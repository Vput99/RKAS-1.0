import { read, utils } from 'xlsx';
import { Type } from "@google/genai";
import { AccountCodes, RaporIndicator, PBDRecommendation, SnpAnalysisData, SnpRaporRow } from "../../types";
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
    1. BACA dan EKSTRAK seluruh skor dari PDF "Rapor Pendidikan" (baik Indikator Utama seperti A.1, A.2, A.3, D.1, D.4, D.8 maupun seluruh Sub-Indikator pendukung yang ada seperti A.1.1, A.1.2, A.2.1, dst).
    2. AMBIL sebanyak mungkin skor indikator yang tertera di dokumen PDF.
    
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

export const parseRaporGrid = (grid: any[][]): SnpRaporRow[] => {
  const allRows: SnpRaporRow[] = [];
  const codeRegex = /^[A-Z]\.[0-9]+(\.[0-9]+)*$/;

  grid.forEach((row) => {
    if (!Array.isArray(row) || row.length === 0) return;

    // Find indicator ID cell
    let idIdx = -1;
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell === null || cell === undefined) continue;
      const cellStr = String(cell).replace(/\s/g, '').replace(/\.$/, ''); // remove spacing/trailing dot
      if (codeRegex.test(cellStr) && cellStr.length > 2) {
        idIdx = i;
        break;
      }
    }

    if (idIdx === -1) return;

    const no = String(row[idIdx]).replace(/\s/g, '').replace(/\.$/, '');
    const indikator = String(row[idIdx + 1] || '').trim();
    if (indikator.toLowerCase().includes('indikator') || indikator.toLowerCase().includes('nama')) {
      // Header row, skip
      return;
    }

    const numericCells: number[] = [];
    const otherCells: string[] = [];

    for (let i = idIdx + 2; i < row.length; i++) {
      const cell = row[i];
      if (cell === null || cell === undefined || cell === '') continue;

      const cellStr = String(cell).trim();
      const clean = cellStr.replace(/%/g, '').replace(/,/g, '.').replace(/\s/g, '');
      const num = parseFloat(clean);

      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(clean)) {
        numericCells.push(num);
      } else {
        otherCells.push(cellStr);
      }
    }

    const skorTahunIni = numericCells.length > 0 ? numericCells[0] : 0;
    const skorTahunLalu = numericCells.length > 1 ? numericCells[1] : 0;
    const delta = numericCells.length > 2 ? numericCells[2] : (skorTahunIni - skorTahunLalu);

    // Find category/pencapaian
    let pencapaianSkor = '';
    const catKeywords = ['baik', 'sedang', 'kurang', 'tinggi', 'rendah', 'mencapai', 'belum'];
    const catCell = otherCells.find(c => 
      catKeywords.some(kw => c.toLowerCase().includes(kw)) && c.length < 100
    );
    pencapaianSkor = catCell || otherCells[0] || '';

    // Find definition (longest cell)
    let definisiCapaian = '';
    if (otherCells.length > 0) {
      const sortedByLength = [...otherCells].sort((a, b) => b.length - a.length);
      definisiCapaian = sortedByLength[0];
    }

    // Find trend/keterangan
    let keterangan = '';
    const trendCell = otherCells.find(c => 
      c.toLowerCase().includes('naik') || 
      c.toLowerCase().includes('turun') || 
      c.toLowerCase().includes('tetap')
    );
    if (trendCell) {
      keterangan = trendCell;
    } else {
      keterangan = `${delta > 0 ? 'Naik' : delta < 0 ? 'Turun' : 'Tetap'} ${Math.abs(delta).toFixed(2)}`;
    }

    allRows.push({
      no,
      indikator,
      skorTahunIni,
      skorTahunLalu,
      delta,
      pencapaianSkor,
      definisiCapaian,
      keterangan
    });
  });

  // Deduplicate rows by code
  const uniqueRows: SnpRaporRow[] = [];
  const seenCodes = new Set<string>();
  allRows.forEach(row => {
    if (!seenCodes.has(row.no)) {
      seenCodes.add(row.no);
      uniqueRows.push(row);
    }
  });

  // Hierarchy grouping
  const parents: SnpRaporRow[] = [];
  const childrenMap = new Map<string, SnpRaporRow[]>();

  uniqueRows.forEach(row => {
    const parts = row.no.split('.');
    if (parts.length === 2) {
      parents.push(row);
    } else if (parts.length > 2) {
      const parentNo = parts.slice(0, 2).join('.');
      if (!childrenMap.has(parentNo)) {
        childrenMap.set(parentNo, []);
      }
      childrenMap.get(parentNo)!.push(row);
    }
  });

  parents.forEach(parent => {
    if (childrenMap.has(parent.no)) {
      parent.children = childrenMap.get(parent.no);
    }
  });

  return parents;
};

export const flattenRaporToIndicators = (rows: SnpRaporRow[]): RaporIndicator[] => {
  const result: RaporIndicator[] = [];
  const traverse = (list: SnpRaporRow[]) => {
    list.forEach(row => {
      const getCategory = (score: number) => {
        if (score >= 70) return 'Baik';
        if (score >= 50) return 'Sedang';
        return 'Kurang';
      };
      const deltaVal = row.delta;
      result.push({
        id: row.no,
        label: row.indikator,
        score: row.skorTahunIni,
        prevScore: row.skorTahunLalu,
        trend: deltaVal > 0 ? 'naik' : deltaVal < 0 ? 'turun' : 'tetap',
        category: getCategory(row.skorTahunIni)
      });
      if (row.children && row.children.length > 0) {
        traverse(row.children);
      }
    });
  };
  traverse(rows);
  return result;
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
    const workbook = read(excelBase64, { type: 'base64' });
    let excelContentText = "";
    let allParsedRows: SnpRaporRow[] = [];

    // Prioritize target sheets
    let targetSheets = workbook.SheetNames.filter(name => {
      const sheetUp = name.toUpperCase();
      return (
        sheetUp.includes('RAPOR') || 
        sheetUp.includes('RINGKASAN') || 
        sheetUp.includes('REKOM') || 
        sheetUp.includes('IDENTIFIKASI') ||
        sheetUp.includes('PBD') ||
        sheetUp.includes('LAPORAN') ||
        sheetUp.includes('DASHBOARD')
      );
    });

    if (targetSheets.length === 0) {
      // Find sheets containing indicator patterns (like "A.1" or "Kemampuan Literasi")
      targetSheets = workbook.SheetNames.filter(name => {
        const worksheet = workbook.Sheets[name];
        if (!worksheet) return false;
        for (const key in worksheet) {
          if (key[0] === '!') continue;
          const val = worksheet[key]?.v;
          if (val === 'A.1' || val === 'A.2' || val === 'Kemampuan Literasi') {
            return true;
          }
        }
        return false;
      });
    }

    if (targetSheets.length === 0) {
      // Fallback to all sheets
      targetSheets = workbook.SheetNames;
    }

    targetSheets.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;

      const csvData = utils.sheet_to_csv(worksheet, { blankrows: false });
      if (csvData.trim().length > 0) {
        excelContentText += `\n--- SHEET: ${sheetName} ---\n${csvData}\n`;
      }

      const grid = utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      if (grid && grid.length > 0) {
        const parsed = parseRaporGrid(grid);
        allParsedRows = allParsedRows.concat(parsed);
      }
    });

    // Deduplicate by code
    const uniqueParents: SnpRaporRow[] = [];
    const seenCodes = new Set<string>();
    allParsedRows.forEach(row => {
      if (!seenCodes.has(row.no)) {
        seenCodes.add(row.no);
        uniqueParents.push(row);
      }
    });

    const localIndicators = flattenRaporToIndicators(uniqueParents);

    // If we could not extract any indicators locally, throw error
    if (localIndicators.length === 0) {
      return { success: false, error: "Tidak dapat menemukan data indikator Rapor Pendidikan di file Excel Anda. Pastikan format file benar." };
    }

    const truncatedContent = excelContentText.slice(0, 140000);
    
    // Save to localStorage for use in SNP Analysis
    try {
      localStorage.setItem('RAW_RAPOR_TEXT', truncatedContent);
    } catch (e) {
      console.warn("Failed to cache RAW_RAPOR_TEXT to localStorage", e);
    }

    const prompt = `Anda adalah Pakar Analisis Data Pendidikan (Indonesia).
    
    Target Tahun Anggaran: ${targetYear}

    DATA INDIKATOR RAPOR PENDIDIKAN (Hasil Ekstraksi):
    ${JSON.stringify(localIndicators, null, 2)}

    TUGAS UTAMA:
    1. Analisis indikator Rapor Pendidikan di atas, terutama yang memiliki skor rendah (di bawah 70) atau tren penurunan.
    2. Berikan rekomendasi PBD strategis untuk RKAS ${targetYear} berdasarkan kelemahan tersebut.
    3. Rincikan item belanja untuk setiap kegiatan (Honor, ATK, Bahan, Jasa).
    4. Gunakan Kode Rekening Resmi berikut:
       ${accountContext}

    OUTPUT JSON FORMAT:
    {
      "generalAnalysis": "Penjelasan menyeluruh tentang performa rapor tahun ini dibanding tahun lalu...",
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
      required: ['generalAnalysis', 'recommendations']
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
    return {
      success: true,
      data: {
        generalAnalysis: result.generalAnalysis || "",
        indicators: localIndicators,
        recommendations: result.recommendations || []
      }
    };
  } catch (error: any) {
    console.error("Excel Analysis Error:", error);
    let errorMessage = `Terjadi kesalahan saat menganalisis dengan AI: ${error.message || 'Unknown error'}`;
    if (error.message?.includes('429')) errorMessage = "Limit API Habis.";
    if (error.message?.includes('400')) errorMessage = "Format Request atau File Tidak Didukung.";
    if (error.message?.includes('403')) errorMessage = "API Key tidak memiliki akses.";
    return { success: false, error: errorMessage };
  }
};

export const parseRaporCSV = (csvText: string): SnpRaporRow[] => {
  const lines = csvText.split('\n');
  const allRows: SnpRaporRow[] = [];
  const codeRegex = /^[A-Z]\.[0-9]+(\.[0-9]+)*$/;
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    // Detect separator
    const commaCount = (line.match(/,/g) || []).length;
    const semiCount = (line.match(/;/g) || []).length;
    const separator = semiCount > commaCount ? ';' : ',';
    
    // Split line
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    const cleanCells = cells.map(cell => cell.replace(/^["']|["']$/g, '').trim());
    
    // Find indicator ID cell
    let idIdx = -1;
    for (let i = 0; i < cleanCells.length; i++) {
      const cell = cleanCells[i];
      const normalizedCell = cell.replace(/\s/g, '').replace(/\.$/, ''); // remove spacing/trailing dot
      if (codeRegex.test(normalizedCell) && normalizedCell.length > 2) {
        idIdx = i;
        break;
      }
    }
    
    if (idIdx === -1) return;
    
    const no = cleanCells[idIdx].replace(/\s/g, '').replace(/\.$/, '');
    const indikator = cleanCells[idIdx + 1] || '';
    if (indikator.toLowerCase().includes('indikator') || indikator.toLowerCase().includes('nama')) {
      // This is a header row, skip it
      return;
    }
    
    const numericCells: number[] = [];
    const otherCells: string[] = [];
    
    for (let i = idIdx + 2; i < cleanCells.length; i++) {
      const cell = cleanCells[i];
      if (!cell) continue;
      
      const clean = cell.replace(/%/g, '').replace(/,/g, '.').replace(/\s/g, '');
      const num = parseFloat(clean);
      
      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(clean)) {
        numericCells.push(num);
      } else {
        otherCells.push(cell);
      }
    }
    
    const skorTahunIni = numericCells.length > 0 ? numericCells[0] : 0;
    const skorTahunLalu = numericCells.length > 1 ? numericCells[1] : 0;
    const delta = numericCells.length > 2 ? numericCells[2] : (skorTahunIni - skorTahunLalu);
    
    // Find category/pencapaian
    let pencapaianSkor = '';
    const catKeywords = ['baik', 'sedang', 'kurang', 'tinggi', 'rendah', 'mencapai', 'belum'];
    const catCell = otherCells.find(c => 
      catKeywords.some(kw => c.toLowerCase().includes(kw)) && c.length < 100
    );
    pencapaianSkor = catCell || otherCells[0] || '';
    
    // Find definition (longest cell)
    let definisiCapaian = '';
    if (otherCells.length > 0) {
      const sortedByLength = [...otherCells].sort((a, b) => b.length - a.length);
      definisiCapaian = sortedByLength[0];
    }
    
    // Find trend/keterangan
    let keterangan = '';
    const trendCell = otherCells.find(c => 
      c.toLowerCase().includes('naik') || 
      c.toLowerCase().includes('turun') || 
      c.toLowerCase().includes('tetap')
    );
    if (trendCell) {
      keterangan = trendCell;
    } else {
      keterangan = `${delta > 0 ? 'Naik' : delta < 0 ? 'Turun' : 'Tetap'} ${Math.abs(delta).toFixed(2)}`;
    }
    
    allRows.push({
      no,
      indikator,
      skorTahunIni,
      skorTahunLalu,
      delta,
      pencapaianSkor,
      definisiCapaian,
      keterangan
    });
  });
  
  // Deduplicate rows by code
  const uniqueRows: SnpRaporRow[] = [];
  const seenCodes = new Set<string>();
  allRows.forEach(row => {
    if (!seenCodes.has(row.no)) {
      seenCodes.add(row.no);
      uniqueRows.push(row);
    }
  });

  // Hierarchy grouping
  const parents: SnpRaporRow[] = [];
  const childrenMap = new Map<string, SnpRaporRow[]>();
  
  uniqueRows.forEach(row => {
    const parts = row.no.split('.');
    if (parts.length === 2) {
      parents.push(row);
    } else if (parts.length > 2) {
      const parentNo = parts.slice(0, 2).join('.');
      if (!childrenMap.has(parentNo)) {
        childrenMap.set(parentNo, []);
      }
      childrenMap.get(parentNo)!.push(row);
    }
  });
  
  parents.forEach(parent => {
    if (childrenMap.has(parent.no)) {
      parent.children = childrenMap.get(parent.no);
    }
  });
  
  return parents;
};

// ─── Helper: Build common context for SNP analysis ────────────────────────────

export type SnpProgressCallback = (step: number, totalSteps: number, label: string) => void;

const buildSnpContext = (indicators: RaporIndicator[], targetYear: string) => {
  const prevYear = (parseInt(targetYear) - 1).toString();

  // Programmatically parse the Rapor Pendidikan table from local storage CSV
  let raporData: SnpRaporRow[] = [];
  const rawRaporText = typeof window !== 'undefined' ? localStorage.getItem('RAW_RAPOR_TEXT') || '' : '';
  if (rawRaporText) {
    try {
      raporData = parseRaporCSV(rawRaporText);
    } catch (e) {
      console.warn("Failed to programmatically parse RAW_RAPOR_TEXT CSV", e);
    }
  }

  // Fallback to the 6 indicators passed if CSV parsing yields nothing
  if (raporData.length === 0) {
    raporData = indicators.map(ind => {
      const deltaVal = (ind.score || 0) - (ind.prevScore || 0);
      return {
        no: ind.id,
        indikator: ind.label,
        skorTahunIni: ind.score || 0,
        skorTahunLalu: ind.prevScore || 0,
        delta: deltaVal,
        pencapaianSkor: ind.category || '',
        definisiCapaian: '',
        keterangan: `${deltaVal > 0 ? 'Naik' : deltaVal < 0 ? 'Turun' : 'Tetap'} ${Math.abs(deltaVal).toFixed(2)}`
      };
    });
  }

  const formatRaporDataToText = (rows: SnpRaporRow[], indent = ''): string => {
    let result = '';
    rows.forEach(row => {
      result += `${indent}- [${row.no}] ${row.indikator}: Skor ${row.skorTahunIni} (Tahun lalu: ${row.skorTahunLalu}, Delta: ${row.delta.toFixed(2)}, Capaian: ${row.pencapaianSkor})\n`;
      if (row.children && row.children.length > 0) {
        result += formatRaporDataToText(row.children, indent + '  ');
      }
    });
    return result;
  };

  const formattedRaporData = formatRaporDataToText(raporData);
  const rawRaporContext = formattedRaporData ? `
=============================================
DATA DETAIL RAPOR PENDIDIKAN ASLI (HIERARKIS):
=============================================
Berikut adalah data detail Rapor Pendidikan sekolah Anda yang diekstraksi dari file asli:
${formattedRaporData}
` : '';

  const indicatorsText = indicators.map(i => "- " + i.id + " " + i.label + ": Skor " + i.score + " (Kategori: " + i.category + ")" + (i.prevScore !== undefined ? ", Skor Tahun Lalu: " + i.prevScore + ", Trend: " + i.trend : "")).join('\n');

  const accountContext = Object.entries(AccountCodes)
    .map(([c, n]) => `- ${c}: ${n}`)
    .join('\n');

  return { prevYear, raporData, rawRaporContext, indicatorsText, accountContext };
};

// ─── Tahap 1: Prioritas Masalah + Ringkasan ──────────────────────────────────

const analyzeSnpPrioritas = async (
  _indicators: RaporIndicator[],
  targetYear: string,
  ctx: ReturnType<typeof buildSnpContext>
): Promise<{ success: boolean; data?: { ringkasan: string; prioritas: any[] }; error?: string; rawText?: string }> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: 'API Key belum dikonfigurasi.' };

  const prompt = `Anda adalah Pakar Evaluasi Diri Sekolah (EDS) dan Analis Standar Nasional Pendidikan (SNP) Indonesia.

Target Tahun Anggaran: ${targetYear}
Tahun Rapor (data): ${ctx.prevYear}

DATA SKOR INDIKATOR RAPOR PENDIDIKAN:
${ctx.indicatorsText}
${ctx.rawRaporContext}

TUGAS: Buatkan RINGKASAN analisis mutu sekolah dan IDENTIFIKASI PRIORITAS MASALAH.

=============================================
RINGKASAN
=============================================
- Buatlah paragraf analisis umum kondisi mutu sekolah berdasarkan data rapor pendidikan di atas.

=============================================
PRIORITAS MASALAH (Identifikasi Prioritas Masalah)
=============================================
- PENTING (BUAT BANYAK BARIS - WAJIB ANTARA 8 HINGGA 12 BARIS): Anda WAJIB mengidentifikasi minimal 8 dan maksimal 12 prioritas masalah riil dari seluruh data indikator yang ada (terutama yang nilainya Rendah/Sedang atau mengalami penurunan skor/tren penurunan). Jangan membuat kurang dari 8 baris, dan jangan membuat lebih dari 12 baris. Jika masalah prioritas kurang dari 8, carilah sub-indikator lainnya yang nilainya Sedang atau mengalami penurunan trend (delta negatif) meskipun berkategori Baik, agar jumlah prioritas masalah mencapai antara 8 hingga 12 baris.
- PENTING (P5 DITIADAKAN): Program P5 (Projek Penguatan Profil Pelajar Pancasila) ditiadakan untuk sekolah ini. Jangan sekali-kali menyarankan program P5 atau Projek Profil Pancasila untuk mengatasi masalah Karakter (A.3) atau lainnya. Ganti dengan kegiatan alternatif berkarakter lain, seperti Pramuka, ekstrakurikuler kesenian, atau pembiasaan budaya sekolah.
- Identifikasi masalah prioritas berdasarkan kelemahan rapor pendidikan (skor rendah, kategori kurang, trend turun).
- Anda harus memberikan nilai skala prioritas 1-3 untuk Tingkat Prioritas dan Tingkat Urgensi, di mana angka 3 adalah yang paling urgent (paling penting/darurat), 2 sedang, dan 1 rendah.
- Jumlah adalah penjumlahan dari Tingkat Prioritas dan Tingkat Urgensi (Tingkat Prioritas + Tingkat Urgensi).
- Berikan Alasan logis mengapa permasalahan tersebut dipilih dan mengapa diberi bobot prioritas serta urgensi tersebut.
- Kolom wajib: no, snp, indikatorId, indikatorLabel, akarMasalahId, akarMasalahLabel, tingkatPrioritas, tingkatUrgensi, jumlah, alasan.

OUTPUT JSON:
{
  "ringkasan": "Paragraf analisis umum kondisi mutu sekolah...",
  "prioritas": [
    { "no": 1, "snp": "Standar Kelulusan", "indikatorId": "A.1", "indikatorLabel": "Kemampuan Literasi", "akarMasalahId": "A.1.1", "akarMasalahLabel": "Kompetensi membaca teks informasi", "tingkatPrioritas": 3, "tingkatUrgensi": 2, "jumlah": 5, "alasan": "Skor literasi termasuk rendah dan perlu penanganan segera..." }
  ]
}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      ringkasan: { type: Type.STRING },
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
      }
    },
    required: ['ringkasan', 'prioritas']
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

    const responseText = response.text || '';
    console.log('[SNP Tahap 1 - Prioritas] Response length:', responseText.length);
    const result = parseAIResponse(responseText);
    if (!result || !result.prioritas) {
      return { success: false, error: 'Tahap 1 (Prioritas): AI tidak mengembalikan format JSON yang valid.', rawText: responseText };
    }
    return { success: true, data: { ringkasan: result.ringkasan || '', prioritas: result.prioritas } };
  } catch (error: any) {
    console.error('SNP Tahap 1 Error:', error);
    return { success: false, error: `Tahap 1 (Prioritas) gagal: ${error.message}` };
  }
};

// ─── Tahap 2: RKT (Rencana Kerja Tahunan) ────────────────────────────────────

const analyzeSnpRkt = async (
  _indicators: RaporIndicator[],
  targetYear: string,
  prioritasData: any[],
  ctx: ReturnType<typeof buildSnpContext>
): Promise<{ success: boolean; data?: { rkt: any[] }; error?: string; rawText?: string }> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: 'API Key belum dikonfigurasi.' };

  const prioritasContext = prioritasData.map(p =>
    `- [No.${p.no}] SNP: ${p.snp} | Indikator: [${p.indikatorId}] ${p.indikatorLabel} | Akar Masalah: [${p.akarMasalahId}] ${p.akarMasalahLabel} | Prioritas: ${p.tingkatPrioritas}, Urgensi: ${p.tingkatUrgensi}, Jumlah: ${p.jumlah}`
  ).join('\n');

  const prompt = `Anda adalah Pakar Evaluasi Diri Sekolah (EDS) dan Analis Standar Nasional Pendidikan (SNP) Indonesia.

Target Tahun Anggaran: ${targetYear}
Tahun Rapor (data): ${ctx.prevYear}

DATA SKOR INDIKATOR RAPOR PENDIDIKAN:
${ctx.indicatorsText}

=============================================
HASIL IDENTIFIKASI PRIORITAS MASALAH (dari tahap sebelumnya):
=============================================
${prioritasContext}

=============================================
TUGAS: BUATKAN RENCANA KERJA TAHUNAN (RKT)
=============================================
- Hubungkan/petakan langsung RKT ini dengan ${prioritasData.length} Prioritas Masalah di atas. Jumlah baris RKT HARUS SAMA PERSIS dengan jumlah prioritas masalah (${prioritasData.length} baris).
- Setiap baris RKT harus memetakan ke satu prioritas masalah yang telah diidentifikasi.
- PENTING (P5 DITIADAKAN): Program P5 (Projek Penguatan Profil Pelajar Pancasila) ditiadakan. Jangan menyarankan program P5. Ganti dengan Pramuka, ekstrakurikuler kesenian, atau pembiasaan budaya sekolah.
- RKT harus menganalisis apakah kegiatan tersebut membutuhkan anggaran atau tidak (butuhBiaya = true / false).
- Kolom wajib: no, snp, indikatorId, indikatorLabel, akarMasalahId, akarMasalahLabel, kegiatanBenahi, penjelasanImplementasi, butuhBiaya, kodeArkas, kegiatanArkas, estimasiBiaya.
- Jika butuhBiaya = false, maka kodeArkas diisi string kosong "", kegiatanArkas diisi padanan kegiatannya (atau nama kegiatan non-ARKAS), dan estimasiBiaya diisi 0.
- Jika butuhBiaya = true, kodeArkas diisi kode kegiatan ARKAS (e.g. "04.05.14", "05.02.02", "03.03", "06.05.06") yang relevan, kegiatanArkas diisi padanan nama kegiatan belanja ARKAS, dan estimasiBiaya diisi estimasi nominalnya.

OUTPUT JSON:
{
  "rkt": [
    { "no": 1, "snp": "Standar Kelulusan", "indikatorId": "A.1", "indikatorLabel": "Kemampuan Literasi", "akarMasalahId": "A.1.1", "akarMasalahLabel": "Kompetensi membaca teks informasi", "kegiatanBenahi": "Pelatihan strategi literasi...", "penjelasanImplementasi": "Guru mendapat pelatihan metode membaca aktif...", "butuhBiaya": true, "kodeArkas": "04.05.14", "kegiatanArkas": "Peningkatan Kompetensi Guru", "estimasiBiaya": 5000000 }
  ]
}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
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
      }
    },
    required: ['rkt']
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

    const responseText = response.text || '';
    console.log('[SNP Tahap 2 - RKT] Response length:', responseText.length);
    const result = parseAIResponse(responseText);
    if (!result || !result.rkt) {
      return { success: false, error: 'Tahap 2 (RKT): AI tidak mengembalikan format JSON yang valid.', rawText: responseText };
    }
    return { success: true, data: { rkt: result.rkt } };
  } catch (error: any) {
    console.error('SNP Tahap 2 Error:', error);
    return { success: false, error: `Tahap 2 (RKT) gagal: ${error.message}` };
  }
};

// ─── Tahap 3: RKAS (Rencana Kegiatan dan Anggaran Sekolah) ────────────────────

const analyzeSnpRkas = async (
  _indicators: RaporIndicator[],
  targetYear: string,
  rktData: any[],
  ctx: ReturnType<typeof buildSnpContext>
): Promise<{ success: boolean; data?: { rkas: any[] }; error?: string; rawText?: string }> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: 'API Key belum dikonfigurasi.' };

  // Filter only RKT items that need budget (butuhBiaya = true)
  const rktBerbiaya = rktData.filter(r => r.butuhBiaya === true && r.estimasiBiaya > 0);

  if (rktBerbiaya.length === 0) {
    // No budget items, return empty RKAS
    return { success: true, data: { rkas: [] } };
  }

  const rktContext = rktBerbiaya.map((r) =>
    `- [No.${r.no}] SNP: ${r.snp} | Kegiatan: ${r.kegiatanBenahi} | Penjelasan: ${r.penjelasanImplementasi} | Kode ARKAS: ${r.kodeArkas} | Kegiatan ARKAS: ${r.kegiatanArkas} | Estimasi: Rp${r.estimasiBiaya.toLocaleString('id-ID')}`
  ).join('\n');

  const prompt = `Anda adalah Pakar Evaluasi Diri Sekolah (EDS) dan Analis Standar Nasional Pendidikan (SNP) Indonesia.

Target Tahun Anggaran: ${targetYear}

=============================================
DAFTAR KEGIATAN RKT YANG MEMBUTUHKAN BIAYA (dari tahap sebelumnya):
=============================================
${rktContext}

=============================================
TUGAS: BUATKAN RKAS (Rencana Kegiatan dan Anggaran Sekolah)
=============================================
- Rincikan SETIAP kegiatan RKT berbiaya di atas menjadi rincian barang/jasa spesifik (lembar kerja rancangan ARKAS).
- Jumlah baris RKAS = jumlah kegiatan RKT berbiaya di atas (${rktBerbiaya.length} baris).
- Kolom utama: no, snp, kegiatanBenahi, penjelasanImplementasi, kodeArkas, kegiatanArkas, totalBiaya.
- Setiap kegiatan harus memiliki array "items" berisi detail barang/jasa yang akan dibelanjakan:
  - uraian (Uraian Kegiatan ARKAS, e.g. "Pembelian ATK", "Honor Narasumber")
  - bulan (Bulan Dianggarkan, e.g. "Agustus", "Maret")
  - volume (Jumlah barang/jasa, e.g. 10, 5)
  - satuan (e.g. "rim", "paket", "eks", "OJ")
  - hargaSatuan (nominal per unit)
  - jumlah (Total biaya = volume x hargaSatuan)
  - sumberAnggaran (e.g. "BOSP")
  - kodeRekening (Gunakan HANYA kode rekening resmi dari daftar di bawah)
- Gunakan HANYA kode rekening dari daftar berikut:
${ctx.accountContext}
- Harga harus REALISTIS untuk sekolah SD di Indonesia (contoh: ATK ~Rp50.000-500.000, Honor Narasumber ~Rp300.000-500.000/OJ, Konsumsi ~Rp25.000-50.000/orang).

OUTPUT JSON:
{
  "rkas": [
    {
      "no": 1,
      "snp": "Standar Kelulusan",
      "kegiatanBenahi": "Pelatihan strategi literasi...",
      "penjelasanImplementasi": "Guru mendapat pelatihan metode membaca aktif...",
      "kodeArkas": "04.05.14",
      "kegiatanArkas": "Peningkatan Kompetensi Guru",
      "totalBiaya": 5000000,
      "items": [
        { "uraian": "Honor Narasumber", "bulan": "Agustus", "volume": 6, "satuan": "OJ", "hargaSatuan": 500000, "jumlah": 3000000, "sumberAnggaran": "BOSP", "kodeRekening": "5.1.02.02.01.0003" },
        { "uraian": "Konsumsi Peserta", "bulan": "Agustus", "volume": 20, "satuan": "orang", "hargaSatuan": 50000, "jumlah": 1000000, "sumberAnggaran": "BOSP", "kodeRekening": "5.1.02.01.01.0053" }
      ]
    }
  ]
}`;

  const schema = {
    type: Type.OBJECT,
    properties: {
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
    required: ['rkas']
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

    const responseText = response.text || '';
    console.log('[SNP Tahap 3 - RKAS] Response length:', responseText.length);
    const result = parseAIResponse(responseText);
    if (!result || !result.rkas) {
      return { success: false, error: 'Tahap 3 (RKAS): AI tidak mengembalikan format JSON yang valid.', rawText: responseText };
    }
    return { success: true, data: { rkas: result.rkas } };
  } catch (error: any) {
    console.error('SNP Tahap 3 Error:', error);
    return { success: false, error: `Tahap 3 (RKAS) gagal: ${error.message}` };
  }
};

// ─── Orchestrator: analyzeRaporSnp (3 tahap berurutan) ────────────────────────

export const analyzeRaporSnp = async (
  indicators: RaporIndicator[],
  targetYear: string,
  onProgress?: SnpProgressCallback
): Promise<{ success: boolean; data?: SnpAnalysisData; error?: string; rawText?: string }> => {
  const ai = getAiInstance();
  if (!ai) return { success: false, error: 'API Key belum dikonfigurasi di Settings.' };

  const ctx = buildSnpContext(indicators, targetYear);

  // ═══ TAHAP 1: Prioritas Masalah + Ringkasan ═══
  onProgress?.(1, 3, 'Mengidentifikasi Prioritas Masalah...');
  console.log('[SNP] Memulai Tahap 1: Prioritas Masalah + Ringkasan');
  const step1 = await analyzeSnpPrioritas(indicators, targetYear, ctx);
  if (!step1.success || !step1.data) {
    return {
      success: false,
      error: step1.error || 'Tahap 1 (Prioritas) gagal.',
      rawText: step1.rawText
    };
  }
  console.log(`[SNP] Tahap 1 selesai: ${step1.data.prioritas.length} prioritas masalah ditemukan.`);

  // ═══ TAHAP 2: RKT ═══
  onProgress?.(2, 3, 'Menyusun Rencana Kerja Tahunan (RKT)...');
  console.log('[SNP] Memulai Tahap 2: RKT');
  const step2 = await analyzeSnpRkt(indicators, targetYear, step1.data.prioritas, ctx);
  if (!step2.success || !step2.data) {
    return {
      success: false,
      error: step2.error || 'Tahap 2 (RKT) gagal.',
      rawText: step2.rawText
    };
  }
  console.log(`[SNP] Tahap 2 selesai: ${step2.data.rkt.length} kegiatan RKT.`);

  // ═══ TAHAP 3: RKAS ═══
  onProgress?.(3, 3, 'Merincikan Anggaran RKAS...');
  console.log('[SNP] Memulai Tahap 3: RKAS');
  const step3 = await analyzeSnpRkas(indicators, targetYear, step2.data.rkt, ctx);
  if (!step3.success || !step3.data) {
    return {
      success: false,
      error: step3.error || 'Tahap 3 (RKAS) gagal.',
      rawText: step3.rawText
    };
  }
  console.log(`[SNP] Tahap 3 selesai: ${step3.data.rkas.length} paket kegiatan RKAS.`);

  // ═══ Gabungkan Semua Hasil ═══
  const analysis: SnpAnalysisData = {
    year: targetYear,
    generatedAt: new Date().toISOString(),
    ringkasan: step1.data.ringkasan,
    rapor: ctx.raporData,
    prioritas: step1.data.prioritas,
    rkt: step2.data.rkt,
    rkas: step3.data.rkas
  };

  // Debug log combined result
  if (typeof window !== 'undefined') {
    const combinedText = JSON.stringify(analysis, null, 2);
    localStorage.setItem('LAST_RAW_SNP_RESPONSE', combinedText);
    fetch('http://localhost:5174/', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: combinedText
    }).catch(err => console.warn('Failed to send debug log:', err));
  }

  return { success: true, data: analysis };
};