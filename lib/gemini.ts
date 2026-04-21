
import { GoogleGenAI, Type } from "@google/genai";
import { SNPStandard, BOSPComponent, AccountCodes, RaporIndicator, PBDRecommendation } from "../types";

export interface InventoryItem {
  id: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  subActivityCode?: string;
  subActivityName?: string;
  accountCode: string;
  date: string;
  contractType?: string;
  vendor?: string;
  docNumber: string;
  category: string; // 'ATK', 'Kebersihan', etc. with optional subcategories like 'ATK - Kertas'
  codification?: string;
  lastYearBalance?: number;
  usedQuantity?: number;
}

// Helper to safely get environment variables
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) { }

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) { }

  return '';
};

// Internal helper to get active API Key
const getActiveApiKey = () => {
  // Priority: Env -> LocalStorage
  return getEnv('VITE_API_KEY') || getEnv('API_KEY') || localStorage.getItem('GEMINI_API_KEY') || '';
};

// Use proxy or dynamic initialization to handle key changes without refresh
const getAiInstance = () => {
  const key = getActiveApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

// Export status check for UI
export const isAiConfigured = () => !!getActiveApiKey();

// Internal helper to get target model
const getAiModel = () => {
  return localStorage.getItem('GEMINI_MODEL') || 'gemini-2.0-flash';
};

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
    queryLower.includes('tukang') ||
    queryLower.includes('tenaga');

  // Keywords specific for Extracurricular/Experts
  const isEskulQuery =
    queryLower.includes('pramuka') ||
    queryLower.includes('ekskul') ||
    queryLower.includes('ekstrakurikuler') ||
    queryLower.includes('tari') ||
    queryLower.includes('drumband') ||
    queryLower.includes('basket') ||
    queryLower.includes('silat') ||
    queryLower.includes('bola') ||
    queryLower.includes('renang') ||
    queryLower.includes('karate') ||
    queryLower.includes('pencak') ||
    queryLower.includes('tahfidz') ||
    queryLower.includes('mengaji') ||
    queryLower.includes('lukis') ||
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

    // If user asks for Extracurricular/Scouts, Heavily Boost "Tenaga Ahli" (5.1.02.02.01.0029)
    if (isEskulQuery) {
      // PRIMARY: Tenaga Ahli is the CORRECT code for honor ekstrakurikuler
      if (code === '5.1.02.02.01.0029' || nameLower.includes('tenaga ahli')) {
        score += 500; // Highest boost — this is the correct mapping
      }
      // SECONDARY: Narasumber/Instruktur as alternative
      if (code === '5.1.02.02.01.0003' || nameLower.includes('narasumber') || nameLower.includes('instruktur')) {
        score += 200;
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
    .sort((a, b) => b.score - a.score)
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
  suggestion_logic: string,  // NEW: Analysis rationale
  is_eligible: boolean,
  warning: string
}> => {
  const ai = getAiInstance();
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
      suggestion_logic: "AI tidak tersedia secara offline.",
      is_eligible: true,
      warning: "AI Offline"
    };
  }

  try {
    const relevantAccountsList = filterRelevantAccounts(description, availableAccounts);

    // Use stable Gemini model for budget analysis
    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{ parts: [{ text: description }] }],
      config: {
        systemInstruction: `Anda adalah Auditor Senior BOSP & Ahli Implementasi ARKAS (Indonesia).
Tugas Anda adalah memetakan narasi kegiatan sekolah ke dalam Standar Nasional Pendidikan (SNP) dan Kode Rekening Belanja yang sesuai dengan Juknis BOSP 2026.

⚠️ ATURAN PEMETAAN WAJIB (PRIORITAS TERTINGGI — IKUTI TANPA PENGECUALIAN):
Untuk setiap kegiatan, Anda HARUS mengisi KEDUA field: snp_standard DAN account_code sesuai tabel di bawah.

FORMAT TABEL: Kegiatan → snp_standard | account_code

HONOR & UPAH:
- Honor Ekstrakurikuler (Pramuka, Tari, Drumband, Silat, Basket, Renang, Karate, Tahfidz, Lukis, Catur, dll) → snp_standard: "1. Pengembangan Kompetensi Lulusan" | account_code: 5.1.02.02.01.0029
- Honor Guru Honorer / GTT (bulanan) → snp_standard: "7. Pengembangan Standar Pembiayaan" | account_code: 5.1.02.02.01.0013
- Honor Narasumber / Pembicara / Moderator → snp_standard: "4. Pengembangan Pendidik dan Tenaga Kependidikan" | account_code: 5.1.02.02.01.0003
- Honor Penyelenggara Ujian (PTS/PAS/ANBK) → snp_standard: "8. Pengembangan dan Implementasi Sistem Penilaian" | account_code: 5.1.02.02.01.0009
- Honor TU / Admin → snp_standard: "7. Pengembangan Standar Pembiayaan" | account_code: 5.1.02.02.01.0026
- Honor Penjaga / Keamanan → snp_standard: "7. Pengembangan Standar Pembiayaan" | account_code: 5.1.02.02.01.0031
- Honor Kebersihan → snp_standard: "7. Pengembangan Standar Pembiayaan" | account_code: 5.1.02.02.01.0030
- Upah Tukang / Reparasi → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.02.01.0016
- Honor Operator Komputer → snp_standard: "7. Pengembangan Standar Pembiayaan" | account_code: 5.1.02.02.01.0027
- Honor Pelatihan / IHT / Workshop / KKG → snp_standard: "4. Pengembangan Pendidik dan Tenaga Kependidikan" | account_code: 5.1.02.02.01.0011
- Honor Laboratorium → snp_standard: "3. Pengembangan Standar Proses" | account_code: 5.1.02.02.01.0015
- Honor Kesenian / Kebudayaan → snp_standard: "1. Pengembangan Kompetensi Lulusan" | account_code: 5.1.02.02.01.0025

BELANJA BARANG & JASA:
- ATK untuk ulangan/ujian → snp_standard: "8. Pengembangan dan Implementasi Sistem Penilaian" | account_code: 5.1.02.01.01.0024
- ATK untuk kantor/admin → snp_standard: "6. Pengembangan Standar Pengelolaan" | account_code: 5.1.02.01.01.0024
- Kertas/Cover untuk ujian → snp_standard: "8. Pengembangan dan Implementasi Sistem Penilaian" | account_code: 5.1.02.01.01.0025
- Fotocopy/Cetak soal → snp_standard: "8. Pengembangan dan Implementasi Sistem Penilaian" | account_code: 5.1.02.01.01.0026
- Konsumsi Rapat → snp_standard: "6. Pengembangan Standar Pengelolaan" | account_code: 5.1.02.01.01.0052
- Konsumsi Kegiatan/Peserta didik → snp_standard: "1. Pengembangan Kompetensi Lulusan" | account_code: 5.1.02.01.01.0055
- Bahan Praktik/Alat Peraga → snp_standard: "3. Pengembangan Standar Proses" | account_code: 5.1.02.01.01.0005
- Listrik → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.02.01.0061
- Air → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.02.01.0060
- Internet/Wifi → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.02.01.0063
- Telepon → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.02.01.0059
- Pemeliharaan Gedung → snp_standard: "5. Pengembangan Sarana dan Prasarana" | account_code: 5.1.02.03.02.0111
- Buku/Perpustakaan → snp_standard: "2. Pengembangan Standar Isi" | account_code: 5.2.02.13.01.0001
- PPDB / Pendaftaran → snp_standard: "6. Pengembangan Standar Pengelolaan" | account_code: 5.1.02.01.01.0026
- Penyusunan Kurikulum / KOSP → snp_standard: "2. Pengembangan Standar Isi" | account_code: 5.1.02.01.01.0024
- Perjalanan Dinas Guru → snp_standard: "4. Pengembangan Pendidik dan Tenaga Kependidikan" | account_code: 5.1.02.04.01.0001

DAFTAR SNP (gunakan PERSIS string ini untuk field snp_standard):
1. "1. Pengembangan Kompetensi Lulusan"
2. "2. Pengembangan Standar Isi"
3. "3. Pengembangan Standar Proses"
4. "4. Pengembangan Pendidik dan Tenaga Kependidikan"
5. "5. Pengembangan Sarana dan Prasarana"
6. "6. Pengembangan Standar Pengelolaan"
7. "7. Pengembangan Standar Pembiayaan"
8. "8. Pengembangan dan Implementasi Sistem Penilaian"

DATABASE REKENING (Hanya pilih kode dari list ini):
${relevantAccountsList}

REWRITE: Tulis ulang "suggestion" menjadi nama kegiatan formal seperti di ARKAS.`,
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
            suggestion_logic: { type: Type.STRING },
            is_eligible: { type: Type.BOOLEAN },
            warning: { type: Type.STRING }
          },
          required: ['snp_standard', 'bosp_component', 'account_code', 'suggestion_logic', 'suggestion']
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
      suggestion_logic: "Gagal memproses narasi AI.",
      is_eligible: false,
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
      suggestion_logic: "Gangguan koneksi API.",
      is_eligible: false,
      warning: "Koneksi AI Gagal (Timeout/Limit)."
    };
  }
};

export const suggestEvidenceList = async (description: string, accountCode: string = ''): Promise<string[]> => {
  const ai = getAiInstance();
  if (!ai) return [];

  try {
    const response = await ai.models.generateContent({
      model: getAiModel(),
      contents: [{
        parts: [{
          text: `Tugas: Berikan daftar bukti fisik SPJ BOSP 2026 yang lengkap dan baku.
      
      ATURAN KHUSUS SIPLAH:
      Jika pengeluaran menggunakan SIPLah (Barang/Bahan/Modal), Anda WAJIB memberikan daftar standar berikut:
      1. Dokumen Cetak Pesanan (PO) Digital dari SIPLah
      2. Invoice / Faktur Penjualan Definitif (Dari SIPLah)
      3. Berita Acara Serah Terima (BAST) Digital SIPLah
      4. Berita Acara Pemeriksaan Barang (Oleh Tim Pemeriksa Sekolah)
      5. Bukti Transfer ke Virtual Account Marketplace SIPLah
      6. Bukti Pajak (Otomatis dari SIPLah / Manual jika perlu)
      7. Foto Dokumentasi Barang Terkirim (Fisik di Sekolah)
      8. Fotokopi Pencatatan di Buku Persediaan / KIB
      9. Kuitansi Manual Sekolah (Sebagai pendukung jika diperlukan)

      ATURAN KHUSUS HONORARIUM / JASA:
      Jika pengeluaran adalah Honor, Gaji, Jasa Narasumber, Ekstrakurikuler, PSS, dll, Anda WAJIB memberikan DAFTAR PASTi berikut HANYA 7 poin:
      1. SK Penetapan / Surat Tugas dari Kepala Sekolah (Tahun Anggaran Berjalan)
      2. Daftar Hadir / Absensi Rekapitulasi Pokok
      3. Daftar Tanda Terima Honorarium (Bruto, Pajak, Netto)
      4. Bukti Transfer Bank ke Rekening Penerima (Prioritas CMS/Non-Tunai)
      5. Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)
      6. Fotokopi KTP & NPWP Penerima Jasa
      7. Foto Kegiatan

      ATURAN KHUSUS LISTRIK / LANGGANAN DAYA:
      Jika pengeluaran adalah Listrik, Air, Telepon, Internet, Anda WAJIB memberikan DAFTAR HANYA 1 poin ini:
      1. Bukti Pembayaran (Minimal 1, Maksimal 3 Bukti)

      ATURAN KHUSUS PEMBAYARAN RETRIBUSI SAMPAH :
      Jika pengeluaran adalah Retribusi Sampah, Anda WAJIB memberikan DAFTAR HANYA 1 poin ini:
      1. Bukti Pembayaran (Minimal 1, Maksimal 3 Bukti) 

      ATURAN KHUSUS PEMBAYARAN SPPD DALAM DAERAH :
      Jika pengeluaran adalah SPPD Dalam Daerah, Anda WAJIB memberikan DAFTAR PASTI 7 poin berikut ini:
      1. Surat Undangan 
      2. Surat Tugas
      3. SPPD (Surat Perintah Perjalanan Dinas)
      4. Laporan Hasil Perjalanan Dinas (Tuntas)
      5. Bukti Transfer Bank ke Rekening Penerima (Prioritas CMS/Non-Tunai)
      6. Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)
      7. Foto Kegiatan



      Input Pengeluaran: "${description}"
      Kode Rekening: "${accountCode}"
      
      Kembalikan dalam format JSON Array of strings.` }]
      }],
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

export const chatWithFinancialAdvisor = async (query: string, context: string, attachment?: { data: string, mimeType: string }) => {
  const ai = getAiInstance();
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
      model: getAiModel(),
      contents: [{ parts: [{ text: query }] }]
    });
    return response.text;
  } catch (e) {
    console.error("Chat Error:", e);
    return "Maaf, terjadi gangguan saat menganalisis permintaan Anda. Coba lagi nanti.";
  }
}

export const analyzeRaporQuality = async (indicators: RaporIndicator[], targetYear: string): Promise<PBDRecommendation[] | null> => {
  const ai = getAiInstance();
  if (!ai) return null;

  const weakIndicators = indicators.filter(i => i.category === 'Kurang' || i.category === 'Sedang');
  if (weakIndicators.length === 0) return [];

  // Reduce context slightly to ensure it fits and processes faster
const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  try {
    console.log("Analyzing Excel file, base64 length:", excelBase64.length);
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
    // Show a more helpful message through console if possible, 
    // or we can handle it in the UI.
    if (error.message?.includes('429')) {
      alert("Terlalu banyak permintaan (Rate Limit). Mohon tunggu 1 menit lalu coba lagi.");
    } else if (error.message?.includes('403')) {
      alert("API Key tidak valid atau tidak memiliki akses ke model AI yang dipilih.");
    } else {
      alert("Analisis AI Gagal: " + (error.message || "Unknown error"));
    }
  }

  return null;
}

// Updated return type to include error message
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

    // Schema for complex output
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

    console.log("AI Response:", response.text);
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

export const analyzeInventoryItems = async (budgets: any[]): Promise<InventoryItem[]> => {
  const ai = getAiInstance();
  if (!ai) return [];

  // Filter only relevant budgets (expenses with realizations)
  const relevantBudgets = budgets.filter(b =>
    b.type === 'belanja' &&
    b.realizations && b.realizations.length > 0 &&
    (b.account_code?.startsWith('5.1.01') || b.account_code?.startsWith('5.1.02.01') || b.account_code?.startsWith('5.2.02'))
  );

  if (relevantBudgets.length === 0) return [];

  const dataToAnalyze = relevantBudgets.map(b => ({
    id: b.id,
    description: b.description,
    account_code: b.account_code,
    realizations: b.realizations.map((r: any) => ({
      amount: r.amount,
      quantity: r.quantity,
      date: r.date,
      vendor: r.vendor,
      notes: r.notes
    }))
  }));

  const prompt = `Role: Logistik & Pengadaan Aset Sekolah (Indonesia).
  
  Task: Analisis data pengeluaran berikut and uraikan menjadi item-item persediaan untuk "Laporan Pengadaan BMD".
  
  Reference Classification (Based on Official List):
  - Bahan bangunan, bahan kimia, Bahan dalam proses, isi tabung gas, bahan lainya
  - Suku cadang alat angkutan, Suku cadang alat kedokteran, Suku cadang alat laboratorium
  - Alat tulis kantor, ATK, Bahan cetak, Benda pos, Bahan komputer, Perabot kantor
  - Alat listrik, Perlengkapan dinas, Perlengkapan pendukung olahraga, Souvernir/cindera mata
  - Alat/Bahan untuk Kegiatan Kantor, Obat, Obat obatan lainnya, Buku
  - Persediaan untuk Dijual/Diserahkan Kepada Masyarakat, natura
  
  Input Data: ${JSON.stringify(dataToAnalyze)}
  
  Instruksi:
  1. Identifikasi nama barang dan spesifikasi detail dari deskripsi/notes.
  2. Gunakan quantity dan unit yang masuk akal berdasarkan item tersebut.
  3. Kelompokkan ke salah satu kategori di atas secara TEPAT sesuai daftar kategorisasi.
  4. Jika satu pengeluaran berisi gabungan item (misal "Beli ATK"), pecah menjadi item-item individu yang realistis.
  5. Set lastYearBalance ke 0 secara default unless context suggests otherwise.
  6. Set usedQuantity sama dengan quantity (masuk) jika barang tersebut langsung disalurkan/dipakai.
  
  Output JSON format: Array of InventoryItem objects.`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        spec: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        unit: { type: Type.STRING },
        price: { type: Type.NUMBER },
        total: { type: Type.NUMBER },
        subActivityCode: { type: Type.STRING },
        subActivityName: { type: Type.STRING },
        accountCode: { type: Type.STRING },
        date: { type: Type.STRING },
        contractType: { type: Type.STRING },
        vendor: { type: Type.STRING },
        docNumber: { type: Type.STRING },
        category: { type: Type.STRING },
        lastYearBalance: { type: Type.NUMBER },
        usedQuantity: { type: Type.NUMBER }
      },
      required: ['name', 'spec', 'quantity', 'unit', 'price', 'total', 'accountCode', 'date', 'category']
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
    return (Array.isArray(result) ? result : []).map((item: any, idx: number) => ({
      ...item,
      id: item.id || `inv-${Date.now()}-${idx}`
    }));
  } catch (error) {
    console.error("Inventory analysis failed:", error);
    return [];
  }
};
