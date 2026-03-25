import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, FileText, ClipboardList, RefreshCw, Calendar, ArrowRightLeft, Package, Download, Printer, Sparkles, Loader2, Plus, Trash2, X, ArrowRight } from 'lucide-react';
import { Budget } from '../types';
import { analyzeInventoryItems, InventoryItem } from '../lib/gemini';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InventoryReportsProps {
  budgets: Budget[];
  schoolProfile: any; // Added based on the diff
}

interface WithdrawalTransaction {
  id: string;
  inventoryItemId: string;
  date: string;
  docNumber: string;
  quantity: number;
  notes?: string;
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ budgets, schoolProfile }) => {
  const [activeReport, setActiveReport] = useState<string>('pengadaan');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [manualInventoryItems, setManualInventoryItems] = useState<InventoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Restored isAnalyzing state
  const [withdrawalTransactions, setWithdrawalTransactions] = useState<WithdrawalTransaction[]>([]);
  const [itemOverrides, setItemOverrides] = useState<Record<string, { usedQuantity?: number; lastYearBalance?: number }>>(() => {
    const saved = localStorage.getItem('rkas_inventory_overrides_v1');
    return saved ? JSON.parse(saved) : {};
  });
  const [mutationOverrides, setMutationOverrides] = useState<Record<string, { awal?: number; tambah?: number; kurang?: number }>>(() => {
    const saved = localStorage.getItem('rkas_mutation_overrides_v1');
    return saved ? JSON.parse(saved) : {};
  });

  // Selection & Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [manualForm, setManualForm] = useState<Partial<InventoryItem>>({});
  const [currentSubCategory, setCurrentSubCategory] = useState<string>('');

  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    docNumber: '',
    quantity: 0,
    notes: ''
  });

  const CATEGORY_SUB_MAP: Record<string, string[]> = {
    'Bahan': [
      'Bahan Bangunan dan Konstruksi',
      'Bahan Kimia',
      'Bahan Peldak',
      'Bahan Bakar dan Pelumas',
      'Bahan Baku : Kawat, Kayu',
      'Bahan kimia nuklir',
      'Barang dalam proses',
      'Bahan/bibit tanaman',
      'Isi tabung pemadam kebakaran',
      'Isi tabung gas: isi tabung gas LPG',
      'Bahan/bibit ternak/bibit ikan',
      'Bahan lainnya'

    ],
    'Suku Cadang': [
      'Suku cadang alat angkutan',
      'Suku cadang alat besar',
      'Suku cadang alat kedokteran',
      'Suku cadang alat laboratorium',
      'Suku cadang alat pemancar',
      'Suku cadang alat studio dan komunikasi',
      'Suku cadang alat pertanian',
      'Suku cadang alat bengkel',
      'Suku cadang alat persenjataan',
      'Persediaan dari belanja bantuan sosial',
      'Suku cadang lainnya'
    ],
    'Alat Atau Bahan Untuk Kegiatan Kantor': [
      'Alat tulis kantor',
      'Kertas dan cover',
      'Bahan cetak',
      'Benda pos',
      'Persediaan dokumen/administrasi tender',
      'Bahan komputer',
      'Perabot kantor',
      'Alat listrik',
      'Perlengkapan dinas',
      'Kaporlap dan perlengkapan satwa',
      'Perlengkapan pendukung olah raga',
      'Suvenir/cindera mata',
      'Alat/bahan untuk kegiatan kantor lainnya'
    ],
    'Obat Obatan': [
      'Obat',
      'Obat Lainnya'
    ],
    'Persediaan Untuk dijual atau diserahkan': [
      'Persediaan untuk dijual/diserahkan kepada masyarakat',
      'Persediaan untuk dijual/diserahkan lainnya'
    ],
    'Natura dan Pakan': [
      'Natura: makanan/ sembako, minuman',
      'Pakan',
      'Natura dan Pakan Lainnya'
    ],
    'Persediaan Penelitian': [
      'Persediaan Penelitian Biologi',
      'Persediaan Penelitian Biologi Lainnya',
      'Persediaan Penelitian Teknologi',
      'Persediaan Penelitian Lainnya'
    ]
  };

  useEffect(() => {
    const localManual = localStorage.getItem('rkas_manual_inventory_v1');
    if (localManual) setManualInventoryItems(JSON.parse(localManual));

    const localWithdrawals = localStorage.getItem('rkas_withdrawal_transactions_v1');
    if (localWithdrawals) setWithdrawalTransactions(JSON.parse(localWithdrawals));
  }, []);

  const saveManualItems = (items: InventoryItem[]) => {
    setManualInventoryItems(items);
    localStorage.setItem('rkas_manual_inventory_v1', JSON.stringify(items));
  };

  const saveWithdrawals = (txs: WithdrawalTransaction[]) => {
    setWithdrawalTransactions(txs);
    localStorage.setItem('rkas_withdrawal_transactions_v1', JSON.stringify(txs));
  };

  const saveOverrides = (newOverrides: typeof itemOverrides) => {
    setItemOverrides(newOverrides);
    localStorage.setItem('rkas_inventory_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleOverride = (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number) => {
    const updated = {
      ...itemOverrides,
      [itemId]: {
        ...(itemOverrides[itemId] || {}),
        [field]: value
      }
    };
    saveOverrides(updated);
  };

  const saveMutationOverrides = (newOverrides: typeof mutationOverrides) => {
    setMutationOverrides(newOverrides);
    localStorage.setItem('rkas_mutation_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleMutationOverride = (category: string, field: 'awal' | 'tambah' | 'kurang', value: number) => {
    const updated = {
      ...mutationOverrides,
      [category]: {
        ...(mutationOverrides[category] || {}),
        [field]: value
      }
    };
    saveMutationOverrides(updated);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeInventoryItems(budgets);
      setInventoryItems(results);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Gagal menganalisis data. Cek koneksi Anda.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualAdd = (budgetItem: any) => {
    const isManualBalance = !budgetItem;
    const budget = budgetItem || {
      id: 'manual-inventory',
      description: 'Saldo Awal / Input Manual Persediaan',
      account_code: '0.00',
      bosp_component: '0.00 Saldo Awal'
    };

    setSelectedBudget(budget);
    setIsManualModalOpen(true);

    const firstRealization = budgetItem?.realizations?.[0];
    const subCode = typeof budget?.bosp_component === 'string' ? budget.bosp_component.split(/[.\s]/)[0] : '';
    const subName = typeof budget?.bosp_component === 'string' ? budget.bosp_component.replace(/^\d+[\.\s]*/, '') : budget?.bosp_component;

    setManualForm({
      name: isManualBalance ? '' : budget.description,
      spec: isManualBalance ? '' : (budget.notes || firstRealization?.notes || ''),
      quantity: isManualBalance ? 0 : (firstRealization?.quantity || budget.quantity || 1),
      unit: firstRealization?.unit || (budgetItem ? budget.unit : 'pcs'),
      price: firstRealization?.price || (budgetItem ? budget.price : 0),
      category: 'Alat Atau Bahan Untuk Kegiatan Kantor',
      date: new Date().toISOString().split('T')[0],
      subActivityCode: subCode,
      subActivityName: subName,
      vendor: firstRealization?.vendor || '',
      docNumber: firstRealization?.notes || ''
    });
    const defaultSub = CATEGORY_SUB_MAP[budget.category || 'Alat Atau Bahan Untuk Kegiatan Kantor']?.[0] || '';
    setCurrentSubCategory(defaultSub);
  };

  const submitManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !selectedBudget) return;

    const newItem: InventoryItem = {
      id: `manual-${Date.now()}`,
      name: manualForm.name!,
      spec: manualForm.spec || '',
      quantity: Number(manualForm.quantity),
      unit: manualForm.unit || 'Unit',
      price: Number(manualForm.price),
      total: Number(manualForm.quantity) * Number(manualForm.price),
      subActivityCode: manualForm.subActivityCode,
      subActivityName: manualForm.subActivityName,
      accountCode: manualForm.accountCode || '',
      date: manualForm.date!,
      contractType: manualForm.contractType || 'Invoice',
      vendor: manualForm.vendor || '',
      docNumber: manualForm.docNumber || '',
      category: manualForm.category && CATEGORY_SUB_MAP[manualForm.category]
        ? `${manualForm.category} - ${currentSubCategory}`
        : (manualForm.category || 'Lainnya'),
      usedQuantity: Number(manualForm.quantity)
    };

    const updated = [newItem, ...manualInventoryItems];
    saveManualItems(updated);
    setIsManualModalOpen(false);
    setSelectedBudget(null);
  };

  const submitWithdrawalForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem || !withdrawalForm.quantity) return;

    const newTx = {
      id: `wd-${Date.now()}`,
      inventoryItemId: selectedInventoryItem.id,
      date: withdrawalForm.date,
      docNumber: withdrawalForm.docNumber,
      quantity: Number(withdrawalForm.quantity),
      notes: withdrawalForm.notes
    };

    saveWithdrawals([...withdrawalTransactions, newTx]);
    setIsWithdrawalModalOpen(false);
    setSelectedInventoryItem(null);
    setWithdrawalForm({
      date: new Date().toISOString().split('T')[0],
      docNumber: '',
      quantity: 0,
      notes: ''
    });
  };

  const deleteWithdrawal = (id: string) => {
    saveWithdrawals(withdrawalTransactions.filter(tx => tx.id !== id));
  };

  const deleteManualItem = (id: string) => {
    const updated = manualInventoryItems.filter(item => item.id !== id);
    saveManualItems(updated);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || '-';
      return d.toLocaleDateString('id-ID');
    } catch (e) {
      return dateStr || '-';
    }
  };

  const getItemStats = (item: InventoryItem) => {
    const overrides = itemOverrides[item.id] || {};
    const lastYearBalance = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
    const totalIn = item.quantity;
    const transactionsQuantity = withdrawalTransactions
      .filter(tx => tx.inventoryItemId === item.id)
      .reduce((sum, tx) => sum + tx.quantity, 0);
    const totalOut = overrides.usedQuantity ?? (transactionsQuantity || item.usedQuantity || 0);
    const remaining = (lastYearBalance + totalIn) - totalOut;
    
    return { lastYearBalance, totalIn, totalOut, remaining };
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    let title = '';
    let headers: string[][] = [];
    let body: any[][] = [];

    if (activeReport === 'pengadaan') {
      title = 'Laporan Pengadaan Barang Milik Daerah (BMD)';
      headers = [['No', 'Tanggal', 'No. Dokumen', 'Nama Barang', 'Spesifikasi', 'Qty', 'Satuan', 'Harga', 'Total', 'Keterangan']];
      
      const transactionsByDoc: Record<string, WithdrawalTransaction[]> = {};
      withdrawalTransactions.filter(t => t.docNumber.startsWith('BMD-')).forEach(t => {
        if (!transactionsByDoc[t.docNumber]) transactionsByDoc[t.docNumber] = [];
        transactionsByDoc[t.docNumber].push(t);
      });

      let rowIdx = 1;
      Object.entries(transactionsByDoc).forEach(([docNum, txs]) => {
        txs.forEach((tx, i) => {
          const item = inventoryItems.find(it => it.id === tx.inventoryItemId);
          if (!item) return;
          body.push([
            i === 0 ? rowIdx++ : '',
            i === 0 ? tx.date : '',
            i === 0 ? docNum : '',
            item.name,
            item.spec,
            tx.quantity,
            item.unit,
            formatCurrency(item.price),
            formatCurrency(tx.quantity * item.price),
            tx.notes || '-'
          ]);
        });
      });
    } else if (activeReport === 'persediaan') {
      title = 'Laporan Persediaan Barang';
      headers = [['No', 'Kodefikasi', 'Nama Barang', 'Sisa Lalu', 'Masuk', 'Keluar', 'Sisa', 'Satuan', 'Harga', 'Total']];
      
      combinedItems.forEach((item, i) => {
        const stats = getItemStats(item);
        body.push([
          i + 1,
          item.codification || '-',
          item.name,
          stats.lastYearBalance,
          stats.totalIn,
          stats.totalOut,
          stats.remaining,
          item.unit,
          formatCurrency(item.price),
          formatCurrency(stats.remaining * item.price)
        ]);
      });
    } else if (activeReport === 'mutasi') {
      title = 'Laporan Mutasi Persediaan';
      headers = [['No', 'Kategori / Nama Barang', 'Saldo Awal', 'Pengadaan', 'Pengeluaran', 'Saldo Akhir', 'Satuan', 'Keterangan']];
      
      const categories = ['Bahan', 'Suku Cadang', 'Alat/Bahan Kantor', 'Obat-obatan', 'Lainnya'];
      categories.forEach(cat => {
        const items = combinedItems.filter(i => {
           if(cat === 'Alat/Bahan Kantor') return i.category === 'Alat Atau Bahan Untuk Kegiatan Kantor';
           if(cat === 'Lainnya') return !['Bahan', 'Suku Cadang', 'Alat Atau Bahan Untuk Kegiatan Kantor', 'Obat Obatan'].includes(i.category);
           return i.category === cat;
        });

        if (items.length > 0) {
            body.push([{ content: cat, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
            items.forEach((item, i) => {
                const stats = getItemStats(item);
                body.push([
                    i+1,
                    item.name,
                    stats.lastYearBalance,
                    stats.totalIn,
                    stats.totalOut,
                    stats.remaining,
                    item.unit,
                    ''
                ]);
            });
        }
      });
    }

    const startY = generatePDFHeader(doc, schoolProfile, title);
    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: headers,
      body: body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] }
    });

    generateSignatures(doc, schoolProfile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`${title.replace(/ /g, '_')}_${schoolProfile?.fiscalYear || '2026'}.pdf`);
  };

  const combinedItems = useMemo(() => {
    return [...inventoryItems, ...manualInventoryItems];
  }, [inventoryItems, manualInventoryItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach((item: InventoryItem) => {
      if (!item) return;
      const cat = item.category || '99 LAINNYA';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [combinedItems]);

  const groupedWithdrawals = useMemo(() => {
    const groups: Record<string, typeof withdrawalTransactions> = {};
    const sorted = [...withdrawalTransactions].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateCompare !== 0 ? dateCompare : a.docNumber.localeCompare(b.docNumber);
    });
    sorted.forEach(tx => {
      const key = tx.docNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }, [withdrawalTransactions]);

  const mutationData = useMemo(() => {
    const data: Record<string, { awal: number; tambah: number; kurang: number }> = {};
    
    combinedItems.forEach(item => {
      const cat = item.category || '99 LAINNYA';
      if (!data[cat]) data[cat] = { awal: 0, tambah: 0, kurang: 0 };
      
      const overrides = itemOverrides[item.id] || {};
      const sisaLalu = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
      const masuk = item.quantity;
      
      const transactionsQuantity = withdrawalTransactions
        .filter(tx => tx.inventoryItemId === item.id)
        .reduce((sum, tx) => sum + tx.quantity, 0);
      const keluar = overrides.usedQuantity ?? (transactionsQuantity || item.usedQuantity || 0);

      data[cat].awal += sisaLalu * item.price;
      data[cat].tambah += masuk * item.price;
      data[cat].kurang += keluar * item.price;
    });
    
    return data;
  }, [combinedItems, itemOverrides, withdrawalTransactions]);

  const reportMenu = [
    {
      id: 'pengadaan',
      title: 'Laporan Pengadaan BMD',
      subtitle: 'Aset Lancar Persediaan',
      description: 'Laporan daftar pengadaan barang milik daerah dalam bentuk aset lancar persediaan.',
      icon: Package,
      color: 'blue'
    },
    {
      id: 'pengeluaran',
      title: 'Buku Pengeluaran Persediaan',
      subtitle: 'Catatan Keluar Barang',
      description: 'Buku catatan kronologis pengeluaran barang persediaan dari gudang/penyimpanan.',
      icon: ClipboardList,
      color: 'orange'
    },
    {
      id: 'semester',
      title: 'Laporan Persediaan Semester',
      subtitle: 'Per 6 Bulan',
      description: 'Rekapitulasi posisi stok barang persediaan setiap periode semester.',
      icon: Calendar,
      color: 'green'
    },
    {
      id: 'persediaan',
      title: 'Laporan Persediaan',
      subtitle: 'Stok & Saldo Akhir',
      description: 'Rekapitulasi persediaan barang dengan penggolongan dan kodefikasi manual.',
      icon: ClipboardList,
      color: 'indigo'
    },
    {
      id: 'mutasi',
      title: 'Laporan Mutasi Persediaan',
      subtitle: 'Tambah & Kurang',
      description: 'Laporan rincian mutasi tambah dan kurang menurut objek sumber dana keseluruhan.',
      icon: ArrowRightLeft,
      color: 'purple'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 flex items-center gap-1"><Package size={12}/> Inventaris</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stok Opname & Persediaan</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manajemen dan pelaporan aset lancar serta barang persediaan.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      {/* Grid Menu Laporan */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportMenu.map((report) => (
          <motion.button
            key={report.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group ${activeReport === report.id
              ? `bg-gradient-to-br from-white to-${report.color}-50/50 border-${report.color}-200 shadow-xl shadow-${report.color}-500/10`
              : 'bg-white/60 backdrop-blur-md border-white hover:border-blue-100 hover:shadow-lg shadow-sm'
              }`}
          >
            {activeReport === report.id && (
                <motion.div layoutId="active-report-bg" className={`absolute inset-0 bg-${report.color}-500/5 z-0`} />
            )}
            {(() => {
              const Icon = report.icon;
              return (
                <div className={`p-3 rounded-xl bg-${report.color}-100 text-${report.color}-600 relative z-10 shadow-inner`}>
                  <Icon size={24} className={activeReport === report.id ? 'animate-pulse' : ''} />
                </div>
              );
            })()}
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight text-sm">{report.title}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-${report.color}-600 mb-2`}>{report.subtitle}</p>
                </div>
                <div className={`text-${report.color}-500 opacity-30 transform group-hover:scale-110 group-hover:opacity-100 transition-all`}>
                  <ArrowRight size={16} />
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{report.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Report View Area */}
      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden relative min-h-[500px]">
        <div className="px-8 py-6 border-b border-slate-100 bg-white/60 backdrop-blur-xl flex flex-col md:flex-row md:justify-between md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl shadow-inner-sm">
              <FileText size={22} className="drop-shadow-sm" />
            </div>
            <div>
               <h3 className="font-black text-slate-800 tracking-tight text-lg">Pratinjau Laporan</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{reportMenu.find(r => r.id === activeReport)?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-white hover:shadow-lg transition-all shadow-sm backdrop-blur-md active:scale-95"
            >
              <Printer size={16} /> CETAK
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl text-xs font-black hover:shadow-xl hover:shadow-slate-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95">
              <Download size={16} /> EXCEL / PDF
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

        {activeReport === 'pengadaan' && (
          <motion.div key="pengadaan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-slate-50/30 relative z-0">
            <div className="p-8 border-b border-slate-100 flex flex-wrap gap-6 justify-between items-center bg-white/40 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-inner">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-md tracking-tight">Data Inventaris Masuk</h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-70">Kelola item dari pengadaan SPJ</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 rounded-2xl text-xs font-black transition-all shadow-sm hover:shadow-emerald-500/10 active:scale-95"
                >
                  <Plus size={16} /> TAMBAH MANUAL
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:scale-95"
                >
                  {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {isAnalyzing ? 'MENGANALISIS...' : 'ANALISA AI'}
                </button>
              </div>
            </div>

            {combinedItems.length === 0 && !isAnalyzing ? (
              <div className="p-12 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-200">
                    <ShoppingBag size={32} />
                  </div>
                  <h4 className="font-bold text-gray-700">Belum Ada Data Teranalisa</h4>
                  <p className="text-xs text-gray-500">Klik tombol di atas untuk mulai menganalisa transaksi SPJ dan mengelompokkannya ke dalam laporan pengadaan.</p>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="p-12 text-center animate-pulse">
                <RefreshCw size={40} className="mx-auto text-blue-400 animate-spin mb-4" />
                <p className="text-sm font-medium text-gray-600">AI sedang memproses transaksi SPJ Anda...</p>
                <p className="text-[10px] text-gray-400 mt-1">Mengidentifikasi barang, spesifikasi, dan kategori bahan habis pakai.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                {/* Visual Header inspired by the Excel Image */}
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SD NEGERI CONTOH'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">TAHUN ANGGARAN {schoolProfile?.fiscalYear || '2026'}</p>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-8">No.</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-32">Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-48">Spesifikasi Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16">Jumlah Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16">Satuan Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24">Harga Satuan (Rp.)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24">Total Nilai Barang (Rp.)</th>
                      <th colSpan={2} className="border border-gray-300 p-1">Sub Kegiatan & Anggaran</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-[8px]">Rekening Belanja</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-20">Tgl Perolehan</th>
                      <th colSpan={3} className="border border-gray-300 p-1">Dokumen Sumber Perolehan</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-1 w-20 text-[8px]">Kode</th>
                      <th className="border border-gray-300 p-1 text-[8px]">Nama Sub Kegiatan</th>
                      <th className="border border-gray-300 p-1 w-16 text-[8px]">Bentuk</th>
                      <th className="border border-gray-300 p-1 w-20 text-[8px]">Penyedia</th>
                      <th className="border border-gray-300 p-1 w-24 text-[8px]">Nomor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(groupedItems) as [string, InventoryItem[]][]).map(([category, items]) => {
                      if (items.length === 0) return null;
                      const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);

                      return (
                        <Fragment key={category}>
                          <tr className="bg-blue-50/50 font-bold">
                            <td colSpan={6} className="border border-gray-300 p-2 text-blue-800 uppercase italic">
                              {category}
                            </td>
                            <td className="border border-gray-300 p-2 text-right text-blue-900">{formatRupiah(categoryTotal)}</td>
                            <td colSpan={7} className="border border-gray-300 p-2 bg-gray-50/20"></td>
                          </tr>

                          {/* Item Rows */}
                          {items.map((item: InventoryItem, idx) => (
                            <tr key={`${category}-${idx}`} className="hover:bg-gray-50 group">
                              <td className="border border-gray-300 p-2 text-center text-gray-400">{idx + 1}</td>
                              <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                              <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                              <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                              <td className="border border-gray-300 p-2 text-right font-semibold">{formatRupiah(item.total)}</td>
                              <td className="border border-gray-300 p-2 text-[8px] text-center font-mono">{item.subActivityCode || '0.00.01'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] leading-tight">{item.subActivityName || 'Administrasi Sekolah'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] text-center font-mono">{item.accountCode}</td>
                              <td className="border border-gray-300 p-2 text-center text-[8px]">{formatDate(item.date)}</td>
                              <td className="border border-gray-300 p-2 text-center text-[8px]">{item.contractType || 'Kuitansi'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] italic">{item.vendor}</td>
                              <td className="border border-gray-300 p-2 text-center text-[8px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                {item.docNumber}
                                {item.id.startsWith('manual-') && (
                                  <button
                                    onClick={() => deleteManualItem(item.id)}
                                    className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Manual Entry */}
            {isManualModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.15)] w-full max-w-4xl p-10 relative my-auto border border-white"
                >
                  <div className="flex justify-between items-start mb-10">
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                          <Plus size={32} />
                       </div>
                       <div>
                          <h3 className="text-3xl font-black text-slate-800 tracking-tight">Input Manual Inventaris</h3>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             Data Anggaran SPJ Terealisasi
                          </p>
                       </div>
                    </div>
                    <button onClick={() => { setIsManualModalOpen(false); setSelectedBudget(null); }} className="p-3 hover:bg-slate-100/80 rounded-2xl transition-all hover:scale-110 active:scale-90 bg-slate-50 border border-slate-100 shadow-sm group">
                      <X size={20} className="text-slate-400 group-hover:text-slate-600" />
                    </button>
                  </div>

                  {!selectedBudget ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between px-2">
                         <p className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList size={16} className="text-blue-500"/>
                            Pilih Anggaran
                         </p>
                         <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">Total: {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length} Item</span>
                      </div>
                      
                      <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {budgets
                          .filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0)
                          .map(b => (
                            <motion.button
                              whileHover={{ x: 8, scale: 1.005 }}
                              key={b.id}
                              onClick={() => handleManualAdd(b)}
                              className="w-full text-left p-5 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:border-blue-400/50 hover:bg-blue-50/30 transition-all group flex justify-between items-center relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="flex-1">
                                <p className="font-black text-slate-800 group-hover:text-blue-700 transition-colors leading-tight mb-2">{b.description}</p>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-lg font-mono font-bold shadow-sm">{b.account_code}</span>
                                  <span className="text-[10px] text-slate-500 font-black">{formatRupiah(b.amount)}</span>
                                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                                  <span className="text-[9px] bg-blue-600 text-white px-3 py-1 rounded-lg font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">{b.realizations?.length} REALISASI</span>
                                </div>
                              </div>
                              <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                              </div>
                            </motion.button>
                          ))}
                        {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length === 0 && (
                          <div className="p-20 text-center space-y-4">
                             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 mb-2">
                                <Package size={32} className="text-slate-200" />
                             </div>
                             <p className="text-slate-400 font-bold italic">Belum ada data SPJ yang terealisasi untuk dipilih.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitManualForm} className="space-y-8">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] shadow-2xl shadow-blue-500/20 text-white relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                           <Package size={200} />
                        </div>
                        <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.3em] mb-3 opacity-80 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                           Sumber Data Anggaran
                        </p>
                        <h4 className="text-2xl font-black tracking-tight">{selectedBudget.description}</h4>
                        <div className="flex items-center gap-4 mt-4">
                           <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 text-xs font-mono font-bold tracking-widest">{selectedBudget.account_code}</span>
                           <span className="text-sm font-black text-blue-100">{formatRupiah(selectedBudget.amount)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Nama Barang</label>
                          <input required className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-blue-500/10 transition-all placeholder:font-normal placeholder:text-slate-400" value={manualForm.name || ''} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Spesifikasi</label>
                          <input className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-blue-500/10 transition-all placeholder:font-normal placeholder:text-slate-400" value={manualForm.spec || ''} onChange={e => setManualForm({ ...manualForm, spec: e.target.value })} placeholder="Merk, Ukuran, Warna, dll" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Kategori Persediaan</label>
                          <select className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-blue-500/10 transition-all cursor-pointer appearance-none" value={manualForm.category || 'Lainnya'} onChange={e => {
                              const newCat = e.target.value;
                              setManualForm({ ...manualForm, category: newCat as any });
                              if (CATEGORY_SUB_MAP[newCat]) setCurrentSubCategory(CATEGORY_SUB_MAP[newCat][0]);
                              else setCurrentSubCategory('');
                            }}>
                            <option value="Bahan">Bahan</option>
                            <option value="Suku Cadang">Suku Cadang</option>
                            <option value="Alat Atau Bahan Untuk Kegiatan Kantor">Kegiatan Kantor</option>
                            <option value="Obat Obatan">Obat Obatan</option>
                            <option value="Natura dan Pakan">Natura & Pakan</option>
                            <option value="Lainnya">Lainnya (Umum)</option>
                          </select>
                        </div>

                        {manualForm.category && CATEGORY_SUB_MAP[manualForm.category] && (
                          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] ml-2 block mb-1">Sub Jenis : {manualForm.category}</label>
                            <select className="w-full bg-blue-50/50 border border-blue-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-blue-500/10 transition-all cursor-pointer" value={currentSubCategory} onChange={e => setCurrentSubCategory(e.target.value)}>
                              {CATEGORY_SUB_MAP[manualForm.category].map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                            </select>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4 md:col-span-1">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Jumlah</label>
                            <input required type="number" className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all" value={manualForm.quantity || ''} onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Satuan</label>
                            <input required className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all" value={manualForm.unit || ''} onChange={e => setManualForm({ ...manualForm, unit: e.target.value })} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Harga Satuan</label>
                          <input required type="number" className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all" value={manualForm.price || ''} onChange={e => setManualForm({ ...manualForm, price: Number(e.target.value) })} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Tgl Perolehan</label>
                          <input type="date" className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all cursor-pointer" value={manualForm.date?.split('T')[0] || ''} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Penyedia / Toko</label>
                          <input className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all placeholder:font-normal" value={manualForm.vendor || ''} onChange={e => setManualForm({ ...manualForm, vendor: e.target.value })} placeholder="Nama Toko / UD / PT" />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Nomor Dokumen</label>
                          <input className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all font-mono" value={manualForm.docNumber || ''} onChange={e => setManualForm({ ...manualForm, docNumber: e.target.value })} placeholder="No Kuitansi/BAST" />
                        </div>
                      </div>

                      <div className="flex gap-4 mt-12 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <button type="button" onClick={() => setSelectedBudget(null)} className="flex-1 py-4 px-6 rounded-2xl border-2 border-slate-200 text-slate-400 font-bold hover:bg-white hover:text-slate-600 transition-all font-mono tracking-widest text-xs uppercase">Batal & Kembali</button>
                        <button type="submit" className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black hover:shadow-2xl hover:shadow-blue-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3">
                           <ShoppingBag size={20} />
                           SIMPAN INVENTARIS
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Modal Withdrawal Entry */}
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
               className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.15)] w-full max-w-4xl p-10 relative my-auto border border-white"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-rose-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                      <ArrowRightLeft size={32} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-slate-800 tracking-tight">Catat Pengeluaran Barang</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                         Daftar Inventaris Masuk
                      </p>
                   </div>
                </div>
                <button onClick={() => { setIsWithdrawalModalOpen(false); setSelectedInventoryItem(null); }} className="p-3 hover:bg-slate-100/80 rounded-2xl transition-all hover:scale-110 active:scale-90 bg-slate-50 border border-slate-100 shadow-sm">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {!selectedInventoryItem ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                     <p className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Package size={16} className="text-orange-500"/>
                        Pilih Barang Keluar
                     </p>
                     <span className="text-[10px] bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold">Total: {combinedItems.length} Item</span>
                  </div>
                  <div className="max-h-[55vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {combinedItems.length === 0 ? (
                      <div className="p-20 text-center space-y-4">
                         <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 mb-2">
                            <ShoppingBag size={32} className="text-slate-200" />
                         </div>
                         <p className="text-slate-400 font-bold italic text-sm">Belum ada data barang masuk.<br/>Masukkan data di Laporan Pengadaan terlebih dahulu.</p>
                      </div>
                    ) : (
                      combinedItems.map(item => (
                        <motion.button
                          whileHover={{ x: 8 }}
                          key={item.id}
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setWithdrawalForm({ ...withdrawalForm, quantity: item.quantity, docNumber: item.docNumber });
                          }}
                          className="w-full text-left p-5 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:border-orange-400/50 hover:bg-orange-50/30 transition-all group flex justify-between items-center relative overflow-hidden"
                        >
                           <div className="absolute left-0 top-0 w-1.5 h-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="flex-1">
                              <p className="font-black text-slate-800 group-hover:text-orange-700 transition-colors leading-tight mb-2">{item.name}</p>
                              <div className="flex flex-wrap gap-2 items-center">
                                 <span className="text-[9px] bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-lg font-mono font-bold shadow-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{item.category}</span>
                                 <span className="text-[10px] text-orange-600 font-black">STOK : {item.quantity} {item.unit}</span>
                                 <div className="h-1 w-1 rounded-full bg-slate-200"></div>
                                 <span className="text-[10px] text-slate-400 italic">Spec: {item.spec}</span>
                              </div>
                           </div>
                           <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all">
                              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                           </div>
                        </motion.button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={submitWithdrawalForm} className="space-y-8">
                  <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-8 rounded-[2rem] shadow-2xl shadow-orange-500/20 text-white relative overflow-hidden group">
                     <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <ArrowRightLeft size={200} />
                     </div>
                     <p className="text-[10px] font-black text-orange-200 uppercase tracking-[0.3em] mb-3 opacity-80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                        Barang yang Dikeluarkan
                     </p>
                     <h4 className="text-2xl font-black tracking-tight">{selectedInventoryItem.name}</h4>
                     <div className="flex items-center gap-4 mt-4">
                        <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 text-xs font-bold tracking-widest uppercase">{selectedInventoryItem.category}</span>
                        <span className="text-sm font-black text-orange-50 italic">Spec: {selectedInventoryItem.spec}</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Tanggal Keluar</label>
                      <input required type="date" className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-orange-500/10 transition-all cursor-pointer" value={withdrawalForm.date} onChange={e => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Nomor Dokumen Pengeluaran</label>
                      <input required className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none ring-4 ring-transparent focus:ring-orange-500/10 transition-all font-mono" placeholder="No. BAST / Kuitansi" value={withdrawalForm.docNumber} onChange={e => setWithdrawalForm({ ...withdrawalForm, docNumber: e.target.value })} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Jumlah Keluar (STOK : {selectedInventoryItem.quantity} {selectedInventoryItem.unit})</label>
                      <input required type="number" max={selectedInventoryItem.quantity} className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3.5 text-sm font-black shadow-sm outline-none transition-all text-orange-600 focus:ring-4 focus:ring-orange-500/10" value={withdrawalForm.quantity || ''} onChange={e => setWithdrawalForm({ ...withdrawalForm, quantity: Number(e.target.value) })} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 block mb-1">Keterangan / Peruntukan</label>
                      <input className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm outline-none transition-all placeholder:font-normal" placeholder="Misal: Untuk kebutuhan KBM Kelas 6" value={withdrawalForm.notes} onChange={e => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-12 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <button type="button" onClick={() => setSelectedInventoryItem(null)} className="flex-1 py-4 px-6 rounded-2xl border-2 border-slate-200 text-slate-400 font-bold hover:bg-white hover:text-slate-600 transition-all font-mono tracking-widest text-xs uppercase">Batal & Kembali</button>
                    <button type="submit" className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-rose-700 text-white font-black hover:shadow-2xl hover:shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-3 uppercase tracking-wider text-sm">
                       <ArrowRightLeft size={20} />
                       Simpan Pengeluaran
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {activeReport === 'pengeluaran' && (
          <motion.div key="pengeluaran" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-white/40 relative z-0">
            <div className="p-6 border-b border-slate-100 bg-orange-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Buku Pengeluaran Persediaan</h4>
                  <p className="text-[10px] text-gray-500 italic">Data pengeluaran barang yang telah terealisasi melalui SPJ.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsWithdrawalModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition shadow-md shadow-orange-200"
                >
                  <Plus size={14} /> Catat Pengeluaran
                </button>
              </div>
            </div>

            {withdrawalTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-sm">Belum ada data pengeluaran. Klik "Catat Pengeluaran" untuk menambah data manual dari barang yang sudah dibeli.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">BUKU PENGELUARAN PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SD NEGERI CONTOH'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">TAHUN ANGGARAN {schoolProfile?.fiscalYear || '2026'}</p>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-8 text-center">No.</th>
                      <th colSpan={2} className="border border-gray-300 p-1 text-center">Dokumen</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center">Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center">Spesifikasi Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-12 text-center">Jumlah</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16 text-center">Satuan Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Harga Satuan (Rp)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Nilai Total (Rp)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Keterangan</th>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <th className="border border-gray-300 p-1 w-20 text-center">Tanggal</th>
                      <th className="border border-gray-300 p-1 w-24 text-center">Nomor</th>
                    </tr>
                    <tr className="bg-gray-100 text-[8px] italic text-center text-gray-500">
                      <td className="border border-gray-300">1</td>
                      <td className="border border-gray-300">2</td>
                      <td className="border border-gray-300">3</td>
                      <td className="border border-gray-300">4</td>
                      <td className="border border-gray-300">5</td>
                      <td className="border border-gray-300">6</td>
                      <td className="border border-gray-300">7</td>
                      <td className="border border-gray-300">8</td>
                      <td className="border border-gray-300">9 = (6x8)</td>
                      <td className="border border-gray-300">10</td>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedWithdrawals).map(([docKey, rawTxs], docIdx) => {
                      const txs = rawTxs as typeof withdrawalTransactions;
                      const firstTx = txs[0];
                      return (
                        <Fragment key={docKey}>
                          {txs.map((tx, txIdx: number) => {
                            const item = combinedItems.find(i => i.id === tx.inventoryItemId);
                            if (!item) return null;
                            return (
                              <tr key={`${docKey}-${txIdx}`} className="hover:bg-gray-50 group">
                                {txIdx === 0 && (
                                  <Fragment>
                                    <td className="border border-gray-300 p-2 text-center font-bold" rowSpan={txs.length}>{docIdx + 1}</td>
                                    <td className="border border-gray-300 p-2 text-center font-bold" rowSpan={txs.length}>{formatDate(firstTx.date)}</td>
                                    <td className="border border-gray-300 p-2 text-center font-mono text-[8px] font-bold" rowSpan={txs.length}>{firstTx.docNumber}</td>
                                  </Fragment>
                                )}
                                <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                                <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                                <td className="border border-gray-300 p-2 text-center">{tx.quantity}</td>
                                <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                                <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                                <td className="border border-gray-300 p-2 text-right font-semibold">{formatRupiah(tx.quantity * item.price)}</td>
                                <td className="border border-gray-300 p-2 text-[8px] italic text-gray-400 relative">
                                  {tx.notes || "-"}
                                  <button
                                    onClick={() => deleteWithdrawal(tx.id)}
                                    className="absolute right-1 top-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeReport === 'persediaan' && (
          <motion.div key="persediaan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-white/40 relative z-0">
            <div className="p-6 border-b border-slate-100 bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Laporan Persediaan</h4>
                  <p className="text-[10px] text-gray-500 italic">Format manual dengan penggolongan dan kodefikasi barang.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition shadow-sm"
                >
                  <Printer size={12} /> Cetak Laporan
                </button>
                <button
                  onClick={() => handleManualAdd(null)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
                >
                  <Plus size={12} /> Tambah Saldo Awal
                </button>
                <div className="text-[10px] font-bold text-indigo-700 bg-indigo-100/50 px-3 py-1 rounded-full border border-indigo-200">
                  Otomatis Terkalkulasi
                </div>
              </div>
            </div>

            {combinedItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-sm">Belum ada data. Silakan analisa data di menu "Laporan Pengadaan BMD" terlebih dahulu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">TAHUN {schoolProfile?.fiscalYear || '2026'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">SUMBERDANA KESELURUHAN</p>
                </div>

                <div className="mb-4 text-[10px] space-y-1">
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Kuasa Pengguna Barang</span>
                    <span>: Dinas Pendidikan</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Pengguna Barang</span>
                    <span>: {schoolProfile?.name || '-'}</span>
                  </div>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700 font-bold text-center">
                    <tr>
                      <th className="border border-gray-300 p-2 w-8" rowSpan={2}>No</th>
                      <th className="border border-gray-300 p-2 w-32" rowSpan={2}>Nama Barang</th>
                      <th className="border border-gray-300 p-2" rowSpan={2}>Spesifikasi Nama Barang</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Sisa Tahun Lalu</th>
                      <th className="border border-gray-300 p-1" colSpan={2}>Persediaan Masuk</th>
                      <th className="border border-gray-300 p-1 bg-yellow-50" colSpan={2}>Persediaan Keluar</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Sisa Persediaan</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Satuan Barang</th>
                      <th className="border border-gray-300 p-1" colSpan={2}>Harga</th>
                      <th className="border border-gray-300 p-2 w-20" rowSpan={2}>Keterangan</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-1 w-12 font-normal italic">Masuk</th>
                      <th className="border border-gray-300 p-1 w-20 font-normal italic bg-yellow-50/50 text-[8px]">hanya itungan</th>
                      <th className="border border-gray-300 p-1 w-12 font-normal italic bg-yellow-50">Keluar</th>
                      <th className="border border-gray-300 p-1 w-20 font-normal italic bg-yellow-50 text-[8px]">hanya itungan</th>
                      <th className="border border-gray-300 p-1 w-24">Satuan (Rp)</th>
                      <th className="border border-gray-300 p-1 w-24">Total Nilai Barang (Rp)</th>
                    </tr>
                    <tr className="bg-gray-100 text-[7px] italic text-gray-500 text-center">
                      <td className="border border-gray-300 p-0.5">1</td>
                      <td className="border border-gray-300 p-0.5">2</td>
                      <td className="border border-gray-300 p-0.5">3</td>
                      <td className="border border-gray-300 p-0.5">4</td>
                      <td className="border border-gray-300 p-0.5">5</td>
                      <td className="border border-gray-300 p-0.5 bg-yellow-50/20">itungan</td>
                      <td className="border border-gray-300 p-0.5">6</td>
                      <td className="border border-gray-300 p-0.5 bg-yellow-50/20">itungan</td>
                      <td className="border border-gray-300 p-0.5">7 = (4+5-6)</td>
                      <td className="border border-gray-300 p-0.5">8</td>
                      <td className="border border-gray-300 p-0.5">9</td>
                      <td className="border border-gray-300 p-0.5">10 = (7x9)</td>
                      <td className="border border-gray-300 p-0.5">11</td>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(groupedItems) as [string, InventoryItem[]][]).sort().map(([category, items]) => {
                      if (items.length === 0) return null;

                      return (
                        <Fragment key={category}>
                          {/* Category Header */}
                          <tr className="bg-gray-50 font-bold italic">
                            <td className="border border-gray-300 p-2" colSpan={13}>
                              {category}
                            </td>
                          </tr>

                          {items.map((item, idx) => {
                            const overrides = itemOverrides[item.id] || {};
                            const sisaLalu = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
                            const masuk = item.quantity;
                            
                            // Calculate usedQuantity from manual transactions
                            const transactionsQuantity = withdrawalTransactions
                              .filter(tx => tx.inventoryItemId === item.id)
                              .reduce((sum, tx) => sum + tx.quantity, 0);

                            const keluar = overrides.usedQuantity ?? (transactionsQuantity || item.usedQuantity || 0);
                            const sisa = sisaLalu + masuk - keluar;
                            const totalNilai = sisa * item.price;

                            return (
                              <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="border border-gray-300 p-2 text-center text-gray-400">{idx + 1}</td>
                                <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                                <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                                <td className="border border-gray-300 p-2 text-center relative group/cell">
                                  <input 
                                    type="number" 
                                    className="w-full bg-transparent text-center border-none focus:ring-1 focus:ring-indigo-300 rounded outline-none"
                                    value={sisaLalu}
                                    onChange={(e) => handleOverride(item.id, 'lastYearBalance', Number(e.target.value))}
                                  />
                                </td>
                                <td className="border border-gray-300 p-2 text-center">{masuk}</td>
                                
                                <td className="border border-gray-300 p-2 text-right bg-yellow-50/20 text-[9px]">{formatRupiah(masuk * item.price)}</td>
                                
                                <td className="border border-gray-300 p-2 text-center relative group/cell bg-yellow-50/50">
                                   <input 
                                    type="number" 
                                    className="w-full bg-transparent text-center border-none focus:ring-1 focus:ring-orange-300 rounded outline-none font-bold"
                                    value={keluar}
                                    onChange={(e) => handleOverride(item.id, 'usedQuantity', Number(e.target.value))}
                                  />
                                  {transactionsQuantity > 0 && overrides.usedQuantity === undefined && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                  )}
                                </td>
                                
                                <td className="border border-gray-300 p-2 text-right bg-yellow-50/20 text-[9px]">{formatRupiah(keluar * item.price)}</td>
                                
                                <td className={`border border-gray-300 p-2 text-center font-bold ${sisa < 0 ? 'text-red-600 bg-red-50' : ''}`}>{sisa}</td>
                                <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                                <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                                <td className="border border-gray-300 p-2 text-right font-black bg-indigo-50/30">{formatRupiah(totalNilai)}</td>
                                <td className="border border-gray-300 p-2 text-[8px] italic text-gray-400">
                                  {overrides.usedQuantity !== undefined ? "Manual override" : transactionsQuantity > 0 ? `${transactionsQuantity} ${item.unit} dari Buku Pengeluaran` : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeReport === 'mutasi' && (
          <motion.div key="mutasi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full overflow-hidden bg-white/40 relative z-0">
            <div className="p-6 border-b border-slate-100 bg-purple-50/30 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Laporan Mutasi Persediaan</h4>
                  <p className="text-[10px] text-gray-500 italic">Rekapitulasi mutasi tambah dan kurang per kategori barang.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-purple-700 bg-purple-100/50 px-3 py-1 rounded-full border border-purple-200">
                  Otomatis dari Rekap Persediaan
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 min-w-[800px]">
                <div className="text-center mb-6 space-y-1">
                  <h3 className="font-black text-lg text-gray-900 tracking-tight uppercase">LAPORAN PERSEDIAAN MUTASI TAMBAH DAN KURANG</h3>
                  <p className="text-xs font-bold text-gray-600 uppercase">MENURUT OBJEK SUMBERDANA KESELURUHAN</p>
                </div>

                <div className="mb-4 text-[10px] space-y-1">
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Provinsi</span>
                    <span>: JAWA TIMUR</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Kota/Kabupaten</span>
                    <span>: KOTA KEDIRI</span>
                  </div>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700 font-bold text-center">
                    <tr>
                      <th className="border border-gray-300 p-2 w-16">Kode Barang</th>
                      <th className="border border-gray-300 p-2">Nama Barang</th>
                      <th className="border border-gray-300 p-2 w-32">Saldo Awal (Rp.)</th>
                      <th className="border border-gray-300 p-2 w-32">Mutasi Tambah (Rp.)</th>
                      <th className="border border-gray-300 p-2 w-32">Mutasi Kurang (Rp.)</th>
                      <th className="border border-gray-300 p-2 w-32">Saldo Akhir</th>
                    </tr>
                    <tr className="bg-gray-100 text-[8px] italic text-gray-500">
                      <td className="border border-gray-300 p-1 text-center">1</td>
                      <td className="border border-gray-300 p-1 text-center">2</td>
                      <td className="border border-gray-300 p-1 text-center">3</td>
                      <td className="border border-gray-300 p-1 text-center">4</td>
                      <td className="border border-gray-300 p-1 text-center">5</td>
                      <td className="border border-gray-300 p-1 text-center">6=(3+4-5)</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-gray-300 p-2 text-center text-[8px]">1.1.7</td>
                      <td className="border border-gray-300 p-2">ASET LANCAR</td>
                      <td className="border border-gray-300 p-2 text-right"></td>
                      <td className="border border-gray-300 p-2 text-right"></td>
                      <td className="border border-gray-300 p-2 text-right"></td>
                      <td className="border border-gray-300 p-2 text-right"></td>
                    </tr>
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-gray-300 p-2 text-center text-[8px]">1.1.7.01</td>
                      <td className="border border-gray-300 p-2">PERSEDIAAN</td>
                      <td className="border border-gray-300 p-2 text-right">{formatRupiah(Object.values(mutationData).reduce((s,v) => s + v.awal, 0))}</td>
                      <td className="border border-gray-300 p-2 text-right">{formatRupiah(Object.values(mutationData).reduce((s,v) => s + v.tambah, 0))}</td>
                      <td className="border border-gray-300 p-2 text-right">{formatRupiah(Object.values(mutationData).reduce((s,v) => s + v.kurang, 0))}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {formatRupiah(Object.values(mutationData).reduce((s,v) => s + (v.awal + v.tambah - v.kurang), 0))}
                      </td>
                    </tr>
                    {Object.entries(mutationData).sort().map(([category, vals]) => {
                      const overrides = mutationOverrides[category] || {};
                      const awal = overrides.awal ?? vals.awal;
                      const tambah = overrides.tambah ?? vals.tambah;
                      const kurang = overrides.kurang ?? vals.kurang;
                      const akhir = awal + tambah - kurang;
                      
                      const code = category.match(/^\d+[\d.]*/)?.[0] || '-';
                      const name = category.replace(/^\d+[\d.\s]*/, '');

                      return (
                        <tr key={category} className="hover:bg-slate-50/50 group">
                          <td className="border border-gray-300 p-2 text-center text-[8px] text-gray-400 font-mono">{code}</td>
                          <td className="border border-gray-300 p-2 font-medium">{name}</td>
                          <td className="border border-gray-300 p-2 text-right relative group/cell">
                             <input 
                              type="number" 
                              className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-purple-300 rounded outline-none"
                              value={awal}
                              onChange={(e) => handleMutationOverride(category, 'awal', Number(e.target.value))}
                            />
                            <div className="hidden group-hover/cell:block absolute top-0 right-0 bg-white text-[7px] p-0.5 border shadow-sm z-10 pointer-events-none">
                              {formatRupiah(awal)}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-right relative group/cell">
                             <input 
                              type="number" 
                              className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-purple-300 rounded outline-none"
                              value={tambah}
                              onChange={(e) => handleMutationOverride(category, 'tambah', Number(e.target.value))}
                            />
                            <div className="hidden group-hover/cell:block absolute top-0 right-0 bg-white text-[7px] p-0.5 border shadow-sm z-10 pointer-events-none">
                              {formatRupiah(tambah)}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-right relative group/cell">
                             <input 
                              type="number" 
                              className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-purple-300 rounded outline-none"
                              value={kurang}
                              onChange={(e) => handleMutationOverride(category, 'kurang', Number(e.target.value))}
                            />
                            <div className="hidden group-hover/cell:block absolute top-0 right-0 bg-white text-[7px] p-0.5 border shadow-sm z-10 pointer-events-none">
                              {formatRupiah(kurang)}
                            </div>
                          </td>
                          <td className="border border-gray-300 p-2 text-right font-bold bg-slate-50">{formatRupiah(akhir)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Catch-all for other reports pending implementation */}
        {activeReport !== 'pengadaan' && activeReport !== 'pengeluaran' && activeReport !== 'persediaan' && activeReport !== 'mutasi' && (
          <motion.div key="other" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center text-slate-400">
            <p className="text-sm font-medium">Modul laporan ini sedang dalam pengembangan.</p>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default InventoryReports;
