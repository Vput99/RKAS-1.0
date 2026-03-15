import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { ShoppingBag, FileText, ClipboardList, RefreshCw, Calendar, ArrowRightLeft, Package, Download, Printer, Sparkles, Loader2 } from 'lucide-react';
import { Budget } from '../types';
import { analyzeInventoryItems, InventoryItem } from '../lib/gemini';
import { getSchoolProfile } from '../lib/db';

interface InventoryReportsProps {
  budgets: Budget[];
}

const InventoryReports = ({ budgets }: InventoryReportsProps) => {
  const [activeReport, setActiveReport] = useState<string>('pengadaan');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);

  useEffect(() => {
    getSchoolProfile().then(setSchoolProfile);
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeInventoryItems(budgets);
      setInventoryItems(results);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Gagal menganalisis data. Cek koneksi Anda.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || '-';
      return d.toLocaleDateString('id-ID');
    } catch (e) {
      return dateStr || '-';
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {
      'ATK': [],
      'Kebersihan': [],
      'Meterai': [],
      'Komputer': [],
      'Listrik': [],
      'Lainnya': []
    };
    inventoryItems.forEach((item: InventoryItem) => {
      if (!item) return;
      if (groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups['Lainnya'].push(item);
      }
    });
    return groups;
  }, [inventoryItems]);

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
            {(() => {
              const Icon = report.icon;
              return (
                <div className={`p-3 rounded-xl bg-${report.color}-50 text-${report.color}-600`}>
                  <Icon size={24} />
                </div>
              );
            })()}
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

        {activeReport === 'pengadaan' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Analisa Otomatis SIPLah</h4>
                  <p className="text-[10px] text-gray-500 italic">Gunakan AI untuk mengurai transaksi belanja menjadi item persediaan.</p>
                </div>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-md shadow-blue-200"
              >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isAnalyzing ? 'Menganalisis...' : 'Analisa Data Transaksi'}
              </button>
            </div>

            {inventoryItems.length === 0 && !isAnalyzing ? (
              <div className="p-12 text-center">
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-200">
                    <ShoppingBag size={32} />
                  </div>
                  <h4 className="font-bold text-gray-700">Belum Ada Data Teranalisa</h4>
                  <p className="text-xs text-gray-500">Klik tombol di atas untuk mulai menganalisa transaksi SPJ dan mengelompokkannya ke dalam laporan pengadaan.</p>
                </div>
              </div>
            ) : isAnalyzing ? (
              <div className="p-12 text-center animate-pulse">
                <RefreshCw size={40} className="mx-auto text-blue-400 animate-spin mb-4" />
                <p className="text-sm font-medium text-gray-600">AI sedang memproses transaksi SPJ Anda...</p>
                <p className="text-[10px] text-gray-400 mt-1">Mengidentifikasi barang, spesifikasi, dan kategori bahan habis pakai.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                {/* Visual Header inspired by the Excel Image */}
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SD NEGERI CONTOH'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">TAHUN ANGGARAN {schoolProfile?.fiscalYear || '2026'}</p>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-8">No.</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-32">Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-48">Spesifikasi Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16">Jumlah Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16">Satuan Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24">Harga Satuan (Rp.)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24">Total Nilai Barang (Rp.)</th>
                      <th colSpan={2} className="border border-gray-300 p-1">Sub Kegiatan & Anggaran</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-[8px]">Rekening Belanja</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-20">Tgl Perolehan</th>
                      <th colSpan={3} className="border border-gray-300 p-1">Dokumen Sumber Perolehan</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-1 w-20 text-[8px]">Kode</th>
                      <th className="border border-gray-300 p-1 text-[8px]">Nama Sub Kegiatan</th>
                      <th className="border border-gray-300 p-1 w-16 text-[8px]">Bentuk</th>
                      <th className="border border-gray-300 p-1 w-20 text-[8px]">Penyedia</th>
                      <th className="border border-gray-300 p-1 w-24 text-[8px]">Nomor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(groupedItems) as [string, InventoryItem[]][]).map(([category, items]) => {
                      if (items.length === 0) return null;
                      const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);
                      
                      return (
                        <Fragment key={category}>
                          {/* Category Header Row */}
                          <tr className="bg-blue-50/50 font-bold">
                            <td colSpan={6} className="border border-gray-300 p-2 text-blue-800 uppercase italic">
                              {category === 'ATK' && 'ALAT TULIS KANTOR'}
                              {category === 'Kebersihan' && 'BAHAN DAN ALAT KEBERSIHAN'}
                              {category === 'Meterai' && 'BENDA POS / METERAI'}
                              {category === 'Komputer' && 'PERALATAN DAN BAHAN KOMPUTER'}
                              {category === 'Listrik' && 'PERALATAN DAN ALAT LISTRIK'}
                              {category === 'Lainnya' && 'BAHAN HABIS PAKAI LAINNYA'}
                            </td>
                            <td className="border border-gray-300 p-2 text-right text-blue-900">{formatRupiah(categoryTotal)}</td>
                            <td colSpan={7} className="border border-gray-300 p-2 bg-gray-50/20"></td>
                          </tr>

                          {/* Item Rows */}
                          {items.map((item: InventoryItem, idx) => (
                            <tr key={`${category}-${idx}`} className="hover:bg-gray-50 group">
                              <td className="border border-gray-300 p-2 text-center text-gray-400">{idx + 1}</td>
                              <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                              <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                              <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                              <td className="border border-gray-300 p-2 text-right font-semibold">{formatRupiah(item.total)}</td>
                              <td className="border border-gray-300 p-2 text-[8px] text-center font-mono">{item.subActivityCode || '0.00.01'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] leading-tight">{item.subActivityName || 'Administrasi Sekolah'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] text-center font-mono">{item.accountCode}</td>
                              <td className="border border-gray-300 p-2 text-center text-[8px]">{formatDate(item.date)}</td>
                              <td className="border border-gray-300 p-2 text-center text-[8px]">{item.contractType || 'Kuitansi'}</td>
                              <td className="border border-gray-300 p-2 text-[8px] italic">{item.vendor}</td>
                              <td className="border border-gray-300 p-2 text-[8px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">{item.docNumber}</td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeReport !== 'pengadaan' && (
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
        )}
      </div>
    </div>
  );
};

export default InventoryReports;
