import React, { useState, useEffect, useMemo } from 'react';
import { Budget, TransactionType, AccountCodes, RealizationDetail } from '../types';
import { FileText, Save, X, Calendar, Search, CheckCircle2, FileCheck2, AlertCircle, CheckSquare, Square, Sparkles, Loader2, ShoppingCart, Filter, TrendingUp, Wallet, Check, ListChecks, ArrowRightCircle, Trash2, Box } from 'lucide-react';
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
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  
  // View State
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth() + 1); // Tab Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0); 
  const [formAmount, setFormAmount] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>(''); // New Quantity Form
  const [batchAmounts, setBatchAmounts] = useState<Record<string, number>>({});
  const [batchQuantities, setBatchQuantities] = useState<Record<string, number>>({}); // New Batch Quantities
  const [formDate, setFormDate] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  
  // Checklist State
  const [evidenceItems, setEvidenceItems] = useState<string[]>([]);
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- LOGIKA UTAMA: FILTER ITEM & ROLLOVER (LUNCURAN) ---
  const expensesInMonth = useMemo(() => {
    return data.filter(d => {
        // 1. Basic Filter: Must be Expense, Not Rejected, Match Search
        if (d.type !== TransactionType.EXPENSE || d.status === 'rejected') return false;
        if (!d.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;

        // 2. Rollover Logic (Logika Luncuran)
        const totalRealized = d.realizations?.reduce((sum, r) => sum + r.amount, 0) || 0;
        const remaining = d.amount - totalRealized;
        const realizedThisView = d.realizations?.find(r => r.month === viewMonth)?.amount || 0;

        // KONDISI A: Sudah ada transaksi di bulan ini (Tampilkan sebagai item selesai/edit)
        if (realizedThisView > 0) return true;

        // KONDISI B: Item belum lunas (Remaining > 0) DAN Bulan sekarang >= Bulan Rencana Pertama
        // Ini artinya item "meluncur" terus ke bulan berikutnya sampai habis
        const firstPlannedMonth = Math.min(...(d.realization_months || [12]));
        
        // Toleransi: Jika sisa < Rp 100 perak, anggap lunas (pembulatan)
        if (remaining > 100 && viewMonth >= firstPlannedMonth) {
            return true;
        }

        return false;
    }).sort((a, b) => {
        // Sort: Items with realization first, then alphabetic
        const aRealized = a.realizations?.some(r => r.month === viewMonth);
        const bRealized = b.realizations?.some(r => r.month === viewMonth);
        if (aRealized && !bRealized) return -1;
        if (!aRealized && bRealized) return 1;
        return a.description.localeCompare(b.description);
    });
  }, [data, viewMonth, searchTerm]);

  // Calculate Monthly Stats (Updated to show Remaining as 0 when done)
  const monthStats = useMemo(() => {
    let totalRemainingToSpend = 0; // Sisa Dana yang BELUM di-SPJ-kan
    let totalRealized = 0;         // Yang SUDAH di-SPJ-kan bulan ini

    expensesInMonth.forEach(item => {
      // 1. Hitung Realisasi Global & Sisa
      const totalGlobalRealized = item.realizations?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const realizedInThisMonth = item.realizations?.find(r => r.month === viewMonth)?.amount || 0;
      
      // 2. Tambahkan ke Total Realisasi Bulan Ini
      totalRealized += realizedInThisMonth;

      // 3. Hitung Sisa Anggaran (Global)
      // Jika semua sudah di SPJ-kan, nilai ini akan 0 (atau negatif kecil karena pembulatan)
      const remainingGlobal = Math.max(0, item.amount - totalGlobalRealized); 
      
      totalRemainingToSpend += remainingGlobal;
    });

    // Total Potensi (Denominator Progress Bar) = (Sisa + Yang Sudah Dipakai Bulan Ini)
    const totalBudgetPool = totalRemainingToSpend + totalRealized;

    return { totalRemainingToSpend, totalRealized, totalBudgetPool };
  }, [expensesInMonth, viewMonth]);

  const handleOpenSPJ = (item: Budget) => {
    setSelectedBudget(item);
    setSelectedBatchIds([item.id]); // Single mode
    
    // Default to currently viewed month in the modal
    selectMonthForEditing(item, viewMonth);
    
    // Load evidence list
    const items = getEvidenceList(item.description, item.account_code);
    setEvidenceItems(items);
    
    setIsModalOpen(true);
  };

  const handleBatchSPJ = () => {
    if (selectedBatchIds.length === 0) return;
    
    // Pick the first item as the "representative" for description logic
    const firstItem = data.find(d => d.id === selectedBatchIds[0]);
    if (!firstItem) return;

    setSelectedBudget(null); // Indicates batch mode if null but selectedBatchIds has items
    setActiveMonthIndex(viewMonth);
    
    // Set default date
    const lastDay = new Date(2026, viewMonth, 0).getDate();
    setFormDate(`2026-${viewMonth.toString().padStart(2, '0')}-${lastDay}`);
    setExistingFileName('');
    setCheckedEvidence([]);

    // Initialize amounts & quantities for all selected items
    const amounts: Record<string, number> = {};
    const quantities: Record<string, number> = {};

    selectedBatchIds.forEach(id => {
       const item = data.find(d => d.id === id);
       if (item) {
          const totalRealized = item.realizations?.reduce((s, r) => s + r.amount, 0) || 0;
          const remainingAmount = item.amount - totalRealized;
          
          const totalRealizedQty = item.realizations?.reduce((s, r) => s + (r.quantity || 0), 0) || 0;
          const remainingQty = (item.quantity || 1) - totalRealizedQty;
          
          // Check if already realized this month
          const existing = item.realizations?.find(r => r.month === viewMonth);
          
          // If realized, use that value. If not, suggest remaining balance (Rollover logic)
          amounts[id] = existing ? existing.amount : remainingAmount;
          quantities[id] = existing ? (existing.quantity || remainingQty) : remainingQty;
       }
    });
    setBatchAmounts(amounts);
    setBatchQuantities(quantities);

    // Get evidence from first item (assuming batch usually shares type)
    const items = getEvidenceList(firstItem.description, firstItem.account_code);
    setEvidenceItems(items);

    setIsModalOpen(true);
  };

  const handleGetAIEvidence = async () => {
    // If batch, use the first selected item for AI context
    const item = selectedBudget || data.find(d => d.id === selectedBatchIds[0]);
    if (!item) return;

    setIsAiLoading(true);
    const aiSuggestions = await suggestEvidenceList(item.description, item.account_code || '');
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
      // Handle quantity, default to 1 or 0 if undefined
      setFormQuantity((existingRealization.quantity || 0).toString());
      setFormDate(existingRealization.date.split('T')[0]);
      setExistingFileName(existingRealization.evidence_file || '');
    } else {
      // SUGGESTION LOGIC: Suggest remaining budget (Rollover)
      const totalRealizedBefore = item.realizations?.reduce((sum, r) => sum + r.amount, 0) || 0;
      const remainingAmount = item.amount - totalRealizedBefore;
      
      const totalQuantityRealizedBefore = item.realizations?.reduce((sum, r) => sum + (r.quantity || 0), 0) || 0;
      const remainingQuantity = (item.quantity || 1) - totalQuantityRealizedBefore;

      setFormAmount(remainingAmount > 0 ? remainingAmount.toString() : '0');
      setFormQuantity(remainingQuantity > 0 ? remainingQuantity.toString() : '0');
      
      const lastDay = new Date(2026, month, 0).getDate();
      setFormDate(`2026-${month.toString().padStart(2, '0')}-${lastDay}`);
      setExistingFileName('');
    }
  };

  const handleSingleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setFormQuantity(val);
      
      if (selectedBudget) {
          // Use unit_price if available, or derive from total amount/quantity
          const price = selectedBudget.unit_price || (selectedBudget.quantity ? selectedBudget.amount / selectedBudget.quantity : 0);
          if (price > 0) {
             const qty = parseFloat(val) || 0;
             setFormAmount((qty * price).toFixed(0));
          }
      }
  };

  const handleBatchQuantityChange = (id: string, val: string) => {
      const qty = parseFloat(val) || 0;
      setBatchQuantities(prev => ({...prev, [id]: qty}));
      
      const item = data.find(d => d.id === id);
      if (item) {
          const price = item.unit_price || (item.quantity ? item.amount / item.quantity : 0);
          if (price > 0) {
              setBatchAmounts(prev => ({...prev, [id]: Math.round(qty * price)}));
          }
      }
  };

  const toggleEvidence = (item: string) => {
    setCheckedEvidence(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleRowSelection = (id: string) => {
    setSelectedBatchIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveSPJ = (e: React.FormEvent) => {
    e.preventDefault();

    // Handle Batch Save
    if (selectedBatchIds.length > 0) {
       selectedBatchIds.forEach(id => {
          const item = data.find(d => d.id === id);
          if (!item) return;

          // Determine amount & quantity
          const amountToSave = selectedBudget ? Number(formAmount) : (batchAmounts[id] || 0);
          const quantityToSave = selectedBudget ? Number(formQuantity) : (batchQuantities[id] || 1);

          const newRealization: RealizationDetail = {
            month: activeMonthIndex,
            amount: amountToSave,
            quantity: quantityToSave,
            date: new Date(formDate).toISOString(),
            evidence_file: existingFileName || 'Nota Kolektif'
          };

          const currentRealizations = item.realizations || [];
          const otherRealizations = currentRealizations.filter(r => r.month !== activeMonthIndex);
          const updatedRealizations = [...otherRealizations, newRealization];

          onUpdate(id, { realizations: updatedRealizations });
       });
    }

    setIsModalOpen(false); 
    setSelectedBudget(null);
    setSelectedBatchIds([]); // Clear selection after save
  };
  
  const handleDeleteSPJ = () => {
    if (!selectedBudget) return;
    if (!confirm(`Batalkan/Hapus SPJ untuk bulan ${MONTHS[activeMonthIndex-1]}? Data realisasi akan dihapus.`)) return;

    const currentRealizations = selectedBudget.realizations || [];
    // Remove the realization for the current active month
    const updatedRealizations = currentRealizations.filter(r => r.month !== activeMonthIndex);
    
    onUpdate(selectedBudget.id, { realizations: updatedRealizations });
    
    setIsModalOpen(false);
    setSelectedBudget(null);
    setSelectedBatchIds([]);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // Check if we are in batch mode inside modal
  const isBatchMode = !selectedBudget && selectedBatchIds.length > 0;
  
  // Logic to show delete button: only in single mode AND if there is already a realization for this month
  const showDeleteButton = !isBatchMode && selectedBudget && selectedBudget.realizations?.some(r => r.month === activeMonthIndex);

  return (
    <div className="space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Peng-SPJ-an & Realisasi</h2>
           <p className="text-sm text-gray-500">
              Input realisasi bulanan. Anggaran yang belum terserap otomatis menjadi <b>Luncuran</b> di bulan berikutnya.
           </p>
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
                 onClick={() => { setViewMonth(monthNum); setSelectedBatchIds([]); }}
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
              <p className="text-xs text-blue-600 font-bold uppercase mb-1">Sisa Anggaran (Bisa di-SPJ)</p>
              <h3 className="text-lg font-bold text-blue-900">{formatRupiah(monthStats.totalRemainingToSpend)}</h3>
              <p className="text-[10px] text-blue-500 mt-1">Akan menjadi 0 jika semua lunas</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
               <Wallet size={20} />
            </div>
         </div>
         
         <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Sudah di-SPJ-kan {MONTHS[viewMonth-1]}</p>
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
               <span className="font-bold text-gray-500">Persentase Serapan</span>
               <span className="font-bold text-blue-600">
                 {monthStats.totalBudgetPool > 0 
                    ? ((monthStats.totalRealized / monthStats.totalBudgetPool) * 100).toFixed(0) 
                    : 0}%
               </span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    monthStats.totalRealized >= monthStats.totalBudgetPool ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${monthStats.totalBudgetPool > 0 ? Math.min((monthStats.totalRealized / monthStats.totalBudgetPool) * 100, 100) : 0}%` }}
                ></div>
             </div>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <h3 className="text-sm font-bold text-gray-700">Daftar Kegiatan Siap SPJ (Bulan {MONTHS[viewMonth-1]})</h3>
           </div>
           
           {/* Batch Action Button */}
           {selectedBatchIds.length > 0 && (
             <button 
                onClick={handleBatchSPJ}
                className="animate-fade-in px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-lg hover:bg-indigo-700 transition flex items-center gap-2"
             >
                <ListChecks size={14} />
                Input SPJ Kolektif ({selectedBatchIds.length})
             </button>
           )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-4 w-10 text-center">
                   <CheckSquare size={16} className="mx-auto text-gray-400" />
                </th>
                <th className="px-4 py-4 font-semibold w-1/3">Uraian Kegiatan</th>
                <th className="px-4 py-4 font-semibold text-right">Sisa Pagu (Available)</th>
                <th className="px-4 py-4 font-semibold text-right">Realisasi Bulan Ini</th>
                <th className="px-4 py-4 font-semibold text-center">Status</th>
                <th className="px-4 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expensesInMonth.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <FileText size={32} className="opacity-20" />
                       <p>Semua anggaran telah terealisasi atau belum masuk jadwal.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expensesInMonth.map((item) => {
                  const totalGlobalRealized = item.realizations?.reduce((s,r) => s+r.amount, 0) || 0;
                  const realizedThisMonth = item.realizations?.find(r => r.month === viewMonth)?.amount || 0;
                  const remainingBudget = item.amount - totalGlobalRealized;
                  
                  // AVAILABLE = Sisa Global + Apa yang sudah diinput bulan ini (untuk diedit)
                  const availableToSpend = remainingBudget + realizedThisMonth; 
                  
                  const isDone = realizedThisMonth > 0;
                  const isSelected = selectedBatchIds.includes(item.id);
                  const isRollover = !(item.realization_months?.includes(viewMonth)) && remainingBudget > 0;
                  
                  return (
                    <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-4 text-center">
                         <button 
                           onClick={() => toggleRowSelection(item.id)}
                           className={`transition ${isSelected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-400'}`}
                         >
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-800">{item.description}</div>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 font-mono">{item.account_code || 'Kode Rekening -'}</span>
                            {isRollover && !isDone && (
                                <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <ArrowRightCircle size={10} /> Luncuran
                                </span>
                            )}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-blue-700 font-bold">
                         {formatRupiah(availableToSpend)}
                         <div className="text-[10px] text-gray-400 font-normal">Pagu Tersedia</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium">
                         <span className={realizedThisMonth > 0 ? 'text-green-700' : 'text-gray-300'}>
                            {formatRupiah(realizedThisMonth)}
                         </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                         {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-100">
                               <CheckCircle2 size={12} /> SPJ OK
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
                          {isDone ? 'Edit' : 'Input'}
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

      {/* Modal Input SPJ (Supports Single & Batch) */}
      {isModalOpen && (selectedBudget || selectedBatchIds.length > 0) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
               <div className="flex items-center gap-2">
                 {isBatchMode ? (
                    <ListChecks className="text-indigo-600" size={20} />
                 ) : (
                    <FileCheck2 className="text-blue-600" size={20} />
                 )}
                 <h3 className="font-bold text-gray-800">
                   {isBatchMode ? `Input Realisasi Kolektif (${selectedBatchIds.length} Item)` : 'Input Realisasi (SPJ)'}
                 </h3>
               </div>
               <button onClick={() => { setIsModalOpen(false); setSelectedBatchIds([]); }}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
               {/* Sidebar Months (Only for Single Mode) */}
               {(!isBatchMode && (selectedBudget?.realization_months?.length || 0) > 1) && (
                 <div className="w-40 bg-gray-50 border-r border-gray-100 overflow-y-auto p-2 space-y-1">
                    <p className="px-2 py-2 text-xs font-bold text-gray-500 uppercase">Pilih Bulan</p>
                    {selectedBudget?.realization_months?.sort((a,b)=>a-b).map(m => {
                       const isDone = selectedBudget.realizations?.some(r => r.month === m);
                       const isActive = activeMonthIndex === m;
                       return (
                         <button
                           key={m}
                           onClick={() => selectedBudget && selectMonthForEditing(selectedBudget, m)}
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
                    
                    {/* Header Info */}
                    <div>
                      {!isBatchMode && selectedBudget ? (
                        <>
                          <h4 className="font-bold text-gray-800">{selectedBudget.description}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                             <span className="bg-gray-100 px-2 py-0.5 rounded">Bulan: {MONTHS[activeMonthIndex-1]}</span>
                             <span>•</span>
                             <span>Pagu Total: {formatRupiah(selectedBudget.amount)}</span>
                          </div>
                        </>
                      ) : (
                         <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                            <p className="text-sm text-indigo-800 font-bold">Mode Input Kolektif</p>
                            <p className="text-xs text-indigo-600">Anda menginput SPJ untuk beberapa kegiatan sekaligus dalam satu nota/kuitansi.</p>
                         </div>
                      )}
                    </div>

                    {/* Amount Input */}
                    {isBatchMode ? (
                       <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <label className="block text-sm font-bold text-gray-700 mb-2">Rincian Nilai & Volume Realisasi per Item</label>
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {selectedBatchIds.map(id => {
                                const item = data.find(d => d.id === id);
                                if(!item) return null;
                                
                                // Calculate planned amount context
                                const totalRealized = item.realizations?.reduce((s, r) => s + r.amount, 0) || 0;
                                const remaining = item.amount - totalRealized;
                                const realizedThisMonth = item.realizations?.find(r => r.month === viewMonth)?.amount || 0;
                                const available = remaining + realizedThisMonth;

                                return (
                                  <div key={id} className="flex flex-col gap-2 bg-white p-2 rounded border border-gray-200">
                                     <div className="flex justify-between items-center">
                                        <div className="overflow-hidden">
                                           <p className="text-xs font-bold text-gray-700 truncate">{item.description}</p>
                                           <p className="text-[10px] text-gray-500">Sisa Pagu: <span className="font-mono text-blue-600 font-bold">{formatRupiah(available)}</span></p>
                                        </div>
                                     </div>
                                     <div className="flex gap-2">
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-400 mb-0.5">Nominal (Rp)</p>
                                            <input 
                                                type="number" 
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-right text-sm font-bold font-mono text-gray-800 focus:border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={batchAmounts[id] || 0}
                                                onChange={(e) => setBatchAmounts(prev => ({...prev, [id]: Number(e.target.value)}))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <p className="text-[9px] text-gray-400 mb-0.5">Vol (Unit)</p>
                                            <input 
                                                type="number" 
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium text-gray-700 focus:border-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={batchQuantities[id] || 0}
                                                onChange={(e) => handleBatchQuantityChange(id, e.target.value)}
                                                placeholder="1"
                                            />
                                        </div>
                                     </div>
                                  </div>
                                )
                            })}
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t border-gray-300 mt-2">
                             <span className="text-sm font-bold text-gray-700">Total Nominal Nota:</span>
                             <span className="text-lg font-bold text-indigo-700 font-mono bg-white px-2 py-1 rounded border border-indigo-100">
                                {formatRupiah((Object.values(batchAmounts) as number[]).reduce((a, b) => a + b, 0))}
                             </span>
                          </div>
                       </div>
                    ) : (
                       <div className="grid grid-cols-2 gap-4">
                         <div className="col-span-2 md:col-span-1">
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
                         <div className="col-span-2 md:col-span-1">
                           <label className="block text-sm font-medium text-gray-700 mb-1">Volume Realisasi (Unit/Paket)</label>
                           <div className="relative">
                               <Box size={18} className="absolute left-3 top-2.5 text-gray-400" />
                               <input 
                                type="number" 
                                required
                                min="0"
                                value={formQuantity}
                                onChange={handleSingleQuantityChange}
                                className="w-full pl-10 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-gray-700"
                                placeholder="0"
                               />
                           </div>
                           <p className="text-[10px] text-gray-400 mt-1 text-right">
                             Sisa Volume: {(selectedBudget?.quantity || 1) - (selectedBudget?.realizations?.reduce((acc, r) => acc + (r.quantity || 0), 0) || 0) + (selectedBudget?.realizations?.find(r => r.month === activeMonthIndex)?.quantity || 0)} {selectedBudget?.unit || 'Paket'}
                           </p>
                         </div>
                         <div className="col-span-2">
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
                    )}
                    
                    {/* Date Input for Batch Mode (Shown separately because layout differs) */}
                    {isBatchMode && (
                        <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kuitansi/Nota (Satu untuk semua)</label>
                           <div className="relative">
                             <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
                             <input 
                                type="date" 
                                required
                                value={formDate}
                                onChange={(e) => setFormDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                             />
                           </div>
                        </div>
                    )}

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

                    <div className="pt-2 flex flex-col md:flex-row gap-3">
                      {/* Tombol Hapus SPJ (Hanya tampil di Single Mode jika sudah ada realisasi) */}
                      {showDeleteButton && (
                        <button 
                          type="button" 
                          onClick={handleDeleteSPJ}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition flex items-center justify-center gap-2"
                          title="Hapus realisasi bulan ini"
                        >
                           <Trash2 size={16} /> <span className="md:hidden">Hapus</span>
                        </button>
                      )}

                      <button 
                        type="button" 
                        onClick={() => { setIsModalOpen(false); setSelectedBatchIds([]); }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      >
                        Batal
                      </button>
                      
                      <button 
                        type="submit" 
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition flex items-center justify-center gap-2 ${isBatchMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        <Save size={18} />
                        Simpan {isBatchMode ? 'Kolektif' : 'Realisasi'}
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