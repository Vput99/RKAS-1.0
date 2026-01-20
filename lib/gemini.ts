import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard, BOSPComponent } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeBudgetEntry = async (description: string): Promise<{ 
  bosp_component: string, 
  snp_standard: string, 
  amount_estimate: number, 
  suggestion: string,
  is_eligible: boolean,
  warning: string 
}> => {
  if (!ai) {
    return {
      bosp_component: BOSPComponent.LAINNYA,
      snp_standard: SNPStandard.SARPRAS,
      amount_estimate: 0,
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
      
      Task:
      1. Map the input to the correct 'Komponen BOSP' (Juknis BOSP) and 'Standar Nasional Pendidikan (SNP)'.
      2. Check against "Larangan Penggunaan Dana BOSP" (e.g., no buying clothing for teachers, no investments, no borrowing, no building construction strictly maintenance).
      3. Estimate a realistic cost in IDR.
      4. Refine the description to formal administrative Indonesian.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bosp_component: {
              type: Type.STRING,
              enum: Object.values(BOSPComponent),
              description: "The BOSP Component category"
            },
            snp_standard: {
              type: Type.STRING,
              enum: Object.values(SNPStandard),
              description: "The SNP category"
            },
            amount_estimate: {
              type: Type.NUMBER,
              description: "Estimated cost in IDR"
            },
            suggestion: {
              type: Type.STRING,
              description: "Formal description suitable for RKAS reporting"
            },
            is_eligible: {
              type: Type.BOOLEAN,
              description: "True if allowed by Juknis BOSP, False if prohibited"
            },
            warning: {
              type: Type.STRING,
              description: "If prohibited, explain why based on Juknis regulations. Empty if allowed."
            }
          }
        }
      }
    });

    const result = response.text ? JSON.parse(response.text) : null;
    return result || { 
      bosp_component: BOSPComponent.LAINNYA, 
      snp_standard: SNPStandard.LAINNYA, 
      amount_estimate: 0, 
      suggestion: description,
      is_eligible: true,
      warning: ""
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      bosp_component: BOSPComponent.LAINNYA,
      snp_standard: SNPStandard.LAINNYA,
      amount_estimate: 0,
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
      contents: `You are an expert RKAS Consultant specializing in Juknis BOSP 2026 (Bantuan Operasional Satuan Pendidikan) for Elementary Schools (SD).
      
      Strict Rules:
      1. Ensure all advice complies with Permendikbudristek regarding BOSP.
      2. Highlight prohibitions (e.g., buying land, medium/heavy construction, stocks, lending money).
      3. Focus on the 11 components of BOSP financing relevant to SD.
      
      Context of current budget: ${context}
      
      User Question: ${query}
      
      Answer in formal but helpful Indonesian.`,
    });
    return response.text;
  } catch (e) {
    return "Maaf, saya tidak dapat memproses permintaan saat ini.";
  }
}
