import React, { useState, useEffect } from 'react';
import { Budget, TransactionType, AccountCodes, RealizationDetail } from '../types';
import { FileText, Save, X, Calendar, Search, CheckCircle2, FileCheck2, AlertCircle, CheckSquare, Square, Sparkles, Loader2, ShoppingCart } from 'lucide-react';
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
  // Honorarium tidak lewat SIPLah, tapi Non-Tunai Transfer Bank.
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

  // 2. BELANJA BARANG / ATK / BAHAN / ALAT KEBERSIHAN
  // Prioritas SIPLah untuk pengadaan barang.
  if (text.includes('atk') || text.includes('bahan') || text.includes('alat tulis') || text.includes('kertas') || text.includes('kebersihan') || text.includes('spanduk') || text.includes('cetak') || text.includes('penggandaan')) {
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
  // Biasanya Offline/Non-SIPLah kecuali ada penyedia katering di SIPLah.
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
  // Wajib SIPLah dan Masuk KIB.
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
  if (text.includes('listrik') || text.includes('air') || text.includes('internet') || text.includes('langganan') || text.includes('telepon') || text.includes('wifi')) {
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
  
  // State for the form
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0); // 1-12
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  
  // Checklist State
  const [evidenceItems, setEvidenceItems] = useState<string[]>([]);
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  // Only show Expenses that are not 'rejected'
  const expenses = data.filter(d => 
    d.type === TransactionType.EXPENSE && 
    d.status !== 'rejected' &&
    d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenSPJ = (item: Budget) => {
    setSelectedBudget(item);
    
    // Default to first month in plan or current month
    const initialMonth = (item.realization_months && item.realization_months.length > 0) 
      ? item.realization_months[0] 
      : new Date().getMonth() + 1;
    
    selectMonthForEditing(item, initialMonth);
    
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
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Peng-SPJ-an & Realisasi</h2>
           <p className="text-sm text-gray-500">Input realisasi per bulan dan ceklist kelengkapan bukti (Standar SIPLah & Juknis 2026).</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Cari kegiatan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-4 font-semibold w-1/3">Uraian Kegiatan</th>
                <th className="px-4 py-4 font-semibold text-right">Pagu Anggaran</th>
                <th className="px-4 py-4 font-semibold text-right">Total Realisasi</th>
                <th className="px-4 py-4 font-semibold text-center">Progres Bulan</th>
                <th className="px-4 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                       <FileText size={32} className="opacity-20" />
                       <p>Belum ada data belanja untuk di-SPJ-kan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((item) => {
                  const totalRealized = item.realizations?.reduce((acc, r) => acc + r.amount, 0) || 0;
                  const plannedMonths = item.realization_months || [1];
                  const realizedMonthsCount = item.realizations?.length || 0;
                  const isFullyRealized = realizedMonthsCount >= plannedMonths.length && totalRealized > 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-800">{item.description}</div>
                         <div className="text-[10px] text-gray-400 font-mono mt-1">
                           {item.account_code || 'Kode Rekening -'}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-gray-900">
                         {formatRupiah(item.amount)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-blue-700">
                         {formatRupiah(totalRealized)}
                         <div className="text-[10px] text-gray-400">
                           Sisa: {formatRupiah(item.amount - totalRealized)}
                         </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-xs font-bold ${isFullyRealized ? 'text-green-600' : 'text-orange-500'}`}>
                            {realizedMonthsCount} / {plannedMonths.length}
                          </span>
                          <span className="text-[10px] text-gray-400">Bln</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mt-1">
                          <div 
                            className={`h-1.5 rounded-full ${isFullyRealized ? 'bg-green-500' : 'bg-orange-400'}`} 
                            style={{ width: `${(realizedMonthsCount / plannedMonths.length) * 100}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => handleOpenSPJ(item)}
                          className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-medium transition shadow-sm"
                        >
                          Kelola SPJ
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