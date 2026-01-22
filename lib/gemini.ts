import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard, BOSPComponent, AccountCodes, RaporIndicator, PBDRecommendation } from "../types";

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

export const analyzeBudgetEntry = async (description: string, availableAccounts: Record<string, string> = AccountCodes): Promise<{ 
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
      contents: `
      Role: You are an expert Auditor for BOSP (Bantuan Operasional Satuan Pendidikan) in Indonesia.
      
      Context:
      - Validating a budget plan entry for an Elementary School (SD) for Fiscal Year 2026.
      - User Input: "${description}"
      - Available Account Codes: ${JSON.stringify(availableAccounts)}
      
      JUKNIS BOSP RULES (Strictly Enforce):
      1. PROHIBITED: Buying land, building new classrooms (only rehab/maintenance allowed), buying personal vehicles, investing shares, paying PNS/PPPK Salary (Honor only for Non-ASN registered in Dapodik), borrowing money, personal use items.
      2. If the input violates any rule, set is_eligible = false and provide a strict warning.
      3. If allowed, find the BEST matching Account Code.
      
      Task:
      1. Analyze the input description.
      2. Determine Eligibility (is_eligible).
      3. Auto-fill estimates based on standard Indonesian market prices (2026):
         - quantity_estimate (Volume)
         - unit_estimate (Satuan: e.g., Orang/Bulan, Paket, Rim, Unit, Kotak)
         - price_estimate (Harga Satuan in IDR, e.g. Laptop ~7000000, ATK ~50000)
         - realization_months_estimate (Array [1..12]. If recurring like Internet/Honor, use [1,2,3,4,5,6,7,8,9,10,11,12]. If purchase, pick likely month e.g. [2]).
      4. Suggest a formal "Uraian Kegiatan" (suggestion).
      
      Output JSON Schema:
      {
        bosp_component: string (enum from BOSPComponent),
        snp_standard: string (enum from SNPStandard),
        account_code: string (key from Available Account Codes),
        quantity_estimate: number,
        unit_estimate: string,
        price_estimate: number,
        realization_months_estimate: number[],
        suggestion: string,
        is_eligible: boolean,
        warning: string (Explanation if ineligible, or "Sesuai Juknis" if ok)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bosp_component: { type: Type.STRING, enum: Object.values(BOSPComponent) },
            snp_standard: { type: Type.STRING, enum: Object.values(SNPStandard) },
            account_code: { type: Type.STRING },
            quantity_estimate: { type: Type.NUMBER },
            unit_estimate: { type: Type.STRING },
            price_estimate: { type: Type.NUMBER },
            realization_months_estimate: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            suggestion: { type: Type.STRING },
            is_eligible: { type: Type.BOOLEAN },
            warning: { type: Type.STRING }
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
      
      CRITICAL RULE 1 (Goods/Assets):
      If the expense is related to purchasing Goods, Equipment, Lights (Lampu), Electronics, or Maintenance Materials (Bahan), you MUST prioritize documents from **SIPLah** (Invoice, BAST). Even if the budget category is "Pemeliharaan/Maintenance", if the item is a physical good (like a bulb), it counts as a Goods Purchase.
      
      CRITICAL RULE 2 (Services):
      Only recommend "SPK/Surat Perintah Kerja" or "Upah Tukang" if the description specifically mentions "Jasa", "Tukang", "Upah", or "Service".
      
      Expense Description: "${description}"
      Account Code: "${accountCode}"
      
      Return ONLY a JSON array of strings. Example: ["Invoice SIPLah", "BAST Digital SIPLah", "Dokumentasi"].`,
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

export const analyzeRaporQuality = async (indicators: RaporIndicator[], targetYear: string): Promise<PBDRecommendation[]> => {
    if (!ai) return [];
    
    // Filter only indicators that need improvement (Kurang/Sedang)
    const weakIndicators = indicators.filter(i => i.category === 'Kurang' || i.category === 'Sedang');
    
    if (weakIndicators.length === 0) return [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Context: Perencanaan Berbasis Data (PBD) sekolah di Indonesia. 
            Goal: Menyusun RKAS untuk Tahun Anggaran ${targetYear} berdasarkan Rapor Pendidikan saat ini.
            
            Task: Berikan rekomendasi kegiatan RKAS (Benahi) untuk memperbaiki indikator Rapor Pendidikan yang lemah.
            
            Weak Indicators: ${JSON.stringify(weakIndicators)}
            Available Account Codes: ${JSON.stringify(AccountCodes)}
            Available BOSP Components: ${Object.values(BOSPComponent).join(', ')}

            IMPORTANT: 
            For each recommended activity, breakdown the budget into specific items (Rincian Anggaran).
            Example: If activity is "Workshop", items might include "Honor Narasumber", "Snack", "ATK".
            Assign the correct Account Code for EACH item.

            Rules:
            1. Suggest specific, actionable activities valid for Fiscal Year ${targetYear}.
            2. Match with valid Account Codes (Kode Rekening) provided.
            3. Estimate logical costs for an average SD (adjusted for year ${targetYear}).
            4. If score is very low (<50), Priority is 'Tinggi'.
            
            Return JSON Array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            indicatorId: { type: Type.STRING },
                            activityName: { type: Type.STRING },
                            description: { type: Type.STRING },
                            bospComponent: { type: Type.STRING },
                            snpStandard: { type: Type.STRING },
                            estimatedCost: { type: Type.NUMBER },
                            priority: { type: Type.STRING, enum: ['Tinggi', 'Sedang', 'Rendah'] },
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING, description: "Item description, e.g. Honor Narasumber" },
                                        quantity: { type: Type.NUMBER },
                                        unit: { type: Type.STRING },
                                        price: { type: Type.NUMBER },
                                        accountCode: { type: Type.STRING, description: "Specific account code for this item" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const result = parseAIResponse(response.text);
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.error("Gemini PBD Error:", error);
        return [];
    }
}