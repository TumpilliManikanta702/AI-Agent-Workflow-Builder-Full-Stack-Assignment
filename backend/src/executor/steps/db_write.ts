import { hasuraGraphQLRequest } from '../../services/hasura';

export async function executeDbWriteStep(
  config: any,
  workflowRunId: string,
  workflowId: string,
  previousOutputs: any[]
) {
  const targetTable = config.target || 'workflow_results';
  const customData = config.data || {};

  const payloadData = {
    ...customData,
    executor_timestamp: new Date().toISOString(),
    previous_step_summary: previousOutputs.slice(-2),
  };

  const mutation = `
    mutation InsertWorkflowResult($workflow_run_id: uuid!, $workflow_id: uuid!, $data: jsonb!) {
      insert_workflow_results_one(object: {
        workflow_run_id: $workflow_run_id,
        workflow_id: $workflow_id,
        data: $data
      }) {
        id
        created_at
      }
    }
  `;

  const data = await hasuraGraphQLRequest(mutation, {
    workflow_run_id: workflowRunId,
    workflow_id: workflowId,
    data: payloadData,
  });

  return {
    target_table: targetTable,
    inserted_id: data.insert_workflow_results_one.id,
    inserted_at: data.insert_workflow_results_one.created_at,
    data: payloadData,
  };
}
