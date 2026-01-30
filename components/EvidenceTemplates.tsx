
import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ChevronRight, BookOpen, Printer, Users, Coffee, Wrench, Bus, ShoppingBag, FileSignature, Handshake, ClipboardList, Receipt, Truck, FileCheck, HardHat, Hammer, X, Save, Calendar, MapPin, User, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSchoolProfile } from '../lib/db';
import { SchoolProfile } from '../types';

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

// Helper Terbilang
const getTerbilang = (nilai: number): string => {
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

const EvidenceTemplates = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  
  // Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
      getSchoolProfile().then(setSchoolProfile);
  }, []);

  const openPrintModal = (type: string) => {
      setCurrentTemplateType(type);
      // Initialize default values from profile
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const year = schoolProfile?.fiscalYear || new Date().getFullYear().toString();
      
      setFormData({
          date: today,
          city: schoolProfile?.city?.replace('KOTA ', '').replace('KABUPATEN ', '') || 'Tempat',
          ksName: schoolProfile?.headmaster || '',
          ksNip: schoolProfile?.headmasterNip || '',
          trName: schoolProfile?.treasurer || '',
          trNip: schoolProfile?.treasurerNip || '',
          schoolName: schoolProfile?.name || '',
          year: year,
          // Specific defaults
          amount: '',
          terbilang: '',
          receiver: '',
          receiverNip: '', // For official letters
          description: '',
          activityName: '',
          projectLocation: schoolProfile?.name || '',
          contractorName: '',
          contractorAddress: '',
          contractorRole: 'Tukang / Pelaksana',
          spkNumber: `027 / ... / ... / ${year}`,
          skNumber: `800 / ... / ... / ${year}`,
          mouNumber: `421.2 / ... / ... / ${year}`,
      });
      setIsPrintModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      
      // Auto terbilang if amount changes
      if (name === 'amount') {
          const valNum = parseInt(value) || 0;
          setFormData((prev: any) => ({ 
              ...prev, 
              [name]: value,
              terbilang: valNum > 0 ? getTerbilang(valNum) : '' 
          }));
      } else {
          setFormData((prev: any) => ({ ...prev, [name]: value }));
      }
  };

  // --- PDF GENERATORS (Updated to use Dynamic Data) ---

  const generateKuitansi = (data: any) => {
    const doc = new jsPDF('l', 'mm', 'a5');
    
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 128);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('KUITANSI PEMBAYARAN', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Anggaran : ${data.year}`, 150, 35);
    doc.text('No. Bukti : .....................', 150, 40);
    doc.text('Mata Anggaran : .....................', 150, 45);

    const startY = 55;
    const gap = 10;
    
    doc.text('Sudah Terima Dari', 20, startY);
    doc.text(':', 60, startY);
    doc.text(`Bendahara BOS ${data.schoolName}`, 65, startY);
    
    doc.text('Uang Sejumlah', 20, startY + gap);
    doc.text(':', 60, startY + gap);
    doc.setFont('helvetica', 'bolditalic');
    const nominal = data.amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(data.amount)) : 'Rp ..................................................';
    doc.text(nominal, 65, startY + gap);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Untuk Pembayaran', 20, startY + (gap*2));
    doc.text(':', 60, startY + (gap*2));
    
    const splitDesc = doc.splitTextToSize(data.description || '..........................................................................................', 120);
    doc.text(splitDesc, 65, startY + (gap*2));

    const terbilangY = startY + (gap*2) + (splitDesc.length * 5) + 5;
    doc.text('Terbilang', 20, terbilangY);
    doc.text(':', 60, terbilangY);
    doc.setFont('helvetica', 'bold');
    doc.text(`# ${data.terbilang || '...................................................................................'} #`, 65, terbilangY);

    const signY = 110;
    doc.setFont('helvetica', 'normal');
    doc.text('Setuju Dibayar,', 30, signY, { align: 'center' });
    doc.text('Kepala Sekolah', 30, signY + 5, { align: 'center' });
    doc.text('Lunas Dibayar,', 105, signY, { align: 'center' });
    doc.text('Bendahara', 105, signY + 5, { align: 'center' });

    doc.text(`${data.city}, ${data.date}`, 170, signY - 5, { align: 'center' });
    doc.text('Yang Menerima,', 170, signY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(data.ksName || '( ........................... )', 30, signY + 25, { align: 'center' });
    doc.text(data.trName || '( ........................... )', 105, signY + 25, { align: 'center' });
    doc.text(data.receiver || '( ........................... )', 170, signY + 25, { align: 'center' });

    doc.save(`Kuitansi_${data.description ? data.description.substring(0,10) : 'Kosong'}.pdf`);
  };

  const generateDaftarHadir = (data: any) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR HADIR KEGIATAN', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama Kegiatan : ${data.activityName || '....................................................................'}`, 20, 35);
    doc.text(`Hari / Tanggal  : ${data.date}`, 20, 42);
    doc.text(`Tempat             : ${data.projectLocation || '....................................................................'}`, 20, 49);

    autoTable(doc, {
        startY: 55,
        head: [['No', 'Nama Lengkap', 'Jabatan / Unsur', 'Tanda Tangan']],
        body: Array(10).fill(['', '', '', '']),
        theme: 'grid',
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { cellWidth: 50 } },
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 0) {
                hookData.cell.text = [(hookData.row.index + 1).toString()];
            }
        }
    });
    doc.save('Daftar_Hadir.pdf');
  };

  const generateSK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header Mockup
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 22, 190, margin + 22);

    const titleY = margin + 35;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('KEPUTUSAN KEPALA SEKOLAH', 105, titleY, { align: 'center' });
    doc.text(`NOMOR : ${data.skNumber}`, 105, titleY + 6, { align: 'center' });
    doc.text('TENTANG', 105, titleY + 14, { align: 'center' });
    doc.text((data.description || 'PENETAPAN PETUGAS KEGIATAN').toUpperCase(), 105, titleY + 20, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let currentY = titleY + 40;
    
    const contentX = margin + 32;
    doc.text('Menimbang', margin, currentY);
    doc.text(':', margin + 28, currentY);
    doc.text('a. Bahwa untuk memperlancar kegiatan sekolah dipandang perlu menetapkan surat keputusan;', contentX, currentY);
    
    currentY += 20;
    doc.text('Mengingat', margin, currentY);
    doc.text(':', margin + 28, currentY);
    doc.text('1. Undang-Undang Nomor 20 Tahun 2003;', contentX, currentY);
    doc.text('2. RKAS Tahun Anggaran ' + data.year, contentX, currentY + 6);

    currentY += 20;
    doc.setFont('times', 'bold');
    doc.text('MEMUTUSKAN', 105, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFont('times', 'normal');
    doc.text('Menetapkan', margin, currentY);
    doc.text(':', margin + 28, currentY);
    doc.text('KESATU : Menetapkan nama yang tercantum dalam lampiran sebagai petugas.', contentX, currentY);
    doc.text(`KEDUA  : Segala biaya dibebankan pada Anggaran ${data.year}.`, contentX, currentY + 10);
    doc.text('KETIGA : Keputusan ini berlaku sejak tanggal ditetapkan.', contentX, currentY + 20);

    const ttdY = currentY + 40;
    doc.text(`Ditetapkan di : ${data.city}`, 130, ttdY);
    doc.text(`Pada Tanggal  : ${data.date}`, 130, ttdY + 6);
    doc.text('Kepala Sekolah,', 130, ttdY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 130, ttdY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 130, ttdY + 40);

    doc.save('SK_Penetapan.pdf');
  };

  const generateSPK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;
    let currentY = margin + 15;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERINTAH KERJA (SPK)', 105, currentY, { align: 'center' });
    currentY += 6;
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(`Nomor: ${data.spkNumber}`, 105, currentY, { align: 'center' });
    
    currentY += 15;
    doc.text('Yang bertanda tangan di bawah ini:', margin, currentY);
    currentY += 8;

    const labelX = margin + 5; const valX = margin + 40;
    doc.text('Nama', labelX, currentY); doc.text(`: ${data.ksName}`, valX, currentY); currentY += 6;
    doc.text('Jabatan', labelX, currentY); doc.text(`: Kepala Sekolah (Pihak Pertama)`, valX, currentY); currentY += 10;

    doc.text('Memberikan perintah kerja kepada:', margin, currentY); currentY += 8;
    doc.text('Nama', labelX, currentY); doc.text(`: ${data.contractorName || '................................'}`, valX, currentY); currentY += 6;
    doc.text('Pekerjaan', labelX, currentY); doc.text(`: ${data.contractorRole || '................................'}`, valX, currentY); currentY += 6;
    doc.text('Alamat', labelX, currentY); doc.text(`: ${data.contractorAddress || '................................'}`, valX, currentY); currentY += 12;

    doc.text('Untuk melaksanakan pekerjaan:', margin, currentY); currentY += 8;
    doc.setFont('times', 'bold');
    doc.text(data.description || 'REHABILITASI / PERBAIKAN .....................................', margin, currentY);
    doc.setFont('times', 'normal');
    
    currentY += 10;
    doc.text('Ketentuan:', margin, currentY);
    currentY += 6;
    doc.text(`1. Biaya pekerjaan sebesar Rp ${data.amount ? new Intl.NumberFormat('id-ID').format(Number(data.amount)) : '................'}.`, margin, currentY);
    doc.text(`2. Pekerjaan dilaksanakan di ${data.projectLocation}.`, margin, currentY + 6);
    doc.text('3. Hasil pekerjaan harus baik dan rapi.', margin, currentY + 12);

    currentY += 25;
    doc.text(`${data.city}, ${data.date}`, 140, currentY, { align: 'center' });
    
    const leftSignX = 40;
    const rightSignX = 150;

    doc.text('Pihak Kedua', leftSignX, currentY + 6, { align: 'center' });
    doc.text('Pihak Pertama', rightSignX, currentY + 6, { align: 'center' });
    
    doc.setFont('times', 'bold underline');
    doc.text(`( ${data.contractorName || '....................'} )`, leftSignX, currentY + 35, { align: 'center' });
    doc.text(`( ${data.ksName} )`, rightSignX, currentY + 35, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, rightSignX, currentY + 40, { align: 'center' });

    doc.save('SPK_Pekerjaan.pdf');
  };

  const generateAbsensiTukang = (data: any) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('DAFTAR HADIR PEKERJA / TUKANG', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Jenis Pekerjaan : ${data.activityName || '...................................................'}`, 20, 35);
    doc.text(`Lokasi          : ${data.projectLocation}`, 20, 42);
    doc.text(`Bulan           : ........................... ${data.year}`, 20, 49);

    autoTable(doc, {
        startY: 55,
        head: [['No', 'Nama Pekerja', 'Jabatan', 'H 1', 'H 2', 'H 3', 'H 4', 'H 5', 'Ket']],
        body: Array(5).fill(['', '', '', '', '', '', '', '', '']),
        theme: 'grid',
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 0) {
                hookData.cell.text = [(hookData.row.index + 1).toString()];
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Mengetahui,', 20, finalY);
    doc.text(`${data.city}, ${data.date}`, 140, finalY - 5);
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Koordinator Pekerja', 140, finalY + 5);
    
    doc.text(`( ${data.ksName} )`, 20, finalY + 25);
    doc.text(`( ................................. )`, 140, finalY + 25);

    doc.save('Absensi_Tukang.pdf');
  };

  const generateUpahTukang = (data: any) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont('times', 'bold');
    doc.text('DAFTAR PENERIMAAN UPAH KERJA', 105, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Pekerjaan      : ${data.activityName || '...................................................'}`, 20, 35);
    doc.text(`Sumber Dana    : BOSP Tahun Anggaran ${data.year}`, 20, 42);

    autoTable(doc, {
        startY: 50,
        head: [['No', 'Nama Pekerja', 'Status', 'Hari', 'Upah (Rp)', 'Total (Rp)', 'Tanda Tangan']],
        body: Array(5).fill(['', '', '', '', '', '', '..........']),
        theme: 'grid',
        didParseCell: (hookData) => {
            if (hookData.section === 'body' && hookData.column.index === 0) {
                hookData.cell.text = [(hookData.row.index + 1).toString()];
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Setuju Dibayar,', 20, finalY);
    doc.text('Lunas Dibayar,', 140, finalY);
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Bendahara', 140, finalY + 5);
    
    doc.text(`( ${data.ksName} )`, 20, finalY + 25);
    doc.text(`( ${data.trName} )`, 140, finalY + 25);

    doc.save('Daftar_Upah.pdf');
  };

  const generateMOU = (data: any) => {
      // Reusing logic from previous but with dynamic data filling
      const doc = new jsPDF();
      const margin = 20;
      let currentY = margin + 15;

      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('SURAT PERJANJIAN KERJASAMA', 105, currentY, { align: 'center' });
      currentY += 8;
      doc.setFontSize(12);
      doc.setFont('times', 'normal');
      doc.text(`NOMOR: ${data.mouNumber}`, 105, currentY, { align: 'center' });
      
      currentY += 15;
      doc.setFont('times', 'bold');
      doc.text('PIHAK PERTAMA', margin, currentY);
      doc.setFont('times', 'normal');
      doc.text(`Nama: ${data.ksName}`, margin, currentY + 6);
      doc.text(`Jabatan: Kepala Sekolah`, margin, currentY + 12);
      
      currentY += 25;
      doc.setFont('times', 'bold');
      doc.text('PIHAK KEDUA', margin, currentY);
      doc.setFont('times', 'normal');
      doc.text(`Nama: ${data.contractorName || '..............................'}`, margin, currentY + 6);
      doc.text(`Pekerjaan: ${data.contractorRole}`, margin, currentY + 12);
      
      currentY += 25;
      doc.text('Sepakat menjalin kerjasama untuk kegiatan:', margin, currentY);
      doc.setFont('times', 'bold');
      doc.text(data.description || '......................................................', margin, currentY + 6);
      
      // ... (Keep simpler for dynamic demo)
      
      currentY += 40;
      doc.text(`Pihak Kedua`, 40, currentY, {align: 'center'});
      doc.text(`Pihak Pertama`, 150, currentY, {align: 'center'});
      
      currentY += 25;
      doc.text(`( ${data.contractorName || '................'} )`, 40, currentY, {align: 'center'});
      doc.text(`( ${data.ksName} )`, 150, currentY, {align: 'center'});

      doc.save('MOU_Kerjasama.pdf');
  };

  const handlePrint = (e: React.FormEvent) => {
      e.preventDefault();
      switch (currentTemplateType) {
          case 'kuitansi': generateKuitansi(formData); break;
          case 'daftar_hadir': generateDaftarHadir(formData); break;
          case 'sk': generateSK(formData); break;
          case 'spk_fisik': generateSPK(formData); break;
          case 'absensi_tukang': generateAbsensiTukang(formData); break;
          case 'upah_tukang': generateUpahTukang(formData); break;
          case 'mou': generateMOU(formData); break;
          default: alert('Template belum didukung sepenuhnya dalam mode dinamis.');
      }
      setIsPrintModalOpen(false);
  };

  // --- RENDER FORM FIELDS BASED ON TEMPLATE ---
  const renderFormFields = () => {
      return (
          <div className="space-y-3">
              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Tanggal Dokumen</label>
                      <input type="text" name="date" value={formData.date} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Kota/Tempat</label>
                      <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
              </div>

              {/* Template Specifics */}
              {currentTemplateType === 'kuitansi' && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nominal Uang (Rp)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Terbilang (Otomatis)</label>
                        <textarea name="terbilang" value={formData.terbilang} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm bg-gray-50" rows={2} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Uraian Pembayaran</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Contoh: Belanja ATK kegiatan..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nama Penerima</label>
                        <input type="text" name="receiver" value={formData.receiver} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama Toko / Orang" />
                    </div>
                  </>
              )}

              {currentTemplateType === 'sk' && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nomor SK</label>
                        <input type="text" name="skNumber" value={formData.skNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Tentang / Judul SK</label>
                        <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="PENETAPAN PANITIA..." />
                    </div>
                  </>
              )}

              {(currentTemplateType === 'spk_fisik' || currentTemplateType === 'mou') && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nomor Surat</label>
                        <input type="text" name={currentTemplateType === 'spk_fisik' ? 'spkNumber' : 'mouNumber'} value={currentTemplateType === 'spk_fisik' ? formData.spkNumber : formData.mouNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Nama Pihak Kedua</label>
                            <input type="text" name="contractorName" value={formData.contractorName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Jabatan/Pekerjaan</label>
                            <input type="text" name="contractorRole" value={formData.contractorRole} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Alamat Pihak Kedua</label>
                        <input type="text" name="contractorAddress" value={formData.contractorAddress} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Uraian Pekerjaan / Kerjasama</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                    </div>
                    {currentTemplateType === 'spk_fisik' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Lokasi Proyek</label>
                                <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Nilai Kontrak (Rp)</label>
                                <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                        </>
                    )}
                  </>
              )}

              {(currentTemplateType === 'daftar_hadir' || currentTemplateType === 'absensi_tukang' || currentTemplateType === 'upah_tukang') && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nama Kegiatan / Proyek</label>
                        <input type="text" name="activityName" value={formData.activityName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Rehab Ruang Kelas" />
                    </div>
                    {currentTemplateType !== 'daftar_hadir' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Lokasi</label>
                            <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    )}
                  </>
              )}
          </div>
      );
  };

  const renderTemplateButtons = () => {
      if (!activeCategory) return <div className="text-center text-gray-400 py-4 text-xs italic">Pilih kategori di atas.</div>;

      switch (activeCategory) {
          case 'honor':
              return (
                  <>
                    <button onClick={() => openPrintModal('sk')} className="btn-template"><FileSignature size={14} className="text-blue-500"/> SK Penetapan</button>
                    <button onClick={() => openPrintModal('mou')} className="btn-template"><Handshake size={14} className="text-teal-500"/> MOU Tenaga Ekstra</button>
                    <button onClick={() => openPrintModal('daftar_hadir')} className="btn-template"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-purple-500"/> Kuitansi Honor</button>
                  </>
              );
          case 'jasa':
              return (
                  <>
                    <button onClick={() => openPrintModal('spk_fisik')} className="btn-template"><HardHat size={14} className="text-purple-500"/> SPK Konstruksi/Servis</button>
                    <button onClick={() => openPrintModal('absensi_tukang')} className="btn-template"><ClipboardList size={14} className="text-orange-500"/> Absensi Tukang</button>
                    <button onClick={() => openPrintModal('upah_tukang')} className="btn-template"><Hammer size={14} className="text-blue-500"/> Daftar Penerimaan Upah</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-red-500"/> Kuitansi Pembayaran</button>
                  </>
              );
          default:
              // Generic fallback for other categories
              return (
                  <>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-blue-500"/> Kuitansi Umum</button>
                    <button onClick={() => openPrintModal('daftar_hadir')} className="btn-template"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir</button>
                    <button onClick={() => openPrintModal('sk')} className="btn-template"><FileSignature size={14} className="text-orange-500"/> SK / Surat Tugas</button>
                  </>
              );
      }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <BookOpen className="text-blue-600" /> Generator Bukti Fisik
           </h2>
           <p className="text-sm text-gray-500">
             Buat dokumen pendukung SPJ secara otomatis. Data sekolah akan terisi sendiri.
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
                    <Printer size={16} className="text-gray-500" /> Cetak Dokumen
                </h4>
                <div className="space-y-2">
                    {renderTemplateButtons()}
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN: Details & Preview */}
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
                        Klik salah satu jenis belanja di sebelah kiri untuk membuat dokumen pendukung.
                    </p>
                </div>
            )}
         </div>
      </div>

      {/* MODAL INPUT DATA */}
      {isPrintModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Printer size={18} className="text-blue-600" /> Isi Data Dokumen
                      </h3>
                      <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handlePrint} className="p-6">
                      {renderFormFields()}
                      
                      <div className="mt-6 flex gap-3">
                          <button type="button" onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-50">Batal</button>
                          <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                              <Download size={18} /> Generate PDF
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Style Injection for Template Buttons */}
      <style>{`
        .btn-template {
            @apply w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center gap-2 text-gray-600 transition-all;
        }
      `}</style>
    </div>
  );
};

export default EvidenceTemplates;
