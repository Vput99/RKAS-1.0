
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
  // --- 5.1.02.01 BELANJA BARANG PAKAI HABIS ---
  '5.1.02.01.01.0002': 'Belanja Perangko, Materai Dan Benda Pos Lainnya',
  '5.1.02.01.01.0004': 'Belanja Bahan-Bahan Bakar dan Pelumas',
  '5.1.02.01.01.0008': 'Belanja Pengisian Tabung Gas',
  '5.1.02.01.01.0012': 'Belanja Bahan/Bibit Tanaman',
  '5.1.02.01.01.0014': 'Belanja Perlengkapan Kebersihan dan Bahan Pembersih',
  '5.1.02.01.01.0016': 'Belanja Bahan Praktek Sekolah/Laboratorium',
  '5.1.02.01.01.0024': 'Belanja Alat Tulis Kantor (ATK)',
  '5.1.02.01.01.0025': 'Belanja Kertas dan Cover',
  '5.1.02.01.01.0026': 'Belanja Bahan Cetak (Fotocopy/Cetak/Penggandaan)',
  '5.1.02.01.01.0027': 'Belanja Benda Pos (Materai)',
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
  
  // --- 5.1.02.02 BELANJA JASA ---
  '5.1.02.02.01.0003': 'Belanja Jasa Narasumber/Instruktur/Pembicara',
  '5.1.02.02.01.0006': 'Belanja Jasa Tenaga Kerja (Tukang/Kebersihan/Keamanan)',
  '5.1.02.02.01.0011': 'Belanja Jasa Kebersihan Kantor',
  '5.1.02.02.01.0013': 'Belanja Jasa Tenaga Pendidikan (Guru Honorer BOS)',
  '5.1.02.02.01.0014': 'Belanja Jasa Tenaga Kependidikan (Tendik/Admin)',
  '5.1.02.02.01.0016': 'Belanja Jasa Keamanan Kantor',
  '5.1.02.02.01.0026': 'Belanja Jasa Publikasi/Iklan',
  '5.1.02.02.01.0029': 'Belanja Jasa Pengiriman Surat/Barang',
  '5.1.02.02.01.0030': 'Belanja Langganan Jurnal/Surat Kabar/Majalah',
  '5.1.02.02.01.0049': 'Belanja Jasa Pembuatan Website/Aplikasi',
  '5.1.02.02.01.0061': 'Belanja Tagihan Listrik (PLN)',
  '5.1.02.02.01.0062': 'Belanja Tagihan Telepon',
  '5.1.02.02.01.0063': 'Belanja Tagihan Air (PDAM)',
  '5.1.02.02.01.0064': 'Belanja Paket/Voucher Internet (Wifi)',
  '5.1.02.02.01.0067': 'Belanja Kawat/Faksimili/Internet/TV Kabel',
  '5.1.02.02.04.0004': 'Belanja Sewa Peralatan dan Mesin (Sound System, Genset)',
  '5.1.02.02.05.0033': 'Belanja Sewa Tenda/Kursi/Perlengkapan Pesta',

  // --- 5.1.02.03 BELANJA PEMELIHARAAN ---
  '5.1.02.03.02.0111': 'Belanja Pemeliharaan Gedung dan Bangunan (Ringan)',
  '5.1.02.03.02.0120': 'Belanja Pemeliharaan Peralatan dan Mesin (AC/Elektronik)',
  '5.1.02.03.02.0121': 'Belanja Pemeliharaan Alat Angkutan',
  '5.1.02.03.02.0401': 'Belanja Pemeliharaan Alat Kantor dan Rumah Tangga',
  '5.1.02.03.02.0405': 'Belanja Pemeliharaan Komputer/Laptop/Printer',

  // --- 5.1.02.04 BELANJA PERJALANAN DINAS ---
  '5.1.02.04.01.0001': 'Belanja Perjalanan Dinas Dalam Daerah',
  '5.1.02.04.01.0003': 'Belanja Perjalanan Dinas Dalam Kota',
  '5.1.02.04.01.0004': 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
  '5.1.02.04.01.0005': 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',

  // --- 5.2.02 BELANJA MODAL (ASET) ---
  '5.2.02.05.01.0004': 'Belanja Modal Alat Pendingin (AC, Kipas Angin)',
  '5.2.02.05.01.0005': 'Belanja Modal Alat Kantor Lainnya (Mesin Tik, Penghancur Kertas)',
  '5.2.02.05.02.0001': 'Belanja Modal Meja dan Kursi Kerja/Murid',
  '5.2.02.05.02.0004': 'Belanja Modal Lemari/Brankas/Filing Cabinet',
  '5.2.02.05.02.0006': 'Belanja Modal Rak/Locker',
  '5.2.02.06.01.0000': 'Belanja Modal Alat Rumah Tangga (Sapu, Pel, Ember - Jika Aset)',
  '5.2.02.08.01.0005': 'Belanja Modal Peralatan Laboratorium (Mikroskop, Alat Peraga)',
  '5.2.02.10.01.0002': 'Belanja Modal Komputer Unit (PC)',
  '5.2.02.10.02.0003': 'Belanja Modal Laptop/Notebook',
  '5.2.02.10.02.0004': 'Belanja Modal Printer/Scanner',
  '5.2.02.10.02.0005': 'Belanja Modal Proyektor (Infocus)/Layar',
  '5.2.02.10.02.0006': 'Belanja Modal Peralatan Jaringan (Router, Switch)',
  '5.2.02.13.01.0001': 'Belanja Modal Buku Umum/Pelajaran/Perpustakaan',
  '5.2.02.13.01.0010': 'Belanja Modal Barang Bercorak Kesenian/Kebudayaan (Alat Musik)',
  '5.2.02.13.01.0012': 'Belanja Modal Alat Olahraga',
  '5.2.02.18.01.0003': 'Belanja Modal Software/Aplikasi',

  // --- 5.2.03 BELANJA MODAL GEDUNG & BANGUNAN ---
  '5.2.03.01.01.0001': 'Belanja Modal Bangunan Gedung Sekolah (Renovasi Berat/Penambahan Ruang)',
} as const;

export interface EvidenceFile {
  type: string; // e.g., "Kuitansi", "Foto", "Daftar Hadir"
  url: string;
  path: string;
  name: string;
}

export interface RealizationDetail {
  month: number; // Bulan pelaporan (kapan diinput)
  target_month?: number; // Bulan peruntukan (untuk bulan apa)
  amount: number;
  quantity?: number; // Volume realisasi
  date: string; // Tanggal Kuitansi/SPJ
  vendor?: string; // Nama Toko / Vendor / Penyedia (SIPLah)
  vendor_account?: string; // Nomor Rekening Penerima
  evidence_file?: string; // Deprecated: Nama file bukti fisik tunggal
  evidence_files?: EvidenceFile[]; // List of multiple evidence files
  notes?: string; // Keterangan tambahan (misal: "Bayar Tunggakan Januari")
}

export interface TransferDetail {
  name: string;
  account: string;
  ppn: number;
  pph21: number;
  pph22: number;
  pph23: number;
  pajakDaerah: number;
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
  
  // Transfer & Pajak Info
  transfer_details?: TransferDetail;

  date: string;
  bosp_component: BOSPComponent | string; 
  category: SNPStandard | string;
  account_code?: string; 
  realization_months?: number[]; // Bulan rencana
  month_quantities?: Record<string, number>; // Per-month quantities, keyed by month number
  status: 'draft' | 'approved' | 'rejected';
  is_bosp_eligible?: boolean; 
  warning_message?: string; 
  ai_analysis_logic?: string; // New: AI analysis result rationale
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
  
  // Address Details
  city?: string;
  district?: string;
  postalCode?: string;

  // Bank Info
  bankName?: string;
  bankBranch?: string;
  bankAddress?: string;
  accountNo?: string;

  // Header Image
  headerImage?: string; // Base64
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  itemCount: number;
}

export interface RaporIndicator {
    id: string;
    label: string;
    score: number;
    category: 'Baik' | 'Sedang' | 'Kurang';
}

export interface PBDBudgetItem {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    accountCode: string; // Specific code for this item
}

export interface PBDRecommendation {
    indicatorId: string;
    activityName: string;
    title: string; // Added title property
    description: string;
    
    // Parent classification
    bospComponent: string;
    snpStandard: string;
    
    // Aggregated Data
    estimatedCost: number;
    priority: 'Tinggi' | 'Sedang' | 'Rendah';

    // Detailed Breakdown
    items: PBDBudgetItem[];

    // NEW: AI Analysis Feedback
    analysisSteps?: string[]; // Steps to improve score
    componentAnalysis?: string; // Qualitative analysis of the component score
}

export interface WithdrawalHistory {
    id: string;
    created_at: string;
    letter_number: string;
    letter_date: string;
    bank_name: string;
    bank_branch: string;
    total_amount: number;
    item_count: number;
    snapshot_data: any; // Contains recipients, ids, personnel names
    notes?: string;
    file_url?: string;
    file_path?: string;
}

export type LetterType = 'ekstrakurikuler' | 'tukang';

export interface PaymentScheduleItem {
    month: string;
    amount: number;
    description: string;
}

export interface LetterAgreement {
    id: string;
    created_at?: string;
    user_id?: string;

    // Jenis Surat
    type: LetterType;
    status: 'draft' | 'final';

    // Nomor & Tanggal
    letter_number: string;
    letter_date: string;
    fiscal_year: string;

    // Data Sekolah (Pihak Pertama)
    school_name: string;
    school_address: string;
    headmaster: string;
    headmaster_nip: string;

    // Data Pihak Kedua (Tenaga / Tukang)
    party_name: string;
    party_address: string;
    party_nik: string;
    party_npwp?: string;

    // Detail Pekerjaan / Kegiatan
    activity_description: string;  // Nama kegiatan ekskul / jenis pekerjaan rehab
    activity_location?: string;    // Lokasi pekerjaan (untuk tukang)
    start_date: string;
    end_date: string;

    // Keuangan
    total_amount: number;
    payment_schedule?: PaymentScheduleItem[];

    // Khusus Ekskul
    schedule_description?: string;  // Jadwal kegiatan ekskul (misal: Sabtu 08.00-10.00)
    student_count?: number;         // Jumlah siswa

    // Khusus Tukang
    work_volume?: string;           // Volume pekerjaan (misal: 20 m²)
    rab_total?: number;             // RAB Total material
    work_guarantee?: string;        // Jaminan pekerjaan (misal: 6 bulan)

    notes?: string;
}

// ─── Daftar Penerimaan Honorarium Ekstra Kurikuler ───────────────────────────

export interface HonorRow {
    no: number;
    nama: string;
    jabatan: string;
    gol: string;
    satuan: string;         // misal: "Jam/bulan"
    jam: number;            // jumlah jam
    jumlah: number;         // honor bruto (jam × satuan harga)
    potongan_pph: number;   // PPh Pasal 21
    penerimaan: number;     // jumlah - potongan
}

export interface HonorariumDaftar {
    id: string;
    created_at?: string;
    user_id?: string;

    // Header surat
    kode_rekening: string;
    no_bukti: string;
    kegiatan_name: string;    // Nama kegiatan ekskul
    bulan: string;            // Nama bulan
    tahun: string;            // Tahun anggaran

    // Data sekolah
    school_name: string;
    school_address: string;
    city: string;             // Kota (untuk TTD)
    tanggal_ttd: string;      // Tanggal surat

    // TTD
    kepala_sekolah: string;
    kepala_sekolah_nip: string;
    bendahara: string;
    bendahara_nip: string;

    // Daftar penerima
    rows: HonorRow[];
}

// ─── Daftar Penerimaan Upah Tukang ───────────────────────────────────────────

export interface UpahTukangRow {
    no: number;
    nama: string;
    kedudukan: string;      // Mandor / Tukang / Kuli, dll.
    gol: string;
    hari: number;           // Jumlah hari kerja
    tarif: number;          // Tarif per hari (Rp)
    honorarium: number;     // hari × tarif (auto-hitung)
    potongan_pph: number;   // PPh Pasal 21
    penerimaan: number;     // honorarium − potongan
}

export interface UpahTukangDaftar {
    id: string;
    created_at?: string;
    user_id?: string;

    // Header
    kode_rekening: string;
    no_bukti: string;
    kegiatan_name: string;   // KEGIATAN PEMELIHARAAN ...
    tahun: string;

    // Data sekolah / TTD
    school_name: string;
    school_address: string;
    city: string;
    tanggal_ttd: string;

    kepala_sekolah: string;
    kepala_sekolah_nip: string;
    bendahara: string;
    bendahara_nip: string;

    // Daftar penerima
    rows: UpahTukangRow[];
}

// ─── Daftar Presensi (Roolstaat) Tukang ───────────────────────────────────────────

export interface RoolstaatRow {
    no: number;
    nama: string;
    pekerjaan: string;
    kehadiran: boolean[];   // Array of length 31 for days 1-31
    hari_kerja: number;
    upah_per_hari: number;
    upah_total: number;
    keterangan: string;
}

export interface RoolstaatDaftar {
    id: string;
    created_at?: string;
    user_id?: string;

    kegiatan_name: string;
    bulan: string;
    tahun: string;

    school_name: string;
    school_address: string;
    city: string;
    tanggal_ttd: string;

    kepala_sekolah: string;
    kepala_sekolah_nip: string;

    rows: RoolstaatRow[];
}

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




