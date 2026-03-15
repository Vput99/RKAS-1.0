import React, { useState } from 'react';
import { ShoppingBag, FileText, ClipboardList, RefreshCw, Calendar, ArrowRightLeft, Package, Download, Printer } from 'lucide-react';
import { Budget } from '../types';

interface InventoryReportsProps {
  budgets: Budget[];
}

const InventoryReports: React.FC<InventoryReportsProps> = ({ budgets }) => {
  const [activeReport, setActiveReport] = useState<string>('pengadaan');

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
      id: 'mutasi', 
      title: 'Laporan Mutasi Persediaan', 
      subtitle: 'Tambah & Kurang',
      description: 'Laporan rincian mutasi tambah dan kurang menurut objek sumber dana keseluruhan.',
      icon: ArrowRightLeft,
      color: 'purple'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">Stok Opname & Persediaan</h2>
        <p className="text-sm text-gray-500">Manajemen dan pelaporan aset lancar serta barang persediaan sekolah.</p>
      </div>

      {/* Grid Menu Laporan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportMenu.map((report) => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 text-left ${
              activeReport === report.id
                ? 'bg-white border-blue-600 ring-4 ring-blue-50 shadow-md'
                : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
            }`}
          >
            <div className={`p-3 rounded-xl bg-${report.color}-50 text-${report.color}-600`}>
              <report.icon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{report.title}</h3>
                  <p className={`text-xs font-medium text-${report.color}-600 mb-2`}>{report.subtitle}</p>
                </div>
                <div className={`text-${report.color}-500 opacity-50`}>
                  <FileText size={16} />
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Report View Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <ShoppingBag size={18} />
            </div>
            <h3 className="font-bold text-gray-700">Pratinjau: {reportMenu.find(r => r.id === activeReport)?.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
              <Printer size={14} /> Cetak
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition">
              <Download size={14} /> Excel / PDF
            </button>
          </div>
        </div>

        <div className="p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <RefreshCw size={40} className="animate-spin-slow" />
                </div>
                <h4 className="font-bold text-gray-800 text-lg">Format Laporan Sedang Disiapkan</h4>
                <p className="text-sm text-gray-500">
                    Struktur dasar menu <b>"{reportMenu.find(r => r.id === activeReport)?.title}"</b> telah siap. 
                    Format detail kolom dan isi laporan akan diimplementasikan satu per satu sesuai instruksi selanjutnya.
                </p>
                <div className="pt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold border border-yellow-100">
                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                        Menunggu Definisi Kolom Laporan
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;
