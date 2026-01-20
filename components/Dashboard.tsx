import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Budget, TransactionType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

interface DashboardProps {
  data: Budget[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const stats = useMemo(() => {
    const income = data.filter(d => d.type === TransactionType.INCOME).reduce((acc, curr) => acc + curr.amount, 0);
    const expense = data.filter(d => d.type === TransactionType.EXPENSE).reduce((acc, curr) => acc + curr.amount, 0);
    return { income, expense, balance: income - expense };
  }, [data]);

  const expenseByComponent = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};
    expenses.forEach(item => {
      // Use BOSP Component as key, strip the number prefix for cleaner chart labels
      // e.g., "1. PPDB" -> "PPDB"
      const rawKey = item.bosp_component || item.category;
      const key = rawKey.includes('.') ? rawKey.split('.').slice(1).join('.').trim() : rawKey;
      grouped[key] = (grouped[key] || 0) + item.amount;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [data]);

  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, { income: number, expense: number }> = {};
    data.forEach(item => {
      const month = new Date(item.date).toLocaleString('id-ID', { month: 'short' });
      if (!grouped[month]) grouped[month] = { income: 0, expense: 0 };
      if (item.type === TransactionType.INCOME) grouped[month].income += item.amount;
      else grouped[month].expense += item.amount;
    });
    return Object.entries(grouped).map(([name, val]) => ({ name, ...val }));
  }, [data]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm">
        <strong>Info BOSP 2026:</strong> Dashboard ini disesuaikan dengan Komponen Pembiayaan Juknis BOSP terbaru untuk SD.
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600">
            <ArrowUpCircle size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Pendapatan</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatRupiah(stats.income)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <ArrowDownCircle size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Realisasi Belanja</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatRupiah(stats.expense)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <Wallet size={32} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sisa Anggaran</p>
            <h3 className="text-2xl font-bold text-gray-800">{formatRupiah(stats.balance)}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Penggunaan Dana per Komponen BOSP</h4>
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
        </div>

        {/* Monthly Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Arus Kas Bulanan</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis hide />
                <RechartsTooltip formatter={(value: number) => formatRupiah(value)} />
                <Legend />
                <Bar dataKey="income" name="Masuk" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Keluar" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
