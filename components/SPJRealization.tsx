import React, { useState, useEffect, useMemo } from 'react';
import { Budget, TransactionType, AccountCodes, RealizationDetail } from '../types';
import { FileText, Save, X, Calendar, Search, CheckCircle2, FileCheck2, AlertCircle, CheckSquare, Square, Sparkles, Loader2, ShoppingCart, Filter, TrendingUp, Wallet } from 'lucide-react';
import { suggestEvidenceList } from '../lib/gemini';

interface SPJRealizationProps {
  data: Budget[];
  onUpdate: (id: string, updates: Partial<Budget>) => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to determine evidence needed based on Juknis BOSP 2026 & SIPLah Context
const getEvidenceList = (description: string, accountCode?: string): string[] => {
  const text = (description + ' ' + (accountCode || '')).toLowerCase();
  
  // 1. HONORARIUM (Guri Honorer / Tendik / Ekstra)
  if (text.includes('honor') || text.includes('gaji') || text.includes('jasa narasumber') || text.includes('instruktur') || text.includes('pembina')) {
    return [
      "SK Penetapan / Surat Tugas dari Kepala Sekolah (Tahun Berjalan)",
      "Surat Perjanjian Kerja (SPK)",
      "Daftar Hadir / Absensi Bulan Berjalan (Tanda Tangan Lengkap)",
      "Laporan Pelaksanaan Tugas / Jurnal Kegiatan",
      "Daftar Tanda Terima Honorarium (Bruto, Potongan Pajak, Netto)",
      "Bukti Transfer Bank ke Rekening Penerima (CMS/Teller)",
      "Bukti Setor Pajak PPh 21 (Kode Billing & NTPN)",
      "Fotokopi KTP & NPWP Penerima"
    ];
  }

  // 2. BELANJA BARANG / ATK / BAHAN / ALAT KEBERSIHAN / ALAT LISTRIK (LAMPU)
  // FIX: Menambahkan 'lampu', 'kabel', 'alat listrik' agar masuk kategori Barang/SIPLah, bukan Konstruksi.
  if (
    text.includes('atk') || text.includes('bahan') || text.includes('alat tulis') || 
    text.includes('kertas') || text.includes('kebersihan') || text.includes('spanduk') || 
    text.includes('cetak') || text.includes('penggandaan') || 
    text.includes('lampu') || text.includes('kabel') || text.includes('alat listrik') || text.includes('saklar')
  ) {
    return [
      "Dokumen Cetak Pesanan SIPLah",
      "Invoice / Faktur Penjualan (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Bukti Transfer ke Rekening Marketplace (Bukan Rekening Penjual)",
      "Bukti Setor / Pungut Pajak (Oleh Marketplace SIPLah)",
      "Foto Dokumentasi Barang yang diterima",
      "Kuitansi Manual (Hanya jika pembelian Non-SIPLah / Mendesak < Rp 200rb)"
    ];
  }

  // 3. MAKAN MINUM (KONSUMSI)
  if (text.includes('makan') || text.includes('minum') || text.includes('konsumsi') || text.includes('rapat') || text.includes('snack')) {
    return [
      "Surat Undangan & Daftar Hadir Kegiatan",
      "Notulen / Laporan Hasil Kegiatan",
      "Nota / Bon Pembelian Konsumsi (Rincian Menu Jelas)",
      "Kuitansi Pembayaran (Bermaterai jika > Rp 5 Juta)",
      "Bukti Setor PPh 23 (Jasa Katering) atau Pajak Daerah (PB1)",
      "Foto Dokumentasi Kegiatan (Open Camera)",
      "Dokumen SIPLah (Jika memesan Katering via SIPLah)"
    ];
  }

  // 4. PERJALANAN DINAS
  if (text.includes('perjalanan') || text.includes('dinas') || text.includes('transport') || text.includes('sppd')) {
    return [
      "Surat Tugas (Ditandatangani KS)",
      "SPPD (Surat Perintah Perjalanan Dinas) - Cap Instansi Tujuan",
      "Laporan Hasil Perjalanan Dinas",
      "Tiket / Bukti Transportasi Riil",
      "Nota BBM (Jika kendaraan pribadi/sewa)",
      "Kuitansi / Bill Hotel (Jika Menginap)",
      "Daftar Pengeluaran Riil (Format Lampiran Juknis)"
    ];
  }

  // 5. BELANJA MODAL / ASET (Laptop, Meja, Kursi, AC, Buku)
  if (text.includes('modal') || text.includes('buku') || text.includes('laptop') || text.includes('komputer') || text.includes('printer') || text.includes('meja') || text.includes('kursi') || text.includes('aset') || text.includes('elektronik')) {
    return [
      "Dokumen Cetak Pesanan SIPLah (SPK Digital)",
      "Invoice / Faktur Penjualan (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Berita Acara Pemeriksaan Barang (Internal Sekolah)",
      "Bukti Transfer ke Rekening Marketplace",
      "Bukti Pungut/Setor Pajak (Oleh Marketplace SIPLah)",
      "Foto Dokumentasi Barang (Fisik di Sekolah)",
      "Fotokopi Pencatatan di Buku Inventaris Aset / KIB",
      "Kartu Garansi Resmi"
    ];
  }

  // 6. PEMELIHARAAN / JASA TUKANG
  // FIX: Hanya masuk sini jika eksplisit menyebut 'jasa', 'tukang', 'servis', atau 'upah'.
  // Jika hanya 'pemeliharaan' tapi barangnya 'lampu', sudah tertangkap di poin 2.
  if (text.includes('pemeliharaan') || text.includes('servis') || text.includes('perbaikan') || text.includes('tukang') || text.includes('rehab')) {
    return [
      "Surat Perintah Kerja (SPK) Manual (Jika Jasa Perorangan)",
      "RAB (Rincian Anggaran Biaya) Pekerjaan",
      "Nota Belanja Bahan Material (Bisa SIPLah / Toko Bangunan)",
      "Kuitansi Upah Tukang",
      "Daftar Hadir Tukang",
      "Berita Acara Penyelesaian Pekerjaan & BAST",
      "Bukti Setor PPh 21 (Upah Tukang)",
      "Foto Dokumentasi (0%, 50%, 100%)"
    ];
  }

  // 7. LANGGANAN DAYA & JASA (Listrik, Internet)
  // FIX: Pastikan tidak menangkap 'alat listrik' atau 'lampu', hanya tagihan.
  if ((text.includes('listrik') && !text.includes('alat')) || text.includes('air') || text.includes('internet') || text.includes('langganan') || text.includes('telepon') || text.includes('wifi')) {
    return [
      "Invoice / Tagihan Resmi Penyedia (PLN/Telkom)",
      "Bukti Pembayaran Valid (Struk Bank / NTPN / Bukti Transfer)",
      "Bukti Transaksi Marketplace (Jika bayar via Tokopedia/Shopee/dll)"
    ];
  }

  // Default fallback
  return [
    "Dokumen SIPLah (Invoice, BAST, Bukti Pesanan)",
    "Bukti Pembayaran Non-Tunai / Transfer",
    "Bukti Pajak (Dipungut Marketplace/Setor Sendiri)",
    "Dokumentasi Foto",
    "Kuitansi / Nota (Jika Transaksi Manual)"
  ];
};

const SPJRealization: React.FC<SPJRealizationProps> = ({ data, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  // View State
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth() + 1); // Tab Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0); 
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  
  // Checklist State
  const [evidenceItems, setEvidenceItems] = useState<string[]>([]);
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter Data based on Month Tab
  const expensesInMonth = useMemo(() => {
    return data.filter(d => 
      d.type === TransactionType.EXPENSE && 
      d.status !== 'rejected' &&
      d.realization_months?.includes(viewMonth) && // Only show items planned for this month
      d.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, viewMonth, searchTerm]);

  // Calculate Monthly Stats
  const monthStats = useMemo(() => {
    let totalPlanned = 0;
    let totalRealized = 0;

    expensesInMonth.forEach(item => {
      // Calculate estimated plan for this specific month (Total / num months)
      const numMonths = item.realization_months?.length || 1;
      const monthlyPlan = item.amount / numMonths;
      totalPlanned += monthlyPlan;

      // Find realization strictly for this month
      const realization = item.realizations?.find(r => r.month === viewMonth);
      if (realization) {
        totalRealized += realization.amount;
      }
    });

    return { totalPlanned, totalRealized };
  }, [expensesInMonth, viewMonth]);

  const handleOpenSPJ = (item: Budget) => {
    setSelectedBudget(item);
    
    // Default to currently viewed month in the modal
    selectMonthForEditing(item, viewMonth);
    
    // Load evidence list
    const items = getEvidenceList(item.description, item.account_code);
    setEvidenceItems(items);
    
    setIsModalOpen(true);
  };

  const handleGetAIEvidence = async () => {
    if (!selectedBudget) return;
    setIsAiLoading(true);
    const aiSuggestions = await suggestEvidenceList(selectedBudget.description, selectedBudget.account_code || '');
    if (aiSuggestions && aiSuggestions.length > 0) {
      setEvidenceItems(aiSuggestions);
      setCheckedEvidence(prev => prev.filter(p => aiSuggestions.includes(p)));
    }
    setIsAiLoading(false);
  };

  const selectMonthForEditing = (item: Budget, month: number) => {
    setActiveMonthIndex(month);
    const existingRealization = item.realizations?.find(r => r.month === month);
    
    // Reset Checklist whenever changing month
    setCheckedEvidence([]); 

    if (existingRealization) {
      setFormAmount(existingRealization.amount.toString());
      setFormDate(existingRealization.date.split('T')[0]);
      setExistingFileName(existingRealization.evidence_file || '');
    } else {
      const monthsCount = item.realization_months?.length || 1;
      const suggestedAmount = Math.floor(item.amount / monthsCount);
      setFormAmount(suggestedAmount.toString());
      
      const lastDay = new Date(2026, month, 0).getDate();
      setFormDate(`2026-${month.toString().padStart(2, '0')}-${lastDay}`);
      setExistingFileName('');
    }
  };

  const toggleEvidence = (item: string) => {
    setCheckedEvidence(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSaveSPJ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;

    // Create new realization item
    const newRealization: RealizationDetail = {
      month: activeMonthIndex,
      amount: Number(formAmount),
      date: new Date(formDate).toISOString(),
      evidence_file: existingFileName 
    };

    // Merge with existing realizations
    const currentRealizations = selectedBudget.realizations || [];
    const otherRealizations = currentRealizations.filter(r => r.month !== activeMonthIndex);
    const updatedRealizations = [...otherRealizations, newRealization];

    onUpdate(selectedBudget.id, {
      realizations: updatedRealizations
    });

    setIsModalOpen(false); 
    setSelectedBudget(null);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Peng-SPJ-an & Realisasi</h2>
           <p className="text-sm text-gray-500">Input realisasi per bulan dan ceklist kelengkapan bukti (Standar SIPLah & Juknis 2026).</p>
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari kegiatan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-full md:w-64 shadow-sm"
          />
        </div>
      </div>

      {/* Month Tabs */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 md:pb-0">
          {MONTHS.map((m, idx) => {
             const monthNum = idx + 1;
             const isActive = viewMonth === monthNum;
             return (
               <button
                 key={monthNum}
                 onClick={() => setViewMonth(monthNum)}
                 className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                   isActive 
                     ? 'bg-blue-600 text-white shadow-md' 
                     : 'text-gray-600 hover:bg-gray-100'
                 }`}
               >
                 {m}
               </button>
             )
          })}
        </div>
      </div>

      {/* Monthly Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Rencana {MONTHS[viewMonth-1]}</p>
              <h3 className="text-lg font-bold text-blue-900">{formatRupiah(monthStats.totalPlanned)}</h3>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
               <Wallet size={20} />
            </div>
         </div>
         
         <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Realisasi {MONTHS[viewMonth-1]}</p>
              <h3 className={`text-lg font-bold ${monthStats.totalRealized > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {formatRupiah(monthStats.totalRealized)}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${monthStats.totalRealized > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
               <TrendingUp size={20} />
            </div>
         </div>

         <div className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-center">
             <div className="flex justify-between items-center text-xs mb-1">
               <span className="font-bold text-gray-500">Serapan Bulan Ini</span>
               <span className="font-bold text-blue-600">
                 {monthStats.totalPlanned > 0 
                    ? ((monthStats.totalRealized / monthStats.totalPlanned) * 100).toFixed(0) 
                    : 0}%
               </span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    monthStats.totalRealized >= monthStats.totalPlanned ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${monthStats.totalPlanned > 0 ? Math.min((monthStats.totalRealized / monthStats.totalPlanned) * 100, 100) : 0}%` }}
                ></div>
             </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
           <Filter size={16} className="text-gray-400" />
           <h3 className="text-sm font-bold text-gray-700">Daftar Kegiatan Bulan {MONTHS[viewMonth-1]}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-4 font-semibold w-1/3">Uraian Kegiatan</th>
                <th className="px-4 py-4 font-semibold text-right">Pagu (Per Bulan)</th>
                <th className="px-4 py-4 font-semibold text-right">Realisasi (Per Bulan)</th>
                <th className="px-4 py-4 font-semibold text-center">Status Bukti</th>
                <th className="px-4 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expensesInMonth.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <FileText size={32} className="opacity-20" />
                       <p>Tidak ada jadwal kegiatan di bulan {MONTHS[viewMonth-1]}.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expensesInMonth.map((item) => {
                  // Monthly Specific Logic
                  const numMonths = item.realization_months?.length || 1;
                  const monthlyBudget = item.amount / numMonths;
                  const realizationThisMonth = item.realizations?.find(r => r.month === viewMonth);
                  const amountRealized = realizationThisMonth?.amount || 0;
                  const isDone = amountRealized > 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-800">{item.description}</div>
                         <div className="text-[10px] text-gray-400 font-mono mt-1">
                           {item.account_code || 'Kode Rekening -'}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-gray-900">
                         {formatRupiah(monthlyBudget)}
                         <div className="text-[10px] text-gray-400">Est. RPD</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium">
                         <span className={amountRealized > 0 ? 'text-green-700' : 'text-gray-400'}>
                            {formatRupiah(amountRealized)}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                         {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-100">
                               <CheckCircle2 size={12} /> Selesai
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs border border-gray-200">
                               <Square size={12} /> Belum
                            </span>
                         )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => handleOpenSPJ(item)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition shadow-sm ${
                            isDone 
                               ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                               : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isDone ? 'Edit SPJ' : 'Input SPJ'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input SPJ */}
      {isModalOpen && selectedBudget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
               <div className="flex items-center gap-2">
                 <FileCheck2 className="text-blue-600" size={20} />
                 <h3 className="font-bold text-gray-800">Input Realisasi (SPJ)</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
               {/* Sidebar Months */}
               {(selectedBudget.realization_months?.length || 0) > 1 && (
                 <div className="w-40 bg-gray-50 border-r border-gray-100 overflow-y-auto p-2 space-y-1">
                    <p className="px-2 py-2 text-xs font-bold text-gray-500 uppercase">Pilih Bulan</p>
                    {selectedBudget.realization_months?.sort((a,b)=>a-b).map(m => {
                       const isDone = selectedBudget.realizations?.some(r => r.month === m);
                       const isActive = activeMonthIndex === m;
                       return (
                         <button
                           key={m}
                           onClick={() => selectMonthForEditing(selectedBudget, m)}
                           className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition ${
                             isActive ? 'bg-white border border-blue-200 shadow-sm text-blue-700 font-bold' : 'hover:bg-gray-100 text-gray-600'
                           }`}
                         >
                           {MONTHS[m-1]}
                           {isDone && <CheckCircle2 size={12} className="text-green-500" />}
                         </button>
                       )
                    })}
                 </div>
               )}

               <div className="flex-1 overflow-y-auto p-6">
                 <form onSubmit={handleSaveSPJ} className="space-y-6">
                    
                    <div>
                      <h4 className="font-bold text-gray-800">{selectedBudget.description}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                         <span className="bg-gray-100 px-2 py-0.5 rounded">Bulan: {MONTHS[activeMonthIndex-1]}</span>
                         <span>•</span>
                         <span>Pagu Total: {formatRupiah(selectedBudget.amount)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Realisasi (Rp)</label>
                         <input 
                           type="number" 
                           required
                           min="0"
                           value={formAmount}
                           onChange={(e) => setFormAmount(e.target.value)}
                           className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono text-blue-800 font-bold"
                           placeholder="0"
                         />
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kuitansi/Nota</label>
                         <div className="relative">
                           <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
                           <input 
                              type="date" 
                              required
                              value={formDate}
                              onChange={(e) => setFormDate(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                         </div>
                       </div>
                    </div>

                    {/* Evidence Checklist */}
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                       <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                            <AlertCircle className="text-yellow-600" size={18} />
                            <h5 className="text-sm font-bold text-yellow-800">Kelengkapan Bukti Fisik</h5>
                         </div>
                         <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={handleGetAIEvidence}
                                disabled={isAiLoading}
                                className="flex items-center gap-1 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition"
                            >
                                {isAiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Saran AI
                            </button>
                         </div>
                       </div>
                       
                       {/* SIPLah Badge */}
                       <div className="flex items-center gap-2 mb-3 bg-white p-2 rounded border border-yellow-200">
                          <ShoppingCart size={16} className="text-orange-500" />
                          <span className="text-xs text-gray-600">Pastikan belanja barang/modal menggunakan <b>SIPLah</b>.</span>
                       </div>

                       <div className="space-y-2">
                         {evidenceItems.map((item, idx) => {
                           const isChecked = checkedEvidence.includes(item);
                           return (
                             <div 
                               key={idx} 
                               onClick={() => toggleEvidence(item)}
                               className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition select-none ${
                                 isChecked ? 'bg-yellow-100/50' : 'hover:bg-white/50'
                               }`}
                             >
                               <div className={`mt-0.5 flex-shrink-0 text-yellow-600`}>
                                 {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                               </div>
                               <span className={`text-xs ${isChecked ? 'text-gray-600 line-through' : 'text-gray-800'}`}>
                                 {item}
                               </span>
                             </div>
                           )
                         })}
                       </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Tutup
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        Simpan Realisasi
                      </button>
                    </div>

                 </form>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SPJRealization;