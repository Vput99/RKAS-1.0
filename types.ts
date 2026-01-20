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

export const AccountCodes = {
  // 5.1.02 BELANJA BARANG DAN JASA
  '5.1.02.01.01.0002': 'Belanja Perangko, Materai Dan Benda Pos Lainnya',
  '5.1.02.01.01.0004': 'Belanja Bahan-Bahan Bakar dan Pelumas',
  '5.1.02.01.01.0012': 'Belanja Bahan/Bibit Tanaman',
  '5.1.02.01.01.0024': 'Belanja Alat Tulis Kantor (ATK)',
  '5.1.02.01.01.0025': 'Belanja Kertas dan Cover',
  '5.1.02.01.01.0026': 'Belanja Bahan Cetak',
  '5.1.02.01.01.0027': 'Belanja Benda Pos',
  '5.1.02.01.01.0029': 'Belanja Peralatan Kebersihan dan Bahan Pembersih',
  '5.1.02.01.01.0030': 'Belanja Alat Listrik dan Elektronik (Lampu, Kabel, dll)',
  '5.1.02.01.01.0031': 'Belanja Pengisian Tabung Gas',
  '5.1.02.01.01.0035': 'Belanja Spanduk/Banner/Baliho',
  '5.1.02.01.01.0036': 'Belanja Dokumentasi/Foto/Video',
  '5.1.02.01.01.0039': 'Belanja Konsumsi Rapat (Makan/Minum)',
  '5.1.02.01.01.0052': 'Belanja Makanan dan Minuman Harian Pegawai/Guru',
  '5.1.02.01.01.0064': 'Belanja Obat-Obatan (UKS)',
  
  // JASA
  '5.1.02.02.01.0003': 'Belanja Jasa Narasumber/Instruktur/Pembicara',
  '5.1.02.02.01.0006': 'Belanja Jasa Tenaga Kerja (Tukang/Kebersihan)',
  '5.1.02.02.01.0013': 'Belanja Honorarium Guru Honorer (BOS)',
  '5.1.02.02.01.0014': 'Belanja Honorarium Tenaga Kependidikan (Tendik)',
  '5.1.02.02.01.0026': 'Belanja Jasa Publikasi/Iklan',
  '5.1.02.02.01.0030': 'Belanja Langganan Jurnal/Surat Kabar/Majalah',
  '5.1.02.02.01.0061': 'Belanja Tagihan Listrik',
  '5.1.02.02.01.0062': 'Belanja Tagihan Telepon',
  '5.1.02.02.01.0063': 'Belanja Tagihan Air (PDAM)',
  '5.1.02.02.01.0067': 'Belanja Tagihan Internet/Wifi',
  
  // PEMELIHARAAN
  '5.1.02.03.02.0111': 'Belanja Pemeliharaan Gedung dan Bangunan',
  '5.1.02.03.02.0120': 'Belanja Pemeliharaan Peralatan dan Mesin (Komputer/Printer)',
  '5.1.02.03.02.0401': 'Belanja Pemeliharaan Alat Angkutan',

  // PERJALANAN DINAS
  '5.1.02.02.04.0011': 'Belanja Perjalanan Dinas Dalam Kota',
  '5.1.02.02.04.0012': 'Belanja Perjalanan Dinas Luar Kota',

  // 5.2.02 BELANJA MODAL (ASET)
  '5.2.02.05.01.0005': 'Belanja Modal Alat Kantor Lainnya (Kipas Angin, AC, dll)',
  '5.2.02.05.02.0001': 'Belanja Modal Meja dan Kursi',
  '5.2.02.05.02.0006': 'Belanja Modal Lemari/Brankas',
  '5.2.02.08.01.0005': 'Belanja Modal Peralatan Laboratorium',
  '5.2.02.10.01.0002': 'Belanja Modal Komputer Unit (PC)',
  '5.2.02.10.02.0003': 'Belanja Modal Laptop/Notebook',
  '5.2.02.10.02.0004': 'Belanja Modal Printer/Scanner',
  '5.2.02.10.02.0005': 'Belanja Modal Proyektor (Infocus)',
  '5.2.02.13.01.0001': 'Belanja Modal Buku Umum/Perpustakaan',
  '5.2.03.01.01.0001': 'Belanja Modal Bangunan Gedung Sekolah (Renovasi Berat)',
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