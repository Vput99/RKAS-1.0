
import { Type } from "@google/genai";
import { InventoryItem } from "../../types";
import { getAiInstance, getAiModel, parseAIResponse } from "./core";

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
        accountCode: { type: Type.STRING },
        date: { type: Type.STRING },
        vendor: { type: Type.STRING },
        docNumber: { type: Type.STRING },
        category: { type: Type.STRING },
        lastYearBalance: { type: Type.NUMBER },
        usedQuantity: { type: Type.NUMBER }
      }
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
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Inventory Analysis Error:", error);
    return [];
  }
};
