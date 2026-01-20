import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard, BOSPComponent, AccountCodes } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeBudgetEntry = async (description: string): Promise<{ 
  bosp_component: string, 
  snp_standard: string, 
  account_code: string,
  quantity_estimate: number,
  unit_estimate: string,
  price_estimate: number,
  realization_months_estimate: number[],
  suggestion: string,
  is_eligible: boolean,
  warning: string 
}> => {
  if (!ai) {
    return {
      bosp_component: BOSPComponent.LAINNYA,
      snp_standard: SNPStandard.SARPRAS,
      account_code: '',
      quantity_estimate: 1,
      unit_estimate: 'Paket',
      price_estimate: 0,
      realization_months_estimate: [1],
      suggestion: "API Key not found.",
      is_eligible: true,
      warning: ""
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User input: "${description}". 
      Context: Rencana Kegiatan dan Anggaran Sekolah (RKAS) SD Tahun 2026.
      Available Account Codes (Kode Rekening): ${JSON.stringify(AccountCodes)}.
      
      Task:
      1. Map input to 'Komponen BOSP' and 'SNP'.
      2. Select the most appropriate 'Kode Rekening' key (e.g., 5.1.02.01.01.0024).
      3. Check prohibitions.
      4. Estimate the details:
         - Quantity (Volume).
         - Unit (Satuan).
         - Unit Price (Harga Satuan).
         - Realization Months: If the expense is recurring monthly (e.g., Listrik, Internet, Honor, Langganan), return [1, 2, ..., 12]. If it's a one-time event (e.g., buying a Laptop), return the most likely single month (e.g., [2]).
      5. Refine description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bosp_component: {
              type: Type.STRING,
              enum: Object.values(BOSPComponent),
              description: "The BOSP Component"
            },
            snp_standard: {
              type: Type.STRING,
              enum: Object.values(SNPStandard),
              description: "The SNP category"
            },
            account_code: {
               type: Type.STRING,
               description: "The exact key for Kode Rekening"
            },
            quantity_estimate: {
              type: Type.NUMBER,
              description: "Estimated volume/quantity"
            },
            unit_estimate: {
              type: Type.STRING,
              description: "Estimated unit (Satuan)"
            },
            price_estimate: {
              type: Type.NUMBER,
              description: "Estimated unit price in IDR"
            },
            realization_months_estimate: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "Array of months (1-12)"
            },
            suggestion: {
              type: Type.STRING,
              description: "Formal description"
            },
            is_eligible: {
              type: Type.BOOLEAN,
              description: "Allowed by Juknis?"
            },
            warning: {
              type: Type.STRING,
              description: "Warning message if any"
            }
          }
        }
      }
    });

    const result = response.text ? JSON.parse(response.text) : null;
    return result || { 
      bosp_component: BOSPComponent.LAINNYA, 
      snp_standard: SNPStandard.LAINNYA, 
      account_code: '',
      quantity_estimate: 1,
      unit_estimate: 'Paket',
      price_estimate: 0, 
      realization_months_estimate: [1],
      suggestion: description,
      is_eligible: true,
      warning: ""
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      bosp_component: BOSPComponent.LAINNYA,
      snp_standard: SNPStandard.LAINNYA,
      account_code: '',
      quantity_estimate: 1,
      unit_estimate: 'Paket',
      price_estimate: 0,
      realization_months_estimate: [1],
      suggestion: "Error connecting to AI assistant.",
      is_eligible: true,
      warning: ""
    };
  }
};

export const chatWithFinancialAdvisor = async (query: string, context: string) => {
  if (!ai) return "AI not configured.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert RKAS Consultant specializing in Juknis BOSP 2026 for Elementary Schools (SD).
      
      Context of current budget: ${context}
      
      User Question: ${query}
      
      Answer in formal but helpful Indonesian.`,
    });
    return response.text;
  } catch (e) {
    return "Maaf, saya tidak dapat memproses permintaan saat ini.";
  }
}
