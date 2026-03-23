import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget, TransactionType, AccountCodes, BankStatement } from '../types';
import { FileDown, Printer, FileText, TrendingUp, Table2, List, Calendar, FilterX, Upload, Trash2, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBankStatements, saveBankStatement, deleteBankStatement, uploadBankStatementFile, getStoredAccounts } from '../lib/db';
import { supabase } from '../lib/supabase';

interface ReportsProps {
  data: Budget[];
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'realization' | 'recap' | 'statement'>('realization');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Bank Statement State
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [bsMonth, setBsMonth] = useState(new Date().getMonth() + 1);
  const [bsBalance, setBsBalance] = useState('');
  
  // Account Mapping State (Dynamic from DB)
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStatementLoading, setIsStatementLoading] = useState(false);

  useEffect(() => {
    loadBankStatements();
    loadAccounts();
  }, []);

  const loadBankStatements = async () => {
    const stmts = await getBankStatements();
    setBankStatements(stmts);
  };

  const loadAccounts = async () => {
      const accs = await getStoredAccounts();
      setAllAccounts(accs);
  };

  // --- 1. DATA LAPORAN RINCIAN (EXISTING) ---
  const realizationData = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE);
    
    return expenses.map(item => {
      const realized = item.realizations?.reduce((acc, r) => acc + r.amount, 0) || 0;
      const balance = item.amount - realized;
      const percentage = item.amount > 0 ? (realized / item.amount) * 100 : 0;
      
      return {
        ...item,
        realized,
        balance,
        percentage
      };
    }).sort((a, b) => (a.account_code || '').localeCompare(b.account_code || ''));
  }, [data]);

  const realizationTotals = useMemo(() => {
    const totalBudget = realizationData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRealized = realizationData.reduce((acc, curr) => acc + curr.realized, 0);
    const totalBalance = totalBudget - totalRealized;
    const totalPercent = totalBudget > 0 ? (totalRealized / totalBudget) * 100 : 0;
    
    return { totalBudget, totalRealized, totalBalance, totalPercent };
  }, [realizationData]);

  // --- 2. DATA LAPORAN REKAPITULASI BULANAN (FILTERED BY REALIZATION > 0) ---
  const monthlyRecapData = useMemo(() => {
    const grouped: Record<string, { description: string, budget: number, past: number, current: number }> = {};

    data.forEach(item => {
      if (item.type !== TransactionType.EXPENSE) return;
      const code = item.account_code || 'Tanpa Kode';
      if (!grouped[code]) {
        const name = allAccounts[code] || 'Belanja Lainnya / Belum Terkategori';
        grouped[code] = { description: name, budget: 0, past: 0, current: 0 };
      }
      grouped[code].budget += item.amount;
      if (item.realizations) {
        item.realizations.forEach(r => {
          if (r.month < reportMonth) grouped[code].past += r.amount;
          else if (r.month === reportMonth) grouped[code].current += r.amount;
        });
      }
    });

    const rows = Object.entries(grouped).map(([code, val]) => {
      const totalToDate = val.past + val.current;
      const balance = val.budget - totalToDate;
      const percentage = val.budget > 0 ? (totalToDate / val.budget) * 100 : 0;
      return { code, name: val.description, budget: val.budget, past: val.past, current: val.current, totalToDate, balance, percentage };
    });

    return rows.filter(row => row.current > 0).sort((a, b) => a.code.localeCompare(b.code));
  }, [data, reportMonth, allAccounts]);

  const monthlyRecapTotals = useMemo(() => {
    return monthlyRecapData.reduce((acc, curr) => ({
      budget: acc.budget + curr.budget, past: acc.past + curr.past, current: acc.current + curr.current,
      totalToDate: acc.totalToDate + curr.totalToDate, balance: acc.balance + curr.balance
    }), { budget: 0, past: 0, current: 0, totalToDate: 0, balance: 0 });
  }, [monthlyRecapData]);

  // --- 3. REKONSILIASI BANK (LOGIC) ---
  const bankReconciliation = useMemo(() => {
      const totalIncome = data.filter(d => d.type === TransactionType.INCOME && new Date(d.date).getMonth() + 1 <= bsMonth).reduce((sum, item) => sum + item.amount, 0);
      const totalExpense = data.filter(d => d.type === TransactionType.EXPENSE).reduce((sum, item) => {
            const realizedTillNow = item.realizations?.filter(r => r.month <= bsMonth).reduce((rSum, r) => rSum + r.amount, 0) || 0;
            return sum + realizedTillNow;
      }, 0);
      const systemBalance = totalIncome - totalExpense;
      const statement = bankStatements.find(s => s.month === bsMonth);
      const bankBalance = statement?.closing_balance || 0;
      const hasStatement = !!statement;
      const difference = systemBalance - bankBalance;

      return { systemBalance, bankBalance, difference, hasStatement };
  }, [data, bankStatements, bsMonth]);

  const handleSaveStatement = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsStatementLoading(true);
      try {
        let fileUrl = ''; let filePath = '';
        if (selectedFile && supabase) {
            const result = await uploadBankStatementFile(selectedFile);
            if (result.url) { fileUrl = result.url; filePath = result.path || ''; }
        }
        const newStatement: BankStatement = { id: crypto.randomUUID(), month: bsMonth, year: 2026, closing_balance: Number(bsBalance), file_name: selectedFile ? selectedFile.name : 'rekening_koran_manual.pdf', file_url: fileUrl, file_path: filePath, updated_at: new Date().toISOString() };
        await saveBankStatement(newStatement); await loadBankStatements();
        setBsBalance(''); setSelectedFile(null);
      } catch (error) { console.error("Failed to save statement:", error); } 
      finally { setIsStatementLoading(false); }
  };

  const handleDeleteStatement = async (id: string) => {
      if(confirm("Hapus data rekening koran ini?")) { await deleteBankStatement(id); await loadBankStatements(); }
  };

  const handleDownloadStatement = (stmt: BankStatement) => {
    if (stmt.file_url) {
        const link = document.createElement('a'); link.href = stmt.file_url; link.target = '_blank';
        link.rel = 'noopener noreferrer'; link.download = stmt.file_name || `Rekening_Koran_${stmt.month}_${stmt.year}`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        return;
    } 
    const doc = new jsPDF();
    doc.setLineWidth(1); doc.setDrawColor(0); doc.line(20, 25, 190, 25);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('ARSIP DIGITAL REKENING KORAN', 105, 20, { align: 'center' });
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.text('Aplikasi RKAS Pintar SD', 105, 32, { align: 'center' });
    const startY = 50; const lineHeight = 10; const leftCol = 30; const midCol = 80;
    doc.text(`Bulan`, leftCol, startY); doc.text(`: ${MONTHS[stmt.month - 1]}`, midCol, startY);
    doc.text(`Tahun Anggaran`, leftCol, startY + lineHeight); doc.text(`: ${stmt.year}`, midCol, startY + lineHeight);
    doc.text(`Saldo Akhir Bank`, leftCol, startY + (lineHeight * 2)); doc.setFont('helvetica', 'bold'); doc.text(`: ${formatRupiah(stmt.closing_balance)}`, midCol, startY + (lineHeight * 2));
    doc.setFont('helvetica', 'normal'); doc.text(`Nama File Fisik`, leftCol, startY + (lineHeight * 3)); doc.text(`: ${stmt.file_name || 'Tidak ada file fisik'}`, midCol, startY + (lineHeight * 3));
    doc.text(`Tanggal Upload`, leftCol, startY + (lineHeight * 4)); doc.text(`: ${stmt.updated_at ? new Date(stmt.updated_at).toLocaleString('id-ID') : '-'}`, midCol, startY + (lineHeight * 4));
    doc.setDrawColor(200); doc.line(20, 110, 190, 110); doc.setFontSize(9); doc.setTextColor(100); doc.text('Catatan Sistem:', 20, 118); doc.text('Ini adalah dokumen PDF pengganti (placeholder) karena file asli tidak ditemukan di cloud.', 20, 123);
    doc.save(`Rekening_Koran_Simulasi_${MONTHS[stmt.month-1]}_${stmt.year}.pdf`);
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const formatCompact = (num: number) => { if (num === 0) return '-'; return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num); };

  const generateRealizationPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('LAPORAN RINCIAN REALISASI ANGGARAN (PER KEGIATAN)', 105, 20, { align: 'center' });
    doc.setFontSize(12); doc.text('TAHUN ANGGARAN 2026', 105, 28, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Total Pagu: ${formatRupiah(realizationTotals.totalBudget)}`, 14, 40); doc.text(`Total Realisasi: ${formatRupiah(realizationTotals.totalRealized)}`, 14, 45);
    const tableBody = realizationData.map((item, index) => [ index + 1, item.account_code || '-', item.description, formatRupiah(item.amount), formatRupiah(item.realized), formatRupiah(item.balance), `${item.percentage.toFixed(0)}%` ]);
    tableBody.push([ '', '', 'TOTAL', formatRupiah(realizationTotals.totalBudget), formatRupiah(realizationTotals.totalRealized), formatRupiah(realizationTotals.totalBalance), '' ]);
    autoTable(doc, { startY: 50, head: [['No', 'Kode Rekening', 'Uraian Kegiatan', 'Pagu', 'Realisasi', 'Sisa', '%']], body: tableBody, theme: 'grid', headStyles: { fillColor: [37, 99, 235], fontSize: 9 }, styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 25, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' }, 6: { cellWidth: 10, halign: 'center' } }, didParseCell: (data) => { if (data.row.index === tableBody.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; } } });
    doc.save('Laporan_Rincian_Realisasi.pdf');
  };

  const generateRecapPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text(`REKAPITULASI REALISASI SPJ (TEREALISASI)`, 148, 15, { align: 'center' });
    doc.setFontSize(12); doc.text(`BULAN: ${MONTHS[reportMonth-1].toUpperCase()} 2026`, 148, 22, { align: 'center' });
    const tableHead = [ ['Kode Rekening', 'Uraian Belanja', 'Anggaran (1 Thn)', 's.d. Bulan Lalu', 'Bulan Ini', 's.d. Bulan Ini', 'Sisa Anggaran'] ];
    const tableBody = monthlyRecapData.map(row => [ row.code, row.name, formatCompact(row.budget), formatCompact(row.past), formatCompact(row.current), formatCompact(row.totalToDate), formatCompact(row.balance) ]);
    const totalRow = [ 'TOTAL', '', formatCompact(monthlyRecapTotals.budget), formatCompact(monthlyRecapTotals.past), formatCompact(monthlyRecapTotals.current), formatCompact(monthlyRecapTotals.totalToDate), formatCompact(monthlyRecapTotals.balance) ];
    tableBody.push(totalRow);
    autoTable(doc, { startY: 30, head: tableHead, body: tableBody, theme: 'grid', headStyles: { fillColor: [22, 163, 74], fontSize: 9, halign: 'center' }, styles: { fontSize: 8, cellPadding: 2, halign: 'right' }, columnStyles: { 0: { halign: 'left', cellWidth: 30 }, 1: { halign: 'left', cellWidth: 'auto' }, 2: { fontStyle: 'bold' }, 4: { fillColor: [240, 253, 244], fontStyle: 'bold' }, 6: { fontStyle: 'bold', textColor: [200, 0, 0] } }, didParseCell: (data) => { if (data.row.index === tableBody.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [240, 240, 240]; } } });
    doc.save(`Rekap_SPJ_${MONTHS[reportMonth-1]}.pdf`);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">
      
      {/* Header & Tabs */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100 flex items-center gap-1"><FileText size={12}/> Pelaporan</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Laporan & Cetak</h2>
        </div>
        
        {/* Toggle Buttons */}
        <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl flex overflow-x-auto shadow-sm border border-white/80 relative z-10 mt-4 md:mt-0">
            {[
                { id: 'realization', icon: List, label: 'Rincian Kegiatan', color: 'blue' },
                { id: 'recap', icon: Table2, label: 'Rekapitulasi SPJ', color: 'emerald' },
                { id: 'statement', icon: Upload, label: 'Rekonsiliasi Bank', color: 'indigo' }
            ].map(tab => (
                 <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap overflow-hidden ${
                     activeTab === tab.id 
                     ? `text-${tab.color}-600 bg-white shadow-md border border-${tab.color}-100` 
                     : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                 }`}
              >
                 {activeTab === tab.id && <motion.div layoutId="tab-blob" className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 -z-10"></motion.div>}
                 <tab.icon size={16} /> {tab.label}
              </button>
            ))}
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
            {activeTab === 'realization' && (
                <motion.div key="realization-cards" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="contents">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden group">
                       <div className="flex items-center gap-3 mb-2 opacity-90">
                         <div className="p-2 bg-white/20 rounded-lg"><FileText size={20} /></div>
                         <span className="text-xs font-bold uppercase tracking-widest text-blue-100">Total Pagu Anggaran</span>
                       </div>
                       <p className="text-3xl font-black drop-shadow-md group-hover:scale-105 transition-transform origin-left">{formatRupiah(realizationTotals.totalBudget)}</p>
                       <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText size={120}/></div>
                    </div>
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                       <div className="flex items-center gap-3 mb-2 text-emerald-600">
                         <div className="p-2 bg-emerald-50 rounded-lg"><Printer size={20} /></div>
                         <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Realisasi (SPJ)</span>
                       </div>
                       <p className="text-3xl font-black text-slate-800 tabular-nums group-hover:translate-x-1 transition-transform">{formatRupiah(realizationTotals.totalRealized)}</p>
                       <p className="text-xs font-bold text-emerald-500 mt-2 bg-emerald-50 inline-block px-2 py-1 rounded-md">
                         {realizationTotals.totalPercent.toFixed(1)}% Terserap
                       </p>
                    </div>
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                       <div className="flex items-center gap-3 mb-2 text-orange-600">
                         <div className="p-2 bg-orange-50 rounded-lg"><TrendingUp size={20} /></div>
                         <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Sisa Anggaran</span>
                       </div>
                       <p className="text-3xl font-black text-slate-800 tabular-nums group-hover:translate-x-1 transition-transform">{formatRupiah(realizationTotals.totalBalance)}</p>
                    </div>
                </motion.div>
            )}
            
            {activeTab === 'recap' && (
                <motion.div key="recap-cards" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="contents">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
                       <div className="flex items-center gap-3 mb-2 opacity-90">
                          <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={20} /></div>
                         <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">SPJ Bulan {MONTHS[reportMonth-1]}</span>
                       </div>
                       <p className="text-3xl font-black drop-shadow-md group-hover:scale-105 transition-transform origin-left">{formatRupiah(monthlyRecapTotals.current)}</p>
                       <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity"><Table2 size={120}/></div>
                    </div>
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden group flex flex-col justify-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Jumlah Kode Rekening</div>
                        <p className="text-3xl font-black text-slate-800 group-hover:translate-x-1 transition-transform">{monthlyRecapData.length}</p>
                        <p className="text-[10px] text-slate-400 mt-2">Akun belanja aktif bulan ini.</p>
                    </div>
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden group flex flex-col justify-center">
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Akumulasi s.d. Bulan Ini</div>
                        <p className="text-3xl font-black text-blue-600 tabular-nums group-hover:translate-x-1 transition-transform">{formatRupiah(monthlyRecapTotals.totalToDate)}</p>
                    </div>
                </motion.div>
            )}

            {activeTab === 'statement' && (
                 <motion.div key="statement-cards" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="contents">
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40">
                       <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Sisa Kas (Pembukuan)</div>
                        <p className="text-3xl font-black text-slate-800 tabular-nums">{formatRupiah(bankReconciliation.systemBalance)}</p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Pendapatan - SPJ (s.d. {MONTHS[bsMonth-1]})</p>
                    </div>
                    <div className="glass-panel border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40">
                       <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Sisa Kas (Bank/Riil)</div>
                        {bankReconciliation.hasStatement ? (
                            <p className="text-3xl font-black text-indigo-600 tabular-nums">{formatRupiah(bankReconciliation.bankBalance)}</p>
                        ) : (
                            <p className="text-sm font-medium text-slate-400 italic mt-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-max">Belum upload Rekening Koran</p>
                        )}
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-2">Sesuai Rekening Koran {MONTHS[bsMonth-1]}</p>
                    </div>
                    <div className={`rounded-3xl p-6 shadow-xl shadow-slate-200/40 border backdrop-blur-md ${
                        Math.abs(bankReconciliation.difference) < 100 
                            ? 'bg-emerald-50/80 border-emerald-200' 
                            : 'bg-rose-50/80 border-rose-200'
                    }`}>
                       <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-widest ${Math.abs(bankReconciliation.difference) < 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {Math.abs(bankReconciliation.difference) < 100 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16} className="animate-pulse"/>} Status Rekonsiliasi
                        </div>
                        <p className={`text-3xl font-black tabular-nums ${Math.abs(bankReconciliation.difference) < 100 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {Math.abs(bankReconciliation.difference) < 100 ? 'SEIMBANG' : formatRupiah(bankReconciliation.difference)}
                        </p>
                        <p className={`text-[10px] font-bold mt-2 ${Math.abs(bankReconciliation.difference) < 100 ? 'text-emerald-600/80' : 'text-rose-600/80'}`}>
                            {Math.abs(bankReconciliation.difference) < 100 ? 'Data sudah valid dan sinkron.' : 'Terdapat selisih antara Buku Kas Umum dan Bank.'}
                        </p>
                    </div>
                 </motion.div>
            )}
        </AnimatePresence>
      </motion.div>

      <motion.div variants={itemVariants} className="w-full">
          {/* TAB CONTENT: REALIZATION */}
          {activeTab === 'realization' && (
            <div className="glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-8 py-5 border-b border-slate-100 bg-white/40 flex justify-between items-center flex-wrap gap-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><List size={18} /></div>
                     <h3 className="font-black text-slate-800 tracking-tight">Rincian Per Kegiatan</h3>
                   </div>
                   <button onClick={generateRealizationPDF} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-lg hover:shadow-blue-500/30 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                      <FileDown size={14} /> Download PDF Rincian
                   </button>
                </div>
                <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                  <table className="w-full text-left text-sm text-slate-600 relative">
                    <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 border-b border-white">
                      <tr>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">No</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Kode Rekening</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Uraian Kegiatan</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Pagu</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Realisasi</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Sisa</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 bg-white/40">
                      {realizationData.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 font-medium">Belum ada data kegiatan.</td></tr>
                      ) : (
                          realizationData.map((item, idx) => (
                            <motion.tr key={item.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay: idx*0.02}} className="hover:bg-white/80 transition-colors">
                              <td className="px-6 py-4 text-center font-bold text-xs text-slate-400">{idx + 1}</td>
                              <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500 bg-slate-50/50">{item.account_code || '-'}</td>
                              <td className="px-6 py-4 font-medium text-slate-700">{item.description}</td>
                              <td className="px-6 py-4 text-right font-mono text-xs">{formatRupiah(item.amount)}</td>
                              <td className="px-6 py-4 text-right font-mono text-xs font-black text-emerald-600 bg-emerald-50/30">{formatRupiah(item.realized)}</td>
                              <td className="px-6 py-4 text-right font-mono text-xs font-bold text-orange-500">{formatRupiah(item.balance)}</td>
                              <td className="px-6 py-4 text-center text-xs">
                                <span className={`px-2 py-1 rounded-md font-bold ${item.percentage === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.percentage.toFixed(0)}%</span>
                              </td>
                            </motion.tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {/* TAB CONTENT: RECAPITULATION */}
          {activeTab === 'recap' && (
            <div className="glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-8 py-5 border-b border-slate-100 bg-white/40 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Table2 size={18} /></div>
                     <div>
                        <h3 className="font-black text-slate-800 tracking-tight">Rekapitulasi SPJ (Terealisasi)</h3>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                       <div className="relative">
                          <select value={reportMonth} onChange={(e) => setReportMonth(Number(e.target.value))} className="pl-5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm appearance-none">
                             {MONTHS.map((m, idx) => (<option key={idx} value={idx + 1}>{m}</option>))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Calendar size={14}/></div>
                       </div>
                       <button onClick={generateRecapPDF} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                          <FileDown size={14} /> Download PDF Rekap
                       </button>
                   </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
                  <table className="w-full text-left text-xs text-slate-600 relative">
                    <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 border-b border-white">
                      <tr>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest w-32">Kode Rekening</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Uraian Akun Belanja</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right bg-slate-50">Anggaran (1 Thn)</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">s.d. Bulan Lalu</th>
                        <th className="px-6 py-4 font-black text-[10px] text-emerald-600 uppercase tracking-widest text-right bg-emerald-50 border-l border-r border-emerald-100">Bulan Ini</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">s.d. Bulan Ini</th>
                        <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right text-orange-500">Sisa Anggaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 bg-white/40">
                      {monthlyRecapData.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                              <div className="flex flex-col items-center gap-3">
                                 <div className="p-4 bg-slate-100 rounded-full"><FilterX size={24} className="text-slate-400" /></div>
                                 <span className="font-bold">Tidak ada transaksi SPJ pada bulan {MONTHS[reportMonth-1]}.</span>
                              </div>
                           </td></tr>
                      ) : (
                        <>
                          {monthlyRecapData.map((row, idx) => (
                            <motion.tr key={row.code} initial={{opacity:0}} animate={{opacity:1}} transition={{delay: idx*0.02}} className="hover:bg-white/80 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-slate-500">{row.code}</td>
                              <td className="px-6 py-4 font-bold text-slate-800">{row.name}</td>
                              <td className="px-6 py-4 text-right font-mono bg-slate-50/50">{formatCompact(row.budget)}</td>
                              <td className="px-6 py-4 text-right font-mono text-slate-400">{formatCompact(row.past)}</td>
                              <td className="px-6 py-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 border-l border-r border-emerald-100/50">
                                  {formatCompact(row.current)}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{formatCompact(row.totalToDate)}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-orange-500">{formatCompact(row.balance)}</td>
                            </motion.tr>
                          ))}
                          <tr className="bg-emerald-50/60 font-black border-t-2 border-emerald-200/50 text-emerald-900 sticky bottom-0 backdrop-blur-md">
                              <td className="px-6 py-4 text-center uppercase tracking-widest text-[10px]" colSpan={2}>Total SPJ Bulan Ini</td>
                              <td className="px-6 py-4 text-right font-mono">{formatCompact(monthlyRecapTotals.budget)}</td>
                              <td className="px-6 py-4 text-right font-mono">{formatCompact(monthlyRecapTotals.past)}</td>
                              <td className="px-6 py-4 text-right font-mono text-emerald-700 bg-emerald-100/50 border-l border-r border-emerald-200">{formatCompact(monthlyRecapTotals.current)}</td>
                              <td className="px-6 py-4 text-right font-mono">{formatCompact(monthlyRecapTotals.totalToDate)}</td>
                              <td className="px-6 py-4 text-right font-mono text-orange-600">{formatCompact(monthlyRecapTotals.balance)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {/* TAB CONTENT: BANK STATEMENTS */}
          {activeTab === 'statement' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-4 glass-panel rounded-[2rem] border border-white/60 shadow-xl p-8 relative overflow-hidden">
                    <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Upload size={18}/></div> Upload Rekening Koran
                    </h3>
                    <form onSubmit={handleSaveStatement} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Pilih Bulan</label>
                            <select value={bsMonth} onChange={(e) => setBsMonth(Number(e.target.value))} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                                {MONTHS.map((m, i) => (<option key={i} value={i+1}>{m}</option>))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Saldo Akhir (Sesuai Bank)</label>
                            <div className="relative">
                               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                               <input required type="number" min="0" value={bsBalance} onChange={(e) => setBsBalance(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-sm font-black font-mono focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium">Nominal mutlak sesuai print out bank di akhir bulan.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Upload File (PDF/Scan)</label>
                            <label className="block border-2 border-dashed border-slate-200 bg-white/40 rounded-xl p-6 text-center hover:bg-white/80 transition-all cursor-pointer group">
                               <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
                                   <Upload size={20} />
                               </div>
                               <p className="text-xs font-bold text-slate-600 truncate max-w-full px-2">
                                   {selectedFile ? selectedFile.name : "Klik atau Drop file di sini"}
                               </p>
                               <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        <button type="submit" disabled={isStatementLoading || !bsBalance || !selectedFile} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-lg hover:shadow-indigo-500/30 text-white py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none">
                            {isStatementLoading ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : 'Simpan & Rekonsiliasi'}
                        </button>
                    </form>
                    <div className="absolute -bottom-10 -right-10 opacity-5 blur-[2px] pointer-events-none"><Upload size={200}/></div>
                </div>

                <div className="lg:col-span-8 glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-white/40">
                        <h3 className="font-black text-slate-800 tracking-tight">Riwayat Dokumen Rekening Koran</h3>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar min-h-[300px]">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 border-b border-white">
                                <tr>
                                    <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Bulan</th>
                                    <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Saldo Akhir</th>
                                    <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">Waktu Upload</th>
                                    <th className="px-6 py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/60 bg-white/40">
                                {bankStatements.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 font-medium">Belum ada dokumen rekening koran tersimpan.</td></tr>
                                ) : (
                                    bankStatements.map(stmt => (
                                        <motion.tr key={stmt.id} initial={{opacity:0}} animate={{opacity:1}} className="hover:bg-white/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block text-xs">{MONTHS[stmt.month - 1]} {stmt.year}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-slate-700">{formatRupiah(stmt.closing_balance)}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {stmt.updated_at ? new Date(stmt.updated_at).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' }) : '-'}
                                                <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={stmt.file_name}>{stmt.file_name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => handleDownloadStatement(stmt)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors shadow-sm" title="Download/Lihat File">
                                                        <Download size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteStatement(stmt.id)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors shadow-sm" title="Hapus Data">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
      </motion.div>
    </motion.div>
  );
};

export default Reports;