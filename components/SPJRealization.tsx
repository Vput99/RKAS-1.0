import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Budget, TransactionType, RealizationDetail, SchoolProfile } from '../types';
import { FileText, Save, X, Search, CheckCircle2, FileCheck2, CheckSquare, Square, Sparkles, Loader2, Filter, TrendingUp, ListChecks, ArrowRightCircle, Printer } from 'lucide-react';
import { suggestEvidenceList } from '../lib/gemini';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SPJRealizationProps {
  data: Budget[];
  profile: SchoolProfile | null;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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

const SPJRealization: React.FC<SPJRealizationProps> = ({ data, profile, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0);
  const [formAmount, setFormAmount] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formVendor, setFormVendor] = useState<string>('');
  const [formVendorAccount, setFormVendorAccount] = useState<string>('');
  const [formTargetMonth, setFormTargetMonth] = useState<number | null>(null);
  const [editingRealizationIndex, setEditingRealizationIndex] = useState<number>(-1);
  const [batchAmounts, setBatchAmounts] = useState<Record<string, number>>({});
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({});
  const [formDate, setFormDate] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [evidenceItems, setEvidenceItems] = useState<string[]>([]);
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const calculateMonthlyAllocation = (item: Budget, month: number) => {
    const plannedMonths = item.realization_months && item.realization_months.length > 0
      ? [...item.realization_months].sort((a, b) => a - b)
      : [1];

    const totalAmount = item.amount;
    const plannedAmountPerMonth = totalAmount / plannedMonths.length;
    const passedPlannedMonths = plannedMonths.filter(m => m <= month);

    if (passedPlannedMonths.length === 0) return 0;
    const totalPlannedUntilNow = plannedAmountPerMonth * passedPlannedMonths.length;
    const totalRealizedUntilNow = item.realizations?.reduce((s, r) => s + r.amount, 0) || 0;
    const available = Math.max(0, totalPlannedUntilNow - totalRealizedUntilNow);
    const realizedThisMonth = item.realizations?.filter(r => r.month === month).reduce((s, r) => s + r.amount, 0) || 0;

    return Math.round(available + realizedThisMonth);
  };

  const expensesInMonth = useMemo(() => {
    return data.filter(d => {
      if (d.type !== TransactionType.EXPENSE || d.status === 'rejected') return false;
      if (!d.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      const realizedThisView = d.realizations?.filter(r => r.month === viewMonth).reduce((s, r) => s + r.amount, 0) || 0;
      if (realizedThisView > 0) return true;
      const allocation = calculateMonthlyAllocation(d, viewMonth);
      if (allocation > 0) return true;
      return false;
    }).sort((a, b) => {
      const aRealized = a.realizations?.some(r => r.month === viewMonth);
      const bRealized = b.realizations?.some(r => r.month === viewMonth);
      if (aRealized && !bRealized) return -1;
      if (!aRealized && bRealized) return 1;
      return a.description.localeCompare(b.description);
    });
  }, [data, viewMonth, searchTerm]);

  const monthStats = useMemo(() => {
    let totalPotensiBulanIni = 0;
    let totalRealized = 0;
    let totalPaguBulanIni = 0;
    expensesInMonth.forEach(item => {
      const monthlyAllocation = calculateMonthlyAllocation(item, viewMonth);
      const realizedInThisMonth = item.realizations?.filter(r => r.month === viewMonth).reduce((s, r) => s + r.amount, 0) || 0;
      const sisa = Math.max(0, monthlyAllocation - realizedInThisMonth);
      totalPaguBulanIni += monthlyAllocation;
      totalRealized += realizedInThisMonth;
      totalPotensiBulanIni += sisa;
    });
    const visualPaguBase = Math.max(totalPaguBulanIni, totalRealized);
    return { totalPotensiBulanIni, totalRealized, totalPaguBulanIni: visualPaguBase };
  }, [expensesInMonth, viewMonth]);

  const handleOpenSPJ = (item: Budget) => {
    setSelectedBudget(item);
    setSelectedBatchIds([item.id]);
    selectMonthForEditing(item, viewMonth);
    const items = getEvidenceList(item.description, item.account_code);
    setEvidenceItems(items);
    setIsModalOpen(true);
  };

  const handleBatchSPJ = () => {
    if (selectedBatchIds.length === 0) return;
    const firstItem = data.find(d => d.id === selectedBatchIds[0]);
    if (!firstItem) return;
    setSelectedBudget(null);
    setActiveMonthIndex(viewMonth);
    const lastDay = new Date(2026, viewMonth, 0).getDate();
    setFormDate(`2026-${viewMonth.toString().padStart(2, '0')}-${lastDay}`);
    setFormVendor('');
    setExistingFileName('');
    setCheckedEvidence([]);
    const amounts: Record<string, number> = {};
    const quantities: Record<string, number> = {};
    selectedBatchIds.forEach(id => {
      const item = data.find(d => d.id === id);
      if (item) {
        const monthlyAlloc = calculateMonthlyAllocation(item, viewMonth);
        const totalRealizedQty = item.realizations?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
        const remainingQty = (item.quantity || 1) - totalRealizedQty;
        const existing = item.realizations?.find(r => r.month === viewMonth);
        amounts[id] = existing ? existing.amount : monthlyAlloc;
        quantities[id] = existing ? (existing.quantity || remainingQty) : remainingQty;
      }
    });
    setBatchAmounts(amounts);
    setBatchQuantities(quantities);
    const items = getEvidenceList(firstItem.description, firstItem.account_code);
    setEvidenceItems(items);
    setIsModalOpen(true);
  };

  const handleGetAIEvidence = async () => {
    const item = selectedBudget || data.find(d => d.id === selectedBatchIds[0]);
    if (!item) return;
    setIsAiLoading(true);
    const aiSuggestions = await suggestEvidenceList(item.description, item.account_code || '');
    if (aiSuggestions && aiSuggestions.length > 0) {
      setEvidenceItems(aiSuggestions);
      setCheckedEvidence(prev => prev.filter(p => aiSuggestions.includes(p)));
    }
    setIsAiLoading(false);
  };

  const selectMonthForEditing = (item: Budget, month: number) => {
    setActiveMonthIndex(month);
    setEditingRealizationIndex(-1);
    const monthlyRealizations = item.realizations?.filter(r => r.month === month) || [];
    setCheckedEvidence([]);
    if (monthlyRealizations.length > 0) {
      const first = monthlyRealizations[0];
      setFormAmount(first.amount.toString());
      setFormQuantity((first.quantity || 0).toString());
      setFormNotes(first.notes || '');
      setFormVendor(first.vendor || '');
      setFormVendorAccount(first.vendor_account || '');
      setFormTargetMonth(first.target_month ?? null);
      setFormDate(first.date.split('T')[0]);
      setExistingFileName(first.evidence_file || '');
      setEditingRealizationIndex(item.realizations?.indexOf(first) ?? -1);
    } else {
      const monthlyAlloc = calculateMonthlyAllocation(item, month);
      const totalQuantityRealizedBefore = item.realizations?.reduce((sum, r) => sum + (r.quantity || 0), 0) || 0;
      const remainingQuantity = (item.quantity || 1) - totalQuantityRealizedBefore;
      setFormAmount(monthlyAlloc > 0 ? monthlyAlloc.toString() : '0');
      setFormQuantity(remainingQuantity > 0 ? remainingQuantity.toString() : '0');
      setFormNotes('');
      setFormVendor('');
      setFormVendorAccount('');
      setFormTargetMonth(month);
      const lastDay = new Date(2026, month, 0).getDate();
      setFormDate(`2026-${month.toString().padStart(2, '0')}-${lastDay}`);
      setExistingFileName('');
    }
  };

  const handleSingleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormQuantity(val);
    if (selectedBudget) {
      const price = selectedBudget.unit_price || (selectedBudget.quantity ? selectedBudget.amount / selectedBudget.quantity : 0);
      if (price > 0) {
        const qty = parseFloat(val) || 0;
        setFormAmount((qty * price).toFixed(0));
      }
    }
  };

  const handleBatchQuantityChange = (id: string, val: string) => {
    const qty = parseFloat(val) || 0;
    setBatchQuantities(prev => ({ ...prev, [id]: qty }));
    const item = data.find(d => d.id === id);
    if (item) {
      const price = item.unit_price || (item.quantity ? item.amount / item.quantity : 0);
      if (price > 0) {
        setBatchAmounts(prev => ({ ...prev, [id]: Math.round(qty * price) }));
      }
    }
  };

  const toggleEvidence = (item: string) => {
    setCheckedEvidence(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleRowSelection = (id: string) => {
    setSelectedBatchIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveSPJ = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatchIds.length > 0 && isBatchMode) {
      selectedBatchIds.forEach(id => {
        const item = data.find(d => d.id === id);
        if (!item) return;
        const amountToSave = batchAmounts[id] || 0;
        const quantityToSave = batchQuantities[id] || 1;
        const newRealization: RealizationDetail = {
          month: activeMonthIndex,
          target_month: formTargetMonth || activeMonthIndex,
          amount: amountToSave,
          quantity: quantityToSave,
          date: new Date(formDate).toISOString(),
          vendor: formVendor,
          vendor_account: formVendorAccount,
          evidence_file: existingFileName || 'Nota Kolektif',
          notes: formNotes
        };
        const currentRealizations = item.realizations || [];
        const otherRealizations = currentRealizations.filter(r => r.month !== activeMonthIndex);
        const updatedRealizations = [...otherRealizations, newRealization];
        onUpdate(id, { realizations: updatedRealizations });
      });
    } else if (selectedBudget) {
      const newRealization: RealizationDetail = {
        month: activeMonthIndex,
        target_month: formTargetMonth || activeMonthIndex,
        amount: Number(formAmount),
        quantity: Number(formQuantity),
        date: new Date(formDate).toISOString(),
        vendor: formVendor,
        vendor_account: formVendorAccount,
        evidence_file: existingFileName || 'Nota',
        notes: formNotes
      };
      const currentRealizations = [...(selectedBudget.realizations || [])];
      if (editingRealizationIndex >= 0) {
        currentRealizations[editingRealizationIndex] = newRealization;
      } else {
        currentRealizations.push(newRealization);
      }
      onUpdate(selectedBudget.id, { realizations: currentRealizations });
    }
    setIsModalOpen(false);
    setSelectedBudget(null);
    setSelectedBatchIds([]);
    setEditingRealizationIndex(-1);
  };

  const handleExportPDF = () => {
    const item = selectedBudget || (selectedBatchIds.length > 0 ? data.find(d => d.id === selectedBatchIds[0]) : null);
    if (!item) return;
    
    const doc = new jsPDF();
    const title = 'BUKTI PENGELUARAN KAS (KUITANSI)';
    const startY = generatePDFHeader(doc, profile, title);

    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['Keterangan', 'Detail']],
      body: [
        ['No. Bukti', `SPJ/${activeMonthIndex}/${item.id.substring(0, 5)}`],
        ['Tahun Anggaran', profile?.fiscalYear || '2026'],
        ['Sudah Terima Dari', profile?.name || 'Sekolah'],
        ['Jumlah Uang', formatCurrency(Number(formAmount) || 0)],
        ['Uraian Pembayaran', item.description],
        ['Nama Toko / Penerima', formVendor || '-'],
        ['Tanggal', formDate || new Date().toISOString().split('T')[0]],
      ],
      theme: 'grid',
    });

    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 20);
    doc.save(`Kuitansi_${item.description.substring(0, 15)}_${activeMonthIndex}.pdf`);
  };

  const handleDeleteSPJ = () => {
    if (!selectedBudget) return;
    if (!confirm(`Hapus data realisasi ini?`)) return;
    const currentRealizations = [...(selectedBudget.realizations || [])];
    if (editingRealizationIndex >= 0) {
      currentRealizations.splice(editingRealizationIndex, 1);
      onUpdate(selectedBudget.id, { realizations: currentRealizations });
      const remainingForMonth = currentRealizations.filter(r => r.month === activeMonthIndex);
      if (remainingForMonth.length > 0) {
        const first = remainingForMonth[0];
        setFormAmount(first.amount.toString());
        setFormQuantity((first.quantity || 0).toString());
        setFormNotes(first.notes || '');
        setFormVendor(first.vendor || '');
        setFormVendorAccount(first.vendor_account || '');
        setFormDate(first.date.split('T')[0]);
        setEditingRealizationIndex(currentRealizations.indexOf(first));
      } else {
        selectMonthForEditing(selectedBudget, activeMonthIndex);
      }
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const isBatchMode = !selectedBudget && selectedBatchIds.length > 0;
  const showDeleteButton = !isBatchMode && selectedBudget && editingRealizationIndex >= 0;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 rounded-full blur-[80px] -mr-20 -mt-20 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-blue-100/80 rounded-xl text-blue-600 shadow-inner">
                <FileCheck2 size={20} className="text-blue-600" />
             </div>
             <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100/50 shadow-sm">SPJ</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Peng-SPJ-an & Realisasi</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Input realisasi bulanan sesuai pagu.</p>
        </div>
        <div className="relative w-full md:w-auto z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari kegiatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm transition-all md:w-64 placeholder-slate-400"
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl p-3 rounded-[1.5rem] border border-white/80 shadow-xl shadow-blue-900/5 flex overflow-x-auto gap-2 no-scrollbar">
        {MONTHS.map((m, idx) => {
          const monthNum = idx + 1;
          const isActive = viewMonth === monthNum;
          return (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={monthNum}
              onClick={() => { setViewMonth(monthNum); setSelectedBatchIds([]); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-50 text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-md'
                }`}
            >
              {m}
            </motion.button>
          )
        })}
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-[2rem] border border-blue-400/30 shadow-xl shadow-blue-900/10 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />
          <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-1 opacity-90">Potensi Belanja</p>
          <h3 className="text-3xl font-black tracking-tight drop-shadow-md">{formatRupiah(monthStats.totalPotensiBulanIni)}</h3>
          <p className="text-[10px] text-blue-200 mt-2 font-bold uppercase">Total Pagu: {formatRupiah(monthStats.totalPaguBulanIni)}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl flex items-center justify-between group">
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Sudah Di-SPJ-kan</p>
            <h3 className={`text-3xl font-black ${monthStats.totalRealized > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
              {formatRupiah(monthStats.totalRealized)}
            </h3>
          </div>
          <div className={`p-4 rounded-2xl transition-colors ${monthStats.totalRealized > 0 ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' : 'bg-slate-50 text-slate-300'}`}>
            <TrendingUp size={28} />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl flex flex-col justify-center">
          <div className="flex justify-between items-center text-xs mb-3">
            <span className="font-black text-slate-400 uppercase tracking-widest">Serapan</span>
            <span className="font-black text-blue-600 text-lg">
              {monthStats.totalPaguBulanIni > 0 ? ((monthStats.totalRealized / monthStats.totalPaguBulanIni) * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${monthStats.totalPaguBulanIni > 0 ? Math.min((monthStats.totalRealized / monthStats.totalPaguBulanIni) * 100, 100) : 0}%` }}
              className={`h-full rounded-full ${monthStats.totalRealized >= monthStats.totalPaguBulanIni ? 'bg-emerald-500' : 'bg-blue-500'}`}
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden relative">
        <div className="px-6 py-5 bg-white/40 border-b border-slate-100/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-lg"><Filter size={16} className="text-slate-500" /></div>
            <h3 className="text-sm font-black text-slate-700 tracking-tight">Data {MONTHS[viewMonth - 1]}</h3>
          </div>

          <AnimatePresence>
            {selectedBatchIds.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleBatchSPJ}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                <ListChecks size={16} /> SPJ Kolektif ({selectedBatchIds.length})
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100/80">
              <tr>
                <th className="px-5 py-4 w-10 text-center"><CheckSquare size={16} className="mx-auto text-slate-400" /></th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] w-1/3">Uraian Kegiatan</th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Pagu</th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Realisasi</th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-center">Status</th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Penyedia</th>
                <th className="px-5 py-4 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 bg-white/40">
              <AnimatePresence>
                {expensesInMonth.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <FileText size={48} className="opacity-20" />
                        <p className="font-semibold text-sm">Tidak ada kegiatan tersisa untuk bulan ini.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  expensesInMonth.flatMap((item) => {
                    const monthlyAllocation = calculateMonthlyAllocation(item, viewMonth);
                    const realizationsThisMonth = item.realizations?.filter(r => r.month === viewMonth) || [];
                    const totalRealizedThisMonth = realizationsThisMonth.reduce((s, r) => s + r.amount, 0);
                    const isDone = totalRealizedThisMonth > 0;
                    const isSelected = selectedBatchIds.includes(item.id);
                    const isRollover = !item.realization_months?.includes(viewMonth) && monthlyAllocation > 0;

                    if (realizationsThisMonth.length > 1) {
                      return realizationsThisMonth.map((r, idx) => (
                        <motion.tr 
                          key={`${item.id}-real-${idx}`} 
                          className={`transition-colors group ${isSelected ? 'bg-indigo-50/80 shadow-inner' : 'hover:bg-white'}`}
                        >
                          <td className="px-5 py-4 text-center">
                            <button onClick={() => toggleRowSelection(item.id)} className={`transition ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800 tracking-tight leading-snug">
                              {item.description}
                              <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-2 font-black uppercase shadow-sm border border-blue-100/50">
                                {r.target_month !== undefined ? MONTHS[r.target_month - 1] : MONTHS[viewMonth - 1]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded border">{item.account_code || '-'}</span>
                              {r.notes && <span className="text-[10px] text-slate-400 italic font-medium">• {r.notes}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-500 font-semibold text-xs">
                            {idx === 0 ? formatRupiah(monthlyAllocation) : '-'}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-black text-emerald-600 tracking-tight">
                            {formatRupiah(r.amount)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> SPJ #{idx + 1}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={r.vendor}>{r.vendor || '-'}</div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleOpenSPJ(item)} className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition shadow-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200">
                              Edit
                            </motion.button>
                          </td>
                        </motion.tr>
                      ));
                    }

                    const realizedAmount = realizationsThisMonth[0]?.amount || 0;
                    return (
                      <motion.tr 
                        key={item.id} 
                        className={`transition-colors group ${isSelected ? 'bg-indigo-50/80 shadow-inner' : 'hover:bg-white'}`}
                      >
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => toggleRowSelection(item.id)} className={`transition ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 tracking-tight leading-snug">
                            {item.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 px-1.5 py-0.5 rounded border">{item.account_code || '-'}</span>
                            {isRollover && !isDone && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1 font-black shadow-sm uppercase">
                                <ArrowRightCircle size={10} strokeWidth={2.5} /> Luncuran
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-mono text-blue-600 font-bold bg-blue-50/30">
                          {formatRupiah(monthlyAllocation)}
                        </td>
                        <td className="px-5 py-4 text-right font-mono font-black tracking-tight">
                          <span className={realizedAmount > 0 ? 'text-emerald-600' : 'text-slate-300'}>
                            {formatRupiah(realizedAmount)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                              <CheckCircle2 size={12} strokeWidth={3} /> SPJ OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-transparent">
                              <Square size={12} strokeWidth={3} /> Belum
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={realizationsThisMonth[0]?.vendor}>{realizationsThisMonth[0]?.vendor || '-'}</div>
                        </td>
                        <td className="px-5 py-4 text-right border-l border-slate-100/50">
                          <motion.button 
                            whileHover={{ scale: 1.05 }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={() => handleOpenSPJ(item)} 
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${isDone
                                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-md'
                              }`}
                          >
                            {isDone ? 'Edit' : 'Input SPJ'}
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (selectedBudget || selectedBatchIds.length > 0) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative z-20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                    {isBatchMode ? <ListChecks size={24} /> : <FileCheck2 size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isBatchMode ? 'Input Realisasi Kolektif' : 'Input Realisasi (SPJ)'}</h3>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Lengkapi data bukti fisik</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isBatchMode && (
                    <button 
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-sm"
                    >
                      <Printer size={14} /> Cetak Kuitansi
                    </button>
                  )}
                  <button onClick={() => { setIsModalOpen(false); setSelectedBatchIds([]); }} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={20} className="text-slate-500" /></button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden relative z-10">
                {(!isBatchMode && (selectedBudget?.realization_months?.length || 0) > 1) && (
                  <div className="w-48 bg-slate-50/50 border-r border-slate-100 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Pilih Bulan</p>
                    {selectedBudget?.realization_months?.sort((a, b) => a - b).map(m => {
                      const isDone = selectedBudget.realizations?.some(r => r.month === m);
                      const isActive = activeMonthIndex === m;
                      return (
                        <button key={m} onClick={() => selectedBudget && selectMonthForEditing(selectedBudget, m)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}
                        >
                          {MONTHS[m - 1]}
                          {isDone && <CheckCircle2 size={16} className={isActive ? 'text-blue-200' : 'text-emerald-500'} />}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                  <form onSubmit={handleSaveSPJ} className="space-y-8">
                    {/* Simplified Form View for Conciseness in Tool Call */}
                    {isBatchMode ? (
                      <div className="space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-[1.5rem] border border-indigo-100 flex gap-4 items-center">
                          <ListChecks className="text-indigo-500" size={32} />
                          <div><p className="font-black text-indigo-900">Mode Kolektif Aktif</p><p className="text-xs font-medium text-indigo-700">Input untuk {selectedBatchIds.length} tagihan sekaligus.</p></div>
                        </div>
                        {selectedBatchIds.map(id => {
                            const item = data.find(d => d.id === id);
                            if(!item) return null;
                            const monthlyAlloc = calculateMonthlyAllocation(item, viewMonth);
                            return (
                                <div key={id} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 shadow-sm items-center">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-800">{item.description}</p>
                                        <p className="text-xs text-slate-400 mt-1">Pagu: {formatRupiah(monthlyAlloc)}</p>
                                    </div>
                                    <input type="number" className="w-32 px-3 py-2 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nominal" value={batchAmounts[id] || 0} onChange={e => setBatchAmounts(prev => ({...prev, [id]: Number(e.target.value)}))} />
                                    <input type="number" className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm text-center focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Vol" value={batchQuantities[id] || 0} onChange={e => handleBatchQuantityChange(id, e.target.value)} />
                                </div>
                            )
                        })}
                      </div>
                    ) : (
                      selectedBudget && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100 mb-6">
                                <h4 className="font-black text-blue-950 text-xl">{selectedBudget.description}</h4>
                                <div className="flex gap-3 mt-3">
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">{MONTHS[activeMonthIndex - 1]}</span>
                                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-xs font-bold font-mono">Pagu: {formatRupiah(calculateMonthlyAllocation(selectedBudget, activeMonthIndex))}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nilai Realisasi</label><input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={formAmount} onChange={e => setFormAmount(e.target.value)} /></div>
                                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Volume</label><input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" value={formQuantity} onChange={handleSingleQuantityChange} /></div>
                                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Nama Toko</label><input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formVendor} onChange={e => setFormVendor(e.target.value)} /></div>
                                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Keterangan</label><input type="text" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formNotes} onChange={e => setFormNotes(e.target.value)} /></div>
                                <div><label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Tanggal Berkas</label><input type="date" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
                            </div>
                        </div>
                      )
                    )}

                    <div className="bg-amber-50/80 border border-amber-200 p-6 rounded-[1.5rem]">
                        <div className="flex justify-between items-center mb-4">
                            <h5 className="font-black text-amber-800 flex items-center gap-2"><FileCheck2 size={20} /> Syarat Bukti Fisik</h5>
                            <button type="button" onClick={handleGetAIEvidence} disabled={isAiLoading} className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-amber-200 transition">
                                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI Saran
                            </button>
                        </div>
                        <div className="space-y-3">
                            {evidenceItems.map((item, idx) => (
                                <div key={idx} onClick={() => toggleEvidence(item)} className="flex items-start gap-4 p-3 bg-white/60 rounded-xl border border-white cursor-pointer hover:bg-white transition shadow-sm">
                                    <div className={`mt-0.5 ${checkedEvidence.includes(item) ? 'text-emerald-500' : 'text-slate-300'}`}>{checkedEvidence.includes(item) ? <CheckSquare size={20} /> : <Square size={20} />}</div>
                                    <span className={`text-sm font-medium ${checkedEvidence.includes(item) ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                        {showDeleteButton && <button type="button" onClick={handleDeleteSPJ} className="px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl mr-auto hover:bg-rose-100">Hapus SPJ</button>}
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Batalkan</button>
                        <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex gap-2 items-center hover:shadow-xl hover:scale-[1.02] transition"><Save size={18} /> Simpan Data</button>
                    </div>

                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SPJRealization;