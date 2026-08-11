import { hasuraGraphQLRequest } from '../services/hasura';
import { executeLlmStep } from './steps/llm';
import { executeHttpStep } from './steps/http';
import { executeConditionalStep } from './steps/conditional';
import { executeApprovalStep } from './steps/approval';
import { executeDbWriteStep } from './steps/db_write';
import { executeNotifyStep } from './steps/notify';

export async function runWorkflowExecutionEngine(
  workflowId: string,
  userId: string,
  triggerType: string = 'manual',
  inputData: any = {}
): Promise<{ workflow_run_id: string; status: string }> {
  // 1. Fetch Workflow details and Org Memberships to verify access & quota
  const wfQuery = `
    query GetWorkflowDetails($workflow_id: uuid!) {
      workflows_by_pk(id: $workflow_id) {
        id
        org_id
        name
        organization {
          id
          name
          usage_calls
          usage_limit
          org_members {
            user_id
            role
          }
        }
        workflow_steps(order_by: { step_order: asc }) {
          id
          name
          step_order
          type
          config
        }
      }
    }
  `;

  const wfData = await hasuraGraphQLRequest(wfQuery, { workflow_id: workflowId });
  const workflow = wfData.workflows_by_pk;

  if (!workflow) {
    throw new Error('UNAUTHORIZED_OR_NOT_FOUND: Workflow does not exist or access denied.');
  }

  // 2. Validate Membership & Role (Skip user check if system webhook trigger with valid token)
  if (userId !== 'system-webhook') {
    const userMember = workflow.organization.org_members.find((m: any) => m.user_id === userId);
    if (!userMember) {
      throw new Error('UNAUTHORIZED_OR_NOT_FOUND: User does not belong to the workflow organization.');
    }
    if (userMember.role === 'viewer') {
      throw new Error('FORBIDDEN_ROLE: Viewers are not authorized to trigger workflows.');
    }
  }

  // 3. Quota check
  const { usage_calls, usage_limit } = workflow.organization;
  if (usage_calls >= usage_limit) {
    throw new Error(`QUOTA_EXCEEDED: Organization monthly call limit reached (${usage_calls}/${usage_limit}).`);
  }

  // 4. Create workflow_run record
  const createRunMutation = `
    mutation CreateWorkflowRun($workflow_id: uuid!, $trigger_type: String!, $created_by: uuid) {
      insert_workflow_runs_one(object: {
        workflow_id: $workflow_id,
        status: "running",
        trigger_type: $trigger_type,
        created_by: $created_by,
        started_at: "now()"
      }) {
        id
        status
      }
    }
  `;

  const validUserId = (userId === 'system-webhook' || !userId) ? null : userId;
  const runRes = await hasuraGraphQLRequest(createRunMutation, {
    workflow_id: workflowId,
    trigger_type: triggerType,
    created_by: validUserId,
  });

  const workflowRunId = runRes.insert_workflow_runs_one.id;

  // 5. Execute steps asynchronously/synchronously in order
  executeStepLoop(workflowRunId, workflow.id, workflow.org_id, workflow.workflow_steps, inputData)
    .catch((err) => {
      console.error(`[Execution Error in Run ${workflowRunId}]:`, err);
    });

  return {
    workflow_run_id: workflowRunId,
    status: 'running',
  };
}

export async function resumeWorkflowExecutionEngine(
  stepRunId: string,
  userId: string
): Promise<{ step_run_id: string; status: string }> {
  // 1. Fetch step_run details and workflow permission info
  const stepRunQuery = `
    query GetStepRunDetails($step_run_id: uuid!) {
      step_runs_by_pk(id: $step_run_id) {
        id
        status
        workflow_run_id
        workflow_step_id
        workflow_run {
          id
          workflow_id
          status
          workflow {
            id
            org_id
            organization {
              id
              org_members {
                user_id
                role
              }
            }
            workflow_steps(order_by: { step_order: asc }) {
              id
              name
              step_order
              type
              config
            }
          }
          step_runs(order_by: { created_at: asc }) {
            id
            workflow_step_id
            status
            output
          }
        }
      }
    }
  `;

  const srData = await hasuraGraphQLRequest(stepRunQuery, { step_run_id: stepRunId });
  const stepRun = srData.step_runs_by_pk;

  if (!stepRun) {
    throw new Error('UNAUTHORIZED_OR_NOT_FOUND: Step run does not exist or access denied.');
  }

  const workflow = stepRun.workflow_run.workflow;
  const userMember = workflow.organization.org_members.find((m: any) => m.user_id === userId);
  if (!userMember) {
    throw new Error('UNAUTHORIZED_OR_NOT_FOUND: User does not belong to the workflow organization.');
  }
  if (userMember.role === 'viewer') {
    throw new Error('FORBIDDEN_ROLE: Viewers are not authorized to approve step runs.');
  }

  if (stepRun.status !== 'paused') {
    throw new Error(`INVALID_STATE: Step run is in status '${stepRun.status}', cannot approve.`);
  }

  // 2. Mark step_run as completed with approval info
  const approveMutation = `
    mutation ApproveStepRun($step_run_id: uuid!, $approved_by: uuid!) {
      update_step_runs_by_pk(
        pk_columns: { id: $step_run_id },
        _set: {
          status: "completed",
          approved_by: $approved_by,
          approved_at: "now()",
          completed_at: "now()"
        }
      ) {
        id
        status
      }
    }
  `;
  await hasuraGraphQLRequest(approveMutation, { step_run_id: stepRunId, approved_by: userId });

  // Update workflow_run status back to 'running'
  const updateRunMutation = `
    mutation UpdateWorkflowRunStatus($workflow_run_id: uuid!, $status: String!) {
      update_workflow_runs_by_pk(
        pk_columns: { id: $workflow_run_id },
        _set: { status: $status }
      ) {
        id
        status
      }
    }
  `;
  await hasuraGraphQLRequest(updateRunMutation, {
    workflow_run_id: stepRun.workflow_run_id,
    status: 'running',
  });

  // Resume step loop from the step AFTER the approved gate
  executeStepLoop(
    stepRun.workflow_run_id,
    workflow.id,
    workflow.org_id,
    workflow.workflow_steps,
    {},
    stepRun.workflow_step_id
  ).catch((err) => {
    console.error(`[Resume Execution Error in Run ${stepRun.workflow_run_id}]:`, err);
  });

  return {
    step_run_id: stepRunId,
    status: 'completed',
  };
}

async function executeStepLoop(
  workflowRunId: string,
  workflowId: string,
  orgId: string,
  steps: any[],
  initialInput: any = {},
  resumeAfterStepId?: string
) {
  let skipUntilResume = !!resumeAfterStepId;
  const previousOutputs: any[] = [initialInput];

  // Fetch existing step_runs for this run to build output context
  const existingRunsQuery = `
    query GetExistingStepRuns($workflow_run_id: uuid!) {
      step_runs(where: { workflow_run_id: { _eq: $workflow_run_id } }) {
        workflow_step_id
        status
        output
      }
    }
  `;
  const existingData = await hasuraGraphQLRequest(existingRunsQuery, { workflow_run_id: workflowRunId });
  const existingStepRunsMap = new Map<string, any>();
  for (const sr of existingData.step_runs) {
    existingStepRunsMap.set(sr.workflow_step_id, sr);
    if (sr.output) {
      previousOutputs.push(sr.output);
    }
  }

  for (const step of steps) {
    if (skipUntilResume) {
      if (step.id === resumeAfterStepId) {
        skipUntilResume = false;
      }
      continue;
    }

    // Skip if step was already completed in a prior iteration
    const existing = existingStepRunsMap.get(step.id);
    if (existing && existing.status === 'completed') {
      continue;
    }

    // 1. Create or update step_run to 'running'
    const stepRunId = await getOrCreateStepRun(workflowRunId, step.id, initialInput);

    // 2. Handle Approval Gate Pause
    if (step.type === 'approval_gate') {
      const approvalOutput = await executeApprovalStep(step.config);

      // Update step_run to paused
      await hasuraGraphQLRequest(`
        mutation PauseStepRun($id: uuid!, $output: jsonb!) {
          update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused", output: $output }) { id }
        }
      `, { id: stepRunId, output: approvalOutput });

      // Update workflow_run to paused
      await hasuraGraphQLRequest(`
        mutation PauseWorkflowRun($id: uuid!) {
          update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused" }) { id }
        }
      `, { id: workflowRunId });

      return; // Stop step execution loop!
    }

    // 3. Execute step with retry mechanism (1 retry attempt)
    let stepSuccess = false;
    let stepOutput: any = null;
    let stepError: string | null = null;
    let attempt = 0;

    while (attempt < 2 && !stepSuccess) {
      attempt++;
      try {
        // Update attempt count
        await hasuraGraphQLRequest(`
          mutation UpdateAttempt($id: uuid!, $attempt: Int!) {
            update_step_runs_by_pk(pk_columns: { id: $id }, _set: { attempt_count: $attempt, status: "running" }) { id }
          }
        `, { id: stepRunId, attempt });

        if (step.type === 'llm_call') {
          stepOutput = await executeLlmStep(step.config, previousOutputs[previousOutputs.length - 1] || initialInput);
        } else if (step.type === 'http_request') {
          stepOutput = await executeHttpStep(step.config, previousOutputs[previousOutputs.length - 1] || initialInput);
        } else if (step.type === 'conditional_branch') {
          stepOutput = await executeConditionalStep(step.config, previousOutputs);
        } else if (step.type === 'db_write') {
          stepOutput = await executeDbWriteStep(step.config, workflowRunId, workflowId, previousOutputs);
        } else if (step.type === 'notify') {
          stepOutput = await executeNotifyStep(step.config, previousOutputs);
        } else {
          stepOutput = { message: `Step type ${step.type} executed.` };
        }

        stepSuccess = true;
      } catch (err: any) {
        stepError = err.message || String(err);
        console.warn(`[Step ${step.name} Attempt ${attempt} Failed]: ${stepError}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500)); // wait 500ms before retry
        }
      }
    }

    if (stepSuccess) {
      previousOutputs.push(stepOutput);
      await hasuraGraphQLRequest(`
        mutation CompleteStepRun($id: uuid!, $output: jsonb!) {
          update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", output: $output, completed_at: "now()" }) { id }
        }
      `, { id: stepRunId, output: stepOutput });
    } else {
      // Step failed after retries
      await hasuraGraphQLRequest(`
        mutation FailStepRun($id: uuid!, $error: String!) {
          update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", error: $error, completed_at: "now()" }) { id }
        }
      `, { id: stepRunId, error: stepError });

      await hasuraGraphQLRequest(`
        mutation FailWorkflowRun($id: uuid!, $error: String!) {
          update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", error: $error, completed_at: "now()" }) { id }
        }
      `, { id: workflowRunId, error: `Step '${step.name}' failed: ${stepError}` });

      return; // Exit loop on failure!
    }
  }

  // All steps completed successfully!
  await hasuraGraphQLRequest(`
    mutation CompleteWorkflowRun($id: uuid!) {
      update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", completed_at: "now()" }) { id }
    }
  `, { id: workflowRunId });

  // Increment organization usage_calls
  await hasuraGraphQLRequest(`
    mutation IncrementOrgUsage($org_id: uuid!) {
      update_organizations_by_pk(pk_columns: { id: $org_id }, _inc: { usage_calls: 1 }) { id usage_calls }
    }
  `, { org_id: orgId });
}

async function getOrCreateStepRun(workflowRunId: string, stepId: string, inputData: any): Promise<string> {
  const existingQuery = `
    query FindStepRun($workflow_run_id: uuid!, $step_id: uuid!) {
      step_runs(where: { workflow_run_id: { _eq: $workflow_run_id }, workflow_step_id: { _eq: $step_id } }) {
        id
      }
    }
  `;
  const existing = await hasuraGraphQLRequest(existingQuery, { workflow_run_id: workflowRunId, step_id: stepId });
  if (existing.step_runs.length > 0) {
    return existing.step_runs[0].id;
  }

  const createMutation = `
    mutation CreateStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!, $input: jsonb) {
      insert_step_runs_one(object: {
        workflow_run_id: $workflow_run_id,
        workflow_step_id: $workflow_step_id,
        status: "running",
        input: $input,
        started_at: "now()",
        attempt_count: 1
      }) {
        id
      }
    }
  `;
  const res = await hasuraGraphQLRequest(createMutation, {
    workflow_run_id: workflowRunId,
    workflow_step_id: stepId,
    input: inputData,
  });

  return res.insert_step_runs_one.id;
}
