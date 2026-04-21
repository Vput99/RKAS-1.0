
import { GoogleGenAI } from "@google/genai";

// Helper to safely get environment variables
export const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) { }

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) { }

  return '';
};

// Internal helper to get active API Key
export const getActiveApiKey = () => {
  // Priority: Env -> LocalStorage
  return getEnv('VITE_API_KEY') || getEnv('API_KEY') || localStorage.getItem('GEMINI_API_KEY') || '';
};

// Use proxy or dynamic initialization to handle key changes without refresh
export const getAiInstance = () => {
  const key = getActiveApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

// Export status check for UI
export const isAiConfigured = () => !!getActiveApiKey();

// Internal helper to get target model
export const getAiModel = () => {
  return localStorage.getItem('GEMINI_MODEL') || 'gemini-1.5-flash';
};

// Helper to robustly parse JSON from AI response
export const parseAIResponse = (text: string | undefined) => {
  if (!text) return null;
  try {
    // 1. Try to extract JSON from markdown code blocks (e.g. ```json ... ```)
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }

    // 2. Try parsing the raw text directly
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse JSON from AI:", text, e);
    return null;
  }
};
