import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let groqClient: Groq | null = null;
if (GROQ_API_KEY && GROQ_API_KEY.trim() !== '') {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  } catch (err) {
    console.warn('[Groq] Failed to initialize Groq SDK, falling back to simulated execution:', err);
  }
}

export async function executeGroqLLMCall(
  prompt: string,
  modelName: string = DEFAULT_MODEL
): Promise<{ text: string; provider: string; model: string; simulated?: boolean }> {
  if (groqClient) {
    try {
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: modelName,
        temperature: 0.1,
        max_tokens: 100,
      });

      const responseText = chatCompletion.choices[0]?.message?.content?.trim() || '';
      return {
        text: responseText,
        provider: 'groq',
        model: modelName,
        simulated: false,
      };
    } catch (err: any) {
      console.warn(`[Groq API Call Failed]: ${err.message}. Using fallback.`);
    }
  }

  // Safe Fallback Execution (Artificial delay 300ms)
  await new Promise((resolve) => setTimeout(resolve, 300));
  
  // Deterministic priority fallback parsing logic
  let fallbackResult = 'HIGH';
  if (prompt.toLowerCase().includes('low priority') || prompt.toLowerCase().includes('low')) {
    fallbackResult = 'LOW';
  } else {
    fallbackResult = 'HIGH';
  }

  return {
    text: fallbackResult,
    provider: 'groq-fallback',
    model: modelName + ' (fallback)',
    simulated: true,
  };
}
