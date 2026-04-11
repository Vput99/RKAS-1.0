import { Users, Coffee, Wrench, Bus, ShoppingBag, Receipt } from 'lucide-react';

export const getTerbilang = (nilai: number): string => {
  const angka = Math.abs(nilai);
  const baca = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let terbilang = "";

  if (angka < 12) terbilang = " " + baca[angka];
  else if (angka < 20) terbilang = getTerbilang(angka - 10) + " Belas";
  else if (angka < 100) terbilang = getTerbilang(Math.floor(angka / 10)) + " Puluh " + getTerbilang(angka % 10);
  else if (angka < 200) terbilang = " Seratus " + getTerbilang(angka - 100);
  else if (angka < 1000) terbilang = getTerbilang(Math.floor(angka / 100)) + " Ratus " + getTerbilang(angka % 100);
  else if (angka < 2000) terbilang = " Seribu " + getTerbilang(angka - 1000);
  else if (angka < 1000000) terbilang = getTerbilang(Math.floor(angka / 1000)) + " Ribu " + getTerbilang(angka % 1000);
  else if (angka < 1000000000) terbilang = getTerbilang(Math.floor(angka / 1000000)) + " Juta" + getTerbilang(angka % 1000000);

  return terbilang.trim() + " Rupiah";
};
export const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const getEvidenceList = (description: string, accountCode?: string): string[] => {
  const text = (description + ' ' + (accountCode || '')).toLowerCase();
  const accCode = accountCode || '';

  // Belanja Listrik, Air, Internet, Telepon, Wifi, Sampah, Retribusi, Iuran, Pajak, Retribusi Sampah (PRIORITY LAJU PERTAMA MENGHINDARI 5.1 MATCH)
  if (text.includes('listrik') || text.includes('retribusi') || text.includes('sampah') || text.includes('retribusi sampah') || text.includes('air') || text.includes('internet') || text.includes('telepon') || text.includes('wifi') || text.includes('iuran') || text.includes('pajak')) {
    return [
      "Bukti Pembayaran Kuitansi / Struk Resmi",
    ];
  }

  // Honor/Gaji (Jasa - Non SIPLah)
  if (text.includes('honor') || text.includes('gaji') || text.includes('jasa narasumber') || text.includes('instruktur') || text.includes('pembina') || accCode.startsWith('5.1.') || text.includes('jasa profesi')) {
    return [
      "SK Penetapan / Surat Tugas dari Kepala Sekolah (Tahun Anggaran Berjalan)",
      "Daftar Hadir / Absensi Rekapitulasi Pokok",
      "Daftar Tanda Terima Honorarium (Bruto, Pajak, Netto)",
      "Bukti Transfer Bank ke Rekening Penerima (Prioritas CMS/Non-Tunai)",
      "Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)",
      "Fotokopi KTP & NPWP Penerima Jasa",
      "Foto Kegiatan"
    ];
  }

  // Jasa Servis/Pemeliharaan (Non-SIPLah untuk Jasa, SIPLah untuk Material)
  if (text.includes('pemeliharaan') || text.includes('servis') || text.includes('perbaikan') || text.includes('tukang') || text.includes('rehab') || text.includes('jasa servis')) {
    return [
      "Surat Perintah Kerja (SPK) Pihak Ketiga / Tukang",
      "RAB (Rincian Anggaran Biaya) Pekerjaan",
      "Nota Belanja Bahan Material (Wajib SIPLah jika nilai belanja material barang mencukupi)",
      "Kuitansi Pembayaran Upah Tukang / Jasa Servis",
      "Daftar Hadir Tukang / Pekerja",
      "Berita Acara Penyelesaian Pekerjaan & BAST Manual",
      "Bukti Setor PPh 21 (Upah Tukang Perorangan) atau PPh 23 (Jasa Badan Usaha)",
      "Foto Dokumentasi Pekerjaan Fisik (0%, 50%, 100%)"
    ];
  }

  if (
    accCode.startsWith('5.2.2') || accCode.startsWith('5.2.3') || accCode.startsWith('5.2.02') ||
    text.includes('atk') || text.includes('bahan') || text.includes('alat') ||
    text.includes('kertas') || text.includes('kebersihan') || text.includes('spanduk') ||
    text.includes('cetak') || text.includes('penggandaan') ||
    text.includes('modal') || text.includes('buku') || text.includes('laptop') ||
    text.includes('komputer') || text.includes('printer') || text.includes('meja') ||
    text.includes('kursi') || text.includes('aset') || text.includes('elektronik') ||
    text.includes('belanja') || text.includes('siplah')
  ) {
    return [
      "Dokumen Cetak Pesanan (PO) Digital dari SIPLah",
      "Invoice / Faktur Penjualan Definitif (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Berita Acara Pemeriksaan Barang (Oleh Tim Pemeriksa Sekolah)",
      "Bukti Transfer ke Virtual Account Marketplace SIPLah",
      "Bukti Pajak (Otomatis dari SIPLah / Manual jika Perlu)",
      "Foto Dokumentasi Barang Terkirim (Fisik di Sekolah)",
      "Fotokopi Pencatatan di Buku Persediaan / KIB",
      "Kuitansi Manual Sekolah (Sebagai Pendukung)"
    ];
  }

  if (text.includes('makan') || text.includes('minum') || text.includes('konsumsi') || text.includes('rapat') || text.includes('snack')) {
    return [
      "Surat Undangan & Daftar Hadir Kegiatan",
      "Notulen / Laporan Hasil Kegiatan",
      "Dokumen SIPLah (Diutamakan memesan Katering/Penyedia UMKM via SIPLah)",
      "Nota / Bon Pembelian Konsumsi (Rincian Menu Jelas - Jika Terpaksa Non-SIPLah)",
      "Kuitansi Pembayaran (Bermaterai jika nilai riil > Rp 5 Juta)",
      "Bukti Setor PPh 23 (Jasa Katering) atau Pajak Daerah (PB1 10%)",
      "Foto Dokumentasi Kegiatan (Open Camera)"
    ];
  }

  if (text.includes('perjalanan') || text.includes('dinas') || text.includes('transport') || text.includes('sppd')) {
    return [
      "Surat Undangan",
      "Surat Tugas",
      "SPPD (Surat Perintah Perjalanan Dinas)",
      "Laporan Hasil Perjalanan Dinas (Tuntas)",
      "Bukti Transfer Bank ke Rekening Penerima (Prioritas CMS/Non-Tunai)",
      "Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)",
      "Foto Kegiatan"
    ];
  }

  if ((text.includes('listrik') && !text.includes('alat')) || text.includes('air') || text.includes('internet') || text.includes('langganan') || text.includes('telepon') || text.includes('wifi')) {
    return [
      "Bukti Pembayaran (Minimal 1, Maksimal 3 Bukti)"
    ];
  }

  if (text.includes('sampah') || text.includes('retribusi') || text.includes('iuran') || text.includes('pajak')) {
    return [
      "Kuitansi / Bukti Pembayaran Resmi dari Instansi Terkait",
      "Foto Dokumentasi (Opsional)",
      "Buku Kas Umum (Pencatatan)"
    ];
  }

  return [
    "Dokumen SIPLah (Wajib untuk semua Rekening Belanja Barang & Modal sesuai Aturan BOSP 2026)",
    "Invoice, BAST, dan Bukti Pesanan",
    "Bukti Pembayaran Non-Tunai / Prioritas CMS Bank",
    "Bukti Setor Pajak (Oleh Marketplace SIPLah atau Mandiri untuk Jasa)",
    "Dokumentasi Foto Fisik/Kegiatan",
    "Kuitansi / Nota Sederhana (Hanya Transaksi Pengecualian/Manual)"
  ];
};

export const TEMPLATE_CATEGORIES = [
  {
    id: 'atk',
    title: 'Belanja Barang SIPLah (Akun 5.2.2)',
    icon: ShoppingBag,
    color: 'text-red-600',
    bg: 'bg-red-50',
    description: 'Aturan BOSP 2026: Semua Rekening Belanja Barang & Modal wajib melalui SIPLah. Hindari pembelian tunai/offline jika item tersedia di SIPLah.',
    requirements: [
      'Dokumen Cetak Pesanan (PO) Digital SIPLah',
      'Invoice / Faktur Penjualan SIPLah',
      'Berita Acara Serah Terima (BAST) Sistem SIPLah',
      'Berita Acara Pemeriksaan Barang (Panitia Sekolah)',
      'Bukti Transfer VA Marketplace (SIPLah)',
      'Bukti Pungut Pajak oleh SIPLah (Bukti Potong PPh/PPN)',
      'Foto Barang Diterima',
      'Kuitansi Manual (KHUSUS untuk transaksi pengecualian < Rp 1 Jt / Toko belum masuk SIPLah)'
    ]
  },
  {
    id: 'honor',
    title: 'Honorarium & Jasa Non-SIPLah',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Rekening Jasa (Honorarium Ekstra, PTK, Jasa Narasumber, Jasa Servis) umumnya Non-SIPLah menggunakan bukti fisik/manual.',
    requirements: [
      'SK Penetapan / Surat Tugas dari Kepala Sekolah',
      'Surat Perjanjian Kerja (SPK) Konvensional',
      'Daftar Hadir Kegiatan / Absensi Bulanan',
      'Laporan Hasil Pekerjaan / Jurnal Mengajar',
      'Daftar Tanda Terima Honorarium (Bruto, Pajak, Netto)',
      'Bukti Transfer Non-Tunai ke Rekening Penerima',
      'Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)',
      'Fotokopi KTP & NPWP Penerima'
    ]
  },
  {
    id: 'mamin',
    title: 'Konsumsi (Rapat/Tamu/Kegiatan)',
    icon: Coffee,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'BOSP 2026: Diutamakan menggunakan jasa UMKM Katering yang terdaftar di SIPLah, atau menggunakan bukti Bon manual jika terpaksa.',
    requirements: [
      'Surat Undangan & Daftar Hadir Rapat',
      'Notulen / Ringkasan Hasil Rapat',
      'Foto Dokumentasi Kegiatan Rapat',
      'Dokumen Pembelian SIPLah (SPK, BAST, Invoice dari Katering SIPLah)',
      'Nota/Bon Makan Asli (Jika Non-SIPLah, Rincian harus lengkap)',
      'Kuitansi Sekolah (Ditandatangani KS & Bendahara)',
      'Bukti Setor Pajak Daerah (PB1 10%) atau PPh 23 Jasa Katering'
    ]
  },
  {
    id: 'peradin',
    title: 'Perjalanan Dinas (Transport)',
    icon: Bus,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Transportasi untuk tugas luar sekolah tidak dapat melalui SIPLah. Diwajibkan melengkapi dokumen perjalanan aktual.',
    requirements: [
      'Surat Tugas Ditandatangani Kepala Sekolah',
      'Surat Perintah Perjalanan Dinas (SPPD) + Stempel Tujuan',
      'Laporan Hasil Perjalanan Dinas (Dilampirkan Materi jika ada)',
      'Daftar Penerimaan Uang Transport / Lumpsum',
      'Tiket Angkutan Riil (Pesawat/KA/Bus) atau Boarding Pass',
      'Nota BBM (Jika Menggunakan Kendaraan Pribadi)',
      'Daftar Perekapan Pengeluaran Riil (Lampiran Juknis BOSP)'
    ]
  },
  {
    id: 'jasa',
    title: 'Pemeliharaan & Rehab Tipe Jasa',
    icon: Wrench,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Gabungan SIPLah & Non-SIPLah: Pembelian Material Bangunan melalui SIPLah, pembayaran Upah Tukang secara Non-SIPLah manual.',
    requirements: [
      'RAB Pekerjaan Pemeliharaan / Rehab Sederhana',
      'Invoice SIPLah & BAST (Untuk Belanja Material / Cat / Bahan)',
      'Surat Perintah Kerja (SPK) untuk Jasa Pekerja/Tukang',
      'Daftar Hadir Pekerja',
      'Kuitansi Upah Tukang / Pekerja Berbasis Hari',
      'Berita Acara Penyelesaian Pekerjaan',
      'Bukti Setor PPh 21 Upah Tukang (Harian/Borongan)',
      'Foto Dokumentasi Bertahap (Sebalum, Sedang, Selesai)'
    ]
  },
  {
    id: 'tagihan',
    title: 'Pembayaran Tagihan Pihak Ketiga',
    icon: Receipt,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    description: 'Pencairan dana untuk operasional bulanan seperti Listrik, Air, Internet, Telepon, hingga Retribusi Sampah/Pajak.',
    requirements: [
      'Bukti Pembayaran Kuitansi / Struk Resmi dari Penyedia (PLN/PDAM/Telkom dll)',
      'Invoice / Tagihan Resmi (Jika Ada)',
      'Buku Kas Umum (Pencatatan)'
    ]
  }
];

