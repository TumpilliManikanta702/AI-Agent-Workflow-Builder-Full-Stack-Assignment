export async function executeConditionalStep(config: any, previousOutputs: any[]) {
  const conditionType = config.condition || 'contains';
  const targetValue = (config.value || 'HIGH').toString().toLowerCase();

  // Extract last non-empty result text or output string from previous steps
  let inspectTarget = '';
  for (let i = previousOutputs.length - 1; i >= 0; i--) {
    const out = previousOutputs[i];
    if (out?.result_text) {
      inspectTarget = out.result_text;
      break;
    } else if (typeof out === 'string') {
      inspectTarget = out;
      break;
    } else if (out && typeof out === 'object') {
      inspectTarget = JSON.stringify(out);
      break;
    }
  }

  const inspectLower = inspectTarget.toLowerCase();
  let branchResult = false;

  if (conditionType === 'contains') {
    branchResult = inspectLower.includes(targetValue);
  } else if (conditionType === 'equals') {
    branchResult = inspectLower.trim() === targetValue.trim();
  } else if (conditionType === 'not_equals') {
    branchResult = inspectLower.trim() !== targetValue.trim();
  } else {
    branchResult = inspectLower.includes(targetValue);
  }

  return {
    condition: conditionType,
    target_value: config.value || 'HIGH',
    evaluated_input: inspectTarget,
    branch_result: branchResult,
    branch_taken: branchResult ? 'TRUE' : 'FALSE',
  };
}
