import React, { useState, useMemo } from 'react';
import { Budget, TransactionType } from '../types';
import { Search, Printer, Trash2, MoreHorizontal, ArrowLeft, HelpCircle } from 'lucide-react';

interface BKUProps {
  data: Budget[];
  onBack?: () => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BKU: React.FC<BKUProps> = ({ data, onBack }) => {
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

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">BKU {MONTHS[selectedMonth - 1]} 2025</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">BOSP REGULER 2025</p>
          </div>
          <button className="text-blue-600 hover:text-red-500 flex items-center gap-1 ml-4 text-sm font-medium transition group">
            <Trash2 size={14} className="group-hover:animate-pulse" />
            <span>Hapus BKU</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 active:scale-95 transition shadow-md shadow-gray-200">
            <Printer size={16} />
            Cetak
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
        
        {/* Closure Info Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center">
             <div className="w-2.5 h-1.5 border-b-2 border-l-2 border-blue-600 -rotate-45 mb-0.5"></div>
          </div>
          <p className="text-xs font-medium text-blue-800">BKU sudah ditutup pada 10 Des 2025</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-hover hover:shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Total Dibelanjakan Nontunai</p>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatRupiah(stats.nonTunai)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-hover hover:shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Total Dibelanjakan Tunai</p>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatRupiah(stats.tunai)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-hover hover:shadow-md">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Pajak Wajib Lapor</p>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatRupiah(stats.pajak)}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-hover hover:shadow-md relative">
            <div className="flex items-center gap-1.5 mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Sisa Dana Tersedia</p>
              <HelpCircle size={12} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-gray-800 tabular-nums">
              {formatRupiah(stats.sisa)}
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[11px] font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-5">ID</th>
                  <th className="px-6 py-5">Tanggal</th>
                  <th className="px-6 py-5">Kegiatan</th>
                  <th className="px-6 py-5">Rekening Belanja</th>
                  <th className="px-6 py-5">Jenis Transaksi</th>
                  <th className="px-6 py-5">Anggaran</th>
                  <th className="px-6 py-5">Dibelanjakan</th>
                  <th className="px-6 py-5">Pajak Wajib Lapor</th>
                  <th className="px-6 py-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bkuData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/30">
                      Bulan ini belum ada transaksi terealisasi.
                    </td>
                  </tr>
                ) : (
                  bkuData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-500">{row.id}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(row.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-medium max-w-[240px] truncate" title={row.kegiatan}>
                        {row.kegiatan}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {row.rekening}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          row.jenis === 'Non Tunai' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {row.jenis}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 tabular-nums">{formatRupiah(row.anggaran)}</td>
                      <td className="px-6 py-4 text-gray-800 font-bold tabular-nums">{formatRupiah(row.dibelanjakan)}</td>
                      <td className="px-6 py-4 text-gray-600 tabular-nums">{formatRupiah(row.pajak)}</td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition active:scale-95">
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Month Picker for testing/navigation */}
        <div className="flex justify-center pt-4">
           <div className="bg-white border border-gray-100 rounded-full p-1 shadow-sm flex gap-1 overflow-x-auto no-scrollbar max-w-full">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(i + 1)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                    selectedMonth === i + 1 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default BKU;
