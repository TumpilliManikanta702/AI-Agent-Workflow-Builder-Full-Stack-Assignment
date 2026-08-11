const GRAPHQL_URL = process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
const GRAPHQL_WS_URL = process.env.NEXT_PUBLIC_NHOST_GRAPHQL_WS_URL || 'ws://localhost:8080/v1/graphql';

export async function executeGraphQL<T = any>(
  query: string,
  variables: Record<string, any> = {},
  userId?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userId) {
    headers['x-hasura-role'] = 'user';
    headers['x-hasura-user-id'] = userId;
  }

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const resJson = await res.json();
  if (resJson.errors && resJson.errors.length > 0) {
    throw new Error(resJson.errors[0].message || 'GraphQL Request Error');
  }

  return resJson.data;
}

// Action Trigger Workflow Run
export async function actionTriggerWorkflowRun(workflowId: string, userId: string, inputData: any = {}) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const res = await fetch(`${backendUrl}/api/actions/trigger-workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-user-id': userId,
      'x-hasura-role': 'user',
    },
    body: JSON.stringify({
      input: {
        workflow_id: workflowId,
        input: inputData,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || 'Failed to trigger workflow run');
  }
  return json;
}

// Action Approve Step
export async function actionApproveStep(stepRunId: string, userId: string) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const res = await fetch(`${backendUrl}/api/actions/approve-step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-user-id': userId,
      'x-hasura-role': 'user',
    },
    body: JSON.stringify({
      input: {
        step_run_id: stepRunId,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || json.error || 'Failed to approve step');
  }
  return json;
}

// GraphQL Documents
export const GET_USER_ORGANIZATIONS = `
  query GetUserOrganizations($userId: uuid!) {
    org_members(where: { user_id: { _eq: $userId } }) {
      id
      role
      org_id
      organization {
        id
        name
        usage_calls
        usage_limit
      }
    }
  }
`;

export const GET_ORG_WORKFLOWS = `
  query GetOrgWorkflows($orgId: uuid!) {
    workflows(where: { org_id: { _eq: $orgId } }, order_by: { created_at: desc }) {
      id
      name
      description
      created_at
      workflow_steps {
        id
        name
        type
        step_order
      }
      workflow_triggers {
        id
        trigger_type
        enabled
      }
      workflow_runs(order_by: { created_at: desc }, limit: 1) {
        id
        status
        created_at
      }
    }
  }
`;

export const GET_WORKFLOW_DETAIL = `
  query GetWorkflowDetail($workflowId: uuid!) {
    workflows_by_pk(id: $workflowId) {
      id
      org_id
      name
      description
      created_at
      organization {
        id
        name
        usage_calls
        usage_limit
      }
      workflow_steps(order_by: { step_order: asc }) {
        id
        name
        step_order
        type
        config
        created_at
      }
      workflow_triggers {
        id
        trigger_type
        config
        enabled
        created_at
      }
      workflow_runs(order_by: { created_at: desc }, limit: 10) {
        id
        status
        trigger_type
        created_at
        started_at
        completed_at
        error
        step_runs(order_by: { created_at: asc }) {
          id
          workflow_step_id
          status
          input
          output
          error
          attempt_count
          approved_by
          approved_at
          started_at
          completed_at
        }
      }
    }
  }
`;

export const STEP_RUNS_SUBSCRIPTION_QUERY = `
  subscription StepRuns($workflowRunId: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $workflowRunId } }
      order_by: { created_at: asc }
    ) {
      id
      workflow_run_id
      workflow_step_id
      status
      input
      output
      error
      attempt_count
      approved_by
      approved_at
      started_at
      completed_at
      workflow_step {
        id
        name
        type
        step_order
      }
    }
  }
`;
