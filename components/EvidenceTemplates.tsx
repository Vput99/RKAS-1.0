
import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ChevronRight, BookOpen, Printer, Users, Coffee, Wrench, Bus, ShoppingBag, FileSignature, Handshake, ClipboardList, Receipt, FileCheck, HardHat, Hammer, X, DollarSign, Plus, Trash2, Search, Sparkles, Loader2, Upload, Eye, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSchoolProfile, getBudgets, updateBudget, uploadEvidenceFile } from '../lib/db';
import { SchoolProfile, Budget, EvidenceFile } from '../types';
import { suggestEvidenceList } from '../lib/gemini';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to determine evidence needed based on Juknis BOSP 2026 & SIPLah Context
const getEvidenceList = (description: string, accountCode?: string): string[] => {
  const text = (description + ' ' + (accountCode || '')).toLowerCase();
  
  if (text.includes('honor') || text.includes('gaji') || text.includes('jasa narasumber') || text.includes('instruktur') || text.includes('pembina')) {
    return [
      "SK Penetapan / Surat Tugas dari Kepala Sekolah (Tahun Berjalan)",
      "Surat Perjanjian Kerja (SPK)",
      "Daftar Hadir / Absensi Bulan Berjalan (Tanda Tangan Lengkap)",
      "Laporan Pelaksanaan Tugas / Jurnal Kegiatan",
      "Daftar Tanda Terima Honorarium (Bruto, Potongan Pajak, Netto)",
      "Bukti Transfer Bank ke Rekening Penerima (CMS/Teller)",
      "Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)",
      "Fotokopi KTP & NPWP Penerima"
    ];
  }

  if (
    text.includes('atk') || text.includes('bahan') || text.includes('alat tulis') || 
    text.includes('kertas') || text.includes('kebersihan') || text.includes('spanduk') || 
    text.includes('cetak') || text.includes('penggandaan') || 
    text.includes('lampu') || text.includes('kabel') || text.includes('alat listrik') || text.includes('saklar')
  ) {
    return [
      "Dokumen Cetak Pesanan SIPLah",
      "Invoice / Faktur Penjualan (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Bukti Transfer ke Rekening Marketplace (Bukan Rekening Penjual)",
      "Bukti Setor / Pungut Pajak (Oleh Marketplace SIPLah)",
      "Foto Dokumentasi Barang yang diterima",
      "Kuitansi Manual (Hanya jika pembelian Non-SIPLah / Mendesak < Rp 200rb)"
    ];
  }

  if (text.includes('makan') || text.includes('minum') || text.includes('konsumsi') || text.includes('rapat') || text.includes('snack')) {
    return [
      "Surat Undangan & Daftar Hadir Kegiatan",
      "Notulen / Laporan Hasil Kegiatan",
      "Nota / Bon Pembelian Konsumsi (Rincian Menu Jelas)",
      "Kuitansi Pembayaran (Bermaterai jika > Rp 5 Juta)",
      "Bukti Setor PPh 23 (Jasa Katering) atau Pajak Daerah (PB1)",
      "Foto Dokumentasi Kegiatan (Open Camera)",
      "Dokumen SIPLah (Jika memesan Katering via SIPLah)"
    ];
  }

  if (text.includes('perjalanan') || text.includes('dinas') || text.includes('transport') || text.includes('sppd')) {
    return [
      "Surat Tugas (Ditandatangani KS)",
      "SPPD (Surat Perintah Perjalanan Dinas) - Cap Instansi Tujuan",
      "Laporan Hasil Perjalanan Dinas",
      "Tiket / Bukti Transportasi Riil",
      "Nota BBM (Jika kendaraan pribadi/sewa)",
      "Kuitansi / Bill Hotel (Jika Menginap)",
      "Daftar Pengeluaran Riil (Format Lampiran Juknis)"
    ];
  }

  if (text.includes('modal') || text.includes('buku') || text.includes('laptop') || text.includes('komputer') || text.includes('printer') || text.includes('meja') || text.includes('kursi') || text.includes('aset') || text.includes('elektronik')) {
    return [
      "Dokumen Cetak Pesanan SIPLah (SPK Digital)",
      "Invoice / Faktur Penjualan (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Berita Acara Pemeriksaan Barang (Internal Sekolah)",
      "Bukti Transfer ke Rekening Marketplace",
      "Bukti Pungut/Setor Pajak (Oleh Marketplace SIPLah)",
      "Foto Dokumentasi Barang (Fisik di Sekolah)",
      "Fotokopi Pencatatan di Buku Inventaris Aset / KIB",
      "Kartu Garansi Resmi"
    ];
  }

  if (text.includes('pemeliharaan') || text.includes('servis') || text.includes('perbaikan') || text.includes('tukang') || text.includes('rehab')) {
    return [
      "Surat Perintah Kerja (SPK) Manual (Jika Jasa Perorangan)",
      "RAB (Rincian Anggaran Biaya) Pekerjaan",
      "Nota Belanja Bahan Material (Bisa SIPLah / Toko Bangunan)",
      "Kuitansi Upah Tukang",
      "Daftar Hadir Tukang",
      "Berita Acara Penyelesaian Pekerjaan & BAST",
      "Bukti Setor PPh 21 (Upah Tukang)",
      "Foto Dokumentasi (0%, 50%, 100%)"
    ];
  }

  if ((text.includes('listrik') && !text.includes('alat')) || text.includes('air') || text.includes('internet') || text.includes('langganan') || text.includes('telepon') || text.includes('wifi')) {
    return [
      "Invoice / Tagihan Resmi Penyedia (PLN/Telkom)",
      "Bukti Pembayaran Valid (Struk Bank / NTPN / Bukti Transfer)",
      "Bukti Transaksi Marketplace (Jika bayar via Tokopedia/Shopee/dll)"
    ];
  }

  return [
    "Dokumen SIPLah (Invoice, BAST, Bukti Pesanan)",
    "Bukti Pembayaran Non-Tunai / Transfer",
    "Bukti Pajak (Dipungut Marketplace/Setor Sendiri)",
    "Dokumentasi Foto",
    "Kuitansi / Nota (Jika Transaksi Manual)"
  ];
};

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
      'Daftar Penerimaan Uang Transport',
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
  const [activeTab, setActiveTab] = useState<'templates' | 'upload'>('templates');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upload State
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedRealizationIndex, setSelectedRealizationIndex] = useState<number>(-1);
  const [suggestedEvidence, setSuggestedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
      setIsLoading(true);
      Promise.all([
          getSchoolProfile(),
          getBudgets()
      ]).then(([profile, allBudgets]) => {
          setSchoolProfile(profile);
          // Filter only budgets that have realizations
          setBudgets(allBudgets.filter(b => b.realizations && b.realizations.length > 0));
          setIsLoading(false);
      });
  }, []);

  const handleProcessAi = async (budget: Budget) => {
    setIsAiLoading(true);
    try {
      const list = await suggestEvidenceList(budget.description);
      setSuggestedEvidence(list);
    } catch (error) {
      // Fallback to local logic
      setSuggestedEvidence(getEvidenceList(budget.description, budget.account_code));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSelectRealization = (budget: Budget, index: number) => {
    setSelectedBudget(budget);
    setSelectedRealizationIndex(index);
    handleProcessAi(budget);
  };

  const handleFileUpload = async (evidenceType: string, file: File) => {
    if (!selectedBudget || selectedRealizationIndex === -1) return;

    setUploadProgress(prev => ({ ...prev, [evidenceType]: true }));
    
    try {
      const result = await uploadEvidenceFile(file, selectedBudget.id);
      
      if (result.url && result.path) {
        const newEvidence: EvidenceFile = {
          type: evidenceType,
          url: result.url,
          path: result.path,
          name: file.name
        };

        const updatedBudgets = [...budgets];
        const budgetIdx = updatedBudgets.findIndex(b => b.id === selectedBudget.id);
        
        if (budgetIdx !== -1) {
          const budget = { ...updatedBudgets[budgetIdx] };
          if (budget.realizations) {
            const realizations = [...budget.realizations];
            const realization = { ...realizations[selectedRealizationIndex] };
            
            const currentFiles = realization.evidence_files || [];
            // Remove existing of same type if any, or just add
            const filteredFiles = currentFiles.filter(f => f.type !== evidenceType);
            realization.evidence_files = [...filteredFiles, newEvidence];
            
            realizations[selectedRealizationIndex] = realization;
            budget.realizations = realizations;
            
            const updated = await updateBudget(budget.id, { realizations: budget.realizations });
            if (updated) {
              updatedBudgets[budgetIdx] = updated;
              setBudgets(updatedBudgets);
              setSelectedBudget(updated);
            }
          }
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Gagal mengunggah file.");
    } finally {
      setUploadProgress(prev => ({ ...prev, [evidenceType]: false }));
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.account_code && b.account_code.includes(searchTerm))
  );

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
          receiverNip: '', 
          description: '',
          activityName: '',
          projectLocation: schoolProfile?.name || '',
          contractorName: '',
          contractorAddress: '',
          contractorRole: 'Tukang / Pelaksana',
          spkNumber: `027 / ... / ... / ${year}`,
          skNumber: `800 / ... / ... / ${year}`,
          mouNumber: `421.2 / ... / ... / ${year}`,
          
          // Peradin Specifics
          suratTugasNumber: `800 / ... / ... / ${year}`,
          sppdNumber: `090 / ... / ... / ${year}`,
          transportMode: 'Kendaraan Umum / Pribadi',
          destination: '',
          departureDate: today,
          returnDate: today,
          reportResult: 'Kegiatan berjalan dengan lancar dan materi yang disampaikan dapat diterapkan di sekolah.', // Default result
          officials: [
              { name: '....................................', nip: '....................................', rank: '-', role: 'Guru / Pendamping' }
          ],

          // SK Specific
          skConsiderations: 'a. Bahwa untuk menjamin kelancaran proses kegiatan sekolah dipandang perlu menetapkan pembagian tugas.\nb. Bahwa nama-nama yang tercantum dalam lampiran surat keputusan ini dipandang cakap dan mampu melaksanakan tugas.',
          skAppointees: [
              { name: '....................................', role: 'Ketua / Koordinator' },
              { name: '....................................', role: 'Anggota / Pelaksana' },
              { name: '....................................', role: 'Anggota / Pelaksana' }
          ],

          // Workers List (For Absensi & Upah)
          workers: [
              { name: '.....................', role: 'Kepala Tukang' },
              { name: '.....................', role: 'Tukang' },
              { name: '.....................', role: 'Tukang' }
          ]
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

  // --- Dynamic List Handlers ---
  const handleListChange = (index: number, field: string, value: string, listKey: 'workers' | 'skAppointees' | 'officials') => {
      const newList = [...formData[listKey]];
      newList[index] = { ...newList[index], [field]: value };
      setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
  };

  const addListItem = (listKey: 'workers' | 'skAppointees' | 'officials') => {
      let defaultItem: any = { name: '', role: 'Anggota' };
      if (listKey === 'officials') defaultItem = { name: '', nip: '', rank: '-', role: 'Guru' };
      
      setFormData((prev: any) => ({
          ...prev,
          [listKey]: [...prev[listKey], defaultItem]
      }));
  };

  const removeListItem = (index: number, listKey: 'workers' | 'skAppointees' | 'officials') => {
      const newList = [...formData[listKey]];
      if (newList.length > 1) {
          newList.splice(index, 1);
          setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
      }
  };

  // --- PDF GENERATORS ---

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
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR HADIR KEGIATAN', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(data.activityName || '........................................', 105, margin + 6, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Hari/Tanggal : ${data.date}`, margin, margin + 20);
    doc.text(`Tempat       : ${data.projectLocation || data.schoolName}`, margin, margin + 26);
    
    // Use officials list if populated, otherwise create empty rows
    const participants = (data.officials && data.officials.length > 0 && data.officials[0].name !== '') 
        ? data.officials 
        : Array(15).fill({ name: '', role: '' });

    const body = participants.map((p: any, i: number) => [
        i + 1, p.name, p.role, '', ''
    ]);

    autoTable(doc, {
        startY: margin + 35,
        head: [['No', 'Nama Lengkap', 'Jabatan / Unsur', 'Tanda Tangan', 'Ket']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 11, cellPadding: 3, lineWidth: 0.1, lineColor: 0 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 40 },
            3: { cellWidth: 40 },
            4: { cellWidth: 20 }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text(`${data.city}, ${data.date}`, 140, finalY);
    doc.text('Mengetahui,', 140, finalY + 6);
    doc.text('Kepala Sekolah', 140, finalY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 140, finalY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 140, finalY + 40);

    doc.save('Daftar_Hadir.pdf');
  };

  const generateSK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 5, { align: 'center' });
    doc.setFontSize(14);
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 18, 190, margin + 18);

    const titleY = margin + 30;
    doc.setFontSize(12);
    doc.text('KEPUTUSAN KEPALA SEKOLAH', 105, titleY, { align: 'center' });
    doc.text(`NOMOR : ${data.skNumber}`, 105, titleY + 6, { align: 'center' });
    doc.text('TENTANG', 105, titleY + 14, { align: 'center' });
    const titleText = (data.description || 'PENETAPAN ...').toUpperCase();
    const splitTitle = doc.splitTextToSize(titleText, 150);
    doc.text(splitTitle, 105, titleY + 20, { align: 'center' });

    let currentY = titleY + 20 + (splitTitle.length * 6) + 10;
    doc.setFont('times', 'normal');
    
    // Menimbang
    doc.text('Menimbang', margin, currentY);
    doc.text(':', margin + 30, currentY);
    const considerations = data.skConsiderations || 'a. Bahwa...';
    const splitCons = doc.splitTextToSize(considerations, 130);
    doc.text(splitCons, margin + 35, currentY);
    currentY += (splitCons.length * 6) + 6;

    // Mengingat
    doc.text('Mengingat', margin, currentY);
    doc.text(':', margin + 30, currentY);
    const remembering = "1. Undang-Undang Nomor 20 Tahun 2003;\n2. Permendikbud tentang Juknis BOSP;\n3. RKAS Tahun " + data.year;
    const splitRem = doc.splitTextToSize(remembering, 130);
    doc.text(splitRem, margin + 35, currentY);
    currentY += (splitRem.length * 6) + 10;

    // Memutuskan
    doc.setFont('times', 'bold');
    doc.text('MEMUTUSKAN', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFont('times', 'normal');
    doc.text('Menetapkan', margin, currentY);
    doc.text(':', margin + 30, currentY);
    doc.text('PERTAMA', margin + 35, currentY);
    doc.text(`: Menetapkan nama-nama yang tercantum dalam lampiran keputusan ini.`, margin + 60, currentY, { maxWidth: 100, align: 'justify' });
    
    currentY += 10; 
    doc.text('KEDUA', margin + 35, currentY);
    doc.text(`: Biaya dibebankan pada Anggaran BOSP Tahun ${data.year}.`, margin + 60, currentY, { maxWidth: 100, align: 'justify' });

    currentY += 10;
    doc.text('KETIGA', margin + 35, currentY);
    doc.text(`: Keputusan ini berlaku sejak tanggal ditetapkan.`, margin + 60, currentY);

    const signY = currentY + 20;
    doc.text(`Ditetapkan di : ${data.city}`, 130, signY);
    doc.text(`Pada Tanggal  : ${data.date}`, 130, signY + 6);
    doc.text('Kepala Sekolah,', 130, signY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 130, signY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 130, signY + 40);

    // Lampiran
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.text('LAMPIRAN KEPUTUSAN KEPALA SEKOLAH', margin, margin);
    doc.text(`Nomor : ${data.skNumber}`, margin, margin + 6);
    
    const body = (data.skAppointees || []).map((p: any, i: number) => [i+1, p.name, p.role, '']);
    
    autoTable(doc, {
        startY: margin + 20,
        head: [['No', 'Nama', 'Jabatan / Tugas', 'Keterangan']],
        body: body,
        theme: 'grid',
        styles: { font: 'times' }
    });

    doc.save('SK_Penetapan.pdf');
  };

  const generateSPK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERINTAH KERJA (SPK)', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`NOMOR : ${data.spkNumber}`, 105, margin + 6, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    let y = margin + 20;
    doc.text('Yang bertanda tangan di bawah ini:', margin, y);
    y += 8;
    doc.text('1. Nama', margin, y); doc.text(`: ${data.ksName}`, margin + 40, y);
    y += 6;
    doc.text('   Jabatan', margin, y); doc.text(`: Kepala Sekolah`, margin + 40, y);
    y += 6;
    doc.text('   Selanjutnya disebut PIHAK PERTAMA.', margin, y);

    y += 10;
    doc.text('2. Nama', margin, y); doc.text(`: ${data.contractorName}`, margin + 40, y);
    y += 6;
    doc.text('   Pekerjaan', margin, y); doc.text(`: ${data.contractorRole}`, margin + 40, y);
    y += 6;
    doc.text('   Selanjutnya disebut PIHAK KEDUA.', margin, y);

    y += 10;
    const content = `PIHAK PERTAMA memerintahkan PIHAK KEDUA untuk melaksanakan pekerjaan: ${data.description || '.........................'} di ${data.projectLocation}.`;
    const splitContent = doc.splitTextToSize(content, 170);
    doc.text(splitContent, margin, y);
    y += (splitContent.length * 6) + 4;

    doc.text(`Nilai Pekerjaan : ${data.amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(data.amount)) : 'Rp ....................'}`, margin, y);
    
    y += 20;
    doc.text('PIHAK KEDUA', margin + 20, y, { align: 'center' });
    doc.text('PIHAK PERTAMA', 150, y, { align: 'center' });
    
    y += 25;
    doc.setFont('times', 'bold');
    doc.text(`( ${data.contractorName} )`, margin + 20, y, { align: 'center' });
    doc.text(`( ${data.ksName} )`, 150, y, { align: 'center' });

    doc.save('SPK.pdf');
  };

  const generateMOU = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PERJANJIAN KERJASAMA', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`NOMOR : ${data.mouNumber}`, 105, margin + 6, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    let y = margin + 20;
    doc.text('Antara:', margin, y);
    y += 8;
    doc.text(`1. ${data.ksName} (Kepala Sekolah) sebagai PIHAK PERTAMA.`, margin, y);
    y += 8;
    doc.text(`2. ${data.contractorName} (${data.contractorRole}) sebagai PIHAK KEDUA.`, margin, y);

    y += 10;
    const content = `Kedua belah pihak sepakat bekerjasama dalam: ${data.description || '.........................'}.`;
    doc.text(doc.splitTextToSize(content, 170), margin, y);
    
    y += 30;
    doc.text('PIHAK KEDUA', margin + 20, y, { align: 'center' });
    doc.text('PIHAK PERTAMA', 150, y, { align: 'center' });
    
    y += 25;
    doc.setFont('times', 'bold');
    doc.text(`( ${data.contractorName} )`, margin + 20, y, { align: 'center' });
    doc.text(`( ${data.ksName} )`, 150, y, { align: 'center' });

    doc.save('MOU.pdf');
  };

  const generateAbsensiTukang = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR HADIR PEKERJA', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`KEGIATAN: ${data.activityName || '..........................'}`, 105, margin + 6, { align: 'center' });
    
    const body = (data.workers || []).map((w: any, i: number) => [
        i + 1, w.name, w.role, '', '', '', ''
    ]);

    autoTable(doc, {
        startY: margin + 20,
        head: [['No', 'Nama', 'Jabatan', 'H1', 'H2', 'H3', 'Total']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 10, cellPadding: 3, lineWidth: 0.1 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`${data.city}, ${data.date}`, 140, finalY);
    doc.text('Kepala Sekolah', 140, finalY + 6);
    doc.text(`( ${data.ksName} )`, 140, finalY + 30);

    doc.save('Absensi_Tukang.pdf');
  };

  const generateUpahTukang = (data: any) => {
    const doc = new jsPDF('l');
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR PENERIMAAN UPAH', 148, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`KEGIATAN: ${data.activityName || '..........................'}`, 148, margin + 6, { align: 'center' });

    const body = (data.workers || []).map((w: any, i: number) => [
        i + 1, w.name, w.role, '... Hari', 'Rp ...', 'Rp ...', 'Rp ...', ''
    ]);

    autoTable(doc, {
        startY: margin + 20,
        head: [['No', 'Nama', 'Jabatan', 'Jml Hari', 'Upah', 'Bruto', 'Pajak', 'Tanda Tangan']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Lunas Dibayar, Bendahara`, 50, finalY);
    doc.text(`( ${data.trName} )`, 50, finalY + 25);
    
    doc.text(`Setuju Dibayar, Kepala Sekolah`, 200, finalY);
    doc.text(`( ${data.ksName} )`, 200, finalY + 25);

    doc.save('Upah_Tukang.pdf');
  };

  const generateSuratTugas = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 22, 190, margin + 22);

    const titleY = margin + 35;
    doc.setFontSize(12);
    doc.text('SURAT TUGAS', 105, titleY, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text(`NOMOR : ${data.suratTugasNumber}`, 105, titleY + 6, { align: 'center' });

    let currentY = titleY + 20;
    doc.text('Dasar', margin, currentY);
    doc.text(':', margin + 25, currentY);
    const dasar = 'Dokumen Pelaksanaan Anggaran (DPA) / RKAS Sekolah Tahun Anggaran ' + data.year;
    doc.text(dasar, margin + 30, currentY);

    currentY += 15;
    doc.setFont('times', 'bold');
    doc.text('MEMERINTAHKAN :', 105, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFont('times', 'normal');
    doc.text('Kepada', margin, currentY);
    doc.text(':', margin + 25, currentY);

    // List Officials
    let officialY = currentY;
    data.officials.forEach((off: any, idx: number) => {
        doc.text(`${idx + 1}.`, margin + 30, officialY);
        doc.text(`Nama`, margin + 38, officialY);
        doc.text(`: ${off.name}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`NIP`, margin + 38, officialY);
        doc.text(`: ${off.nip}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`Pangkat/Gol`, margin + 38, officialY);
        doc.text(`: ${off.rank}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`Jabatan`, margin + 38, officialY);
        doc.text(`: ${off.role}`, margin + 70, officialY);
        officialY += 10;
    });

    currentY = officialY;
    doc.text('Untuk', margin, currentY);
    doc.text(':', margin + 25, currentY);
    const desc = `Melaksanakan perjalanan dinas dalam rangka ${data.description || '...........................................'} ke ${data.destination || '...........'} pada tanggal ${data.departureDate} s/d ${data.returnDate}.`;
    const splitDesc = doc.splitTextToSize(desc, 135);
    doc.text(splitDesc, margin + 30, currentY);

    const closingY = currentY + (splitDesc.length * 6) + 10;
    doc.text('Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', margin, closingY);

    const signY = closingY + 20;
    doc.text(`Ditetapkan di : ${data.city}`, 140, signY);
    doc.text(`Pada Tanggal  : ${data.date}`, 140, signY + 6);
    doc.text('Kepala Sekolah,', 140, signY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 140, signY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 140, signY + 40);

    doc.save('Surat_Tugas.pdf');
  };

  const generateSPPD = (data: any) => {
    // Generate one SPPD page per Official
    const doc = new jsPDF();
    
    data.officials.forEach((official: any, index: number) => {
        if (index > 0) doc.addPage();

        const margin = 20;
        
        // Header SPPD (Small)
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(`PEMERINTAH KABUPATEN/KOTA`, margin, 15);
        doc.text('DINAS PENDIDIKAN', margin, 20);
        doc.text(data.schoolName.toUpperCase(), margin, 25);
        
        doc.setFontSize(9);
        doc.text('Lembar ke : ............', 140, 15);
        doc.text('Kode No   : ............', 140, 20);
        doc.text('Nomor     : ' + data.sppdNumber, 140, 25);

        const titleY = 40;
        doc.setFontSize(12);
        doc.text('SURAT PERINTAH PERJALANAN DINAS', 105, titleY, { align: 'center' });
        doc.text('(SPPD)', 105, titleY + 6, { align: 'center' });

        // Table Content
        const tableBody = [
            ['1.', 'Pejabat berwenang yang memberi perintah', `Kepala ${data.schoolName}`],
            ['2.', 'Nama Pegawai yang diperintah', official.name],
            ['3.', 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', `a. ${official.rank}\nb. ${official.role}\nc. C`],
            ['4.', 'Maksud Perjalanan Dinas', data.description || '...........................................'],
            ['5.', 'Alat Angkutan yang dipergunakan', data.transportMode || 'Kendaraan Umum'],
            ['6.', 'a. Tempat Berangkat\nb. Tempat Tujuan', `a. ${data.schoolName}\nb. ${data.destination}`],
            ['7.', 'a. Lamanya Perjalanan Dinas\nb. Tanggal Berangkat\nc. Tanggal Harus Kembali', `a. 1 (Satu) Hari\nb. ${data.departureDate}\nc. ${data.returnDate}`],
            ['8.', 'Pembebanan Anggaran\na. Instansi\nb. Mata Anggaran', `\na. Dinas Pendidikan\nb. BOSP ${data.year}`],
            ['9.', 'Keterangan Lain-lain', 'Lihat Sebelah']
        ];

        autoTable(doc, {
            startY: 55,
            head: [['No', 'Uraian', 'Keterangan']],
            body: tableBody,
            theme: 'grid',
            styles: { font: 'times', fontSize: 10, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 80 },
                2: { cellWidth: 80 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('times', 'normal');
        doc.text(`Ditetapkan di : ${data.city}`, 130, finalY);
        doc.text(`Pada Tanggal  : ${data.date}`, 130, finalY + 5);
        doc.text('Kepala Sekolah,', 130, finalY + 15);
        doc.setFont('times', 'bold');
        doc.text(`( ${data.ksName} )`, 130, finalY + 35);
        doc.setFont('times', 'normal');
        doc.text(`NIP. ${data.ksNip}`, 130, finalY + 40);
    });

    doc.save('SPPD_Perjalanan_Dinas.pdf');
  };

  const generateDaftarTransport = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR PENERIMAAN UANG TRANSPORT', 105, margin, { align: 'center' });
    doc.text('PERJALANAN DINAS', 105, margin + 6, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`Kegiatan        : ${data.description || '...........................................'}`, margin, margin + 20);
    doc.text(`Hari/Tanggal : ${data.date}`, margin, margin + 26);
    doc.text(`Tempat          : ${data.destination || '...........................................'}`, margin, margin + 32);

    const transportPerPerson = data.amount ? Number(data.amount) : 0;
    
    const body = (data.officials || []).map((off: any, i: number) => [
        i + 1, off.name, `${data.schoolName} - ${data.destination}`, new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transportPerPerson), ''
    ]);

    // Total Row
    const totalAmount = transportPerPerson * (data.officials ? data.officials.length : 0);
    body.push(['', 'TOTAL', '', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount), '']);

    autoTable(doc, {
        startY: margin + 40,
        head: [['No', 'Nama Pegawai', 'Rute Perjalanan', 'Uang Transport', 'Tanda Tangan']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 11, cellPadding: 3, lineWidth: 0.1, lineColor: 0 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            3: { halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.row.index === body.length - 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.text('Setuju Dibayar,', 20, finalY);
    doc.text('Lunas Dibayar,', 85, finalY);
    doc.text('Mengetahui,', 150, finalY); // Changed position logic
    
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Bendahara', 85, finalY + 5);
    doc.text('Kepala Sekolah', 150, finalY + 5); // Usually KS signs twice or just once

    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 20, finalY + 25);
    doc.text(`( ${data.trName} )`, 85, finalY + 25);
    doc.text(`( ${data.ksName} )`, 150, finalY + 25);
    
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 20, finalY + 30);
    doc.text(`NIP. ${data.trNip}`, 85, finalY + 30);
    doc.text(`NIP. ${data.ksNip}`, 150, finalY + 30);

    doc.save('Daftar_Transport.pdf');
  };

  const generateLaporanSPPD = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 22, 190, margin + 22);

    const titleY = margin + 35;
    doc.setFontSize(12);
    doc.text('LAPORAN PERJALANAN DINAS', 105, titleY, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let y = titleY + 15;

    // I. Pendahuluan
    doc.setFont('times', 'bold');
    doc.text('I. DASAR', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text(`Surat Tugas Kepala Sekolah Nomor: ${data.suratTugasNumber} Tanggal ${data.date}`, margin + 5, y);
    
    y += 10;
    doc.setFont('times', 'bold');
    doc.text('II. MAKSUD DAN TUJUAN', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    const splitTujuan = doc.splitTextToSize(data.description || 'Melaksanakan tugas dinas...', 165);
    doc.text(splitTujuan, margin + 5, y);
    y += (splitTujuan.length * 5) + 5;

    // III. Pelaksanaan
    doc.setFont('times', 'bold');
    doc.text('III. WAKTU DAN TEMPAT', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text(`Hari / Tanggal : ${data.date}`, margin + 5, y);
    y += 6;
    doc.text(`Tempat            : ${data.destination}`, margin + 5, y);
    
    y += 10;
    doc.setFont('times', 'bold');
    doc.text('IV. PETUGAS', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    data.officials.forEach((off: any, i: number) => {
        doc.text(`${i + 1}. ${off.name} (${off.role})`, margin + 5, y);
        y += 6;
    });

    y += 5;
    doc.setFont('times', 'bold');
    doc.text('V. HASIL KEGIATAN', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    const resultText = data.reportResult || 'Kegiatan telah dilaksanakan dengan baik.';
    const splitResult = doc.splitTextToSize(resultText, 165);
    doc.text(splitResult, margin + 5, y);
    y += (splitResult.length * 5) + 5;

    // VI. Penutup
    doc.setFont('times', 'bold');
    doc.text('VI. PENUTUP', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text('Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya.', margin + 5, y);

    // Signatures
    y += 20;
    doc.text(`${data.city}, ${data.date}`, 140, y);
    y += 6;
    doc.text('Pelapor / Petugas,', 140, y);
    
    y += 25;
    doc.setFont('times', 'bold');
    // Assuming the first official is the main reporter
    doc.text(`( ${data.officials[0]?.name || '.......................'} )`, 140, y);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.officials[0]?.nip || '.......................'}`, 140, y + 5);

    doc.save('Laporan_SPPD.pdf');
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
          case 'surat_tugas': generateSuratTugas(formData); break;
          case 'sppd': generateSPPD(formData); break;
          // New Cases
          case 'daftar_transport': generateDaftarTransport(formData); break;
          case 'laporan_sppd': generateLaporanSPPD(formData); break;
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
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Menimbang (Konsideran)</label>
                        <textarea 
                            name="skConsiderations" 
                            value={formData.skConsiderations} 
                            onChange={handleInputChange} 
                            className="w-full border rounded px-2 py-1 text-sm h-24" 
                            placeholder="a. Bahwa..." 
                        />
                    </div>
                    <div className="mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Nama yang Ditetapkan (Lampiran)</label>
                        {formData.skAppointees && formData.skAppointees.map((person: any, idx: number) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={person.name} 
                                    onChange={(e) => handleListChange(idx, 'name', e.target.value, 'skAppointees')}
                                    className="flex-1 border rounded px-2 py-1 text-xs" 
                                    placeholder="Nama Lengkap" 
                                />
                                <input 
                                    type="text" 
                                    value={person.role} 
                                    onChange={(e) => handleListChange(idx, 'role', e.target.value, 'skAppointees')}
                                    className="flex-1 border rounded px-2 py-1 text-xs" 
                                    placeholder="Jabatan" 
                                />
                                <button type="button" onClick={() => removeListItem(idx, 'skAppointees')} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addListItem('skAppointees')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                            <Plus size={14}/> Tambah Nama
                        </button>
                    </div>
                  </>
              )}

              {/* Peradin Group */}
              {(currentTemplateType === 'surat_tugas' || currentTemplateType === 'sppd' || currentTemplateType === 'daftar_transport' || currentTemplateType === 'laporan_sppd') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Nomor {currentTemplateType === 'surat_tugas' ? 'Surat Tugas' : 'SPPD'}</label>
                            <input 
                                type="text" 
                                name={currentTemplateType === 'surat_tugas' ? 'suratTugasNumber' : 'sppdNumber'} 
                                value={currentTemplateType === 'surat_tugas' ? formData.suratTugasNumber : formData.sppdNumber} 
                                onChange={handleInputChange} 
                                className="w-full border rounded px-2 py-1 text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tujuan Perjalanan</label>
                            <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Dinas Pendidikan" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tgl Berangkat</label>
                            <input type="text" name="departureDate" value={formData.departureDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tgl Kembali</label>
                            <input type="text" name="returnDate" value={formData.returnDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Maksud / Keperluan</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Mengikuti Workshop..." />
                    </div>
                    
                    {currentTemplateType === 'sppd' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Alat Angkut</label>
                            <input type="text" name="transportMode" value={formData.transportMode} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    )}

                    {currentTemplateType === 'daftar_transport' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Besaran Transport (Per Orang)</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                        </div>
                    )}

                    {currentTemplateType === 'laporan_sppd' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Hasil Kegiatan (Laporan)</label>
                            <textarea name="reportResult" value={formData.reportResult} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm h-24" placeholder="Hasil kegiatan..." />
                        </div>
                    )}

                    <div className="mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pegawai yang Ditugaskan</label>
                        {formData.officials && formData.officials.map((person: any, idx: number) => (
                            <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        value={person.name} 
                                        onChange={(e) => handleListChange(idx, 'name', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Nama Lengkap" 
                                    />
                                    <input 
                                        type="text" 
                                        value={person.nip} 
                                        onChange={(e) => handleListChange(idx, 'nip', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="NIP" 
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={person.rank} 
                                        onChange={(e) => handleListChange(idx, 'rank', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Pangkat/Golongan" 
                                    />
                                    <input 
                                        type="text" 
                                        value={person.role} 
                                        onChange={(e) => handleListChange(idx, 'role', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Jabatan" 
                                    />
                                    <button type="button" onClick={() => removeListItem(idx, 'officials')} className="text-red-500 p-1"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addListItem('officials')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                            <Plus size={14}/> Tambah Pegawai
                        </button>
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
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Lokasi</label>
                                <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pekerja</label>
                                {formData.workers && formData.workers.map((worker: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={worker.name} 
                                            onChange={(e) => handleListChange(idx, 'name', e.target.value, 'workers')}
                                            className="flex-1 border rounded px-2 py-1 text-xs" 
                                            placeholder="Nama Pekerja" 
                                        />
                                        <input 
                                            type="text" 
                                            value={worker.role} 
                                            onChange={(e) => handleListChange(idx, 'role', e.target.value, 'workers')}
                                            className="flex-1 border rounded px-2 py-1 text-xs" 
                                            placeholder="Jabatan (Tukang/Pekerja)" 
                                        />
                                        <button type="button" onClick={() => removeListItem(idx, 'workers')} className="text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addListItem('workers')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                                    <Plus size={14}/> Tambah Pekerja
                                </button>
                            </div>
                        </>
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
          case 'peradin':
              return (
                  <>
                    <button onClick={() => openPrintModal('surat_tugas')} className="btn-template"><FileSignature size={14} className="text-blue-500"/> Surat Tugas</button>
                    <button onClick={() => openPrintModal('sppd')} className="btn-template"><Bus size={14} className="text-green-500"/> SPPD</button>
                    <button onClick={() => openPrintModal('daftar_transport')} className="btn-template"><DollarSign size={14} className="text-teal-600"/> Daftar Transport</button>
                    <button onClick={() => openPrintModal('laporan_sppd')} className="btn-template"><FileCheck size={14} className="text-orange-500"/> Laporan Perjalanan</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-purple-500"/> Kuitansi Transport</button>
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

        <div className="flex bg-gray-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'templates' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Template Dokumen
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'upload' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Bukti Realisasi
          </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
          {/* Left: Budget List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari SPJ..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="py-10 text-center">
                    <Loader2 className="animate-spin text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Memuat data SPJ...</p>
                  </div>
                ) : filteredBudgets.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-lg">
                    <p className="text-xs text-gray-400">Tidak ada data SPJ ditemukan.</p>
                  </div>
                ) : (
                  filteredBudgets.map(budget => (
                    <div key={budget.id} className="space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {budget.account_code || 'Tanpa Kode'}
                      </div>
                      {budget.realizations?.map((real, idx) => (
                        <button
                          key={`${budget.id}-${idx}`}
                          onClick={() => handleSelectRealization(budget, idx)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedBudget?.id === budget.id && selectedRealizationIndex === idx
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-xs font-medium text-gray-800 line-clamp-1">{budget.description}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-gray-500">
                              {MONTHS[real.month - 1]} {real.target_month && `(Untuk ${MONTHS[real.target_month - 1]})`}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-blue-600">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(real.amount)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Upload Interface */}
          <div className="lg:col-span-8">
            {selectedBudget && selectedRealizationIndex !== -1 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{selectedBudget.description}</h3>
                    <p className="text-xs text-gray-500">
                      Realisasi Bulan {MONTHS[selectedBudget.realizations![selectedRealizationIndex].month - 1]} 
                      {selectedBudget.realizations![selectedRealizationIndex].target_month && ` - Peruntukan ${MONTHS[selectedBudget.realizations![selectedRealizationIndex].target_month! - 1]}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleProcessAi(selectedBudget)}
                      disabled={isAiLoading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Refresh Analisis AI
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                    <h4 className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-1">
                      <AlertCircle size={14} /> Analisis Bukti Fisik Dibutuhkan:
                    </h4>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Berdasarkan Juknis BOSP 2026, transaksi ini memerlukan dokumen berikut untuk dinyatakan sah dalam audit.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {suggestedEvidence.map((evidence, idx) => {
                      const existingFile = selectedBudget.realizations![selectedRealizationIndex].evidence_files?.find(f => f.type === evidence);
                      const isUploading = uploadProgress[evidence];

                      return (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 transition-all">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg ${existingFile ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                              {existingFile ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">{evidence}</div>
                              {existingFile ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Terunggah
                                  </span>
                                  <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{existingFile.name}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400 mt-1 italic">Belum ada file</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            {existingFile && (
                              <a 
                                href={existingFile.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lihat File"
                              >
                                <Eye size={18} />
                              </a>
                            )}
                            
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                              isUploading 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : existingFile 
                                  ? 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            }`}>
                              {isUploading ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <Upload size={14} />
                                  {existingFile ? 'Ganti File' : 'Upload Bukti'}
                                </>
                              )}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(evidence, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px]">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Upload className="text-blue-200" size={40} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Pilih Realisasi SPJ</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Silakan pilih salah satu item realisasi dari daftar di sebelah kiri untuk mulai mengunggah bukti fisik pendukung.
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-blue-600 font-bold text-lg mb-1">1</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pilih Item</div>
                    <div className="text-xs text-gray-400 mt-1">Pilih belanja yang sudah direalisasikan</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-blue-600 font-bold text-lg mb-1">2</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Analisis AI</div>
                    <div className="text-xs text-gray-400 mt-1">AI akan menentukan bukti fisik yang sah</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-blue-600 font-bold text-lg mb-1">3</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Upload & Simpan</div>
                    <div className="text-xs text-gray-400 mt-1">Unggah foto/PDF bukti ke database</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INPUT DATA */}
      {isPrintModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Printer size={18} className="text-blue-600" /> Isi Data Dokumen
                      </h3>
                      <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <form id="printForm" onSubmit={handlePrint}>
                          {renderFormFields()}
                      </form>
                  </div>
                  
                  <div className="p-6 border-t border-gray-100 bg-white">
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-50">Batal</button>
                          <button type="submit" form="printForm" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
                              <Download size={18} /> Generate PDF
                          </button>
                      </div>
                  </div>
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
