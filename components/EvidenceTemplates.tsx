
import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, ChevronRight, BookOpen, Printer, Users, Coffee, Wrench, Bus, ShoppingBag, FileSignature, Handshake, ClipboardList, Receipt, Truck, FileCheck, HardHat, Hammer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TEMPLATE_CATEGORIES = [
  {
    id: 'honor',
    title: 'Honorarium (Ekstra/GTT/PTT)',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    description: 'Untuk pembayaran jasa narasumber, pelatih ekstrakurikuler, guru honorer, dan tenaga kependidikan.',
    requirements: [
      'SK Penetapan / Surat Tugas dari Kepala Sekolah',
      'Surat Perjanjian Kerjasama (SPK) / MOU',
      'Daftar Hadir Kegiatan / Absensi Bulanan',
      'Daftar Tanda Terima Honorarium (Bruto, Pajak, Netto)',
      'Bukti Transfer (CMS/Struk ATM) atau Kuitansi Tunai',
      'Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)',
      'Fotokopi KTP & NPWP Penerima',
      'Laporan Pelaksanaan Tugas / Jurnal Kegiatan'
    ]
  },
  {
    id: 'mamin',
    title: 'Makan & Minum (Rapat/Tamu)',
    icon: Coffee,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    description: 'Konsumsi untuk rapat sekolah, tamu dinas, atau kegiatan siswa.',
    requirements: [
      'Surat Undangan Rapat',
      'Daftar Hadir Peserta Rapat',
      'Notulen / Laporan Hasil Rapat',
      'Foto Dokumentasi Kegiatan (Open Camera)',
      'Nota / Bon Pembelian (Rincian Menu Jelas)',
      'Kuitansi Sekolah (Bermaterai jika > 5 Juta)',
      'Bukti Setor Pajak Daerah (PB1 10%) atau PPh 23 (Jasa Katering)'
    ]
  },
  {
    id: 'peradin',
    title: 'Perjalanan Dinas',
    icon: Bus,
    color: 'text-green-600',
    bg: 'bg-green-50',
    description: 'Transportasi dan akomodasi untuk tugas luar sekolah (KKKS, Pelatihan, Lomba).',
    requirements: [
      'Surat Tugas (Ditandatangani KS)',
      'SPPD (Surat Perintah Perjalanan Dinas) - Cap Instansi Tujuan',
      'Laporan Hasil Perjalanan Dinas',
      'Tiket / Bukti Transportasi Riil',
      'Nota BBM (Jika kendaraan pribadi/sewa)',
      'Kuitansi / Bill Hotel (Jika Menginap)',
      'Daftar Pengeluaran Riil (Format Lampiran Juknis)'
    ]
  },
  {
    id: 'jasa',
    title: 'Jasa Tukang / Servis / Sewa',
    icon: Wrench,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    description: 'Pemeliharaan ringan, servis elektronik, atau sewa peralatan.',
    requirements: [
      'Surat Perintah Kerja (SPK) Sederhana',
      'Daftar Hadir Pekerja / Tukang',
      'Daftar Penerimaan Upah Kerja',
      'Nota Pembelian Bahan Material (Toko Bangunan)',
      'Kuitansi Upah Tukang / Jasa Servis',
      'Berita Acara Penyelesaian Pekerjaan & Serah Terima',
      'Bukti Setor PPh 21 (Upah Tukang) atau PPh 23 (Servis/Sewa)',
      'Foto Dokumentasi (0%, 50%, 100%)'
    ]
  },
  {
    id: 'atk',
    title: 'Belanja Barang Tunai (Non-SIPLah)',
    icon: ShoppingBag,
    color: 'text-red-600',
    bg: 'bg-red-50',
    description: 'Pembelian ATK/Bahan mendesak di toko kelontong/offline (Nilai Kecil).',
    requirements: [
      'Nota Kontan dari Toko (Asli)',
      'Kuitansi Sekolah',
      'Faktur Pajak (Jika Toko PKP)',
      'Berita Acara Serah Terima Barang (Internal)',
      'Berita Acara Pemeriksaan Barang',
      'Foto Barang'
    ]
  }
];

const EvidenceTemplates = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // --- PDF GENERATORS ---

  const generateKuitansi = () => {
    const doc = new jsPDF('l', 'mm', 'a5'); // Landscape A5
    
    // Border
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 128);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('KUITANSI PEMBAYARAN', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Tahun Anggaran : 2026', 150, 35);
    doc.text('No. Bukti : .....................', 150, 40);
    doc.text('Mata Anggaran : .....................', 150, 45);

    const startY = 55;
    const gap = 10;
    
    doc.text('Sudah Terima Dari', 20, startY);
    doc.text(':', 60, startY);
    doc.text('Bendahara BOS SD ..............................................................', 65, startY);
    
    doc.text('Uang Sejumlah', 20, startY + gap);
    doc.text(':', 60, startY + gap);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Rp ............................................................................................', 65, startY + gap);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Untuk Pembayaran', 20, startY + (gap*2));
    doc.text(':', 60, startY + (gap*2));
    doc.text('....................................................................................................', 65, startY + (gap*2));
    doc.text('....................................................................................................', 65, startY + (gap*2) + 6);

    doc.text('Terbilang', 20, startY + (gap*4));
    doc.text(':', 60, startY + (gap*4));
    doc.setFont('helvetica', 'bold');
    doc.text('# ............................................................................................... #', 65, startY + (gap*4));

    // Signatures
    const signY = 110;
    doc.setFont('helvetica', 'normal');
    doc.text('Setuju Dibayar,', 30, signY, { align: 'center' });
    doc.text('Kepala Sekolah', 30, signY + 5, { align: 'center' });
    
    doc.text('Lunas Dibayar,', 105, signY, { align: 'center' });
    doc.text('Bendahara', 105, signY + 5, { align: 'center' });

    doc.text('................., ...................... 2026', 170, signY - 5, { align: 'center' });
    doc.text('Yang Menerima,', 170, signY, { align: 'center' });

    // Lines for names
    doc.line(15, signY + 25, 45, signY + 25);
    doc.line(90, signY + 25, 120, signY + 25);
    doc.line(155, signY + 25, 185, signY + 25);

    doc.save('Template_Kuitansi_Kosong.pdf');
  };

  const generateDaftarHadir = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR HADIR KEGIATAN', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nama Kegiatan : ....................................................................', 20, 35);
    doc.text('Hari / Tanggal  : ....................................................................', 20, 42);
    doc.text('Tempat             : ....................................................................', 20, 49);

    autoTable(doc, {
        startY: 55,
        head: [['No', 'Nama Lengkap', 'Jabatan / Unsur', 'Tanda Tangan']],
        body: [
            ['1', '', '', '1...........'],
            ['2', '', '', '...........2'],
            ['3', '', '', '3...........'],
            ['4', '', '', '...........4'],
            ['5', '', '', '5...........'],
            ['6', '', '', '...........6'],
            ['7', '', '', '7...........'],
            ['8', '', '', '...........8'],
            ['9', '', '', '9...........'],
            ['10', '', '', '...........10'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', minCellHeight: 10 },
            1: { cellWidth: 70 },
            2: { cellWidth: 50 },
            3: { cellWidth: 50 }
        },
        styles: { minCellHeight: 12, valign: 'middle' }
    });

    doc.save('Template_Daftar_Hadir.pdf');
  };

  const generateTandaTerimaHonor = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR TANDA TERIMA HONORARIUM', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('KEGIATAN EKSTRAKURIKULER / JASA', 105, 25, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text('Bulan : ........................... 2026', 105, 32, { align: 'center' });

    autoTable(doc, {
        startY: 40,
        head: [['No', 'Nama Penerima', 'Uraian Tugas', 'Nominal (Rp)', 'PPh 21', 'Diterima (Rp)', 'Tanda Tangan']],
        body: [
            ['1', '', 'Pelatih Ekstra ...', '', '', '', '1...........'],
            ['2', '', 'Narasumber ...', '', '', '', '...........2'],
            ['3', '', '........................', '', '', '', '3...........'],
            ['4', '', '........................', '', '', '', '...........4'],
            ['5', '', '........................', '', '', '', '5...........'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, halign: 'center', fontSize: 9 },
        styles: { minCellHeight: 12, valign: 'middle', fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.text('Mengetahui,', 20, finalY);
    doc.text('Lunas Dibayar,', 140, finalY);
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Bendahara', 140, finalY + 5);
    
    doc.text('( ................................. )', 20, finalY + 25);
    doc.text('( ................................. )', 140, finalY + 25);

    doc.save('Template_Tanda_Terima_Honor.pdf');
  };

  const generateAbsensiTukang = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('DAFTAR HADIR PEKERJA / TUKANG', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    // Project details above columns as requested
    doc.text('Jenis Pekerjaan / Proyek : ....................................................................................', 20, 35);
    doc.text('Lokasi                                : SD Negeri ...................................................', 20, 42);
    doc.text('Minggu Ke / Bulan            : ........................... / ........................... 2026', 20, 49);

    autoTable(doc, {
        startY: 55,
        head: [['No', 'Nama Pekerja', 'Jabatan', 'H 1', 'H 2', 'H 3', 'H 4', 'H 5', 'H 6', 'Ket']],
        body: [
            ['1', '', 'Tukang', '', '', '', '', '', '', ''],
            ['2', '', 'Pekerja', '', '', '', '', '', '', ''],
            ['3', '', 'Pekerja', '', '', '', '', '', '', ''],
            ['4', '', '.........', '', '', '', '', '', '', ''],
            ['5', '', '.........', '', '', '', '', '', '', ''],
        ],
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100], halign: 'center' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            2: { cellWidth: 25 },
            3: { cellWidth: 15 }, 4: { cellWidth: 15 }, 5: { cellWidth: 15 },
            6: { cellWidth: 15 }, 7: { cellWidth: 15 }, 8: { cellWidth: 15 }
        },
        styles: { minCellHeight: 10, valign: 'middle' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Mengetahui,', 20, finalY);
    doc.text('...................., ...................... 2026', 140, finalY - 5);
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Koordinator Pekerja', 140, finalY + 5);
    
    doc.text('( ................................. )', 20, finalY + 25);
    doc.text('( ................................. )', 140, finalY + 25);

    doc.save('Daftar_Hadir_Tukang.pdf');
  };

  const generateUpahTukang = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('DAFTAR PENERIMAAN UPAH KERJA', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Jenis Pekerjaan : ........................................................................................', 20, 35);
    doc.text('Sumber Dana    : BOSP Tahun Anggaran 2026', 20, 42);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Nama Pekerja', 'Status', 'Jml Hari', 'Upah Harian (Rp)', 'Jumlah Terima (Rp)', 'Tanda Tangan']],
        body: [
            ['1', '', 'Tukang', '', '', '', '1...........'],
            ['2', '', 'Pekerja', '', '', '', '...........2'],
            ['3', '', 'Pekerja', '', '', '', '3...........'],
            ['4', '', '.........', '', '', '', '...........4'],
            ['5', '', '.........', '', '', '', '5...........'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [50, 150, 200], halign: 'center', fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { minCellHeight: 12, valign: 'middle' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Setuju Dibayar,', 20, finalY);
    doc.text('Lunas Dibayar,', 140, finalY);
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Bendahara', 140, finalY + 5);
    
    doc.text('( ................................. )', 20, finalY + 25);
    doc.text('( ................................. )', 140, finalY + 25);

    doc.save('Daftar_Penerimaan_Upah.pdf');
  };

  const generateSPKKonstruksi = () => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = margin + 15;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERINTAH KERJA (SPK)', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Nomor: 027 / ......... / ......... / 2026', 105, currentY, { align: 'center' });
    
    currentY += 15;
    doc.text('Yang bertanda tangan di bawah ini:', margin, currentY);
    currentY += 8;

    const labelX = margin + 5; const valX = margin + 40;
    doc.text('Nama', labelX, currentY); doc.text(': .................................................', valX, currentY); currentY += 6;
    doc.text('Jabatan', labelX, currentY); doc.text(': Kepala Sekolah (Pihak Pertama)', valX, currentY); currentY += 10;

    doc.text('Memberikan perintah kerja kepada:', margin, currentY); currentY += 8;
    doc.text('Nama', labelX, currentY); doc.text(': .................................................', valX, currentY); currentY += 6;
    doc.text('Pekerjaan', labelX, currentY); doc.text(': Tukang / Penyedia Jasa (Pihak Kedua)', valX, currentY); currentY += 6;
    doc.text('Alamat', labelX, currentY); doc.text(': .................................................', valX, currentY); currentY += 12;

    doc.text('Untuk melaksanakan pekerjaan dengan ketentuan sebagai berikut:', margin, currentY); currentY += 8;
    
    const printPasal = (title: string, content: string) => {
        doc.setFont('times', 'bold');
        doc.text(title, margin, currentY);
        currentY += 5;
        doc.setFont('times', 'normal');
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin, currentY);
        currentY += (lines.length * 5) + 3;
    }

    printPasal('1. Jenis Pekerjaan', 'Rehabilitasi ringan / Perbaikan ............................................................ di lingkungan SD Negeri ......................................');
    printPasal('2. Waktu Pelaksanaan', 'Pekerjaan dilaksanakan selama ...... hari kalender, mulai tanggal ..................... sampai dengan .....................');
    printPasal('3. Biaya Pekerjaan', 'Total biaya upah kerja disepakati sebesar Rp .................... (belum termasuk pajak). Pembayaran dilakukan setelah pekerjaan selesai 100% dan diterima baik oleh Pihak Pertama.');
    printPasal('4. Ketentuan Lain', 'Bahan material disediakan oleh Pihak Pertama. Pihak Kedua wajib bekerja sesuai spesifikasi dan menjaga kebersihan lingkungan kerja.');

    currentY += 5;
    doc.text('Demikian Surat Perintah Kerja ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', margin, currentY);

    currentY += 20;
    doc.text('....................., ...................... 2026', 140, currentY, { align: 'center' });
    
    const leftSignX = 40;
    const rightSignX = 150;

    doc.text('Pihak Kedua (Pelaksana)', leftSignX, currentY + 6, { align: 'center' });
    doc.text('Pihak Pertama (Kepala Sekolah)', rightSignX, currentY + 6, { align: 'center' });
    
    doc.text('Materai 10.000', leftSignX, currentY + 20, { align: 'center' });

    doc.setFont('times', 'bold underline');
    doc.text('( ..................................... )', leftSignX, currentY + 35, { align: 'center' });
    doc.text('( ..................................... )', rightSignX, currentY + 35, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.text('NIP. ..................................', rightSignX, currentY + 40, { align: 'center' });

    doc.save('SPK_Pekerjaan_Fisik.pdf');
  };

  const generateSK = () => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH KABUPATEN .......................', 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text('SD NEGERI .......................', 105, margin + 12, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Alamat: Jl. ......................................................................', 105, margin + 18, { align: 'center' });
    doc.line(margin, margin + 22, 190, margin + 22);

    // Judul SK
    const titleY = margin + 35;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('KEPUTUSAN KEPALA SEKOLAH DASAR NEGERI ............', 105, titleY, { align: 'center' });
    doc.text('NOMOR : 800 / ..... / ..... / 2026', 105, titleY + 6, { align: 'center' });
    doc.text('TENTANG', 105, titleY + 14, { align: 'center' });
    doc.text('PENETAPAN ................................................................', 105, titleY + 20, { align: 'center' });
    doc.text('TAHUN PELAJARAN 2025/2026', 105, titleY + 26, { align: 'center' });

    // Konsideran
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let currentY = titleY + 40;
    
    const labelX = margin;
    const colonX = margin + 28;
    const contentX = margin + 32;
    const splitWidth = 135;

    doc.text('Menimbang', labelX, currentY);
    doc.text(':', colonX, currentY);
    const menimbang = 'a.  Bahwa untuk memperlancar kegiatan ...................................................... di SD Negeri .............., maka dipandang perlu menetapkan petugas/pelaksana kegiatan;\n' +
                      'b.  Bahwa mereka yang namanya tercantum dalam lampiran keputusan ini dianggap cakap dan mampu melaksanakan tugas tersebut;\n' +
                      'c.  Bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan b, perlu menetapkan Keputusan Kepala Sekolah.';
    const splitMenimbang = doc.splitTextToSize(menimbang, splitWidth);
    doc.text(splitMenimbang, contentX, currentY);
    
    currentY += (splitMenimbang.length * 5) + 5;

    doc.text('Mengingat', labelX, currentY);
    doc.text(':', colonX, currentY);
    const mengingat = '1.  Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;\n' +
                      '2.  Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 63 Tahun 2022 tentang Juknis BOSP;\n' +
                      '3.  RKAS SD Negeri .................... Tahun Anggaran 2026.';
    const splitMengingat = doc.splitTextToSize(mengingat, splitWidth);
    doc.text(splitMengingat, contentX, currentY);

    currentY += (splitMengingat.length * 5) + 10;

    // Memutuskan
    doc.setFont('times', 'bold');
    doc.text('MEMUTUSKAN', 105, currentY, { align: 'center' });
    currentY += 8;

    doc.setFont('times', 'normal');
    doc.text('Menetapkan', labelX, currentY);
    doc.text(':', colonX, currentY);
    
    doc.text('KESATU', labelX, currentY + 10);
    doc.text(':', colonX, currentY + 10);
    const satu = 'Menetapkan nama-nama yang tercantum dalam lampiran surat keputusan ini sebagai ................................................................';
    doc.text(doc.splitTextToSize(satu, splitWidth), contentX, currentY + 10);

    doc.text('KEDUA', labelX, currentY + 25);
    doc.text(':', colonX, currentY + 25);
    const dua = 'Segala biaya yang timbul akibat keputusan ini dibebankan pada Anggaran Dana BOSP Tahun 2026.';
    doc.text(doc.splitTextToSize(dua, splitWidth), contentX, currentY + 25);

    doc.text('KETIGA', labelX, currentY + 40);
    doc.text(':', colonX, currentY + 40);
    const tiga = 'Keputusan ini mulai berlaku sejak tanggal ditetapkan.';
    doc.text(doc.splitTextToSize(tiga, splitWidth), contentX, currentY + 40);

    // TTD
    const ttdY = currentY + 60;
    doc.text('Ditetapkan di : ...........................', 130, ttdY);
    doc.text('Pada Tanggal  : ...........................', 130, ttdY + 6);
    doc.text('Kepala Sekolah,', 130, ttdY + 16);
    doc.setFont('times', 'bold');
    doc.text('( ........................................... )', 130, ttdY + 40);
    doc.setFont('times', 'normal');
    doc.text('NIP. ....................................', 130, ttdY + 45);

    doc.save('Template_SK_Penetapan.pdf');
  };

  // MOU KHUSUS TENAGA EKSTRAKURIKULER
  const generateMOUHonor = () => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = margin + 15;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERJANJIAN KERJASAMA', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.text('TENAGA KEGIATAN EKSTRAKURIKULER', 105, currentY, { align: 'center' });
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('NOMOR: 421.2 / ......... / ......... / 2026', 105, currentY, { align: 'center' });
    
    currentY += 15;
    
    const intro = 'Pada hari ini .............. tanggal ............ bulan ............... tahun Dua Ribu Dua Puluh Enam, kami yang bertanda tangan di bawah ini:';
    doc.text(doc.splitTextToSize(intro, 170), margin, currentY);
    
    currentY += 12;
    
    const labelX = margin;
    const colonX = margin + 30;
    const valueX = margin + 35;

    // PIHAK PERTAMA
    doc.setFont('times', 'bold');
    doc.text('I. PIHAK PERTAMA', labelX, currentY);
    currentY += 6;
    doc.setFont('times', 'normal');
    
    doc.text('Nama', labelX, currentY); doc.text(':', colonX, currentY); doc.text('............................................................', valueX, currentY); currentY += 6;
    doc.text('NIP', labelX, currentY); doc.text(':', colonX, currentY); doc.text('............................................................', valueX, currentY); currentY += 6;
    doc.text('Jabatan', labelX, currentY); doc.text(':', colonX, currentY); doc.text('Kepala Sekolah SD Negeri ...........................', valueX, currentY); currentY += 6;
    doc.text('Bertindak untuk dan atas nama Sekolah, selanjutnya disebut PIHAK PERTAMA.', margin, currentY + 2);

    currentY += 12;

    // PIHAK KEDUA
    doc.setFont('times', 'bold');
    doc.text('II. PIHAK KEDUA', labelX, currentY);
    currentY += 6;
    doc.setFont('times', 'normal');

    doc.text('Nama', labelX, currentY); doc.text(':', colonX, currentY); doc.text('............................................................', valueX, currentY); currentY += 6;
    doc.text('NIK', labelX, currentY); doc.text(':', colonX, currentY); doc.text('............................................................', valueX, currentY); currentY += 6;
    doc.text('Bidang Tugas', labelX, currentY); doc.text(':', colonX, currentY); doc.text('Pembina Ekstrakurikuler ...........................', valueX, currentY); currentY += 6;
    doc.text('Bertindak atas nama pribadi, selanjutnya disebut PIHAK KEDUA.', margin, currentY + 2);

    currentY += 12;
    const bridge = 'Sepakat mengadakan perjanjian kerjasama dengan ketentuan sebagai berikut:';
    doc.text(bridge, margin, currentY);

    // PASAL
    const printPasal = (num: string, title: string, content: string) => {
        currentY += 8;
        if (currentY > 260) { doc.addPage(); currentY = margin; }
        
        doc.setFont('times', 'bold');
        doc.text(`PASAL ${num}: ${title.toUpperCase()}`, margin, currentY);
        currentY += 5;
        
        doc.setFont('times', 'normal');
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin, currentY);
        currentY += (lines.length * 5);
    };

    printPasal('1', 'Tugas', 'Pihak Pertama memberikan tugas kepada Pihak Kedua sebagai Pembina/Pelatih Ekstrakurikuler ........................................ untuk melatih siswa sesuai jadwal yang telah ditentukan sekolah.');
    printPasal('2', 'Kewajiban', 'Pihak Kedua wajib menyusun program kerja, hadir melatih tepat waktu, mengisi daftar hadir, dan melaporkan perkembangan siswa kepada Pihak Pertama.');
    printPasal('3', 'Honorarium', 'Pihak Kedua berhak menerima honorarium sebesar Rp .................... per (datang/bulan) dipotong pajak sesuai ketentuan, yang dibayarkan setiap akhir bulan atau sesuai kebijakan sekolah.');
    printPasal('4', 'Jangka Waktu', 'Perjanjian ini berlaku untuk Tahun Pelajaran 2025/2026 dan dapat diperpanjang atau diputuskan berdasarkan evaluasi kinerja.');

    // TTD
    currentY += 15;
    if (currentY > 230) { doc.addPage(); currentY = margin; }

    doc.text('..............................., ........................... 2026', 140, currentY); 
    currentY += 8;

    const leftSignX = 40;
    const rightSignX = 150;

    doc.text('PIHAK KEDUA', leftSignX, currentY, { align: 'center' });
    doc.text('PIHAK PERTAMA', rightSignX, currentY, { align: 'center' });
    currentY += 25;

    doc.setFont('times', 'bold underline');
    doc.text('( ..................................... )', leftSignX, currentY, { align: 'center' });
    doc.text('( ..................................... )', rightSignX, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFont('times', 'normal');
    doc.text('Pembina Ekstra', leftSignX, currentY, { align: 'center' });
    doc.text('NIP. ..................................', rightSignX, currentY, { align: 'center' });

    doc.save('MOU_Tenaga_Ekstrakurikuler.pdf');
  };

  const generateMOU = () => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = margin + 15;

    // -- HEADER --
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERJANJIAN KERJASAMA', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.text('(SPK / MOU)', 105, currentY, { align: 'center' });
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('NOMOR: 421.2 / ......... / ......... / 2026', 105, currentY, { align: 'center' });
    
    currentY += 15;
    
    // -- INTRO --
    const intro = 'Pada hari ini .............. tanggal ............ bulan ............... tahun Dua Ribu Dua Puluh Enam, yang bertanda tangan di bawah ini:';
    doc.text(doc.splitTextToSize(intro, 170), margin, currentY);
    
    currentY += 12;
    
    // -- ALIGNMENT HELPERS --
    const labelX = margin;
    const colonX = margin + 30;
    const valueX = margin + 35;
    const rightMargin = 190;
    const textWidth = rightMargin - valueX;

    // -- PIHAK PERTAMA --
    doc.setFont('times', 'bold');
    doc.text('I. PIHAK PERTAMA', labelX, currentY);
    currentY += 6;
    doc.setFont('times', 'normal');
    
    doc.text('Nama', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 6;
    
    doc.text('NIP', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 6;

    doc.text('Jabatan', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('Kepala Sekolah SD Negeri ...........................', valueX, currentY);
    currentY += 6;

    doc.text('Alamat', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 8;
    doc.text('Dalam hal ini bertindak untuk dan atas nama Sekolah, selanjutnya disebut PIHAK PERTAMA.', margin, currentY);

    currentY += 12;

    // -- PIHAK KEDUA --
    doc.setFont('times', 'bold');
    doc.text('II. PIHAK KEDUA', labelX, currentY);
    currentY += 6;
    doc.setFont('times', 'normal');

    doc.text('Nama', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 6;

    doc.text('Pekerjaan', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 6;

    doc.text('Alamat', labelX, currentY);
    doc.text(':', colonX, currentY);
    doc.text('............................................................', valueX, currentY);
    currentY += 8;
    doc.text('Dalam hal ini bertindak atas nama pribadi/penyedia jasa, selanjutnya disebut PIHAK KEDUA.', margin, currentY);

    currentY += 12;
    const bridge = 'Kedua belah pihak sepakat untuk mengadakan perjanjian kerjasama pelaksanaan pekerjaan dengan ketentuan sebagai berikut:';
    doc.text(doc.splitTextToSize(bridge, 170), margin, currentY);

    // -- PASAL --
    const printPasal = (num: string, title: string, content: string) => {
        currentY += 10;
        // Check page break
        if (currentY > 260) {
            doc.addPage();
            currentY = margin;
        }
        
        doc.setFont('times', 'bold');
        doc.text(`PASAL ${num}`, 105, currentY, { align: 'center' });
        currentY += 6;
        doc.text(title.toUpperCase(), 105, currentY, { align: 'center' });
        currentY += 8;
        
        doc.setFont('times', 'normal');
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, margin, currentY);
        currentY += (lines.length * 6);
    };

    printPasal('1', 'Lingkup Pekerjaan', 
        'Pihak Pertama memberikan tugas kepada Pihak Kedua untuk melaksanakan pekerjaan: .................................................................................... yang berlokasi di SD Negeri ...........................');

    printPasal('2', 'Jangka Waktu', 
        'Pekerjaan tersebut harus diselesaikan dalam jangka waktu ...... (....................) hari kalender, terhitung mulai tanggal ........................... s.d. tanggal ...........................');

    printPasal('3', 'Biaya dan Pembayaran', 
        'Biaya pelaksanaan pekerjaan tersebut disepakati sebesar Rp ........................... (Terbilang: ...........................................................). Pembayaran akan dilakukan oleh Pihak Pertama setelah pekerjaan dinyatakan selesai 100% dan diterima dengan baik.');

    printPasal('4', 'Sanksi', 
        'Apabila Pihak Kedua tidak dapat menyelesaikan pekerjaan sesuai jadwal atau hasil pekerjaan tidak sesuai spesifikasi, maka Pihak Kedua bersedia memperbaiki kembali tanpa biaya tambahan atau dikenakan denda sesuai ketentuan yang berlaku.');

    printPasal('5', 'Penutup', 
        'Surat perjanjian ini dibuat rangkap 2 (dua) bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama. Hal-hal yang belum diatur akan diselesaikan secara musyawarah mufakat.');

    // -- SIGNATURES --
    currentY += 15;
    // Check page break for signature
    if (currentY > 230) {
        doc.addPage();
        currentY = margin;
    }

    doc.text('..............................., ........................... 2026', 140, currentY); 
    currentY += 8;

    const leftSignX = 40;
    const rightSignX = 150;

    doc.text('PIHAK KEDUA', leftSignX, currentY, { align: 'center' });
    doc.text('PIHAK PERTAMA', rightSignX, currentY, { align: 'center' });
    currentY += 6;
    doc.text('(Pelaksana/Penyedia)', leftSignX, currentY, { align: 'center' });
    doc.text('(Kepala Sekolah)', rightSignX, currentY, { align: 'center' });

    currentY += 25;
    
    // Materai Text Placeholder
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Materai Rp 10.000', rightSignX, currentY - 10, { align: 'center' });
    doc.setTextColor(0);
    doc.setFontSize(12);

    doc.setFont('times', 'bold underline');
    doc.text('( ..................................... )', leftSignX, currentY, { align: 'center' });
    doc.text('( ..................................... )', rightSignX, currentY, { align: 'center' });
    
    currentY += 6;
    doc.setFont('times', 'normal');
    doc.text('NPWP. ..................................', leftSignX, currentY, { align: 'center' });
    doc.text('NIP. ..................................', rightSignX, currentY, { align: 'center' });

    doc.save('Template_MOU_SPK_Kerjasama.pdf');
  };

  const generateSuratTugas = () => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Kop
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH KABUPATEN .......................', 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text('SD NEGERI .......................', 105, margin + 12, { align: 'center' });
    doc.line(margin, margin + 22, 190, margin + 22);

    let currentY = margin + 35;
    doc.text('SURAT TUGAS', 105, currentY, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Nomor: 800 / ......... / ......... / 2026', 105, currentY + 6, { align: 'center' });

    currentY += 20;
    doc.text('Yang bertanda tangan di bawah ini:', margin, currentY);
    
    currentY += 8;
    const labelX = margin + 5; const valX = margin + 40;
    doc.text('Nama', labelX, currentY); doc.text(': .................................................', valX, currentY);
    currentY += 6;
    doc.text('NIP', labelX, currentY); doc.text(': .................................................', valX, currentY);
    currentY += 6;
    doc.text('Jabatan', labelX, currentY); doc.text(': Kepala Sekolah', valX, currentY);

    currentY += 15;
    doc.text('Memberikan tugas kepada:', margin, currentY);
    currentY += 8;
    doc.text('Nama', labelX, currentY); doc.text(': .................................................', valX, currentY);
    currentY += 6;
    doc.text('NIP', labelX, currentY); doc.text(': .................................................', valX, currentY);
    currentY += 6;
    doc.text('Jabatan', labelX, currentY); doc.text(': Guru / Tenaga Kependidikan', valX, currentY);

    currentY += 15;
    doc.text('Untuk melaksanakan tugas:', margin, currentY);
    currentY += 8;
    doc.text('1. ..............................................................................................................', labelX, currentY);
    currentY += 6;
    doc.text('2. ..............................................................................................................', labelX, currentY);
    
    currentY += 15;
    doc.text('Waktu Pelaksanaan:', margin, currentY);
    currentY += 8;
    doc.text('Hari / Tanggal', labelX, currentY); doc.text(': .................................................', valX, currentY);
    currentY += 6;
    doc.text('Tempat', labelX, currentY); doc.text(': .................................................', valX, currentY);

    currentY += 20;
    doc.text('Demikian surat tugas ini diberikan untuk dilaksanakan dengan penuh tanggung jawab.', margin, currentY);

    const ttdY = currentY + 20;
    doc.text('....................., ...................... 2026', 140, ttdY, { align: 'center' });
    doc.text('Kepala Sekolah,', 140, ttdY + 6, { align: 'center' });
    doc.text('( ........................................... )', 140, ttdY + 30, { align: 'center' });
    doc.text('NIP. ....................................', 140, ttdY + 35, { align: 'center' });

    doc.save('Template_Surat_Tugas.pdf');
  };

  const generateSPPD = () => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Front Page (Simple Layout)
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERINTAH PERJALANAN DINAS', 105, 20, { align: 'center' });
    doc.text('(SPPD)', 105, 26, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    
    autoTable(doc, {
        startY: 40,
        body: [
            ['1.', 'Pejabat yang memberi perintah', 'Kepala SD Negeri .................'],
            ['2.', 'Nama Pegawai yang diperintah', '...................................................'],
            ['3.', 'a. Pangkat dan Golongan', 'a. ...............................................'],
            ['', 'b. Jabatan', 'b. ...............................................'],
            ['4.', 'Maksud Perjalanan Dinas', '...................................................'],
            ['5.', 'Alat Angkutan yang dipergunakan', 'Kendaraan Umum / Pribadi'],
            ['6.', 'a. Tempat Berangkat', 'a. SD Negeri ................................'],
            ['', 'b. Tempat Tujuan', 'b. ...............................................'],
            ['7.', 'a. Lamanya Perjalanan Dinas', 'a. ..... (............) hari'],
            ['', 'b. Tanggal Berangkat', 'b. ...............................................'],
            ['', 'c. Tanggal Harus Kembali', 'c. ...............................................'],
            ['8.', 'Pembebanan Anggaran', 'Dana BOSP Tahun 2026'],
        ],
        theme: 'grid',
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 90 }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Ditetapkan di : ...........................', 130, finalY);
    doc.text('Pada Tanggal  : ...........................', 130, finalY + 6);
    doc.text('Kepala Sekolah,', 130, finalY + 12);
    doc.setFont('times', 'bold');
    doc.text('( ........................................... )', 130, finalY + 35);
    doc.setFont('times', 'normal');
    doc.text('NIP. ....................................', 130, finalY + 40);

    // Back Page (Visum)
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.text('I. Berangkat dari', 20, 20);
    doc.text(': SD Negeri ....................', 60, 20);
    doc.text('   Pada Tanggal', 20, 26);
    doc.text(': .....................................', 60, 26);
    doc.text('   Kepala Sekolah,', 20, 35);
    doc.text('( .................................... )', 20, 55);

    doc.text('II. Tiba di', 110, 20);
    doc.text(': .....................................', 140, 20);
    doc.text('    Pada Tanggal', 110, 26);
    doc.text(': .....................................', 140, 26);
    doc.text('    Kepala Instansi Tujuan,', 110, 35);
    doc.text('( .................................... )', 110, 55);
    doc.text('Cap Dinas', 110, 60);

    doc.save('Template_SPPD.pdf');
  };

  const generateNota = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('NOTA / FAKTUR PEMBELIAN', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nama Toko  : ...........................................', 20, 35);
    doc.text('Alamat        : ...........................................', 20, 42);
    doc.text('Tanggal       : ...........................................', 140, 35);
    doc.text('Kepada Yth  : Bendahara BOS', 140, 42);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Nama Barang', 'Banyaknya', 'Harga Satuan', 'Jumlah']],
        body: [
            ['1', '.............................................', '...', 'Rp .................', 'Rp .................'],
            ['2', '.............................................', '...', 'Rp .................', 'Rp .................'],
            ['3', '.............................................', '...', 'Rp .................', 'Rp .................'],
            ['4', '.............................................', '...', 'Rp .................', 'Rp .................'],
            ['5', '.............................................', '...', 'Rp .................', 'Rp .................'],
            ['', '', '', 'Total', 'Rp .................']
        ],
        theme: 'grid',
        footStyles: { fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Tanda Terima / Toko,', 140, finalY);
    doc.text('( ................................. )', 140, finalY + 20);
    
    doc.save('Template_Nota_Kosong.pdf');
  };

  const generateBAST = () => {
    const doc = new jsPDF();
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('BERITA ACARA SERAH TERIMA', 105, 20, { align: 'center' });
    doc.text('BARANG / PEKERJAAN', 105, 26, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text('Pada hari ini ............. tanggal ........... bulan ............. tahun 2026, kami yang bertanda tangan dibawah ini:', 20, 40);
    
    doc.text('1. Nama', 20, 50); doc.text(': ................................................... (Penyedia)', 50, 50);
    doc.text('   Alamat', 20, 56); doc.text(': ...................................................', 50, 56);
    doc.text('   Selanjutnya disebut PIHAK PERTAMA', 20, 62);

    doc.text('2. Nama', 20, 72); doc.text(': ................................................... (Kepala Sekolah/Pengurus Barang)', 50, 72);
    doc.text('   Jabatan', 20, 78); doc.text(': ...................................................', 50, 78);
    doc.text('   Selanjutnya disebut PIHAK KEDUA', 20, 84);

    doc.text('PIHAK PERTAMA menyerahkan barang/pekerjaan kepada PIHAK KEDUA dengan rincian:', 20, 95);
    
    autoTable(doc, {
        startY: 100,
        head: [['No', 'Nama Barang / Pekerjaan', 'Vol', 'Satuan', 'Keterangan']],
        body: [
            ['1', '', '', '', 'Baik'],
            ['2', '', '', '', 'Baik'],
            ['3', '', '', '', 'Baik'],
        ],
        theme: 'grid'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('PIHAK KEDUA', 140, finalY, { align: 'center' });
    doc.text('PIHAK PERTAMA', 40, finalY, { align: 'center' });
    
    doc.text('( ................................. )', 140, finalY + 25, { align: 'center' });
    doc.text('( ................................. )', 40, finalY + 25, { align: 'center' });

    doc.save('Template_BAST.pdf');
  };

  const generateLaporanTugas = () => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = margin + 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('LAPORAN PELAKSANAAN TUGAS', 105, currentY, { align: 'center' });
    currentY += 15;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    doc.text('Yang bertanda tangan di bawah ini:', margin, currentY);
    currentY += 8;
    
    const labelX = margin;
    const valX = margin + 35;

    doc.text('Nama', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);
    currentY += 8;
    doc.text('NIP', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);
    currentY += 8;
    doc.text('Jabatan', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);
    
    currentY += 15;
    const intro = 'Melaporkan bahwa telah melaksanakan tugas dinas / kegiatan sekolah berdasarkan:';
    doc.text(intro, margin, currentY);
    
    currentY += 8;
    doc.text('Surat Tugas Dari', labelX, currentY);
    doc.text(': Kepala Sekolah SD Negeri ...........................', valX, currentY);
    currentY += 8;
    doc.text('Nomor Surat', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);
    currentY += 8;
    doc.text('Tanggal Surat', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);
    currentY += 8;
    doc.text('Perihal', labelX, currentY);
    doc.text(': ........................................................................', valX, currentY);

    currentY += 15;
    doc.setFont('times', 'bold');
    doc.text('HASIL KEGIATAN:', margin, currentY);
    doc.setFont('times', 'normal');
    currentY += 8;
    
    // Create lines for user to write on
    for(let i=0; i<8; i++) {
        doc.text('.........................................................................................................................................................................', margin, currentY);
        currentY += 8;
    }

    currentY += 5;
    const closing = 'Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya.';
    doc.text(closing, margin, currentY);

    const ttdY = currentY + 20;
    doc.text('........................., ........................... 2026', 140, ttdY, { align: 'center' });
    doc.text('Pelapor,', 140, ttdY + 6, { align: 'center' });
    
    doc.text('( ........................................... )', 140, ttdY + 30, { align: 'center' });
    doc.text('NIP. ....................................', 140, ttdY + 35, { align: 'center' });

    doc.save('Template_Laporan_Tugas.pdf');
  };

  // --- DYNAMIC RENDERER ---
  const renderTemplateButtons = () => {
      if (!activeCategory) {
          return (
              <div className="text-center text-gray-400 py-4 text-xs italic">
                  Pilih kategori di atas untuk melihat template.
              </div>
          );
      }

      switch (activeCategory) {
          case 'honor':
              return (
                  <>
                    <button onClick={generateSK} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileSignature size={14} className="text-blue-500"/> SK Penetapan / Tugas</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateMOUHonor} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Handshake size={14} className="text-teal-500"/> MOU Tenaga Ekstra</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateDaftarHadir} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir Kegiatan</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateTandaTerimaHonor} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Users size={14} className="text-purple-500"/> Tanda Terima Honor</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateLaporanTugas} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileText size={14} className="text-orange-500"/> Laporan Pelaksanaan</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                  </>
              );
          
          case 'mamin':
              return (
                  <>
                    <button onClick={generateDaftarHadir} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir Rapat</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={() => alert("Gunakan template Surat Dinas standar sekolah.")} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileText size={14} className="text-blue-500"/> Undangan Rapat</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateNota} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Receipt size={14} className="text-red-500"/> Nota Pesanan (Kosong)</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                  </>
              );

          case 'peradin':
              return (
                  <>
                    <button onClick={generateSuratTugas} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileSignature size={14} className="text-blue-500"/> Surat Tugas (Individu)</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateSPPD} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Truck size={14} className="text-green-500"/> SPPD (Depan Belakang)</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateLaporanTugas} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileText size={14} className="text-orange-500"/> Laporan Perjalanan Dinas</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                  </>
              );

          case 'jasa':
              return (
                  <>
                    <button onClick={generateSPKKonstruksi} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><HardHat size={14} className="text-purple-500"/> SPK / MOU Pekerjaan</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateAbsensiTukang} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><ClipboardList size={14} className="text-orange-500"/> Daftar Hadir Pekerja</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateUpahTukang} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Hammer size={14} className="text-blue-500"/> Daftar Penerimaan Upah</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateBAST} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileCheck size={14} className="text-green-500"/> Berita Acara Serah Terima</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateKuitansi} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Receipt size={14} className="text-red-500"/> Kuitansi Tukang/Servis</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                  </>
              );

          case 'atk':
              return (
                  <>
                    <button onClick={generateNota} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><Receipt size={14} className="text-red-500"/> Nota Toko (Kosong)</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateBAST} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileCheck size={14} className="text-green-500"/> Berita Acara Pemeriksaan</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                    <button onClick={generateKuitansi} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-2"><FileText size={14} className="text-blue-500"/> Kuitansi Pembayaran</span>
                        <Download size={14} className="text-gray-400" />
                    </button>
                  </>
              );

          default:
              return null;
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <BookOpen className="text-blue-600" /> Bukti Fisik & Template Administrasi
           </h2>
           <p className="text-sm text-gray-500">
             Panduan kelengkapan dokumen SPJ non-SIPLah dan generator template siap cetak.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* LEFT COLUMN: Categories */}
         <div className="lg:col-span-1 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pilih Jenis Belanja</p>
            {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                   key={cat.id}
                   onClick={() => setActiveCategory(cat.id)}
                   className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${
                       activeCategory === cat.id 
                       ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]' 
                       : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                   }`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${activeCategory === cat.id ? 'bg-white/20 text-white' : `${cat.bg} ${cat.color}`}`}>
                         <cat.icon size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-sm">{cat.title}</p>
                         <p className={`text-[10px] line-clamp-1 ${activeCategory === cat.id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {cat.description}
                         </p>
                      </div>
                   </div>
                   <ChevronRight size={16} className={`transition-transform ${activeCategory === cat.id ? 'text-white' : 'text-gray-300 group-hover:text-blue-400'}`} />
                </button>
            ))}
            
            {/* Quick Template Downloads */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Printer size={16} className="text-gray-500" /> Cetak Template Kosong
                </h4>
                <div className="space-y-2">
                    {renderTemplateButtons()}
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN: Details */}
         <div className="lg:col-span-2">
            {activeCategory ? (
                (() => {
                    const cat = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory);
                    if (!cat) return null;
                    return (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up">
                            <div className={`p-6 border-b border-gray-100 ${cat.bg}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <cat.icon size={24} className={cat.color} />
                                    <h3 className={`text-lg font-bold ${cat.color}`}>{cat.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600">{cat.description}</p>
                            </div>
                            
                            <div className="p-6">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-green-600" />
                                    Kelengkapan Bukti Fisik SPJ
                                </h4>
                                
                                <div className="space-y-0">
                                    {cat.requirements.map((req, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg border-b border-gray-50 last:border-0">
                                            <div className="min-w-[24px] h-6 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full text-xs font-bold mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <p className="text-sm text-gray-700">{req}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h5 className="text-sm font-bold text-blue-800 mb-2">Tips Bendahara:</h5>
                                    <ul className="text-xs text-blue-700 space-y-1 list-disc ml-4">
                                        <li>Pastikan tanggal kuitansi tidak mendahului tanggal Surat Tugas/Undangan.</li>
                                        <li>Untuk honorarium, pastikan penerima telah menandatangani daftar terima.</li>
                                        <li>Belanja di atas Rp 2.000.000 (Non-SIPLah) wajib menggunakan materai.</li>
                                        <li>Foto dokumentasi harus "Open Camera" (ada timestamp/lokasi lebih baik).</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })()
            ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center p-8">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <FileText size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-600 mb-2">Pilih Kategori Belanja</h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                        Klik salah satu jenis belanja di sebelah kiri untuk melihat daftar bukti fisik yang diperlukan.
                    </p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default EvidenceTemplates;
