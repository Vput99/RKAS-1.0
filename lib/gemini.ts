import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeBudgetEntry = async (description: string): Promise<{ category: string, amount_estimate: number, suggestion: string }> => {
  if (!ai) {
    return {
      category: SNPStandard.SARPRAS,
      amount_estimate: 0,
      suggestion: "API Key not found. Please configure Gemini API Key."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User input: "${description}". 
      Based on this input for an Indonesian Elementary School (SD) budget:
      1. Determine the most appropriate Standar Nasional Pendidikan (SNP) category.
      2. Estimate a realistic cost in IDR (Rupiah) for a single unit if applicable (just a rough guess based on common prices).
      3. Provide a more formal description string.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: Object.values(SNPStandard),
              description: "The SNP category best fitting the description"
            },
            amount_estimate: {
              type: Type.NUMBER,
              description: "Estimated cost in IDR"
            },
            suggestion: {
              type: Type.STRING,
              description: "A formal, administrative description of the activity"
            }
          }
        }
      }
    });

    const result = response.text ? JSON.parse(response.text) : null;
    return result || { category: SNPStandard.LAINNYA, amount_estimate: 0, suggestion: description };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      category: SNPStandard.LAINNYA,
      amount_estimate: 0,
      suggestion: "Error connecting to AI assistant."
    };
  }
};

export const chatWithFinancialAdvisor = async (query: string, context: string) => {
  if (!ai) return "AI not configured.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert school treasurer consultant (Konsultan Dana BOS). 
      Context of current budget: ${context}
      
      User Question: ${query}
      
      Answer in Indonesian, be professional, helpful, and concise.`,
    });
    return response.text;
  } catch (e) {
    return "Maaf, saya tidak dapat memproses permintaan saat ini.";
  }
}
