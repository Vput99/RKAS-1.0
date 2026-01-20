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

export interface Budget {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string;
  category: SNPStandard | string;
  status: 'draft' | 'approved' | 'rejected';
  notes?: string;
  created_at?: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  itemCount: number;
}
