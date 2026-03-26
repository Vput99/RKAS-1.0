
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { Search, Printer, Trash2, MoreHorizontal, ArrowLeft, HelpCircle, BookOpen, Plus, ChevronRight, Check } from 'lucide-react';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BKUProps {
  data: Budget[];
  profile: SchoolProfile | null;
  onBack?: () => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 20 } }
};

const BKU: React.FC<BKUProps> = ({ data, profile, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const bkuData = useMemo(() => {
    const list: any[] = [];
    data.forEach(item => {
      if (item.type !== TransactionType.EXPENSE || !item.realizations) return;

      item.realizations.forEach((real, _idx) => {
        // Extract month from real.date (YYYY-MM-DD)
        const realDate = new Date(real.date);
        const realMonth = realDate.getMonth() + 1; // getMonth() is 0-indexed

        if (realMonth === selectedMonth) {
          list.push({
            date: real.date,
            kegiatan: item.description,
            rekening: item.account_code || '-',
            jenis: real.vendor_account ? 'Non Tunai' : 'Tunai',
            anggaran: item.amount,
            dibelanjakan: real.amount,
            pajak: 0, // Placeholder
            raw: real
          });
        }
      });
    });
    
    const sortedList = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sortedList.map((row, index) => ({
      ...row,
      id: `BNU${String(76 + index).padStart(2, '0')}` 
    })).filter(row => 
      row.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.rekening.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, selectedMonth, searchTerm]);

  const stats = useMemo(() => {
    let nonTunai = 0;
    let tunai = 0;
    let bkuPajak = 0;
    
    bkuData.forEach(row => {
      if (row.jenis === 'Non Tunai') nonTunai += row.dibelanjakan;
      else tunai += row.dibelanjakan;
      bkuPajak += row.pajak;
    });

    const totalIncome = data.filter(d => d.type === TransactionType.INCOME).reduce((s, i) => s + i.amount, 0);
    const totalExpenseAllTime = data.filter(d => d.type === TransactionType.EXPENSE).reduce((s, e) => {
      const expensesUpToMonth = e.realizations?.filter(r => {
        const rDate = new Date(r.date);
        const rMonth = rDate.getMonth() + 1;
        return rMonth <= selectedMonth;
      }).reduce((acc, r) => acc + r.amount, 0) || 0;
      return s + expensesUpToMonth;
    }, 0);

    const targetBudget = data.filter(d => d.type === TransactionType.EXPENSE).reduce((s, e) => s + e.amount, 0);
    const percentage = targetBudget > 0 ? (totalExpenseAllTime / targetBudget) * 100 : 0;

    return { 
        nonTunai, 
        tunai, 
        pajak: bkuPajak, 
        sisa: totalIncome - totalExpenseAllTime,
        totalBudget: targetBudget,
        totalSpent: totalExpenseAllTime,
        percentage
    };
  }, [bkuData, data, selectedMonth]);

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Buku Kas Umum (BKU) - ${MONTHS[selectedMonth - 1]} 2026`;
    const startY = generatePDFHeader(doc, profile, title);

    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['No', 'Tanggal', 'ID', 'Kegiatan', 'Rekening', 'Jenis', 'Nominal']],
      body: bkuData.map((row, i) => [
        i + 1,
        row.date,
        row.id,
        row.kegiatan,
        row.rekening,
        row.jenis,
        formatCurrency(row.dibelanjakan),
      ]),
    });

    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`BKU_${MONTHS[selectedMonth - 1]}_2026.pdf`);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-20 max-w-[1600px] mx-auto px-4 sm:px-6">
      
      {/* Dynamic Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div className="flex flex-col gap-1">
            <button onClick={onBack} className="flex items-center gap-1.5 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors w-fit mb-2 group">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Kembali ke Penatausahaan
            </button>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">BKU {MONTHS[selectedMonth - 1]} 2026</h1>
                <button className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider group">
                    <Trash2 size={12} className="group-hover:scale-110 transition-transform" /> Hapus BKU
                </button>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BOSP REGULER 2026</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
           <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all">
                <Plus size={16} /> Tambah Pembelanjaan
           </button>
           <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>
           <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-40 shadow-sm transition-all"
                />
           </div>
           <button onClick={handleExportPDF} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm hover:border-blue-400 hover:text-blue-600 transition-all">
                <Printer size={16} /> Cetak
           </button>
           <button className="px-6 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all">
                Tutup BKU
           </button>
        </div>
      </motion.div>

      {/* Connection Notice */}
      <motion.div variants={itemVariants} className="flex justify-end pr-1">
          <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1.5 bg-blue-50/50 px-3 py-1 rounded-full border border-blue-100/50 italic">
              "Tutup BKU" membutuhkan koneksi internet
          </p>
      </motion.div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Summary: Dana Tersedia */}
          <motion.div variants={itemVariants} className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 flex flex-col justify-between group overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 group-hover:text-blue-500 transition-colors">TOTAL DANA TERSEDIA</p>
                <h4 className="text-3xl font-black text-slate-800 mb-6 drop-shadow-sm">{formatRupiah(stats.sisa)}</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-blue-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nontunai</p>
                      <div className="text-lg font-black text-blue-600 tabular-nums">{formatRupiah(stats.sisa)}</div>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-emerald-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tunai</p>
                      <div className="text-lg font-black text-slate-300 tabular-nums">Rp 0</div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 text-[10px] font-black text-blue-600 relative z-10">
                  <button className="hover:underline transition-all flex items-center gap-1">Tarik Tunai <ChevronRight size={12}/></button>
                  <button className="hover:underline transition-all flex items-center gap-1">Setor Tunai <ChevronRight size={12}/></button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-blue-50 rounded-full blur-3xl -z-0 opacity-60"></div>
          </motion.div>

          {/* Right Summary: Anggaran Belanja */}
          <motion.div variants={itemVariants} className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 flex flex-col group relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">ANGGARAN DIBELANJAKAN SAMPAI BULAN INI</p>
                    <p className="text-[10px] text-slate-400 font-medium">Monitoring Penyerapan Dana Tahap 1</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <div className="relative w-12 h-12">
                          <svg className="w-12 h-12 -rotate-90">
                              <circle cx="24" cy="24" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                              <circle cx="24" cy="24" r="18" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray={113.1} strokeDashoffset={113.1 * (1 - stats.percentage/100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">{Math.round(stats.percentage)}%</div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 max-w-[120px] leading-tight"><span className="text-emerald-600">{Math.round(stats.percentage)}%</span> dana tersedia tahap 1 telah dibelanjakan</p>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-6 relative z-10">
                  <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Bisa Dibelanjakan <HelpCircle size={10}/></p>
                      <div className="text-lg font-black text-blue-600 tabular-nums truncate" title={formatRupiah(stats.totalBudget)}>{formatRupiah(stats.totalBudget)}</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-full"></div></div>
                  </div>
                  <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Sudah Dibelanjakan <HelpCircle size={10}/></p>
                      <div className="text-lg font-black text-slate-800 tabular-nums truncate" title={formatRupiah(stats.totalSpent)}>{formatRupiah(stats.totalSpent)}</div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${stats.percentage}%`}} className="h-full bg-emerald-500"></motion.div></div>
                  </div>
                  <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">Bisa Dianggarkan Ulang <HelpCircle size={10}/></p>
                      <div className="text-lg font-black text-slate-300 tabular-nums">Rp 0</div>
                      <div className="h-1 bg-slate-100 rounded-full"></div>
                  </div>
              </div>

              <div className="mt-8 flex justify-end">
                <span className="text-[9px] font-bold text-slate-400 italic flex items-center gap-1.5"><Check size={12} className="text-emerald-500"/> tersimpan otomatis pukul {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</span>
              </div>
          </motion.div>
      </div>

      {/* Main Table Section */}
      <motion.div variants={itemVariants} className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden mt-8">
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                          <th className="pl-8 pr-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black">ID</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black">Tanggal</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black">Kegiatan</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black">Rekening Belanja</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black">Jenis Transaksi</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Anggaran</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Dibelanjakan</th>
                          <th className="px-4 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Pajak Wajib Lapor</th>
                          <th className="pl-4 pr-8 py-6 uppercase tracking-widest text-[10px] text-slate-400 font-black text-center">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {bkuData.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-24 text-center">
                                <div className="flex flex-col items-center justify-center animate-fade-in">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                        <BookOpen size={40} strokeWidth={1.5} />
                                    </div>
                                    <p className="font-bold text-slate-400">Belum ada realisasi pembelanjaan di bulan {MONTHS[selectedMonth-1]}</p>
                                    <p className="text-xs text-slate-300 mt-1">Gunakan tombol "Tambah Pembelanjaan" untuk memulai</p>
                                </div>
                            </td>
                          </tr>
                      ) : bkuData.map((row) => (
                          <motion.tr 
                              key={row.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-slate-50/50 transition-all group"
                          >
                              <td className="pl-8 pr-4 py-5">
                                  <span className="font-mono text-[11px] font-black text-slate-400">{row.id}</span>
                              </td>
                              <td className="px-4 py-5">
                                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                      {new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                              </td>
                              <td className="px-4 py-5 min-w-[200px]">
                                  <div className="text-xs font-black text-blue-700 hover:text-blue-900 transition-colors leading-relaxed line-clamp-2" title={row.kegiatan}>{row.kegiatan}</div>
                              </td>
                              <td className="px-4 py-5 min-w-[180px]">
                                  <div className="text-xs font-bold text-slate-500 leading-relaxed line-clamp-2" title={row.rekening}>{row.rekening}</div>
                              </td>
                              <td className="px-4 py-5">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                      row.jenis === 'Non Tunai' 
                                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  }`}>
                                      {row.jenis}
                                  </span>
                              </td>
                              <td className="px-4 py-5 text-right font-mono text-xs font-bold text-slate-400">
                                  {formatRupiah(row.anggaran)}
                              </td>
                              <td className="px-4 py-5 text-right font-mono text-xs font-black text-slate-700">
                                  {formatRupiah(row.dibelanjakan)}
                              </td>
                              <td className="px-4 py-5 text-right font-mono text-xs font-bold text-slate-400">
                                  {formatRupiah(row.pajak)}
                              </td>
                              <td className="pl-4 pr-8 py-5 text-center">
                                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md border border-transparent hover:border-blue-100 rounded-xl transition-all">
                                      <MoreHorizontal size={18} />
                                  </button>
                                  <div className="hidden group-hover:flex items-center gap-1 absolute right-8 bg-white border border-slate-100 p-1 rounded-xl shadow-xl z-10 -translate-y-1/2">
                                      {/* Quick Action Overlay could go here */}
                                  </div>
                              </td>
                          </motion.tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </motion.div>

      {/* Month Picker - Styled as pagination/tags */}
      <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 mt-12 pb-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pilih Bulan Laporan</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
              {MONTHS.map((m, i) => {
                  const isSelected = selectedMonth === i + 1;
                  return (
                      <button
                          key={m}
                          onClick={() => setSelectedMonth(i + 1)}
                          className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                              isSelected 
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-105 z-10' 
                                : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100'
                          }`}
                      >
                          {m.substring(0, 3)}
                      </button>
                  );
              })}
          </div>
      </motion.div>
    </motion.div>
  );
};

export default BKU;
