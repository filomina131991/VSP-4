import { GeminiConfig, ChatMessage } from '../types';

const STORAGE_KEY = 'vsp_gemini_config';

export function getGeminiConfig(): GeminiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    apiKey: '',
    enabled: false,
    model: 'gemini-2.0-flash',
    temperature: 0.3
  };
}

export function saveGeminiConfig(config: GeminiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isGeminiEnabled(): boolean {
  const config = getGeminiConfig();
  return config.enabled && config.apiKey.length > 0;
}

export async function queryGemini(
  userQuery: string,
  contextQuestions: string[]
): Promise<ChatMessage> {
  const config = getGeminiConfig();
  if (!config.enabled || !config.apiKey) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: 'Gemini AI is not configured. Please enable it in Admin Settings or use the local help database.',
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  try {
    const prompt = `You are a helpful assistant for the Vijayasree Palakkad SSLC portal. 
Answer the user's question with ONLY step-by-step instructions. No explanations, no greetings, no extra text.
Format each step as "Step N: action description".

Available topics (use these if relevant):
${contextQuestions.join('\n')}

User Question: ${userQuery}

Provide only the steps:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const lines = text.split('\n').filter(Boolean);
    const steps = lines.filter(l => /step \d/i.test(l));

    return {
      id: `msg-${Date.now()}`,
      sender: 'gemini',
      text: steps.length > 0 ? 'Here are the steps to resolve your issue:' : text,
      steps: steps.length > 0 ? steps : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        { label: 'Was this helpful?', action: 'feedback_yes' },
        { label: 'Create Ticket', link: '/help/tickets' }
      ]
    };
  } catch (error) {
    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: `Gemini AI error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API key or try again later.`,
      steps: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        { label: 'Try Local Search', action: 'local_search' },
        { label: 'Create Ticket', link: '/help/tickets' }
      ]
    };
  }
}
