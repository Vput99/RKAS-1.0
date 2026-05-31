import { read, utils } from 'xlsx';
import { Type } from "@google/genai";
import { AccountCodes, RaporIndicator, PBDRecommendation, SnpAnalysisData } from "../../types";
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
        responseSchema: schema,
        temperature: 0.0,
        maxOutputTokens: 8192
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
        responseSchema: schema,
        temperature: 0.0,
        maxOutputTokens: 8192
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
    
    // Save to localStorage for use in SNP Analysis
    try {
      localStorage.setItem('RAW_RAPOR_TEXT', truncatedContent);
    } catch (e) {
      console.warn("Failed to cache RAW_RAPOR_TEXT to localStorage", e);
    }

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
        responseSchema: schema,
        temperature: 0.0,
        maxOutputTokens: 8192
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

// ─── Analisa SNP (AI-powered) ────────────────────────────────────────────────

export const analyzeRaporSnp = async (
  indicators: RaporIndicator[],
  targetYear: string
): Promise<{ success: boolean; data?: SnpAnalysisData; error?: string }> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: 'API Key belum dikonfigurasi di Settings.' };

  const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  const prevYear = (parseInt(targetYear) - 1).toString();

  const rawRaporText = typeof window !== 'undefined' ? localStorage.getItem('RAW_RAPOR_TEXT') || '' : '';
  let rawRaporContext = '';
  if (rawRaporText) {
    rawRaporContext = `
═══════════════════════════════════════════
DATA MENTAH DETAIL RAPOR PENDIDIKAN ASLI (CSV):
═══════════════════════════════════════════
Berikut adalah data mentah Rapor Pendidikan sekolah Anda yang diekstraksi dari file Excel asli:
${rawRaporText.slice(0, 110000)}
`;
  }

  const prompt = `Anda adalah Pakar Evaluasi Diri Sekolah (EDS) dan Analis Standar Nasional Pendidikan (SNP) Indonesia.

Target Tahun Anggaran: ${targetYear}
Tahun Rapor (data): ${prevYear}

DATA SKOR 6 INDIKATOR PRIORITAS RAPOR PENDIDIKAN:
${indicators.map(i => `- ${i.id} ${i.label}: Skor ${i.score} (Kategori: ${i.category})${i.prevScore !== undefined ? `, Skor Tahun Lalu: ${i.prevScore}, Trend: ${i.trend}` : ''}`).join('\n')}
${rawRaporContext}

TUGAS UTAMA: Buatkan 4 dokumen analisis SNP lengkap:

═══════════════════════════════════════════
1. ANALISIS RAPOR PENDIDIKAN (Sheet "Analisis Rapor")
═══════════════════════════════════════════
- PENTING (COPAS SELURUH DATA UTUH - JANGAN HANYA 1 STANDAR): Untuk tabel "Analisis Rapor", jika terdapat "DATA MENTAH DETAIL RAPOR PENDIDIKAN ASLI (CSV)" di atas, Anda wajib langsung menyalin (copy-paste) seluruh data indikator utama (seperti A.1, A.2, A.3, D.1, D.4, D.8, dst) beserta sub-indikator aslinya yang relevan dari data tersebut. JANGAN HANYA MENGAMBIL 1 STANDAR/SNP SAJA (misalnya hanya Standar Kompetensi Lulusan A saja). Tampilkan seluruh standar (A, B, C, D, dst) secara seimbang, lengkap, dan profesional. Jangan mengubah nama indikator, jangan mengubah skor tahun ini, jangan mengubah skor tahun lalu, jangan mengubah delta, jangan mengubah pencapaian capaian, dan jangan mengubah keterangan. AI hanya memindahkan (copas) data assessment secara persis tanpa modifikasi.
- Jika data CSV tidak tersedia, Anda wajib menyertakan seluruh 6 indikator prioritas di atas (A.1, A.2, A.3, D.1, D.4, D.8) beserta sub-indikator simulasinya yang relevan. Jangan dikurangi atau hanya mengambil sebagian saja!
- Kolom wajib: no, indikator, skorTahunIni, skorTahunLalu, delta, pencapaianSkor, definisiCapaian, keterangan.
- Batasi panjang teks deskriptif pencapaianSkor dan definisiCapaian maksimal 1 kalimat ringkas untuk menghemat ruang output JSON agar tidak terpotong.
- pencapaianSkor: contoh "Baik (84,21% siswa mencapai batas minimum)".
- definisiCapaian: contoh "Sebagian besar siswa telah mencapai batas minimum".
- Keterangan berisi highlight penting, misal: "Naik 1.50" atau "Turun 14.72".
- Sub-indikator dimasukkan ke dalam field "children" pada indikator induknya.

═══════════════════════════════════════════
2. PRIORITAS MASALAH (Identifikasi Prioritas Masalah)
═══════════════════════════════════════════
- PENTING (BACA DATA ASLI): Jika terdapat "DATA MENTAH DETAIL RAPOR PENDIDIKAN ASLI (CSV)" di atas, Anda wajib mencari dan mengidentifikasi seluruh masalah prioritas dari seluruh indikator yang ada (tidak hanya terbatas pada 6 indikator utama, tapi mencakup indikator lain seperti D.2, D.3, dll jika nilainya rendah/sedang/turun pada CSV tersebut). Silakan buat hingga 6-12 baris prioritas masalah jika memang terdapat banyak masalah riil pada data CSV.
- PENTING (P5 DITIADAKAN): Program P5 (Projek Penguatan Profil Pelajar Pancasila) ditiadakan untuk sekolah ini. Jangan sekali-kali menyarankan program P5 atau Projek Profil Pancasila untuk mengatasi masalah Karakter (A.3) atau lainnya. Ganti dengan kegiatan alternatif berkarakter lain, seperti Pramuka, ekstrakurikuler kesenian, atau pembiasaan budaya sekolah.
- Identifikasi masalah prioritas berdasarkan kelemahan rapor pendidikan (skor rendah, kategori kurang, trend turun).
- Anda harus memberikan nilai skala prioritas 1-3 untuk Tingkat Prioritas dan Tingkat Urgensi, di mana angka 3 adalah yang paling urgent (paling penting/darurat), 2 sedang, dan 1 rendah.
- Jumlah adalah penjumlahan dari Tingkat Prioritas dan Tingkat Urgensi (Tingkat Prioritas + Tingkat Urgensi).
- Berikan Alasan logis mengapa permasalahan tersebut dipilih dan mengapa diberi bobot prioritas serta urgensi tersebut.
- Kolom wajib: no, snp, indikatorId, indikatorLabel, akarMasalahId, akarMasalahLabel, tingkatPrioritas, tingkatUrgensi, jumlah, alasan.

═══════════════════════════════════════════
3. RENCANA KERJA TAHUNAN (RKT)
═══════════════════════════════════════════
- Hubungkan/petakan langsung RKT ini dengan 5-8 Prioritas Masalah yang telah diidentifikasi sebelumnya.
- RKT harus menganalisis apakah kegiatan tersebut membutuhkan anggaran atau tidak (butuhBiaya = true / false). Jika kegiatan membutuhkan biaya, butuhBiaya diisi true (Ya), jika tidak butuhBiaya diisi false (Tidak).
- Contoh kegiatan tidak butuh biaya: "Diskusi mingguan guru terkait modul", "Penerapan metode pembelajaran bervariasi oleh guru di kelas", "Kunjungan ke perpustakaan secara terjadwal".
- Kolom wajib: no, snp, indikatorId, indikatorLabel, akarMasalahId, akarMasalahLabel, kegiatanBenahi, penjelasanImplementasi, butuhBiaya, kodeArkas, kegiatanArkas, estimasiBiaya.
- Jika butuhBiaya = false, maka kodeArkas diisi string kosong "", kegiatanArkas diisi padanan kegiatannya (atau nama kegiatan non-ARKAS), dan estimasiBiaya diisi 0.
- Jika butuhBiaya = true, kodeArkas diisi kode kegiatan ARKAS (e.g. "04.05.14", "05.02.02", "03.03", "06.05.06") yang relevan, kegiatanArkas diisi padanan nama kegiatan belanja ARKAS (e.g. "Belanja Modal Buku Umum", "Peningkatan Kompetensi Guru...", "Penyelenggaraan Ekstrakurikuler..."), dan estimasiBiaya diisi estimasi nominalnya.

═══════════════════════════════════════════
4. RKAS (Rencana Kegiatan dan Anggaran Sekolah)
═══════════════════════════════════════════
- PENTING (RKAS HANYA UNTUK KEGIATAN BERBIAYA): Hanya masukkan kegiatan RKT yang membutuhkan biaya (butuhBiaya = true dan estimasiBiaya > 0) ke dalam array "rkas". Kegiatan yang tidak membutuhkan biaya (butuhBiaya = false) SAMA SEKALI TIDAK BOLEH dimasukkan ke dalam daftar "rkas" (jangan cantumkan kegiatan dengan totalBiaya 0 atau items kosong).
- Rincikan SETIAP kegiatan RKT yang membutuhkan biaya (butuhBiaya = true) menjadi rincian barang/jasa spesifik (lembar kerja rancangan ARKAS).
- Kolom utama: no, snp, kegiatanBenahi, penjelasanImplementasi, kodeArkas, kegiatanArkas, totalBiaya.
- Setiap kegiatan berbiaya harus memiliki array "items" berisi detail barang/jasa yang akan dibelanjakan:
  - uraian (Uraian Kegiatan ARKAS, e.g. "Belanja Modal Buku Umum", "Pembelian ATK"), 
  - bulan (Bulan Dianggarkan, e.g. "Agustus", "Maret"), 
  - volume (Jumlah barang/jasa, e.g. 10, 5), 
  - satuan (e.g. "rim", "paket", "eks"), 
  - hargaSatuan (nominal per unit), 
  - jumlah (Total biaya = volume x hargaSatuan), 
  - sumberAnggaran (e.g. "BOSP"),
  - kodeRekening (Gunakan HANYA kode rekening resmi dari daftar di bawah).
- Gunakan HANYA kode rekening dari daftar berikut:
${accountContext}
- Harga harus REALISTIS untuk sekolah SD di Indonesia (contoh: ATK ~Rp50.000-500.000, Honor Narasumber ~Rp300.000-500.000/OJ, Konsumsi ~Rp25.000-50.000/orang).

═══════════════════════════════════════════
TAMBAHAN
═══════════════════════════════════════════
- Sertakan "ringkasan" berupa paragraf analisis umum kondisi mutu sekolah.

OUTPUT JSON WAJIB:
{
  "ringkasan": "Paragraf analisis umum...",
  "rapor": [
    {
      "no": "A.1", "indikator": "Kemampuan Literasi", "skorTahunIni": 84.21, "skorTahunLalu": 85.71,
      "delta": -1.50, "pencapaianSkor": "Baik (84,21% peserta didik...)",
      "definisiCapaian": "Sebagian besar peserta didik...", "keterangan": "Turun 1.50",
      "children": [
        { "no": "A.1.1", "indikator": "Kompetensi membaca teks informasi", "skorTahunIni": 62.57, "skorTahunLalu": 73.56, "delta": -10.99, "pencapaianSkor": "...", "definisiCapaian": "...", "keterangan": "Turun 10.99" }
      ]
    }
  ],
  "prioritas": [
    { "no": 1, "snp": "Standar Kelulusan", "indikatorId": "A.1", "indikatorLabel": "Kemampuan Literasi", "akarMasalahId": "A.1.1", "akarMasalahLabel": "Kompetensi membaca teks informasi", "tingkatPrioritas": 3, "tingkatUrgensi": 2, "jumlah": 5, "alasan": "Kemampuan untuk memahami teks informasi berkaitan erat dengan kemampuan literasi siswa secara keseluruhan." }
  ],
  "rkt": [
    { "no": 1, "snp": "Standar Kelulusan", "indikatorId": "A.1", "indikatorLabel": "Kemampuan Literasi", "akarMasalahId": "A.1.1", "akarMasalahLabel": "Kompetensi membaca teks informasi", "kegiatanBenahi": "Kemampuan untuk memahami teks informasi berkaitan erat dengan kemampuan literasi siswa secara keseluruhan.", "penjelasanImplementasi": "Meningkatkan kompetensi dalam memahami teks informasi dengan diskusi bersama dalam Komunikasi Belajar.", "butuhBiaya": true, "kodeArkas": "04.05.14", "kegiatanArkas": "Peningkatan Kompetensi Guru untuk memperkuat literasi", "estimasiBiaya": 5000000 }
  ],
  "rkas": [
    { 
      "no": 1, 
      "snp": "Standar Kelulusan", 
      "kegiatanBenahi": "Kemampuan untuk memahami teks informasi berkaitan erat dengan kemampuan literasi siswa secara keseluruhan.", 
      "penjelasanImplementasi": "Meningkatkan kompetensi dalam memahami teks informasi dengan diskusi bersama dalam Komunikasi Belajar.", 
      "kodeArkas": "04.05.14", 
      "kegiatanArkas": "Peningkatan Kompetensi Guru untuk memperkuat literasi", 
      "totalBiaya": 5000000, 
      "items": [
        { "uraian": "Belanja Modal Buku Umum", "bulan": "Agustus", "volume": 10, "satuan": "eks", "hargaSatuan": 500000, "jumlah": 5000000, "sumberAnggaran": "BOSP", "kodeRekening": "5.1.02.01.01.0024" }
      ]
    }
  ]
}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      ringkasan: { type: Type.STRING },
      rapor: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            no: { type: Type.STRING },
            indikator: { type: Type.STRING },
            skorTahunIni: { type: Type.NUMBER },
            skorTahunLalu: { type: Type.NUMBER },
            delta: { type: Type.NUMBER },
            pencapaianSkor: { type: Type.STRING },
            definisiCapaian: { type: Type.STRING },
            keterangan: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.STRING },
                  indikator: { type: Type.STRING },
                  skorTahunIni: { type: Type.NUMBER },
                  skorTahunLalu: { type: Type.NUMBER },
                  delta: { type: Type.NUMBER },
                  pencapaianSkor: { type: Type.STRING },
                  definisiCapaian: { type: Type.STRING },
                  keterangan: { type: Type.STRING }
                },
                required: ['no', 'indikator', 'skorTahunIni', 'skorTahunLalu', 'delta', 'pencapaianSkor', 'definisiCapaian', 'keterangan']
              }
            }
          },
          required: ['no', 'indikator', 'skorTahunIni', 'skorTahunLalu', 'delta', 'pencapaianSkor', 'definisiCapaian', 'keterangan']
        }
      },
      prioritas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            no: { type: Type.NUMBER },
            snp: { type: Type.STRING },
            indikatorId: { type: Type.STRING },
            indikatorLabel: { type: Type.STRING },
            akarMasalahId: { type: Type.STRING },
            akarMasalahLabel: { type: Type.STRING },
            tingkatPrioritas: { type: Type.NUMBER },
            tingkatUrgensi: { type: Type.NUMBER },
            jumlah: { type: Type.NUMBER },
            alasan: { type: Type.STRING }
          },
          required: [
            'no', 'snp', 'indikatorId', 'indikatorLabel', 'akarMasalahId', 
            'akarMasalahLabel', 'tingkatPrioritas', 'tingkatUrgensi', 'jumlah', 'alasan'
          ]
        }
      },
      rkt: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            no: { type: Type.NUMBER },
            snp: { type: Type.STRING },
            indikatorId: { type: Type.STRING },
            indikatorLabel: { type: Type.STRING },
            akarMasalahId: { type: Type.STRING },
            akarMasalahLabel: { type: Type.STRING },
            kegiatanBenahi: { type: Type.STRING },
            penjelasanImplementasi: { type: Type.STRING },
            butuhBiaya: { type: Type.BOOLEAN },
            kodeArkas: { type: Type.STRING },
            kegiatanArkas: { type: Type.STRING },
            estimasiBiaya: { type: Type.NUMBER }
          },
          required: [
            'no', 'snp', 'indikatorId', 'indikatorLabel', 'akarMasalahId', 
            'akarMasalahLabel', 'kegiatanBenahi', 'penjelasanImplementasi', 
            'butuhBiaya', 'kodeArkas', 'kegiatanArkas', 'estimasiBiaya'
          ]
        }
      },
      rkas: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            no: { type: Type.NUMBER },
            snp: { type: Type.STRING },
            kegiatanBenahi: { type: Type.STRING },
            penjelasanImplementasi: { type: Type.STRING },
            kodeArkas: { type: Type.STRING },
            kegiatanArkas: { type: Type.STRING },
            totalBiaya: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  uraian: { type: Type.STRING },
                  bulan: { type: Type.STRING },
                  volume: { type: Type.NUMBER },
                  satuan: { type: Type.STRING },
                  hargaSatuan: { type: Type.NUMBER },
                  jumlah: { type: Type.NUMBER },
                  sumberAnggaran: { type: Type.STRING },
                  kodeRekening: { type: Type.STRING }
                },
                required: [
                  'uraian', 'bulan', 'volume', 'satuan', 'hargaSatuan', 
                  'jumlah', 'sumberAnggaran', 'kodeRekening'
                ]
              }
            }
          },
          required: [
            'no', 'snp', 'kegiatanBenahi', 'penjelasanImplementasi', 
            'kodeArkas', 'kegiatanArkas', 'totalBiaya', 'items'
          ]
        }
      }
    },
    required: ['ringkasan', 'rapor', 'prioritas', 'rkt', 'rkas']
  };

  try {
    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.0,
        maxOutputTokens: 8192
      }
    });

    const result = parseAIResponse(response.text);
    if (!result) {
      return { success: false, error: 'AI tidak mengembalikan format JSON yang valid.' };
    }

    const analysis: SnpAnalysisData = {
      year: targetYear,
      generatedAt: new Date().toISOString(),
      ringkasan: result.ringkasan || '',
      rapor: result.rapor || [],
      prioritas: result.prioritas || [],
      rkt: result.rkt || [],
      rkas: result.rkas || []
    };

    return { success: true, data: analysis };
  } catch (error: any) {
    console.error('SNP Analysis Error:', error);
    let errorMessage = 'Terjadi kesalahan saat menganalisis SNP dengan AI.';
    if (error.message?.includes('429')) errorMessage = 'Limit API Habis (429). Coba lagi dalam 1 menit.';
    if (error.message?.includes('400')) errorMessage = 'Format request salah (400).';
    if (error.message?.includes('403')) errorMessage = 'API Key tidak memiliki akses (403).';
    return { success: false, error: `${errorMessage} Detail: ${error.message}` };
  }
};
