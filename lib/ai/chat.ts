
import { getAiInstance, getAiModel } from "./core";

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
      contents: [{ parts }]
    });
    return response.text;
  } catch (e) {
    console.error("Chat Error:", e);
    return "Maaf, terjadi gangguan saat menganalisis permintaan Anda. Coba lagi nanti.";
  }
};
