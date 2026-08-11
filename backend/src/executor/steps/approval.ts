export async function executeApprovalStep(config: any) {
  return {
    action_required: 'human_approval',
    message: config.message || 'Approval required to proceed with workflow execution.',
    paused_at: new Date().toISOString(),
  };
}
