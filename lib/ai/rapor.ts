
import { Type } from "@google/genai";
import { AccountCodes, RaporIndicator, PBDRecommendation } from "../../types";
import { getAiInstance, getAiModel, parseAIResponse } from "./core";

export const analyzeRaporQuality = async (indicators: RaporIndicator[], targetYear: string): Promise<PBDRecommendation[] | null> => {
  const ai = getAiInstance();
  if (!ai) return null;

  const weakIndicators = indicators.filter(i => i.category === 'Kurang' || i.category === 'Sedang');
  if (weakIndicators.length === 0) return [];

  const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  const prompt = `Anda adalah Pakar Analisis Data Pendidikan (Auditor Senior BOSP).
    
    Target Tahun Anggaran: ${targetYear}

    TUGAS UTAMA:
    1. Analisis 6 Indikator Prioritas Rapor Pendidikan berikut:
       ${indicators.map(i => `- ${i.label} (${i.id}): Skor ${i.score} (${i.category})`).join('\n')}
    
    2. Identifikasi kelemahan pada indikator yang berkategori "Kurang" atau "Sedang".
    3. BERIKAN Rekomendasi PBD Strategis untuk RKAS ${targetYear} berdasarkan kelemahan tersebut.
    4. Rincikan item belanja untuk setiap kegiatan (Honor, ATK, Bahan, Jasa).
    5. Gunakan Kode Rekening Resmi berikut:
       ${accountContext}

    OUTPUT JSON FORMAT:
    [
      { 
        "indicatorId": "A.1", 
        "activityName": "...", 
        "title": "...",
        "description": "Justifikasi logis...", 
        "bospComponent": "BOSP",
        "snpStandard": "...",
        "estimatedCost": 1000000,
        "priority": "Tinggi",
        "componentAnalysis": "Analisis kenapa nilai ini didapat...",
        "analysisSteps": ["Langkah 1...", "Langkah 2..."],
        "items": [
          { "name": "...", "quantity": 1, "unit": "...", "price": 100000, "accountCode": "..." }
        ] 
      }
    ]`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        indicatorId: { type: Type.STRING },
        activityName: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        bospComponent: { type: Type.STRING },
        snpStandard: { type: Type.STRING },
        estimatedCost: { type: Type.NUMBER },
        priority: { type: Type.STRING },
        componentAnalysis: { type: Type.STRING },
        analysisSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
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
      required: ['indicatorId', 'activityName', 'title', 'description', 'bospComponent', 'snpStandard', 'estimatedCost', 'priority', 'items']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = parseAIResponse(response.text);
    if (Array.isArray(result)) return result;
  } catch (error: any) {
    console.error("Gemini analysis failed:", error);
    if (error.message?.includes('429')) {
      alert("Terlalu banyak permintaan (Rate Limit). Mohon tunggu 1 menit lalu coba lagi.");
    } else if (error.message?.includes('403')) {
      alert("API Key tidak valid atau tidak memiliki akses ke model AI yang dipilih.");
    } else {
      alert("Analisis AI Gagal: " + (error.message || "Unknown error"));
    }
  }

  return null;
};

export const analyzeRaporPDF = async (pdfBase64: string, targetYear: string): Promise<{
  success: boolean;
  data?: { indicators: RaporIndicator[], recommendations: PBDRecommendation[], generalAnalysis: string };
  error?: string;
}> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: "API Key belum dikonfigurasi di Settings." };

  const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  try {
    const prompt = `Anda adalah Pakar Analisis Data Pendidikan (Auditor Senior BOSP).
    
    TUGAS UTAMA:
    1. BACA dan EKSTRAK seluruh skor dari PDF "Rapor Pendidikan" (utamakan halaman DASHBOARD atau RINGKASAN).
    2. AMBIL skor untuk 6 Indikator Prioritas (Literasi, Numerasi, Karakter, Kualitas Pembelajaran, Keamanan, Kebinekaan).
    3. CARI juga "Sub-Indikator" pendukung (Misal: Literasi Membaca Teks Informasi, Numerasi Domain Geometri) jika ada di teks untuk memperkuat analisis.
    4. ANALISIS trend (apakah naik atau turun dibanding tahun lalu).
    5. BUATKAN Analisis Umum (generalAnalysis) yang me-review, menjelaskan, menganalisa secara keseluruhan, dan memberi solusi strategis umum tentang masalah yang ada di Rapor Pendidikan tersebut.
    6. BERIKAN Rekomendasi PBD Strategis untuk RKAS ${targetYear} berdasarkan kelemahan yang ditemukan.
    
    KRITERIA REKOMENDASI (MAXIMIZE):
    - Satu indikator lemah minimal 1 paket kegiatan besar.
    - Rincikan item belanja (Honor, ATK, Bahan, Jasa).
    - Gunakan Kode Rekening Resmi berikut:
       ${accountContext}

      OUTPUT JSON FORMAT:
      {
        "generalAnalysis": "Penjelasan menyeluruh tentang performa rapor...",
        "indicators": [{ "id": "A.1", "label": "Kemampuan Literasi", "score": 85, "category": "Baik" }, ...],
        "recommendations": [
          { 
            "indicatorId": "A.2", 
            "activityName": "...", 
            "description": "Justifikasi logis...", 
            "componentAnalysis": "Analisis kualitatif kenapa nilai ini didapat...",
            "analysisSteps": ["Langkah 1...", "Langkah 2..."],
            "items": [...], 
            "priority": "Tinggi" 
          }
        ]
      }`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        generalAnalysis: { type: Type.STRING }, indicators: {
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
              componentAnalysis: { type: Type.STRING },
              analysisSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
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

    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = parseAIResponse(response.text);
    if (!result) {
      return { success: false, error: "AI tidak mengembalikan format JSON yang valid. Mungkin file PDF tidak terbaca atau kosong." };
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error("PDF Analysis Error:", error);
    let errorMessage = "Terjadi kesalahan saat menghubungi Google Gemini.";
    if (error.message?.includes('API_KEY')) errorMessage = "API Key Invalid atau Hilang.";
    if (error.message?.includes('429')) errorMessage = "Limit Kuota API Habis (429).";
    if (error.message?.includes('400')) errorMessage = "Format Request Salah atau File PDF Rusak (400).";
    if (error.message?.includes('500')) errorMessage = "Server Google Sedang Sibuk (500).";
    return { success: false, error: `${errorMessage} Detail: ${error.message}` };
  }
};

export const analyzeRaporExcel = async (excelBase64: string, targetYear: string): Promise<{
  success: boolean;
  data?: {
    generalAnalysis: string;
    indicators: RaporIndicator[];
    recommendations: PBDRecommendation[];
  };
  error?: string;
}> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: "API Key belum dikonfigurasi di Settings." };

  const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  try {
    const prompt = `Anda adalah Pakar Analisis Data Pendidikan & Auditor Senior BOSP (Indonesia).
    
    Target Tahun Anggaran: ${targetYear}

    TUGAS UTAMA:
    1. BACA dan EKSTRAK SELURUH data dari file Excel Rapor Pendidikan (semua sheet, termasuk sheet Dashboard, Ringkasan, Detail, dll).
    2. AMBIL skor untuk 6 Indikator Prioritas:
       - A.1 Kemampuan Literasi
       - A.2 Kemampuan Numerasi  
       - A.3 Karakter
       - D.1 Kualitas Pembelajaran
       - D.4 Iklim Keamanan Sekolah
       - D.8 Iklim Kebinekaan
    3. ANALISIS faktor penyebab mengapa nilai tersebut MERAH (Kurang/Sedang):
       - Cari data pendukung: jumlah siswa, persentase keterlibatan, hasil проб assessments
       - Identifikasiroot cause dari kelemahan
    4. BUATKAN ringkasan analisis (generalAnalysis) yang menjelaskan:
       - Kondisi saat ini berdasarkan data
       - Penyebab utama nilai merah
       - Rekomendasi strategis untuk RKAS ${targetYear}
    5. BUATKAN rekomendasi PBD dengan Anggaran untuk mengatasi nilai merah:
       - Setiap indikator yang "Kurang" atau "Sedang" wajib ada 1 paket kegiatan
       - Rincikan item belanja denganperkiraan biaya (quantity × price)
       - Gunakan kode rekening yang sesuai dengan Juknis BOSP
    
    DAFTAR KODE REKENING:
    ${accountContext}

    KRITERIA NILAI:
    - Score >= 70 = Hijau ("Baik")
    - Score 50-69 = Kuning ("Sedang")  
    - Score < 50 = Merah ("Kurang")

    OUTPUT JSON WAJIB:
    {
      "generalAnalysis": "Ringkasan analisis kondisi sekolah berdasarkan data rapor...",
      "indicators": [
        { "id": "A.1", "label": "Kemampuan Literasi", "score": 45, "category": "Kurang" },
        { "id": "A.2", "label": "Kemampuan Numerasi", "score": 72, "category": "Baik" },
        { "id": "A.3", "label": "Karakter", "score": 55, "category": "Sedang" },
        { "id": "D.1", "label": "Kualitas Pembelajaran", "score": 40, "category": "Kurang" },
        { "id": "D.4", "label": "Iklim Keamanan Sekolah", "score": 80, "category": "Baik" },
        { "id": "D.8", "label": "Iklim Kebinekaan", "score": 65, "category": "Sedang" }
      ],
      "recommendations": [
        {
          "indicatorId": "A.1",
          "activityName": "Pengembangan Program Literasi Sekolah",
          "description": "Justifikasi kenapa nilai literasi rendah berdasarkan data rapor...",
          "componentAnalysis": "Analisis penyebab nilai rendah...",
          "analysisSteps": ["Langkah 1...", "Langkah 2...", "Langkah 3..."],
          "bospComponent": "BOSP",
          "snpStandard": "1. Pengembangan Kompetensi Lulusan",
          "estimatedCost": 15000000,
          "priority": "Tinggi",
          "items": [
            { "name": "Honor Narasumber Literasi", "quantity": 10, "unit": "OJ", "price": 500000, "accountCode": "5.1.02.02.01.0003" },
            { "name": "Bahan Praktik Membaca", "quantity": 100, "unit": "Bks", "price": 25000, "accountCode": "5.1.02.01.01.0005" },
            { "name": "Konsumsi Peserta", "quantity": 50, "unit": "Pax", "price": 35000, "accountCode": "5.1.02.01.01.0055" }
          ]
        }
      ]
    }`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        generalAnalysis: { type: Type.STRING },
        indicators: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              score: { type: Type.NUMBER },
              category: { type: Type.STRING }
            },
            required: ['id', 'label', 'score', 'category']
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
              componentAnalysis: { type: Type.STRING },
              analysisSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
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
            required: ['indicatorId', 'activityName', 'description', 'componentAnalysis', 'analysisSteps', 'bospComponent', 'snpStandard', 'estimatedCost', 'priority', 'items']
          }
        }
      },
      required: ['generalAnalysis', 'indicators', 'recommendations']
    };

    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', data: excelBase64 } }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = parseAIResponse(response.text);
    if (!result) {
      return { success: false, error: "AI tidak mengembalikan format JSON yang valid." };
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Excel Analysis Error:", error);
    let errorMessage = `Terjadi kesalahan saat menganalisis dengan AI: ${error.message || 'Unknown error'}`;
    if (error.message?.includes('429')) errorMessage = "Limit API Habis.";
    if (error.message?.includes('400')) errorMessage = "Request tidak valid. Pastikan file Excel valid.";
    if (error.message?.includes('403')) errorMessage = "API Key tidak memiliki akses.";
    if (error.message?.includes('400')) errorMessage = "Format File Excel tidak valid atau rusak.";
    return { success: false, error: errorMessage };
  }
};
