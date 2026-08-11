import { executeGroqLLMCall } from '../../services/groq';

export async function executeLlmStep(config: any, inputData: any) {
  const promptTemplate = config.prompt || 'Process input: {{input}}';
  const inputStr = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
  const prompt = promptTemplate.replace(/\{\{\s*input\s*\}\}/g, inputStr);
  const model = config.model || 'llama-3.3-70b-versatile';

  const result = await executeGroqLLMCall(prompt, model);

  return {
    prompt_sent: prompt,
    result_text: result.text,
    model: result.model,
    provider: result.provider,
    simulated: result.simulated ?? false,
  };
}
