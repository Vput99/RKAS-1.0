
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

// --- OPTIMIZATION: SMART FILTERING ---
const filterRelevantAccounts = (query: string, accounts: Record<string, string>): string => {
  const entries = Object.entries(accounts);
  
  // STRATEGY 1: Small Dataset (< 150 items)
  if (entries.length < 150) {
      return entries.map(([c, n]) => `- ${c}: ${n}`).join('\n');
  }

  // STRATEGY 2: Large Dataset (Imported Excel)
  const queryLower = query.toLowerCase();
  
  // Keywords triggering "Service/Labor" accounts
  const isServiceQuery = 
    queryLower.includes('honor') || 
    queryLower.includes('gaji') || 
    queryLower.includes('upah') || 
    queryLower.includes('jasa') || 
    queryLower.includes('pelatih') || 
    queryLower.includes('pembina') ||
    queryLower.includes('narasumber') ||
    queryLower.includes('tukang');

  // Keywords specific for Extracurricular/Experts
  const isEskulQuery = 
    queryLower.includes('pramuka') || 
    queryLower.includes('ekskul') || 
    queryLower.includes('ekstrakurikuler') || 
    queryLower.includes('tari') || 
    queryLower.includes('drumband') || 
    queryLower.includes('basket') || 
    queryLower.includes('ahli') ||
    queryLower.includes('instruktur');

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

  // Score each account based on match relevance
  const scored = entries.map(([code, name]) => {
      const nameLower = name.toLowerCase();
      let score = 0;
      
      // Exact phrase match bonus
      if (nameLower.includes(queryLower)) score += 100;
      
      // Keyword matching
      queryWords.forEach(word => {
          if (nameLower.includes(word)) score += 10;
      });

      // CONTEXT AWARENESS:
      // If user asks for Honor/Service, boost accounts starting with 5.1.02.02 (Belanja Jasa)
      if (isServiceQuery && code.startsWith('5.1.02.02')) {
          score += 50; 
          // Boost specific types of services
          if (nameLower.includes('narasumber') || nameLower.includes('instruktur')) score += 20;
          if (nameLower.includes('tenaga')) score += 20;
      }

      // If user asks for Extracurricular/Scouts, Heavily Boost "Narasumber/Instruktur" or "Tenaga Ahli"
      if (isEskulQuery) {
          if (code === '5.1.02.02.01.0003' || nameLower.includes('narasumber') || nameLower.includes('instruktur') || nameLower.includes('ahli')) {
              score += 300; // Massive boost to ensure visibility
          }
          if (nameLower.includes('pendidikan') && code.startsWith('5.1.02.02')) {
              score += 100;
          }
      }

      // If user asks for Goods (Barang), boost 5.1.02.01 (Belanja Barang)
      if (!isServiceQuery && !isEskulQuery && code.startsWith('5.1.02.01')) {
          score += 5;
      }

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

  // Fallback
  if (candidates.length === 0) {
      candidates = entries
        .slice(0, 30)
        .map(([code, name]) => ({ code, name, score: 0 }));
  }

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
    const relevantAccountsList = filterRelevantAccounts(description, availableAccounts);

    // Default use flash for speed, unless very complex
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `
      Role: BOSP Auditor & Budget Planner (Indonesia).
      
      Task: 
      1. Validate the user's budget plan input against Juknis BOSP 2026.
      2. Select the BEST matching Account Code from the provided list.
      3. ESTIMATE the Quantity, Unit, and Unit Price (IDR).
      
      User Input: "${description}"
      
      Strict Mapping Rules (MUST FOLLOW):
      - "Honor Ekstrakurikuler" (Pramuka/Tari/Drumband/Silat) -> MAP TO "Belanja Jasa Narasumber/Instruktur" (Code 5.1.02.02.01.0003) or "Tenaga Ahli". NEVER map to Belanja Barang.
      - "Honor Pembina/Pelatih" -> MAP TO "Belanja Jasa Narasumber/Instruktur".
      - "Honor Tukang" -> "Belanja Jasa Tenaga Kerja".
      - "Makan Minum" -> "Belanja Makan dan Minum".
      - "Laptop/Komputer/Printer" -> "Belanja Modal Peralatan".
      
      Available Account Codes (Select ONLY from this list):
      ${relevantAccountsList}
      
      Output JSON Format Only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bosp_component: { type: Type.STRING },
            snp_standard: { type: Type.STRING },
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

export const chatWithFinancialAdvisor = async (query: string, context: string, attachment?: {data: string, mimeType: string}) => {
  if (!ai) return "Fitur AI belum aktif.";

  try {
    const parts: any[] = [
        { text: `Role: Konsultan RKAS BOSP SD Profesional.\nContext Data Sekolah: ${context}\n\nUser Question: ${query}\n\nInstruksi: Jawab dalam Bahasa Indonesia yang formal namun ramah. Jika ada lampiran dokumen (PDF/Gambar), analisis isinya sesuai pertanyaan user.` }
    ];

    if (attachment) {
        parts.push({
            inlineData: {
                data: attachment.data,
                mimeType: attachment.mimeType
            }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
    });
    return response.text;
  } catch (e) {
    console.error("Chat Error:", e);
    return "Maaf, terjadi gangguan saat menganalisis permintaan Anda. Coba lagi nanti.";
  }
}

export const analyzeRaporQuality = async (indicators: RaporIndicator[], targetYear: string): Promise<PBDRecommendation[] | null> => {
    if (!ai) return null;
    
    const weakIndicators = indicators.filter(i => i.category === 'Kurang' || i.category === 'Sedang');
    if (weakIndicators.length === 0) return [];

    // Reduce context slightly to ensure it fits and processes faster
    const accountContext = Object.entries(AccountCodes)
        .slice(0, 100) 
        .map(([c, n]) => `- ${c}: ${n}`)
        .join('\n');

    const prompt = `Role: Expert School Budget Consultant (BOSP Indonesia).
            
    Task: Analyze the following "Weak" Rapor Pendidikan indicators and recommend specific, actionable RKAS budget activities to improve them for Fiscal Year ${targetYear}.
    
    Weak Indicators: ${JSON.stringify(weakIndicators)}
    
    Guidelines:
    1. Create 1-2 activities per indicator.
    2. For each activity, break it down into concrete budget items (e.g., "Makan Minum", "Honor Narasumber", "ATK").
    3. You MUST select a valid 'accountCode' for each item from the list below. If no exact match, pick the closest one starting with '5.'.
    
    Available Account Codes:
    ${accountContext}

    Output: JSON Array of PBDRecommendation objects.`;

    const schema = {
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
                priority: { type: Type.STRING },
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
                        },
                        required: ['name', 'quantity', 'unit', 'price', 'accountCode']
                    }
                }
            },
            required: ['indicatorId', 'activityName', 'description', 'bospComponent', 'snpStandard', 'estimatedCost', 'priority', 'items']
        }
    };

    // ATTEMPT 1: Try Pro Model (Best Quality)
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const result = parseAIResponse(response.text);
        if (Array.isArray(result) && result.length > 0) return result;
    } catch (error) {
        console.warn("Gemini Pro failed, attempting fallback...", error);
    }

    // ATTEMPT 2: Fallback to Flash Model (Higher Availability)
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });

        const result = parseAIResponse(response.text);
        if (Array.isArray(result)) return result;
    } catch (error) {
        console.error("Gemini Flash also failed:", error);
    }

    return null;
}

export const analyzeRaporPDF = async (pdfBase64: string, targetYear: string): Promise<{ indicators: RaporIndicator[], recommendations: PBDRecommendation[] } | null> => {
  if (!ai) return null;

  const accountContext = Object.entries(AccountCodes)
      .slice(0, 100) 
      .map(([c, n]) => `- ${c}: ${n}`)
      .join('\n');

  try {
    const prompt = `Role: Expert School Data Analyst (BOSP Indonesia).

    Task:
    1. READ and ANALYZE the attached "Rapor Pendidikan" PDF.
    2. EXTRACT scores for key indicators:
       - A.1 Kemampuan Literasi
       - A.2 Kemampuan Numerasi
       - A.3 Karakter
       - D.1 Kualitas Pembelajaran
       - D.4 Iklim Keamanan Sekolah
       - D.8 Iklim Kebinekaan
    3. Categorize each score: >=70 (Baik), 50-69 (Sedang), <50 (Kurang).
    4. Based on the WEAKEST indicators (Kurang/Sedang), GENERATE specific RKAS budget recommendations for FY ${targetYear}.
    
    Guidelines for Recommendations:
    - Focus on 'Benahi' activities.
    - Provide concrete budget items (e.g., "Workshop Guru", "Pengadaan Buku Non-Teks", "Honor Narasumber").
    - Select valid Account Codes from:
      ${accountContext}

    Output JSON Format:
    {
      "indicators": [{ "id": "A.1", "label": "Kemampuan Literasi", "score": 80, "category": "Baik" }, ...],
      "recommendations": [{ "indicatorId": "A.2", "activityName": "...", "items": [...] }]
    }`;

    // Schema for complex output
    const schema = {
      type: Type.OBJECT,
      properties: {
        indicators: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
               id: { type: Type.STRING },
               label: { type: Type.STRING },
               score: { type: Type.NUMBER },
               category: { type: Type.STRING }
             }
          }
        },
        recommendations: {
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
                priority: { type: Type.STRING },
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
    };

    // Use Gemini 1.5 Flash or Pro which supports PDF understanding
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Or 1.5 Pro if available, using Flash for speed/cost
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = parseAIResponse(response.text);
    return result;

  } catch (error) {
    console.error("PDF Analysis Error:", error);
    return null;
  }
};
