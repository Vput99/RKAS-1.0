import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard, BOSPComponent, AccountCodes } from "../types";

// Helper to safely get environment variables
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  
  return '';
};

const apiKey = getEnv('API_KEY') || getEnv('VITE_API_KEY') || '';

// Export status check for UI
export const isAiConfigured = () => !!apiKey;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Helper to robustly parse JSON from AI response (handles markdown code blocks)
const parseAIResponse = (text: string | undefined) => {
  if (!text) return null;
  try {
    let clean = text.trim();
    // Remove markdown formatting if present (```json ... ```)
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return JSON.parse(clean);
  } catch (e) {
    console.error("Failed to parse JSON from AI:", text);
    return null;
  }
};

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
      suggestion: "Fitur AI belum aktif. Masukkan API_KEY di pengaturan environment.",
      is_eligible: true,
      warning: "AI Offline"
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

    const result = parseAIResponse(response.text);
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
      warning: "Gagal memproses respon AI."
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
      suggestion: "Terjadi kesalahan koneksi ke AI.",
      is_eligible: true,
      warning: "Connection Error"
    };
  }
};

export const suggestEvidenceList = async (description: string, accountCode: string = ''): Promise<string[]> => {
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: Juknis BOSP 2026 for Elementary Schools (SD) in Indonesia.
      Task: List the required physical evidence documents (Bukti Fisik SPJ) for the following expense transaction.
      The list should be specific and compliant with Indonesian audit requirements (tax invoices, transfer proof for non-cash, etc).
      
      Expense Description: "${description}"
      Account Code: "${accountCode}"
      
      Return ONLY a JSON array of strings. Example: ["Kuitansi", "Faktur", "Dokumentasi"].`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const result = parseAIResponse(response.text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const chatWithFinancialAdvisor = async (query: string, context: string) => {
  if (!ai) return "Fitur AI belum aktif. Harap masukkan API Key (VITE_API_KEY) di pengaturan environment.";

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
    console.error("Chat Error:", e);
    return "Maaf, saya tidak dapat memproses permintaan saat ini karena gangguan koneksi.";
  }
}