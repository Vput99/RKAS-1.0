
import { Type } from "@google/genai";
import { SNPStandard, BOSPComponent, AccountCodes } from "../../types";
import { getAiInstance, getAiModel, parseAIResponse } from "./core";

// --- OPTIMIZATION: SMART FILTERING ---
export const filterRelevantAccounts = (query: string, accounts: Record<string, string>): string => {
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
      if (code === '5.1.02.02.01.0029' || nameLower.includes('tenaga ahli')) {
        score += 500;
      }
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
  suggestion_logic: string,
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
