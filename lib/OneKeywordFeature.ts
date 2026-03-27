import { callLiteLLM } from './ai-service';

/**
 * Simulasi Fitur '1 Kata Kunci'
 * 
 * Flow:
 * 1. User input: "realisasikan honor Tenaga Ekstrakurikuler Pramuka"
 * 2. Logic: Send to Groq-Llama3 via LiteLLM
 * 3. Result: Parsed action and data for ARKAS realization
 */

export const simulateOneKeyword = async (userInput: string) => {
  console.log('--- Memulai Simulasi Satu Kata Kunci ---');
  console.log('User Input:', userInput);

  const systemInstructions = `
  Anda adalah asisten Senior ARKAS Smart SPJ.
  Tugas: Konversi perintah bahasa manusia menjadi langkah teknis realisasi BOSP.
  
  Format Output:
  1. Nama Kegiatan: (Mencocokkan SNP)
  2. Kode Rekening: (Misal: 5.1.02.02.01.0029)
  3. Aksi: (Realisasi/Input/Hapus)
  4. Analisis Singkat: (Penjelasan mengapa memilih kode tersebut)
  `;

  try {
    const aiResponse = await callLiteLLM('groq-llama3', [
      { role: 'system', content: systemInstructions },
      { role: 'user', content: userInput }
    ]);

    console.log('AI Response from Groq:');
    console.log(aiResponse);

    return {
      success: true,
      data: aiResponse
    };
  } catch (error) {
    console.error('Simulation Failed:', error);
    return {
      success: false,
      error: 'Gagal menghubungi LiteLLM Proxy.'
    };
  }
};

// Auto-test for the requested keyword
export const runRequestedDemo = async () => {
  const result = await simulateOneKeyword('realisasikan honor Tenaga Ekstrakurikuler Pramuka');
  return result;
};
