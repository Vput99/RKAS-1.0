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

// Helper to robustly parse JSON from AI response
const parseAIResponse = (text: string | undefined) => {
  if (!text) return null;
  try {
    // 1. Try to extract JSON from markdown code blocks (e.g. ```json ... ```)
    // Regex explanation: Matches ``` optionally followed by json, capturing content, ending with ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    
    // 2. Try parsing the raw text directly (cleaning potential whitespace)
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed to parse JSON from AI:", text, e);
    return null;
  }
};

// --- OPTIMIZATION: SMART FILTERING ---
// Reduces payload size by only sending relevant account codes to AI
const filterRelevantAccounts = (query: string, accounts: Record<string, string>): string => {
  const entries = Object.entries(accounts);
  
  // STRATEGY 1: Small Dataset (< 150 items)
  // If the list is small enough, send EVERYTHING. This ensures 100% accuracy for finding matches.
  if (entries.length < 150) {
      return entries.map(([c, n]) => `- ${c}: ${n}`).join('\n');
  }

  // STRATEGY 2: Large Dataset (Imported Excel)
  // Use keyword matching to find relevant codes.
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1); // Allow 2 chars like 'HP', 'PC'

  // Score each account based on match relevance
  const scored = entries.map(([code, name]) => {
      const nameLower = name.toLowerCase();
      let score = 0;
      
      // Exact phrase match bonus
      if (nameLower.includes(queryLower)) score += 100;
      
      // Word match bonus
      queryWords.forEach(word => {
          if (nameLower.includes(word)) score += 10;
      });

      // Prefer standard codes slightly if scores match
      // @ts-ignore
      if (AccountCodes[code]) score += 1;

      return { code, name, score };
  });

  // Filter items with score > 0, sort descending, take top 50 matches
  let candidates = scored
    .filter(s => s.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 50);

  // Fallback: If no matches found (e.g. typos), include a mix of common accounts + top custom ones
  if (candidates.length === 0) {
      candidates = entries
        .slice(0, 30) // Take first 30 (usually standard accounts)
        .map(([code, name]) => ({ code, name, score: 0 }));
  }

  // Format as simple text list to save tokens
  return candidates.map(c => `- ${c.code}: ${c.name}`).join('\n');
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
      suggestion: "Fitur AI belum aktif. Masukkan API_KEY.",
      is_eligible: true,
      warning: "AI Offline"
    };
  }

  try {
    // Optimization: Filter accounts to avoid "Payload Too Large"
    const relevantAccountsList = filterRelevantAccounts(description, availableAccounts);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
      Role: BOSP Auditor & Budget Planner (Indonesia).
      
      Task: 
      1. Validate the user's budget plan input against Juknis BOSP 2026.
      2. Select the BEST matching Account Code from the provided list.
      3. ESTIMATE the Quantity, Unit, and Unit Price (IDR) based on standard market rates in Indonesia (2026).
      
      User Input: "${description}"
      
      Available Account Codes (Select one):
      ${relevantAccountsList}
      
      Rules:
      1. JUKNIS 2026: No land purchase, no personal vehicle, no PNS salary.
      2. If forbidden, set is_eligible=false and provide a warning.
      3. YOU MUST ESTIMATE THE PRICE. Do not return 0 unless absolutely unknown. Example: Laptop ~7.000.000, ATK ~50.000.
      4. Suggest a formal "Uraian Kegiatan" text if the input is informal.
      
      Output JSON Format Only.`,
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
      warning: "Gagal memproses respon AI (Format Invalid)."
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
      suggestion: description,
      is_eligible: true,
      warning: "Koneksi AI Gagal (Timeout/Limit)."
    };
  }
};

export const suggestEvidenceList = async (description: string, accountCode: string = ''): Promise<string[]> => {
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Task: List physical evidence (Bukti Fisik SPJ) for BOSP 2026.
      Expense: "${description}"
      Code: "${accountCode}"
      Return JSON Array of strings.`,
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
  if (!ai) return "Fitur AI belum aktif.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Role: Konsultan RKAS BOSP SD.
      Context: ${context}
      User: ${query}
      Reply in Indonesian.`,
    });
    return response.text;
  } catch (e) {
    console.error("Chat Error:", e);
    return "Maaf, gangguan koneksi.";
  }
}

export const analyzeRaporQuality = async (indicators: RaporIndicator[], targetYear: string): Promise<PBDRecommendation[]> => {
    if (!ai) return [];
    
    const weakIndicators = indicators.filter(i => i.category === 'Kurang' || i.category === 'Sedang');
    if (weakIndicators.length === 0) return [];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Task: Recommend RKAS activities (PBD) for weak indicators.
            Weak Indicators: ${JSON.stringify(weakIndicators)}
            Return JSON Array with detailed budget items.`,
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
                                        name: { type: Type.STRING },
                                        quantity: { type: Type.NUMBER },
                                        unit: { type: Type.STRING },
                                        price: { type: Type.NUMBER },
                                        accountCode: { type: Type.STRING }
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