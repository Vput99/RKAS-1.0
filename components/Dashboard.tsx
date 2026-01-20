import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Budget, TransactionType } from '../types';
import { ArrowUpCircle, CheckCircle2, Wallet, AlertCircle } from 'lucide-react';

interface DashboardProps {
  data: Budget[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const stats = useMemo(() => {
    // Pendapatan Total
    const income = data.filter(d => d.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    
    // Rencana Belanja (Pagu)
    const plannedExpense = data.filter(d => d.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    
    // Realisasi Belanja (SPJ) - Sum all detail items in realizations array
    const realizedExpense = data.filter(d => d.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        const itemTotal = curr.realizations?.reduce((rAcc, r) => rAcc + r.amount, 0) || 0;
        return acc + itemTotal;
      }, 0);
    
    // Saldo Kas = Pendapatan - Realisasi
    const cashBalance = income - realizedExpense;

    // SILPA (Sisa dari kegiatan yang SUDAH direalisasikan sebagian atau seluruhnya)
    const totalSilpa = plannedExpense - realizedExpense;

    return { income, plannedExpense, realizedExpense, cashBalance, totalSilpa };
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
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [data]);

  const silpaByComponent = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};
    
    expenses.forEach(item => {
      const itemRealized = item.realizations?.reduce((rAcc, r) => rAcc + r.amount, 0) || 0;
      const itemBalance = item.amount - itemRealized;
      
      if (itemBalance > 0) {
        const rawKey = item.bosp_component || item.category;
        const key = rawKey.includes('.') ? rawKey.split('.').slice(1).join('.').trim() : rawKey;
        grouped[key] = (grouped[key] || 0) + itemBalance;
      }
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { income: number, expense: number }> = {};
    
    data.forEach(item => {
      if (item.type === TransactionType.INCOME) {
        const month = new Date(item.date).toLocaleString('id-ID', { month: 'short' });
        if (!grouped[month]) grouped[month] = { income: 0, expense: 0 };
        grouped[month].income += item.amount;
      } else {
        // Expense: Iterate realizations to place them in correct months
        if (item.realizations) {
          item.realizations.forEach(r => {
             const dateObj = new Date(r.date);
             const month = dateObj.toLocaleString('id-ID', { month: 'short' });
             if (!grouped[month]) grouped[month] = { income: 0, expense: 0 };
             grouped[month].expense += r.amount;
          });
        }
      }
    });
    
    const ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return Object.entries(grouped)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
  }, [data]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm flex gap-3 items-start">
        <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
        <div>
          <strong>Informasi Keuangan:</strong> Dashboard menampilkan data berdasarkan <b>Realisasi (SPJ)</b> yang telah diinput per bulan beserta bukti fisiknya.
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <ArrowUpCircle size={20} />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Pendapatan</p>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{formatRupiah(stats.income)}</h3>
          <p className="text-xs text-gray-400 mt-1">Dana Masuk</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Realisasi (SPJ)</p>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{formatRupiah(stats.realizedExpense)}</h3>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
             <div 
               className="bg-blue-600 h-1.5 rounded-full" 
               style={{ width: `${stats.plannedExpense > 0 ? (stats.realizedExpense / stats.plannedExpense) * 100 : 0}%` }}
             ></div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats.plannedExpense > 0 ? ((stats.realizedExpense / stats.plannedExpense) * 100).toFixed(1) : 0}% dari Pagu
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
              <Wallet size={20} />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Saldo Kas Tunai</p>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{formatRupiah(stats.cashBalance)}</h3>
          <p className="text-xs text-gray-400 mt-1">Pendapatan - Realisasi</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
              <Wallet size={20} />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sisa Anggaran</p>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{formatRupiah(stats.totalSilpa)}</h3>
          <p className="text-xs text-gray-400 mt-1">Belum di-SPJ-kan</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Expense Breakdown (Realisasi) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Realisasi per Komponen BOSP</h4>
          {expenseByComponent.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByComponent}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseByComponent.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatRupiah(value)} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
               Belum ada data realisasi (SPJ).
             </div>
          )}
        </div>

        {/* SILPA Breakdown (Sisa Anggaran) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Sisa Anggaran per Komponen</h4>
          {silpaByComponent.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={silpaByComponent}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#FF8042"
                    dataKey="value"
                  >
                    {silpaByComponent.map((entry, index) => (
                      <Cell key={`cell-silpa-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatRupiah(value)} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
               Tidak ada sisa anggaran (Semua terealisasi).
             </div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Arus Kas Realisasi (Income vs SPJ)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis hide />
                <RechartsTooltip formatter={(value: number) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="income" name="Masuk" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="SPJ Keluar" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;