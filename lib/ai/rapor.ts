import { read, utils } from 'xlsx';
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
    2. AMBIL skor untuk 6 Indikator Prioritas UTAMA:
       - Kemampuan Literasi (A.1)
       - Kemampuan Numerasi (A.2)
       - Karakter (A.3)
       - Kualitas Pembelajaran (D.1)
       - Iklim Keamanan Sekolah (D.4)
       - Iklim Kebinekaan (D.8)
    
    PANDUAN EKSTRAKSI (SANGAT PENTING):
    - Fokus pada nilai yang disebut "Capaian" atau "Skor Rapor" tahun terbaru (${targetYear}) DAN tahun sebelumnya (Year-1).
    - JANGAN tertukar antara nilai Capaian dan nilai Perubahan/Delta.
    - Pastikan nilai adalah angka 0-100.
    - Tentukan trend: "naik" jika skor naik, "turun" jika turun, "tetap" jika sama (dibanding tahun sebelumnya).
    - Jika indikator tidak ada nilainya secara eksplisit, coba cari di halaman detail indikator tersebut.
    - AMBIL juga "Sub-Indikator" pendukung (Misal: Literasi Membaca Teks Informasi, Numerasi Domain Geometri) jika ada di teks untuk memperkuat analisis rekomendasi.

    3. ANALISIS trend. Jika trend adalah "turun", berikan solusi strategis (comparisonSolution) untuk mengatasi penurunan tersebut.
    4. BUATKAN Analisis Umum (generalAnalysis) yang me-review performa rapor tahun ini dibanding tahun lalu.
    5. BERIKAN Rekomendasi PBD Strategis untuk RKAS ${targetYear} berdasarkan kelemahan (skor rendah) atau penurunan trend.
    
    KRITERIA REKOMENDASI:
    - Satu indikator lemah atau TURUN minimal 1 paket kegiatan besar.
    - Rincikan item belanja (Honor, ATK, Bahan, Jasa).
    - Gunakan Kode Rekening Resmi dari daftar berikut:
      ${accountContext}
    - Pastikan kategori ditentukan dengan benar: >= 70 "Baik", 50-69 "Sedang", < 50 "Kurang".

      OUTPUT JSON FORMAT:
      {
        "generalAnalysis": "Penjelasan menyeluruh tentang performa rapor tahun ini dibanding tahun lalu...",
        "indicators": [
          { 
            "id": "A.1", 
            "label": "Kemampuan Literasi", 
            "score": 85, 
            "prevScore": 80, 
            "trend": "naik", 
            "category": "Baik" 
          }, ...
        ],
        "recommendations": [
          { 
            "indicatorId": "A.2", 
            "activityName": "...", 
            "description": "Justifikasi logis...", 
            "comparisonSolution": "Karena nilai turun dari X ke Y, maka sekolah harus...",
            "componentAnalysis": "Analisis kualitatif...",
            "analysisSteps": ["Langkah 1...", "Langkah 2..."],
            "items": [...], 
            "priority": "Tinggi" 
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
              prevScore: { type: Type.NUMBER },
              trend: { type: Type.STRING },
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
              comparisonSolution: { type: Type.STRING },
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
    // 1. Parse Excel locally to extract data
    // Rapor Pendidikan files can be complex, so we extract all sheets
    const workbook = read(excelBase64, { type: 'base64' });
    let excelContentText = "";

    // Sort sheets to prioritize high-value ones
    const sortedSheets = [...workbook.SheetNames].sort((a, b) => {
      const aUp = a.toUpperCase();
      const bUp = b.toUpperCase();
      const priorityKeywords = ['RAPOR', 'PBD', 'RINGKASAN', 'IDENTIFIKASI', 'DASHBOARD'];
      const secondaryKeywords = ['LAPORAN', 'REKOM', 'HASIL', 'DATA'];
      
      const isAPriority = priorityKeywords.some(k => aUp.includes(k));
      const isBPriority = priorityKeywords.some(k => bUp.includes(k));
      const isASecondary = secondaryKeywords.some(k => aUp.includes(k));
      const isBSecondary = secondaryKeywords.some(k => bUp.includes(k));
      
      if (isAPriority && !isBPriority) return -1;
      if (!isAPriority && isBPriority) return 1;
      if (isASecondary && !isBSecondary) return -1;
      if (!isASecondary && isBSecondary) return 1;
      return 0;
    });

    sortedSheets.forEach(sheetName => {
      const sheetUp = sheetName.toUpperCase();
      const isPossiblyRelevant = 
        sheetUp.includes('RAPOR') || 
        sheetUp.includes('RINGKASAN') || 
        sheetUp.includes('REKOM') || 
        sheetUp.includes('IDENTIFIKASI') ||
        sheetUp.includes('PBD') ||
        sheetUp.includes('LAPORAN') ||
        sheetUp.includes('DASHBOARD');
      
      if (isPossiblyRelevant) {
        const worksheet = workbook.Sheets[sheetName];
        // Using sheet_to_csv with blankrows false to save space
        const csvData = utils.sheet_to_csv(worksheet, { blankrows: false });
        if (csvData.trim().length > 0) {
          excelContentText += `\n--- SHEET: ${sheetName} ---\n${csvData}\n`;
        }
      }
    });

    // Increase limit to 140,000 characters
    const truncatedContent = excelContentText.slice(0, 140000);

    const prompt = `Anda adalah Pakar Analisis Data Pendidikan (Indonesia).
    
    Target Tahun Anggaran: ${targetYear}

    DATA EKSTRAKSI EXCEL (Dalam Format CSV):
    ${truncatedContent}

    TUGAS UTAMA:
    1. CARI dan EKSTRAK skor UNTUK 6 Indikator Prioritas UTAMA:
       ID | Nama Indikator
       A.1 | Kemampuan Literasi
       A.2 | Kemampuan Numerasi  
       A.3 | Karakter
       D.1 | Kualitas Pembelajaran
       D.4 | Iklim Keamanan Sekolah
       D.8 | Iklim Kebinekaan
    
    PANDUAN EKSTRAKSI DATA (SANGAT PENTING):
    - Temukan baris yang mengandung kode indikator tersebut (misal: "A.1").
    - EKSTRAK dua nilai: Skor Tahun ${targetYear} (Terbaru) dan Skor Tahun Sebelumnya.
    - Biasanya ada kolom seperti "Skor Rapor [Tahun]" atau kolom bersebelahan.
    - Bandingkan keduanya dan tentukan trend: "naik", "turun", atau "tetap".
    - JANGAN ambil nilai "Delta" atau "Perubahan" sebagai skor utama.
    - Konversi ke angka desimal (titik sebagai pemisah). Hapus tanda '%' jika ada (misal: "84,21%" menjadi 84.21).
    - JANGAN ambil skor dari sub-indikator (A.1.1, A.2.1, dst) sebagai skor indikator utama.
    - Pastikan kategori ditentukan: >= 70 "Baik", 50-69 "Sedang", < 50 "Kurang".

    2. ANALISIS KHUSUS PENURUNAN:
       - Jika trend adala "turun", wajib memberikan solusi/langkah strategis (comparisonSolution).
       - Identifikasi akar masalah dari detail sub-indikator.
    3. BUATKAN ringkasan analisis (generalAnalysis) strategis membandingkan capaian tahun ini vs tahun lalu.
    4. BUATKAN rekomendasi PBD dengan Rincian Anggaran (Budget Paten) menggunakan kode rekening yang tersedia.
    
    DAFTAR KODE REKENING:
    ${accountContext}

    OUTPUT JSON WAJIB:
    {
      "generalAnalysis": "...",
      "indicators": [
        { "id": "A.1", "label": "Kemampuan Literasi", "score": 45, "prevScore": 60, "trend": "turun", "category": "Kurang" },
        ...
      ],
      "recommendations": [
        {
          "indicatorId": "A.1",
          "activityName": "...",
          "description": "...",
          "comparisonSolution": "Solusi khusus karena nilai turun...",
          "componentAnalysis": "...",
          "analysisSteps": ["Langkah 1...", "Langkah 2..."],
          "bospComponent": "BOSP",
          "snpStandard": "...",
          "estimatedCost": 15000000,
          "priority": "Tinggi",
          "items": [
            { "name": "...", "quantity": 10, "unit": "OJ", "price": 500000, "accountCode": "5.1.02.02.01.0003" }
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
              prevScore: { type: Type.NUMBER },
              trend: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ['id', 'label', 'score', 'trend', 'category']
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
              comparisonSolution: { type: Type.STRING },
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
      contents: [{ parts: [{ text: prompt }] }],
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
    if (error.message?.includes('400')) errorMessage = "Format Request atau File Tidak Didukung.";
    if (error.message?.includes('403')) errorMessage = "API Key tidak memiliki akses.";
    return { success: false, error: errorMessage };
  }
};
