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
  LAINNYA = 'Lainnya'
}

export const AccountCodes = {
  // --- 5.1.02 BELANJA BARANG DAN JASA ---

  // 5.1.02.01 Belanja Barang Pakai Habis
  '5.1.02.01.01.0002': 'Belanja Perangko, Materai Dan Benda Pos Lainnya',
  '5.1.02.01.01.0004': 'Belanja Bahan-Bahan Bakar dan Pelumas',
  '5.1.02.01.01.0012': 'Belanja Bahan/Bibit Tanaman',
  '5.1.02.01.01.0024': 'Belanja Alat Tulis Kantor (ATK)',
  '5.1.02.01.01.0025': 'Belanja Kertas dan Cover',
  '5.1.02.01.01.0026': 'Belanja Bahan Cetak (Fotocopy/Cetak)',
  '5.1.02.01.01.0027': 'Belanja Benda Pos',
  '5.1.02.01.01.0029': 'Belanja Peralatan Kebersihan dan Bahan Pembersih',
  '5.1.02.01.01.0030': 'Belanja Alat Listrik dan Elektronik (Lampu, Kabel, Baterai)',
  '5.1.02.01.01.0031': 'Belanja Pengisian Tabung Gas',
  '5.1.02.01.01.0032': 'Belanja Perlengkapan Medis/Obat-obatan (UKS)',
  '5.1.02.01.01.0034': 'Belanja Perlengkapan Olahraga (Pakai Habis)',
  '5.1.02.01.01.0035': 'Belanja Spanduk/Banner/Baliho/Umbul-umbul',
  '5.1.02.01.01.0036': 'Belanja Dokumentasi/Foto/Video',
  '5.1.02.01.01.0037': 'Belanja Dekorasi',
  '5.1.02.01.01.0039': 'Belanja Konsumsi Rapat (Makan/Minum)',
  '5.1.02.01.01.0044': 'Belanja Pakan Ternak/Ikan',
  '5.1.02.01.01.0052': 'Belanja Makanan dan Minuman Harian Pegawai/Guru',
  '5.1.02.01.01.0053': 'Belanja Makanan dan Minuman Peserta Kegiatan',
  '5.1.02.01.01.0055': 'Belanja Pakaian Dinas/Seragam/Atribut',
  '5.1.02.01.01.0063': 'Belanja Perlengkapan Pendukung Kegiatan Pendidikan',
  '5.1.02.01.01.0064': 'Belanja Obat-Obatan (UKS)',
  
  // 5.1.02.02 Belanja Jasa Kantor & Honorarium
  '5.1.02.02.01.0003': 'Belanja Jasa Narasumber/Instruktur/Pembicara',
  '5.1.02.02.01.0006': 'Belanja Jasa Tenaga Kerja (Tukang/Kebersihan/Keamanan)',
  '5.1.02.02.01.0011': 'Belanja Jasa Kebersihan Kantor',
  '5.1.02.02.01.0013': 'Belanja Honorarium Guru Honorer (BOS)',
  '5.1.02.02.01.0014': 'Belanja Honorarium Tenaga Kependidikan (Tendik)',
  '5.1.02.02.01.0026': 'Belanja Jasa Publikasi/Iklan',
  '5.1.02.02.01.0029': 'Belanja Jasa Pengiriman Surat/Barang',
  '5.1.02.02.01.0030': 'Belanja Langganan Jurnal/Surat Kabar/Majalah',
  '5.1.02.02.01.0049': 'Belanja Jasa Pembuatan Website/Aplikasi',
  '5.1.02.02.01.0061': 'Belanja Tagihan Listrik',
  '5.1.02.02.01.0062': 'Belanja Tagihan Telepon',
  '5.1.02.02.01.0063': 'Belanja Tagihan Air (PDAM)',
  '5.1.02.02.01.0067': 'Belanja Tagihan Internet/Wifi',

  // 5.1.02.02 Belanja Sewa
  '5.1.02.02.05.0004': 'Belanja Sewa Peralatan dan Mesin (Sound System, Genset, dll)',
  '5.1.02.02.05.0033': 'Belanja Sewa Tenda/Kursi/Perlengkapan Pesta',

  // 5.1.02.03 Belanja Pemeliharaan (Jasa Service & Material Ringan)
  '5.1.02.03.02.0111': 'Belanja Pemeliharaan Gedung dan Bangunan (Ringan)',
  '5.1.02.03.02.0120': 'Belanja Pemeliharaan Peralatan dan Mesin (Komputer/Printer)',
  '5.1.02.03.02.0121': 'Belanja Pemeliharaan Alat Angkutan',
  '5.1.02.03.02.0401': 'Belanja Pemeliharaan Alat Kantor dan Rumah Tangga',

  // 5.1.02.04 Belanja Perjalanan Dinas
  '5.1.02.04.01.0001': 'Belanja Perjalanan Dinas Dalam Daerah',
  '5.1.02.04.01.0003': 'Belanja Perjalanan Dinas Dalam Kota',
  '5.1.02.04.01.0004': 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
  '5.1.02.04.01.0005': 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',

  // --- 5.2.02 BELANJA MODAL (ASET) ---
  
  // 5.2.02.05 Belanja Modal Peralatan dan Mesin
  '5.2.02.05.01.0004': 'Belanja Modal Alat Pendingin (AC, Kipas Angin)',
  '5.2.02.05.01.0005': 'Belanja Modal Alat Kantor Lainnya (Mesin Tik, Penghancur Kertas)',
  '5.2.02.05.02.0001': 'Belanja Modal Meja dan Kursi Kerja/Murid',
  '5.2.02.05.02.0004': 'Belanja Modal Lemari/Brankas/Filing Cabinet',
  '5.2.02.05.02.0006': 'Belanja Modal Rak/Locker',
  '5.2.02.06.01.0000': 'Belanja Modal Alat Rumah Tangga (Sapu, Pel, Ember - Jika Aset)',
  '5.2.02.08.01.0005': 'Belanja Modal Peralatan Laboratorium (Mikroskop, Alat Peraga)',
  
  // 5.2.02.10 Belanja Modal Komputer
  '5.2.02.10.01.0002': 'Belanja Modal Komputer Unit (PC)',
  '5.2.02.10.02.0003': 'Belanja Modal Laptop/Notebook',
  '5.2.02.10.02.0004': 'Belanja Modal Printer/Scanner',
  '5.2.02.10.02.0005': 'Belanja Modal Proyektor (Infocus)/Layar',
  '5.2.02.10.02.0006': 'Belanja Modal Peralatan Jaringan (Router, Switch)',

  // 5.2.02.13 Belanja Modal Aset Tetap Lainnya
  '5.2.02.13.01.0001': 'Belanja Modal Buku Umum/Pelajaran/Perpustakaan',
  '5.2.02.13.01.0010': 'Belanja Modal Barang Bercorak Kesenian/Kebudayaan (Alat Musik)',
  '5.2.02.13.01.0012': 'Belanja Modal Alat Olahraga',

  // 5.2.03 Belanja Modal Gedung dan Bangunan (Renovasi Berat)
  '5.2.03.01.01.0001': 'Belanja Modal Bangunan Gedung Sekolah (Renovasi Berat/Penambahan Ruang)',
} as const;

export interface RealizationDetail {
  month: number;
  amount: number;
  date: string; // Tanggal Kuitansi/SPJ
  evidence_file?: string; // Nama file bukti fisik
}

export interface Budget {
  id: string;
  type: TransactionType;
  description: string;
  
  // Rincian Anggaran (Perencanaan)
  quantity?: number; 
  unit?: string;     
  unit_price?: number; 
  amount: number;    // Pagu Anggaran Total (Nominal)
  
  // Rincian Realisasi (SPJ) - Updated to Array
  realizations?: RealizationDetail[];
  
  date: string;
  bosp_component: BOSPComponent | string; 
  category: SNPStandard | string;
  account_code?: string; 
  realization_months?: number[]; // Bulan rencana
  status: 'draft' | 'approved' | 'rejected';
  is_bosp_eligible?: boolean; 
  warning_message?: string; 
  notes?: string;
  created_at?: string;
}

export interface BankStatement {
  id: string;
  month: number;
  year: number;
  closing_balance: number; // Saldo Akhir di Rekening Koran
  file_name?: string; // Nama file display
  file_url?: string; // URL Publik dari Supabase Storage
  file_path?: string; // Path di Storage (bucket/filename)
  notes?: string;
  updated_at?: string;
}

export interface SchoolProfile {
  name: string;
  npsn: string;
  address: string;
  headmaster: string;
  headmasterNip: string;
  treasurer: string;
  treasurerNip: string;
  fiscalYear: string;
  studentCount: number;
  budgetCeiling: number; // Pagu Anggaran Total
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  itemCount: number;
}