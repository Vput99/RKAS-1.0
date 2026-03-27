/**
 * LiteLLM Service Bridge for Smart SPJ BOSP
 * Connects the application to the local LiteLLM Proxy Server.
 */

const PROXY_URL = 'http://localhost:4000/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/**
 * Sends a request to LiteLLM Proxy
 * @param model Available models: gemini-1.5-flash, groq-llama3, deepseek-chat
 * @param messages Array of ChatMessage
 * @param temperature Sampling temperature
 */
export const callLiteLLM = async (
  model: 'gemini-1.5-flash' | 'groq-llama3' | 'deepseek-chat',
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> => {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data: AIResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error(`LiteLLM Error (${model}):`, error);
    throw error;
  }
};

/**
 * Specifically for the "1 Keyword" feature (using Groq for speed)
 */
export const processOneKeyword = async (input: string): Promise<string> => {
  const systemPrompt = `Anda adalah asisten cerdas Smart SPJ. 
Tugas Anda adalah memecah perintah keyword menjadi list kegiatan spesifik sesuai ARKAS.
Contoh: "realisasikan honor pramuka" -> {"activity": "Kegiatan Ekstrakurikuler Pramuka", "account": "5.1.02.02.01.0029", "action": "realize"}`;

  return callLiteLLM('groq-llama3', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: input }
  ]);
};

/**
 * Specifically for SIPLah Receipt OCR (using Gemini Flash)
 */
export const extractReceiptText = async (imageBase64: string): Promise<string> => {
  // LiteLLM supports base64 images in OpenAI format
  return callLiteLLM('gemini-1.5-flash', [
    { role: 'system', content: "Ekstrak teks detail dari nota SIPLah ini. Fokus pada item, kuantitas, harga, dan vendor." },
    { role: 'user', content: `[Image Data: ${imageBase64.substring(0, 50)}...]` } // Simulated for now
  ]);
};
