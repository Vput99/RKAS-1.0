export enum TransactionType {
  INCOME = 'pendapatan',
  EXPENSE = 'belanja',
}

export enum SNPStandard {
  LULUSAN = '1. Pengembangan Kompetensi Lulusan',
  ISI = '2. Pengembangan Standar Isi',
  PROSES = '3. Pengembangan Standar Proses',
  PTK = '4. Pengembangan Pendidik dan Tenaga Kependidikan',
  SARPRAS = '5. Pengembangan Sarana dan Prasarana',
  PENGELOLAAN = '6. Pengembangan Standar Pengelolaan',
  PEMBIAYAAN = '7. Pengembangan Standar Pembiayaan',
  PENILAIAN = '8. Pengembangan dan Implementasi Sistem Penilaian',
  LAINNYA = 'Lainnya'
}

export enum BOSPComponent {
  PPDB = '1. Penerimaan Peserta Didik Baru',
  PERPUSTAKAAN = '2. Pengembangan Perpustakaan',
  PEMBELAJARAN = '3. Kegiatan Pembelajaran & Ekstrakurikuler',
  ASESMEN = '4. Asesmen & Evaluasi Pembelajaran',
  ADMINISTRASI = '5. Administrasi Kegiatan Sekolah',
  PROFESI_GURU = '6. Pengembangan Profesi Guru & Tendik',
  LANGGANAN = '7. Langganan Daya dan Jasa',
  SARPRAS = '8. Pemeliharaan Sarana & Prasarana',
  MULTIMEDIA = '9. Penyediaan Alat Multimedia Pembelajaran',
  LAINNYA = 'Lainnya / Non-BOSP'
}

export interface Budget {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  bosp_component: BOSPComponent | string; // New field for Juknis compliance
  category: SNPStandard | string;
  status: 'draft' | 'approved' | 'rejected';
  is_bosp_eligible?: boolean; // AI validation flag
  warning_message?: string; // AI warning for prohibited items
  notes?: string;
  created_at?: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  itemCount: number;
}
