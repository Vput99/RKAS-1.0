import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { Search, Printer, Trash2, MoreHorizontal, ArrowLeft, HelpCircle, BookOpen, CreditCard, Landmark, Receipt, Calendar } from 'lucide-react';
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
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
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
        if (real.month === selectedMonth) {
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
    
    // Sort first by date, then assign sequential BNU IDs
    const sortedList = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sortedList.map((row, index) => ({
      ...row,
      id: `BNU${68 + index}` // Starting from 68 as in screenshot
    })).filter(row => 
      row.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.rekening.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, selectedMonth, searchTerm]);

  const stats = useMemo(() => {
    let nonTunai = 0;
    let tunai = 0;
    let pajak = 0;
    
    bkuData.forEach(row => {
      if (row.jenis === 'Non Tunai') nonTunai += row.dibelanjakan;
      else tunai += row.dibelanjakan;
      pajak += row.pajak;
    });

    // Calculate remaining (total income - total expense so far)
    const totalIncome = data.filter(d => d.type === TransactionType.INCOME).reduce((s, i) => s + i.amount, 0);
    const totalExpenseAllTime = data.filter(d => d.type === TransactionType.EXPENSE).reduce((s, e) => {
      return s + (e.realizations?.filter(r => r.month <= selectedMonth).reduce((acc, r) => acc + r.amount, 0) || 0);
    }, 0);

    return { nonTunai, tunai, pajak, sisa: totalIncome - totalExpenseAllTime };
  }, [bkuData, data, selectedMonth]);

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Buku Kas Umum (BKU) - ${MONTHS[selectedMonth - 1]} 2025`;
    const startY = generatePDFHeader(doc, profile, title);

    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['No', 'Tanggal', 'Kode Rekening', 'Uraian', 'Penerimaan', 'Pengeluaran', 'Saldo']],
      body: bkuData.map((row, i) => [
        i + 1,
        row.date,
        row.rekening,
        row.kegiatan,
        '-',
        formatCurrency(row.dibelanjakan),
        '-'
      ]),
    });

    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`BKU_${MONTHS[selectedMonth - 1]}_2025.pdf`);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <button onClick={onBack} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl transition shadow-sm bg-white/50 border border-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-yellow-50 text-yellow-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-yellow-100 flex items-center gap-1"><BookOpen size={12}/> Buku Kas Umum</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">BOSP REGULER 2025</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">BKU <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{MONTHS[selectedMonth - 1]} 2025</span></h1>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0 relative z-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 border border-white/60 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 w-64 shadow-sm transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 active:scale-95 transition-all"
          >
            <Printer size={16} /> Print
          </button>
          <button className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all">
            <Trash2 size={16} /> Hapus
          </button>
        </div>
        
        {/* Background Graphic */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        
        {/* Closure Info Card */}
        <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200/50 rounded-2xl p-4 shadow-sm flex items-center gap-3 animate-in fade-in zoom-in duration-500">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shadow-inner">
             <Calendar size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 tracking-tight">Status Penutupan BKU</p>
            <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">BKU sudah ditutup pada tanggal 10 Desember 2025. Data bersifat read-only.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 text-blue-600">
                    <Landmark size={20} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belanja Nontunai</p>
            </div>
            <div className="text-2xl font-black text-slate-800 tabular-nums my-1 group-hover:translate-x-1 transition-transform">
              {formatRupiah(stats.nonTunai)}
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity"><Landmark size={100}/></div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-50 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 text-emerald-600">
                    <CreditCard size={20} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belanja Tunai</p>
            </div>
            <div className="text-2xl font-black text-slate-800 tabular-nums my-1 group-hover:translate-x-1 transition-transform">
              {formatRupiah(stats.tunai)}
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity"><CreditCard size={100}/></div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/60 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-orange-50 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300 text-orange-600">
                    <Receipt size={20} />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pajak (Wajib Lapor)</p>
            </div>
            <div className="text-2xl font-black text-slate-800 tabular-nums my-1 group-hover:translate-x-1 transition-transform">
              {formatRupiah(stats.pajak)}
            </div>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] group-hover:opacity-[0.05] transition-opacity"><Receipt size={100}/></div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] border border-blue-400/30 shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest opacity-90">Sisa Dana Tersedia</p>
                <HelpCircle size={16} className="text-blue-400 cursor-pointer" />
            </div>
            <div className="text-3xl font-black drop-shadow-md my-1 group-hover:scale-105 transition-transform transform origin-left">
              {formatRupiah(stats.sisa)}
            </div>
             <div className="absolute right-[-20px] bottom-[-20px] opacity-10 blur-sm pointer-events-none text-white"><Landmark size={140}/></div>
          </div>
        </div>

        {/* Main Table */}
        <div className="glass-panel overflow-hidden rounded-[2rem] border border-white/60 shadow-xl shadow-slate-200/40">
          <div className="overflow-x-auto custom-scrollbar relative">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 font-bold border-b border-white">
                <tr>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black">ID BNU</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black">Tanggal</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black">Kegiatan & Rekening</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black text-center">Tipe</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Anggaran</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Dibelanjakan</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black text-right">Pajak</th>
                  <th className="px-6 py-4 uppercase tracking-widest text-[10px] text-slate-400 font-black text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 bg-white/40">
                {bkuData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center placeholder:text-slate-400 opacity-60">
                            <BookOpen size={48} strokeWidth={1} className="text-slate-400 mb-4"/>
                            <p className="font-bold text-slate-500">Tidak ada data transaksi</p>
                            <p className="text-xs text-slate-400">Belum ada transaksi realisasi pada bulan {MONTHS[selectedMonth-1]}.</p>
                        </div>
                      </td>
                    </tr>
                  ) : bkuData.map((row) => (
                    <motion.tr 
                        key={row.id} 
                        initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} transition={{type:"spring"}}
                        className="hover:bg-white/80 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-100/50 px-2 py-1 rounded-md">{row.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-600 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[300px]">
                        <div className="font-bold text-slate-700 text-sm leading-snug line-clamp-2" title={row.kegiatan}>{row.kegiatan}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-1">{row.rekening}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                          row.jenis === 'Non Tunai' 
                            ? 'bg-blue-50 text-blue-600 border-blue-100' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {row.jenis}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-slate-400">
                        {formatRupiah(row.anggaran)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-black text-slate-700 bg-slate-50/30">
                        {formatRupiah(row.dibelanjakan)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {formatRupiah(row.pajak)}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Month Picker for testing/navigation */}
        <div className="flex justify-center pt-2">
           <div className="bg-white/80 backdrop-blur-md border border-white rounded-full p-1.5 shadow-lg shadow-blue-900/5 flex gap-1 overflow-x-auto custom-scrollbar max-w-full">
              {MONTHS.map((m, i) => {
                const isSelected = selectedMonth === i + 1;
                return (
                    <button
                        key={m}
                        onClick={() => setSelectedMonth(i + 1)}
                        className={`relative px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                            isSelected ? 'text-white shadow-xl shadow-blue-500/30 scale-105 z-10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/50'
                        }`}
                        >
                        {isSelected && <motion.div layoutId="month-blob" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full -z-10"></motion.div>}
                        {m.substring(0,3)}
                    </button>
                 );
              })}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BKU;
