import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { motion, Variants } from 'framer-motion';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, Target, PieChart as PieChartIcon, Activity, AlertTriangle, XCircle, FileText, Sparkles } from 'lucide-react';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  data: Budget[];
  profile: SchoolProfile | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const BOS_LARANGAN = [
  "Disimpan dengan maksud dibungakan.",
  "Dipinjamkan kepada pihak lain.",
  "Membeli software/perangkat lunak untuk pelaporan keuangan BOS atau software sejenis.",
  "Membiayai kegiatan yang tidak menjadi prioritas sekolah (studi banding, tur studi/karya wisata, dan sejenisnya).",
  "Membayar iuran kegiatan yang diselenggarakan oleh UPTD kecamatan/kabupaten/kota/provinsi/pusat, atau pihak lainnya.",
  "Membayar bonus dan transportasi rutin untuk guru.",
  "Membiayai akomodasi untuk kegiatan yang diselenggarakan oleh pihak lain.",
  "Membeli pakaian/seragam/sepatu bagi guru/peserta didik untuk kepentingan pribadi (bukan inventaris sekolah).",
  "Digunakan untuk rehabilitasi sedang dan berat.",
  "Membangun gedung/ruangan baru (kecuali SD/SMP yang belum punya jamban/WC/kantin sehat).",
  "Membeli Lembar Kerja Siswa (LKS) dan bahan/peralatan yang tidak mendukung proses pembelajaran.",
  "Menanamkan saham.",
  "Membiayai kegiatan yang telah dibiayai dari sumber dana pemerintah pusat/daerah atau sumber lainnya.",
  "Membiayai iuran dalam rangka upacara peringatan hari besar nasional atau upacara/acara keagamaan.",
  "Membiayai kegiatan pelatihan/sosialisasi terkait program BOS yang diselenggarakan lembaga di luar dinas pendidikan resmi."
];

// Motion variants for staggered children
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const Dashboard: React.FC<DashboardProps> = ({ data, profile }) => {
  
  const stats = useMemo(() => {
    const income = data.filter(d => d.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const plannedExpense = data.filter(d => d.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    const realizedExpense = data.filter(d => d.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        const itemTotal = curr.realizations?.reduce((rAcc, r) => rAcc + r.amount, 0) || 0;
        return acc + itemTotal;
      }, 0);
    const cashBalance = income - realizedExpense;
    const absorptionRate = plannedExpense > 0 ? (realizedExpense / plannedExpense) * 100 : 0;

    return { income, plannedExpense, realizedExpense, cashBalance, absorptionRate };
  }, [data]);

  const expenseByComponent = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};
    
    expenses.forEach(item => {
      const itemRealized = item.realizations?.reduce((rAcc, r) => rAcc + r.amount, 0) || 0;
      if (itemRealized > 0) {
        const rawKey = item.bosp_component || item.category;
        const key = rawKey.includes('.') ? rawKey.split('.').slice(1).join('.').trim() : rawKey;
        grouped[key] = (grouped[key] || 0) + itemRealized;
      }
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { income: number, expense: number }> = {};
    const ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    ORDER.forEach(m => grouped[m] = { income: 0, expense: 0 });

    data.forEach(item => {
      if (item.type === TransactionType.INCOME) {
        const dateObj = new Date(item.date);
        const month = dateObj.toLocaleString('id-ID', { month: 'short' });
        if (grouped[month]) grouped[month].income += item.amount;
      } else {
        if (item.realizations) {
          item.realizations.forEach(r => {
             const dateObj = new Date(r.date);
             const month = dateObj.toLocaleString('id-ID', { month: 'short' });
             if (grouped[month]) grouped[month].expense += r.amount;
          });
        }
      }
    });
    
    return Object.entries(grouped)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
  }, [data]);

  const handlePrintSummary = () => {
    const doc = new jsPDF();
    const startY = generatePDFHeader(doc, profile, 'Ringkasan Eksekutif RKAS');

    // Stats Table
    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['Indikator Keuangan', 'Nilai Nominal']],
      body: [
        ['Total Penerimaan (BOSP)', formatCurrency(stats.income)],
        ['Total Rencana Belanja', formatCurrency(stats.plannedExpense)],
        ['Total Realisasi (SPJ)', formatCurrency(stats.realizedExpense)],
        ['Sisa Saldo Kas', formatCurrency(stats.cashBalance)],
        ['Persentase Penyerapan', `${stats.absorptionRate.toFixed(2)}%`]
      ],
    });

    // Component Breakdown Table
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Realisasi Per Komponen BOSP', 15, finalY);

    autoTable(doc, {
      ...defaultTableStyles,
      startY: finalY + 5,
      head: [['Nama Komponen', 'Total Realisasi']],
      body: expenseByComponent.map(c => [c.name, formatCurrency(c.value)]),
    });

    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 20);
    doc.save(`Ringkasan_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // AI-like Insights based on data
  const aiInsight = useMemo(() => {
    if (stats.plannedExpense === 0) return "Belum ada Rencana Anggaran (RKAS) yang diinput. Silakan buat perencanaan terlebih dahulu.";

    if (stats.absorptionRate < 25) {
      return `Serapan anggaran masih sangat rendah (${stats.absorptionRate.toFixed(1)}%). Segera lakukan realisasi program sesuai dengan RKAS untuk menghindari penumpukan di akhir tahun.`;
    } else if (stats.absorptionRate > 80 && stats.cashBalance > 0) {
      return `Bagus! Serapan anggaran sudah mencapai ${stats.absorptionRate.toFixed(1)}%. Pastikan sisa saldo ${formatRupiah(stats.cashBalance)} difokuskan untuk kebutuhan esensial dan pelaporan SPJ diselesaikan tepat waktu.`;
    } else if (stats.cashBalance <= 0 && stats.plannedExpense > 0) {
      return "Peringatan: Saldo Kas Kosong atau Minus. Periksa kembali entri penerimaan dan pengeluaran Anda. Pastikan dana cair sebelum melakukan realisasi.";
    }

    return `Kondisi keuangan stabil. Serapan saat ini ${stats.absorptionRate.toFixed(1)}% dengan sisa pagu ${formatRupiah(stats.plannedExpense - stats.realizedExpense)}. Lanjutkan eksekusi program sesuai timeline BOSP.`;
  }, [stats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-4 rounded-2xl shadow-xl border border-white/60">
          <p className="font-bold text-slate-800 mb-3">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-2 last:mb-0">
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                 <span className="text-sm font-semibold text-slate-600">
                   {entry.name === 'income' ? 'Pemasukan' : entry.name === 'expense' ? 'Pengeluaran' : entry.name}
                 </span>
               </div>
               <span style={{ color: entry.color }} className="text-sm font-bold tracking-tight">
                 {formatRupiah(entry.value)}
               </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
        
        {/* 1. Welcome Card (Full Width) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/30 border border-white/20 group">
           <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white opacity-[0.05] rounded-full blur-[80px] group-hover:opacity-[0.1] transition-opacity duration-700"></div>
           <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-400 opacity-[0.15] rounded-full blur-[60px] animate-blob"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="max-w-2xl">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                       <Activity className="text-indigo-200" size={24} />
                    </div>
                    <span className="px-4 py-1.5 bg-indigo-500/30 backdrop-blur-md rounded-full text-xs font-bold tracking-[0.2em] uppercase border border-indigo-400/30 shadow-sm">Sistem Terintegrasi</span>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight drop-shadow-sm">
                    Ringkasan <br/> <span className="text-indigo-200">Keuangan Sekolah</span>
                 </h1>
                 <p className="text-indigo-100 font-medium text-lg leading-relaxed max-w-lg drop-shadow-sm">
                    Manajemen anggaran <b className="text-white">{profile?.name || 'sekolah'}</b> yang efisien. Pantau realisasi dana BOSP dan kepatuhan SPJ dalam satu tampilan cerdas.
                 </p>
              </div>
              <div className="flex flex-col items-end gap-4">
                 <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 backdrop-blur-xl px-8 py-5 rounded-[2rem] border border-white/20 text-right min-w-[200px] shadow-2xl shadow-black/10">
                    <p className="text-[10px] text-indigo-200 uppercase font-black tracking-[0.2em] mb-2">Tahun Anggaran</p>
                    <p className="text-5xl font-black drop-shadow-sm">{profile?.fiscalYear || new Date().getFullYear()}</p>
                 </motion.div>
                 <motion.button 
                   whileHover={{ scale: 1.05 }} 
                   whileTap={{ scale: 0.95 }}
                   onClick={handlePrintSummary}
                   className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 text-white text-xs font-bold transition-all shadow-lg"
                 >
                   <FileText size={16} />
                   Cetak Ringkasan
                 </motion.button>
                 <div className="flex items-center gap-2 mt-2 bg-indigo-900/40 px-4 py-2 rounded-full backdrop-blur-md border border-indigo-500/30">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
                    <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Sistem Online Tersinkron</span>
                 </div>
              </div>
           </div>
        </motion.div>

        {/* New AI Insight Banner */}
        <motion.div variants={itemVariants} className="lg:col-span-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-[2rem] p-6 border border-teal-100 shadow-lg shadow-teal-500/5 flex items-start gap-5">
           <div className="p-3 bg-white rounded-2xl shadow-sm border border-teal-50 text-teal-600 flex-shrink-0">
              <Sparkles size={24} />
           </div>
           <div>
              <h4 className="text-sm font-bold text-teal-800 uppercase tracking-widest mb-1">AI Financial Insight</h4>
              <p className="text-teal-900 font-medium leading-relaxed">{aiInsight}</p>
           </div>
        </motion.div>

        {/* 2. Key Stats (4 Cards) */}
        
        {/* Income */}
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="lg:col-span-1 glass-panel rounded-[2rem] p-7 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-emerald-100/80 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 group-hover:rotate-12 shadow-inner">
                 <ArrowDownRight size={26} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">Validated</p>
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wider uppercase mb-1">Total Pendapatan</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.income)}</h3>
           </div>
        </motion.div>

        {/* Realization */}
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="lg:col-span-1 glass-panel rounded-[2rem] p-7 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-indigo-100/80 rounded-2xl text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:-rotate-12">
                 <ArrowUpRight size={26} strokeWidth={2.5} />
              </div>
              <div className="text-right">
                 <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-sm ${stats.absorptionRate > 80 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {stats.absorptionRate.toFixed(1)}% Serapan
                 </span>
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wider uppercase mb-1">Realisasi (SPJ)</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.realizedExpense)}</h3>
              <div className="w-full bg-slate-200/50 rounded-full h-2.5 mt-5 overflow-hidden p-[2px] shadow-inner border border-slate-200/50">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stats.absorptionRate, 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-indigo-500 h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                 />
              </div>
           </div>
        </motion.div>

        {/* Cash Balance */}
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="lg:col-span-1 glass-panel rounded-[2rem] p-7 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-blue-100/80 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:scale-110">
                 <Wallet size={26} strokeWidth={2.5} />
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wider uppercase mb-1">Saldo Kas Tersedia</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.cashBalance)}</h3>
              <p className="text-xs text-blue-500 mt-2 uppercase tracking-[0.15em] font-black">Dana Siap Belanja</p>
           </div>
        </motion.div>

        {/* Target/Remaining */}
        <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="lg:col-span-1 glass-panel rounded-[2rem] p-7 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 group">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-orange-100/80 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500 shadow-inner group-hover:scale-110">
                 <Target size={26} strokeWidth={2.5} />
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wider uppercase mb-1">Sisa Pagu Anggaran</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.plannedExpense - stats.realizedExpense)}</h3>
              <p className="text-xs text-orange-500 mt-2 uppercase tracking-[0.15em] font-black">Belum Direalisasikan</p>
           </div>
        </motion.div>

        {/* 3. Main Trends Chart (Large Span) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 glass-panel rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 group-hover:opacity-100 transition-opacity"></div>
           
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 relative z-10">
              <div>
                 <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                    <Activity className="text-indigo-500 drop-shadow-sm" size={28} />
                    Arus Kas Bulanan
                 </h4>
                 <p className="text-sm font-semibold text-slate-400 mt-1.5 uppercase tracking-widest">Perbandingan Real-time</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-100/80 p-2.5 rounded-[1.5rem] border border-slate-200/50 shadow-inner backdrop-blur-md">
                 <div className="flex items-center gap-2.5 px-4 py-2 rounded-[1rem] bg-white shadow-sm border border-slate-100">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> 
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Pendapatan</span>
                 </div>
                 <div className="flex items-center gap-2.5 px-4 py-2 rounded-[1rem] bg-white shadow-sm border border-slate-100">
                    <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> 
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Belanja</span>
                 </div>
              </div>
           </div>
           
           <div className="h-[380px] w-full relative z-10">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                     <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                     <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                 <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 12, fill: '#64748b', fontWeight: 800}} 
                    dy={15} 
                 />
                 <YAxis hide />
                 <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} />
                 <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={5} fillOpacity={1} fill="url(#colorIncome)" animationDuration={2000} />
                 <Area type="monotone" dataKey="expense" stroke="#6366F1" strokeWidth={5} fillOpacity={1} fill="url(#colorExpense)" animationDuration={2500} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </motion.div>

        {/* 4. Pie Chart (Small Span) */}
        <motion.div variants={itemVariants} className="lg:col-span-1 glass-panel rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 flex flex-col relative overflow-hidden group">
           <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-50/50 rounded-full blur-3xl -mr-10 -mb-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
           
           <div className="mb-6 relative z-10">
              <h4 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                 <PieChartIcon className="text-purple-500 drop-shadow-sm" size={26} />
                 Komposisi
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-[0.2em] font-black">Realisasi BOSP</p>
           </div>
           
           <div className="flex-1 min-h-[250px] relative z-10">
             {expenseByComponent.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                     <Pie
                        data={expenseByComponent}
                        cx="50%"
                        cy="50%"
                        innerRadius={75}
                        outerRadius={105}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        animationBegin={500}
                        animationDuration={1500}
                        cornerRadius={12}
                     >
                     {expenseByComponent.map((_, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                     </Pie>
                     <RechartsTooltip content={<CustomTooltip />} />
                 </PieChart>
                 </ResponsiveContainer>
             ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                     <PieChartIcon size={64} className="mb-4 opacity-20" />
                     <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Tidak ada data</span>
                 </div>
             )}
             
             {expenseByComponent.length > 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                     <span className="text-5xl font-black text-slate-800 tracking-tighter">{expenseByComponent.length}</span>
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Sektor</span>
                 </div>
             )}
           </div>
           
           {expenseByComponent.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200/50 space-y-3 relative z-10">
                 {expenseByComponent.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/50 p-2.5 rounded-[1rem] border border-white">
                       <div className="flex items-center gap-3 max-w-[70%]">
                          <span className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                          <span className="text-[10px] font-black text-slate-700 truncate uppercase tracking-widest">{item.name}</span>
                       </div>
                       <span className="text-xs font-black text-slate-900 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                          {((item.value / stats.realizedExpense) * 100).toFixed(0)}%
                       </span>
                    </div>
                 ))}
              </div>
           )}
        </motion.div>

        {/* 5. Larangan Section (Full Width Modern Alert) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 bg-gradient-to-br from-rose-50/80 to-red-50/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-rose-200/50 shadow-xl shadow-rose-500/10 overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-80 h-80 bg-rose-300/20 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none transition-all duration-700 group-hover:bg-rose-300/30"></div>
           
           <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-8 border-b border-rose-200/50 relative z-10">
              <div className="p-5 bg-rose-200/50 rounded-[1.5rem] text-rose-600 shadow-inner group-hover:scale-110 transition-transform duration-500 border border-rose-200">
                 <AlertTriangle size={36} className="drop-shadow-sm" />
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm border border-rose-700">Penting</span>
                 </div>
                 <h3 className="text-3xl font-black text-rose-950 tracking-tight">Larangan Penggunaan Dana BOSP</h3>
                 <p className="text-rose-800/80 font-semibold max-w-2xl mt-2 leading-relaxed">
                    Penting bagi Satuan Pendidikan untuk menjaga integritas pengelolaan dana sesuai Juknis BOSP yang berlaku.
                 </p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {BOS_LARANGAN.map((item, idx) => (
                  <motion.div 
                     whileHover={{ scale: 1.02, y: -2 }}
                     key={idx} 
                     className="bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-rose-100 flex items-start gap-4 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300"
                  >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0 mt-0.5 shadow-inner border border-rose-100">
                         <XCircle size={16} strokeWidth={2.5} />
                      </div>
                      <p className="text-[11px] font-bold text-rose-900 leading-relaxed uppercase tracking-widest">{item}</p>
                  </motion.div>
              ))}
           </div>
           
           <div className="mt-12 flex items-center justify-between text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] pt-6 border-t border-rose-200/50 relative z-10">
              <span>&copy; Kementerian Pendidikan & Kebudayaan RI</span>
              <span className="bg-rose-200/50 px-3 py-1.5 rounded-lg border border-rose-200">Ref: Juknis BOSP Terbaru</span>
           </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Dashboard;
