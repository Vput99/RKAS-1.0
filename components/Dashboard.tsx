
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { Budget, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, Target, TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';

interface DashboardProps {
  data: Budget[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
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
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-10 text-white shadow-lg">
         <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-400 opacity-10 rounded-full blur-2xl"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
               <h1 className="text-3xl font-bold mb-2">Dashboard Keuangan</h1>
               <p className="text-blue-100 text-sm md:text-base max-w-xl">
                 Pantau kesehatan finansial sekolah secara real-time. Kelola dana BOSP, realisasi SPJ, dan pelaporan dengan lebih efisien.
               </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
               <p className="text-xs text-blue-100 uppercase font-bold tracking-wider">Tahun Anggaran</p>
               <p className="text-xl font-bold">2026</p>
            </div>
         </div>
      </div>

      {/* 2. Premium Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Income Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                 <ArrowDownRight size={24} />
              </div>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">+100% Valid</span>
           </div>
           <p className="text-sm text-gray-500 font-medium">Total Pendapatan</p>
           <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(stats.income)}</h3>
        </div>

        {/* Realization Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                 <ArrowUpRight size={24} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stats.absorptionRate > 80 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                 {stats.absorptionRate.toFixed(1)}% Serapan
              </span>
           </div>
           <p className="text-sm text-gray-500 font-medium">Total Realisasi (SPJ)</p>
           <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(stats.realizedExpense)}</h3>
           <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                 className="bg-blue-600 h-1.5 rounded-full transition-all duration-1000" 
                 style={{ width: `${Math.min(stats.absorptionRate, 100)}%` }}
              ></div>
           </div>
        </div>

        {/* Cash Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                 <Wallet size={24} />
              </div>
           </div>
           <p className="text-sm text-gray-500 font-medium">Saldo Kas Tunai/Bank</p>
           <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(stats.cashBalance)}</h3>
           <p className="text-xs text-gray-400 mt-2">Dana Tersedia</p>
        </div>

        {/* Remaining Budget Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                 <Target size={24} />
              </div>
           </div>
           <p className="text-sm text-gray-500 font-medium">Sisa Pagu Anggaran</p>
           <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatRupiah(stats.plannedExpense - stats.realizedExpense)}</h3>
           <p className="text-xs text-gray-400 mt-2">Belum dibelanjakan</p>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        
        {/* Left: Area Chart (Trends) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
             <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-500" size={20} /> Arus Kas Bulanan
             </h4>
             <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                   <span className="w-3 h-3 rounded-full bg-green-500"></span> Pendapatan
                </div>
                <div className="flex items-center gap-1">
                   <span className="w-3 h-3 rounded-full bg-red-500"></span> Belanja
                </div>
             </div>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} dy={10} />
                <YAxis hide />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Donut Chart (Breakdown) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
             <PieChartIcon className="text-purple-500" size={20} /> Komposisi Belanja
          </h4>
          <p className="text-xs text-gray-500 mb-6">Distribusi realisasi berdasarkan komponen BOSP.</p>
          
          <div className="flex-1 min-h-[250px] relative">
            {expenseByComponent.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={expenseByComponent}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    >
                    {expenseByComponent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} 
                    />
                </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <PieChartIcon size={40} className="mb-2 opacity-20" />
                    <span className="text-xs">Belum ada data realisasi</span>
                </div>
            )}
            
            {/* Center Label for Donut */}
            {expenseByComponent.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-2xl font-bold text-gray-800">{expenseByComponent.length}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Komponen</span>
                </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
