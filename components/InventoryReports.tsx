import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { ShoppingBag, FileText, ClipboardList, RefreshCw, Calendar, ArrowRightLeft, Package, Download, Printer, Sparkles, Loader2, Plus, Trash2, X, ArrowRight } from 'lucide-react';
import { Budget } from '../types';
import { analyzeInventoryItems, InventoryItem } from '../lib/gemini';
import { getSchoolProfile } from '../lib/db';

interface InventoryReportsProps {
  budgets: Budget[];
}

const InventoryReports = ({ budgets }: InventoryReportsProps) => {
  const [activeReport, setActiveReport] = useState<string>('pengadaan');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [manualInventoryItems, setManualInventoryItems] = useState<InventoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
  const [itemOverrides, setItemOverrides] = useState<Record<string, { lastYearBalance?: number, usedQuantity?: number }>>({});

  // Selection & Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [manualForm, setManualForm] = useState<Partial<InventoryItem>>({});
  const [currentSubCategory, setCurrentSubCategory] = useState<string>('');

  const CATEGORY_SUB_MAP: Record<string, string[]> = {
    'Bahan': [
      'Bahan Bangunan dan Konstruksi',
      'Bahan Kimia',
      'Bahan Bakar dan Pelumas',
      'Bahan Cetak dan Penggandaan',
      'Bahan Praktek Siswa',
      'Lainnya'
    ],
    'Suku Cadang': [
      'Suku Cadang Kendaraan',
      'Suku Cadang Peralatan Kantor',
      'Suku Cadang Komputer',
      'Suku Cadang Alat Angkutan',
      'Lainnya'
    ],
    'Alat Atau Bahan Untuk Kegiatan Kantor': [
      'Kertas dan Cover',
      'Alat Tulis Kantor (Umum)',
      'Benda Pos / Meterai',
      'Tinta / Toner / Ribbon',
      'Alat Listrik dan Elektronik',
      'Bahan Kebersihan',
      'Perabot Kantor',
      'Lainnya'
    ],
    'Obat Obatan': [
      'Obat-obatan Umum / Generik',
      'Peralatan P3K',
      'Obat-obatan Laboratorium',
      'Vaksin',
      'Lainnya'
    ],
    'Persediaan Untuk dijual atau diserahkan': [
      'Hadiah / Doorprize',
      'Brosur / Pamflet / Leaflet',
      'Seragam untuk Siswa',
      'Buku untuk Diserahkan',
      'Lainnya'
    ],
    'Natura dan Pakan': [
      'Bahan Makanan (Sembako)',
      'Pakan Hewan / Ternak',
      'Bibit / Benih Tanaman',
      'Lainnya'
    ],
    'Persediaan Penelitian': [
      'Alat Penelitian Habis Pakai',
      'Bahan Penelitian',
      'Dokumentasi Penelitian',
      'Lainnya'
    ]
  };

  useEffect(() => {
    getSchoolProfile().then(setSchoolProfile);
    const localManual = localStorage.getItem('rkas_manual_inventory_v1');
    if (localManual) setManualInventoryItems(JSON.parse(localManual));
  }, []);

  const saveManualItems = (items: InventoryItem[]) => {
    setManualInventoryItems(items);
    localStorage.setItem('rkas_manual_inventory_v1', JSON.stringify(items));
  };

  const handleOverride = (itemId: string, field: 'lastYearBalance' | 'usedQuantity', value: number) => {
    setItemOverrides((prev: Record<string, { lastYearBalance?: number, usedQuantity?: number }>) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

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

  const handleManualAdd = (budgetItem: Budget) => {
    setSelectedBudget(budgetItem);
    const firstRealization = budgetItem.realizations?.[0];

    const subCode = typeof budgetItem.bosp_component === 'string' ? budgetItem.bosp_component.split('.')[0] : '';
    const subName = typeof budgetItem.bosp_component === 'string' ? budgetItem.bosp_component.replace(/^\d+\.\s/, '') : budgetItem.bosp_component;

    setManualForm({
      name: budgetItem.description,
      spec: budgetItem.notes || firstRealization?.notes || '',
      quantity: firstRealization?.quantity || budgetItem.quantity || 1,
      unit: budgetItem.unit || 'Unit',
      price: budgetItem.unit_price || (firstRealization?.amount ? firstRealization.amount / (firstRealization.quantity || 1) : 0),
      subActivityCode: subCode || '0.00.01',
      subActivityName: subName || 'Administrasi Sekolah',
      accountCode: budgetItem.account_code || '',
      date: firstRealization?.date || budgetItem.date || new Date().toISOString(),
      contractType: 'Invoice',
      vendor: firstRealization?.vendor || '',
      docNumber: firstRealization?.notes || '',
      category: 'ATK'
    });
    const defaultSub = CATEGORY_SUB_MAP[budgetItem.category || 'Alat Atau Bahan Untuk Kegiatan Kantor']?.[0] || '';
    setCurrentSubCategory(defaultSub);
  };

  const submitManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.quantity || !manualForm.price) return;

    const newItem: InventoryItem = {
      id: `manual-${Date.now()}`,
      name: manualForm.name!,
      spec: manualForm.spec || '',
      quantity: Number(manualForm.quantity),
      unit: manualForm.unit || 'Unit',
      price: Number(manualForm.price),
      total: Number(manualForm.quantity) * Number(manualForm.price),
      subActivityCode: manualForm.subActivityCode,
      subActivityName: manualForm.subActivityName,
      accountCode: manualForm.accountCode || '',
      date: manualForm.date!,
      contractType: manualForm.contractType || 'Invoice',
      vendor: manualForm.vendor || '',
      docNumber: manualForm.docNumber || '',
      category: manualForm.category && CATEGORY_SUB_MAP[manualForm.category] 
        ? `${manualForm.category} - ${currentSubCategory}` 
        : (manualForm.category || 'Lainnya'),
      usedQuantity: Number(manualForm.quantity)
    };

    const updated = [newItem, ...manualInventoryItems];
    saveManualItems(updated);
    setIsManualModalOpen(false);
    setSelectedBudget(null);
  };

  const deleteManualItem = (id: string) => {
    const updated = manualInventoryItems.filter(item => item.id !== id);
    saveManualItems(updated);
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

  const combinedItems = useMemo(() => {
    return [...inventoryItems, ...manualInventoryItems];
  }, [inventoryItems, manualInventoryItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach((item: InventoryItem) => {
      if (!item) return;
      const cat = item.category || '99 LAINNYA';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [combinedItems]);

  const groupedByDoc = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach((item: InventoryItem) => {
      const key = `${item.date}-${item.docNumber}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [combinedItems]);

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
      id: 'persediaan',
      title: 'Laporan Persediaan',
      subtitle: 'Stok & Saldo Akhir',
      description: 'Rekapitulasi persediaan barang dengan penggolongan dan kodefikasi manual.',
      icon: ClipboardList,
      color: 'indigo'
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
            className={`flex items-start gap-4 p-5 rounded-xl border transition-all duration-200 text-left ${activeReport === report.id
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
            <div className="p-6 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center bg-blue-50/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Input Data Inventaris</h4>
                  <p className="text-[10px] text-gray-500 italic">Pilih dari SPJ yang terealisasi atau gunakan AI.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsManualModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-md shadow-emerald-200"
                >
                  <Plus size={14} /> Tambah Manual
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-md shadow-blue-200"
                >
                  {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {isAnalyzing ? 'Menganalisis...' : 'Analisa AI'}
                </button>
              </div>
            </div>

            {combinedItems.length === 0 && !isAnalyzing ? (
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
                          <tr className="bg-blue-50/50 font-bold">
                            <td colSpan={6} className="border border-gray-300 p-2 text-blue-800 uppercase italic">
                              {category}
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
                              <td className="border border-gray-300 p-2 text-center text-[8px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[80px]">
                                {item.docNumber}
                                {item.id.startsWith('manual-') && (
                                  <button
                                    onClick={() => deleteManualItem(item.id)}
                                    className="ml-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Manual Entry */}
            {isManualModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl p-8 animate-fade-in-up relative my-auto">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">Input Manual Inventaris</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Pilih data dari Anggaran/SPJ yang terealisasi</p>
                    </div>
                    <button onClick={() => { setIsManualModalOpen(false); setSelectedBudget(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <X size={24} className="text-slate-400" />
                    </button>
                  </div>

                  {!selectedBudget ? (
                    <div className="space-y-4">
                      <p className="text-sm font-bold text-slate-700 mb-4">Pilih Item dari Anggaran:</p>
                      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2 scrollbar-hide">
                        {budgets
                          .filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0)
                          .map(b => (
                            <button
                              key={b.id}
                              onClick={() => handleManualAdd(b)}
                              className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group flex justify-between items-center"
                            >
                              <div>
                                <p className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{b.description}</p>
                                <div className="flex gap-3 mt-1 items-center">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">{b.account_code}</span>
                                  <span className="text-[10px] text-slate-400">{formatRupiah(b.amount)}</span>
                                  <span className="text-[10px] text-blue-600 font-bold uppercase">{b.realizations?.length} Realisasi</span>
                                </div>
                              </div>
                              <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length === 0 && (
                          <div className="p-12 text-center text-slate-400 italic">Belum ada data SPJ yang terealisasi untuk dipilih.</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={submitManualForm} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Sumber Data:</p>
                        <p className="text-sm font-bold text-slate-800">{selectedBudget.description}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Barang</label>
                        <input
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.name || ''}
                          onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spesifikasi</label>
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.spec || ''}
                          onChange={e => setManualForm({ ...manualForm, spec: e.target.value })}
                          placeholder="Misal: Merk A, Ukuran B, Warna C"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kategori</label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.category || 'Lainnya'}
                          onChange={e => {
                            const newCat = e.target.value;
                            setManualForm({ ...manualForm, category: newCat as any });
                            if (CATEGORY_SUB_MAP[newCat]) {
                              setCurrentSubCategory(CATEGORY_SUB_MAP[newCat][0]);
                            } else {
                              setCurrentSubCategory('');
                            }
                          }}
                        >
                          <option value="Bahan">Bahan</option>
                          <option value="Suku Cadang">Suku Cadang</option>
                          <option value="Alat Atau Bahan Untuk Kegiatan Kantor">Alat atau Bahan Untuk Kegiatan Kantor</option>
                          <option value="Obat Obatan">Obat Obatan</option>
                          <option value="Persediaan Untuk dijual atau diserahkan">Persediaan Untuk dijual atau diserahkan</option>
                          <option value="Persediaan untuk Strategis atau Berjaga jaga">Persediaan untuk Strategis atau Berjaga jaga</option>
                          <option value="Natura dan Pakan">Natura dan Pakan</option>
                          <option value="Persediaan Penelitian">Persediaan Penelitian</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>

                      {manualForm.category && CATEGORY_SUB_MAP[manualForm.category] && (
                        <div className="space-y-1 animate-fade-in">
                          <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Jenis {manualForm.category}</label>
                          <select
                            className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            value={currentSubCategory}
                            onChange={e => setCurrentSubCategory(e.target.value)}
                          >
                            {CATEGORY_SUB_MAP[manualForm.category].map((sub: string) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.quantity || ''}
                          onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Satuan</label>
                        <input
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.unit || ''}
                          onChange={e => setManualForm({ ...manualForm, unit: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Satuan</label>
                        <input
                          required
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.price || ''}
                          onChange={e => setManualForm({ ...manualForm, price: Number(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tgl Perolehan</label>
                        <input
                          type="date"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.date?.split('T')[0] || ''}
                          onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bentuk Kontrak</label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.contractType || 'Invoice'}
                          onChange={e => setManualForm({ ...manualForm, contractType: e.target.value })}
                        >
                          <option value="Invoice">Invoice</option>
                          <option value="Kuitansi">Kuitansi</option>
                          <option value="Nota Kontan">Nota Kontan</option>
                          <option value="BAST">BAST</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penyedia</label>
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                          value={manualForm.vendor || ''}
                          onChange={e => setManualForm({ ...manualForm, vendor: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-3 pt-6 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedBudget(null)}
                          className="flex-1 py-4 px-6 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all font-mono tracking-tight"
                        >
                          KEMBALI
                        </button>
                        <button
                          type="submit"
                          className="flex-[2] py-4 px-6 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-xl shadow-blue-500/25 transition-all active:scale-95"
                        >
                          SIMPAN DATA
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeReport === 'pengeluaran' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 bg-orange-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Buku Pengeluaran Persediaan</h4>
                  <p className="text-[10px] text-gray-500 italic">Data pengeluaran barang yang telah terealisasi melalui SPJ.</p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-orange-700 bg-orange-100/50 px-3 py-1 rounded-full border border-orange-200">
                Otomatis dari Laporan Pengadaan
              </div>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-sm">Belum ada data. Silakan analisa data di menu "Laporan Pengadaan BMD" terlebih dahulu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">BUKU PENGELUARAN PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SD NEGERI CONTOH'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">TAHUN ANGGARAN {schoolProfile?.fiscalYear || '2026'}</p>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-8 text-center">No.</th>
                      <th colSpan={2} className="border border-gray-300 p-1 text-center">Dokumen</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center">Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 text-center">Spesifikasi Nama Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-12 text-center">Jumlah</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-16 text-center">Satuan Barang</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Harga Satuan (Rp)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Nilai Total (Rp)</th>
                      <th rowSpan={2} className="border border-gray-300 p-2 w-24 text-center">Keterangan</th>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <th className="border border-gray-300 p-1 w-20 text-center">Tanggal</th>
                      <th className="border border-gray-300 p-1 w-24 text-center">Nomor</th>
                    </tr>
                    <tr className="bg-gray-100 text-[8px] italic text-center text-gray-500">
                      <td className="border border-gray-300">1</td>
                      <td className="border border-gray-300">2</td>
                      <td className="border border-gray-300">3</td>
                      <td className="border border-gray-300">4</td>
                      <td className="border border-gray-300">5</td>
                      <td className="border border-gray-300">6</td>
                      <td className="border border-gray-300">7</td>
                      <td className="border border-gray-300">8</td>
                      <td className="border border-gray-300">9 = (6x8)</td>
                      <td className="border border-gray-300">10</td>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedByDoc).map(([docKey, rawItems], docIdx) => {
                      const documentItems = rawItems as InventoryItem[];
                      const firstItem = documentItems[0];
                      return (
                        <Fragment key={docKey}>
                          {documentItems.map((item: InventoryItem, itemIdx: number) => (
                            <tr key={`${docKey}-${itemIdx}`} className="hover:bg-gray-50">
                              {itemIdx === 0 && (
                                <Fragment>
                                  <td className="border border-gray-300 p-2 text-center font-bold" rowSpan={documentItems.length}>{docIdx + 1}</td>
                                  <td className="border border-gray-300 p-2 text-center" rowSpan={documentItems.length}>{formatDate(firstItem.date)}</td>
                                  <td className="border border-gray-300 p-2 text-center font-mono text-[8px]" rowSpan={documentItems.length}>{firstItem.docNumber}</td>
                                </Fragment>
                              )}
                              <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                              <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                              <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                              <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                              <td className="border border-gray-300 p-2 text-right font-semibold">{formatRupiah(item.total)}</td>
                              <td className="border border-gray-300 p-2 text-[8px] italic text-gray-400">
                                {itemIdx === 0 ? "per belanja, per transaksi" : "-"}
                              </td>
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

        {activeReport === 'persediaan' && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 bg-indigo-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Laporan Persediaan</h4>
                  <p className="text-[10px] text-gray-500 italic">Format manual dengan penggolongan dan kodefikasi barang.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-indigo-700 bg-indigo-100/50 px-3 py-1 rounded-full border border-indigo-200">
                  Otomatis Terkalkulasi
                </div>
              </div>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-sm">Belum ada data. Silakan analisa data di menu "Laporan Pengadaan BMD" terlebih dahulu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto p-4">
                <div className="text-center mb-6 space-y-1">
                  <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PERSEDIAAN</h3>
                  <p className="text-sm font-bold text-gray-700 uppercase">TAHUN {schoolProfile?.fiscalYear || '2026'}</p>
                  <p className="text-xs font-bold text-gray-600 uppercase">SUMBERDANA KESELURUHAN</p>
                </div>

                <div className="mb-4 text-[10px] space-y-1">
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Kuasa Pengguna Barang</span>
                    <span>: Dinas Pendidikan</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-32 font-medium">Pengguna Barang</span>
                    <span>: {schoolProfile?.name || '-'}</span>
                  </div>
                </div>

                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead className="bg-gray-50 text-gray-700 font-bold text-center">
                    <tr>
                      <th className="border border-gray-300 p-2 w-8" rowSpan={2}>No</th>
                      <th className="border border-gray-300 p-2 w-32" rowSpan={2}>Nama Barang</th>
                      <th className="border border-gray-300 p-2" rowSpan={2}>Spesifikasi Nama Barang</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Sisa Tahun lalu</th>
                      <th className="border border-gray-300 p-1" colSpan={2}>Persediaan</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Sisa Persediaan</th>
                      <th className="border border-gray-300 p-2 w-16" rowSpan={2}>Satuan Barang</th>
                      <th className="border border-gray-300 p-1" colSpan={2}>Harga</th>
                      <th className="border border-gray-300 p-2 w-20" rowSpan={2}>Keterangan</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 p-1 w-16">Masuk</th>
                      <th className="border border-gray-300 p-1 w-16 bg-yellow-50">Keluar</th>
                      <th className="border border-gray-300 p-1 w-24">Satuan (Rp)</th>
                      <th className="border border-gray-300 p-1 w-24">Total Nilai Barang (Rp)</th>
                    </tr>
                    <tr className="bg-gray-100 text-[8px] italic text-gray-500">
                      <td className="border border-gray-300 p-1">1</td>
                      <td className="border border-gray-300 p-1">2</td>
                      <td className="border border-gray-300 p-1">3</td>
                      <td className="border border-gray-300 p-1">4</td>
                      <td className="border border-gray-300 p-1">5</td>
                      <td className="border border-gray-300 p-1">6</td>
                      <td className="border border-gray-300 p-1">7 = (4+5-6)</td>
                      <td className="border border-gray-300 p-1">8</td>
                      <td className="border border-gray-300 p-1">9</td>
                      <td className="border border-gray-300 p-1">10 = (7x9)</td>
                      <td className="border border-gray-300 p-1">11</td>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.entries(groupedItems) as [string, InventoryItem[]][]).sort().map(([category, items]) => {
                      if (items.length === 0) return null;

                      return (
                        <Fragment key={category}>
                          {/* Category Header */}
                          <tr className="bg-gray-50 font-bold italic">
                            <td className="border border-gray-300 p-2" colSpan={11}>
                              {category}
                            </td>
                          </tr>

                          {items.map((item, idx) => {
                            const overrides = itemOverrides[item.id] || {};
                            const sisaLalu = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
                            const masuk = item.quantity;
                            const keluar = overrides.usedQuantity ?? (item.usedQuantity || 0);
                            const sisa = sisaLalu + masuk - keluar;
                            const totalNilai = sisa * item.price;

                            return (
                              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="border border-gray-300 p-2 text-center text-gray-400">{idx + 1}</td>
                                <td className="border border-gray-300 p-2 font-medium">{item.name}</td>
                                <td className="border border-gray-300 p-2 text-gray-500 italic">{item.spec}</td>
                                <td className="border border-gray-300 p-1 text-center bg-gray-50/50">
                                  <input
                                    type="number"
                                    className="w-full bg-transparent text-center border-none focus:ring-0 p-0"
                                    value={sisaLalu}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOverride(item.id, 'lastYearBalance', Number(e.target.value))}
                                  />
                                </td>
                                <td className="border border-gray-300 p-2 text-center font-bold text-blue-600">{masuk}</td>
                                <td className="border border-gray-300 p-1 text-center bg-yellow-50/50">
                                  <input
                                    type="number"
                                    className="w-full bg-transparent text-center border-none focus:ring-0 p-0 font-bold text-orange-600"
                                    value={keluar}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOverride(item.id, 'usedQuantity', Number(e.target.value))}
                                  />
                                </td>
                                <td className={`border border-gray-300 p-2 text-center font-black ${sisa < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                  {sisa}
                                </td>
                                <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                                <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                                <td className="border border-gray-300 p-2 text-right font-bold">{formatRupiah(totalNilai)}</td>
                                <td className="border border-gray-300 p-2 text-[8px] italic text-gray-400">-</td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeReport !== 'pengadaan' && activeReport !== 'pengeluaran' && activeReport !== 'persediaan' && (
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
