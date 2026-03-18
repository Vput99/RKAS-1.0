
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, Target, PieChart as PieChartIcon, Activity, AlertTriangle, XCircle } from 'lucide-react';

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

const Dashboard: React.FC<DashboardProps> = ({ data, profile }) => {
  
  const stats = useMemo(() => {
    // Pendapatan Total
    const income = data.filter(d => d.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    
    // Rencana Belanja (Pagu)
    const plannedExpense = data.filter(d => d.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    
    // Realisasi Belanja (SPJ)
    const realizedExpense = data.filter(d => d.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        const itemTotal = curr.realizations?.reduce((rAcc, r) => rAcc + r.amount, 0) || 0;
        return acc + itemTotal;
      }, 0);
    
    // Saldo Kas = Pendapatan - Realisasi
    const cashBalance = income - realizedExpense;

    // Persentase Serapan
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
        // Simplify name: remove numbering "1. "
        const key = rawKey.includes('.') ? rawKey.split('.').slice(1).join('.').trim() : rawKey;
        grouped[key] = (grouped[key] || 0) + itemRealized;
      }
    });
    // Sort big to small
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { income: number, expense: number }> = {};
    
    // Init all months to 0
    const ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    ORDER.forEach(m => grouped[m] = { income: 0, expense: 0 });

    data.forEach(item => {
      if (item.type === TransactionType.INCOME) {
        const dateObj = new Date(item.date);
        const month = dateObj.toLocaleString('id-ID', { month: 'short' });
        if (grouped[month]) grouped[month].income += item.amount;
      } else {
        // Expense: Iterate realizations
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

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          <p className="font-bold text-gray-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name === 'income' ? 'Pemasukan' : entry.name === 'expense' ? 'Pengeluaran' : entry.name}: {formatRupiah(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in-up">
      
      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
        
        {/* 1. Welcome Card (Full Width) */}
        <div className="lg:col-span-4 relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-[#3730a3] to-[#4338ca] rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20 border border-white/10 group transition-all duration-500 hover:shadow-indigo-500/30">
           <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white opacity-[0.03] rounded-full blur-[100px] group-hover:opacity-[0.05] transition-opacity"></div>
           <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-blue-400 opacity-[0.07] rounded-full blur-[80px]"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="max-w-2xl">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                       <Activity className="text-blue-300" size={24} />
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full text-xs font-bold tracking-widest uppercase border border-blue-400/30">Sistem Terintegrasi</span>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                    Ringkasan <br/> <span className="text-blue-200">Keuangan Sekolah</span>
                 </h1>
                 <p className="text-indigo-100/80 text-lg leading-relaxed max-w-lg">
                    Manajemen anggaran {profile?.name || 'sekolah'} yang efisien. Pantau realisasi dana BOSP dan kepatuhan SPJ dalam satu tampilan cerdas.
                 </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                 <div className="bg-white/10 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/20 text-right min-w-[180px] shadow-lg">
                    <p className="text-[10px] text-indigo-200 uppercase font-black tracking-[0.2em] mb-1">Tahun Anggaran</p>
                    <p className="text-4xl font-black">{profile?.fiscalYear || new Date().getFullYear()}</p>
                 </div>
                 <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Sistem Online & Terverifikasi</span>
                 </div>
              </div>
           </div>
        </div>

        {/* 2. Key Stats (4 Cards) */}
        
        {/* Income */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group bento-inner-shadow">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 rotate-0 group-hover:rotate-6">
                 <ArrowDownRight size={24} />
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-lg uppercase tracking-wider italic">Validated</p>
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wide mb-1">Total Pendapatan</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.income)}</h3>
           </div>
        </div>

        {/* Realization */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group bento-inner-shadow">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                 <ArrowUpRight size={24} />
              </div>
              <div className="text-right">
                 <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${stats.absorptionRate > 80 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    {stats.absorptionRate.toFixed(1)}% Serapan
                 </span>
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wide mb-1">Realisasi (SPJ)</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.realizedExpense)}</h3>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden p-[2px]">
                 <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(stats.absorptionRate, 100)}%` }}
                 ></div>
              </div>
           </div>
        </div>

        {/* Cash Balance */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group bento-inner-shadow">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                 <Wallet size={24} />
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wide mb-1">Saldo Kas Tersedia</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.cashBalance)}</h3>
              <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Dana Siap Belanja</p>
           </div>
        </div>

        {/* Target/Remaining */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] p-7 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group bento-inner-shadow">
           <div className="flex justify-between items-center mb-6">
              <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500">
                 <Target size={24} />
              </div>
           </div>
           <div>
              <p className="text-sm text-slate-500 font-bold tracking-wide mb-1">Sisa Pagu Anggaran</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{formatRupiah(stats.plannedExpense - stats.realizedExpense)}</h3>
              <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">Belum Direalisasikan</p>
           </div>
        </div>

        {/* 3. Main Trends Chart (Large Span) */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 scroll-mt-20">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
              <div>
                 <h4 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <Activity className="text-blue-500" size={24} />
                    Arus Kas Bulanan
                 </h4>
                 <p className="text-sm text-slate-400 mt-1">Perbandingan pemasukan vs pengeluaran real-time.</p>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Pendapatan</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> 
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Belanja</span>
                 </div>
              </div>
           </div>
           
           <div className="h-[350px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} 
                    dy={15} 
                 />
                 <YAxis hide />
                 <RechartsTooltip 
                    content={<CustomTooltip />} 
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                 />
                 <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" animationDuration={2000} />
                 <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" animationDuration={2500} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* 4. Pie Chart (Small Span) */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col hover:shadow-xl transition-all duration-500">
           <div className="mb-6">
              <h4 className="text-lg font-black text-slate-800 flex items-center gap-3">
                 <PieChartIcon className="text-indigo-500" size={24} />
                 Komposisi
              </h4>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">Realisasi BOSP</p>
           </div>
           
           <div className="flex-1 min-h-[250px] relative">
             {expenseByComponent.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                     <Pie
                        data={expenseByComponent}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        animationBegin={500}
                        animationDuration={1500}
                        cornerRadius={10}
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
                     <PieChartIcon size={64} className="mb-4 opacity-10" />
                     <span className="text-xs font-bold uppercase tracking-widest">Tidak ada data</span>
                 </div>
             )}
             
             {expenseByComponent.length > 0 && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
                     <span className="text-4xl font-black text-slate-800">{expenseByComponent.length}</span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sektor</span>
                 </div>
             )}
           </div>
           
           {expenseByComponent.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-50 space-y-2">
                 {expenseByComponent.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <div className="flex items-center gap-2 max-w-[70%]">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                          <span className="text-[10px] font-bold text-slate-600 truncate uppercase tracking-tighter">{item.name}</span>
                       </div>
                       <span className="text-[10px] font-black text-slate-800">{((item.value / stats.realizedExpense) * 100).toFixed(0)}%</span>
                    </div>
                 ))}
              </div>
           )}
        </div>

        {/* 5. Larangan Section (Full Width Modern Alert) */}
        <div className="lg:col-span-4 bg-rose-50/50 rounded-[2.5rem] p-8 md:p-10 border border-rose-100 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/20 blur-[100px] -mr-32 -mt-32"></div>
           
           <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-10 pb-6 border-b border-rose-100/50">
              <div className="p-5 bg-rose-100 rounded-[1.5rem] text-rose-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                 <AlertTriangle size={32} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-rose-900 tracking-tight">Larangan Penggunaan Dana BOSP</h3>
                 <p className="text-rose-700/70 font-medium max-w-2xl mt-1 leading-relaxed">
                    Penting bagi Satuan Pendidikan untuk menjaga integritas pengelolaan dana sesuai Juknis BOSP yang berlaku.
                 </p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {BOS_LARANGAN.map((item, idx) => (
                  <div key={idx} className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-rose-100/30 flex items-start gap-4 hover:bg-white transition-colors duration-300">
                      <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 mt-0.5">
                         <XCircle size={14} />
                      </div>
                      <p className="text-xs font-bold text-rose-800/80 leading-relaxed uppercase tracking-tight">{item}</p>
                  </div>
              ))}
           </div>
           
           <div className="mt-10 flex items-center justify-between text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] pt-4">
              <span>&copy; Kementeruan Pendidikan & Kebudayaan RI</span>
              <span className="italic">Ref: Juknis BOSP Terbaru</span>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
