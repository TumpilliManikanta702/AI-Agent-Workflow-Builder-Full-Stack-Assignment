export async function executeNotifyStep(config: any, previousOutputs: any[]) {
  const messageTemplate = config.message || 'Notification: Workflow step executed successfully.';
  
  return {
    notified: true,
    message: messageTemplate,
    timestamp: new Date().toISOString(),
  };
}
