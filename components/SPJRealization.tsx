import React, { useState } from 'react';
import { Budget, TransactionType, AccountCodes, RealizationDetail } from '../types';
import { FileText, Save, X, Calendar, Search, CheckCircle2, UploadCloud, FileCheck2, AlertCircle } from 'lucide-react';

interface SPJRealizationProps {
  data: Budget[];
  onUpdate: (id: string, updates: Partial<Budget>) => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to determine evidence needed
const getEvidenceSuggestion = (description: string, accountCode?: string): string => {
  const text = (description + ' ' + (accountCode || '')).toLowerCase();
  
  if (text.includes('honor') || text.includes('gaji') || text.includes('jasa')) {
    return "SK Tugas/SK Pembagian Tugas, Daftar Hadir, Tanda Terima/Kuitansi Honor, Bukti Transfer (Non-Tunai).";
  }
  if (text.includes('listrik') || text.includes('air') || text.includes('internet') || text.includes('langganan')) {
    return "Surat Tagihan/Invoice, Bukti Pembayaran/Struk Bank/Kuitansi.";
  }
  if (text.includes('makan') || text.includes('minum') || text.includes('konsumsi')) {
    return "Nota/Faktur Pembelian, Daftar Hadir Peserta Rapat/Kegiatan, Undangan, Notulen/Laporan Kegiatan, Foto Kegiatan.";
  }
  if (text.includes('perjalanan') || text.includes('dinas')) {
    return "Surat Tugas, SPPD, Tiket/Bukti Transportasi, Nota BBM (jika sewa), Laporan Perjalanan Dinas.";
  }
  if (text.includes('modal') || text.includes('buku') || text.includes('laptop') || text.includes('bangunan')) {
    return "Faktur/Nota, Berita Acara Serah Terima (BAST), Berita Acara Pemeriksaan Barang, Foto Barang, Catatan Aset.";
  }
  if (text.includes('atk') || text.includes('bahan')) {
    return "Nota/Faktur Pembelian, Struk Belanja.";
  }

  return "Kuitansi/Nota/Faktur Pembelian yang sah.";
};

const SPJRealization: React.FC<SPJRealizationProps> = ({ data, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  // State for the form
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0); // 1-12
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string>('');

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
    setIsModalOpen(true);
  };

  const selectMonthForEditing = (item: Budget, month: number) => {
    setActiveMonthIndex(month);
    const existingRealization = item.realizations?.find(r => r.month === month);
    
    if (existingRealization) {
      setFormAmount(existingRealization.amount.toString());
      setFormDate(existingRealization.date.split('T')[0]);
      setExistingFileName(existingRealization.evidence_file || '');
    } else {
      // Propose amount: Total / Number of months? Or just 0
      // For routine (e.g. 12 months), total amount usually represents the year total.
      // So expected per month = Total / months count.
      const monthsCount = item.realization_months?.length || 1;
      const suggestedAmount = Math.floor(item.amount / monthsCount);
      setFormAmount(suggestedAmount.toString());
      
      // Default date: end of that month in 2026
      // Handle leap year etc roughly
      const lastDay = new Date(2026, month, 0).getDate();
      setFormDate(`2026-${month.toString().padStart(2, '0')}-${lastDay}`);
      setExistingFileName('');
    }
    setFormFile(null);
  };

  const handleSaveSPJ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;

    // Create new realization item
    const newRealization: RealizationDetail = {
      month: activeMonthIndex,
      amount: Number(formAmount),
      date: new Date(formDate).toISOString(),
      evidence_file: formFile ? formFile.name : existingFileName
    };

    // Merge with existing realizations
    const currentRealizations = selectedBudget.realizations || [];
    const otherRealizations = currentRealizations.filter(r => r.month !== activeMonthIndex);
    const updatedRealizations = [...otherRealizations, newRealization];

    onUpdate(selectedBudget.id, {
      realizations: updatedRealizations
    });

    // Don't close modal immediately, allows editing other months if routine
    // Update local state to reflect change visually if needed (though onUpdate triggers re-render of props)
    // For UX, maybe close if it's single month, stay open if routine? 
    // Let's close for now to indicate success.
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
           <p className="text-sm text-gray-500">Input realisasi per bulan dan upload bukti fisik.</p>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
               <div className="flex items-center gap-2">
                 <FileCheck2 className="text-blue-600" size={20} />
                 <h3 className="font-bold text-gray-800">Input Realisasi (SPJ)</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
               {/* Sidebar Months for Routine Expenses */}
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
                 <form onSubmit={handleSaveSPJ} className="space-y-5">
                    
                    <div>
                      <h4 className="font-bold text-gray-800">{selectedBudget.description}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                         <span className="bg-gray-100 px-2 py-0.5 rounded">Bulan: {MONTHS[activeMonthIndex-1]}</span>
                         <span>•</span>
                         <span>Pagu Total: {formatRupiah(selectedBudget.amount)}</span>
                      </div>
                    </div>

                    {/* Evidence Recommendation Box */}
                    <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg flex gap-3">
                       <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                       <div>
                          <p className="text-xs font-bold text-yellow-800 mb-1">Rekomendasi Bukti Fisik:</p>
                          <p className="text-xs text-yellow-700 leading-relaxed">
                            {getEvidenceSuggestion(selectedBudget.description, selectedBudget.account_code)}
                          </p>
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
                         <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kuitansi</label>
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

                    {/* File Upload Simulation */}
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Upload Bukti Fisik (Scan PDF/Foto)</label>
                       <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer relative">
                          <input 
                            type="file" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => setFormFile(e.target.files ? e.target.files[0] : null)}
                            accept="image/*,.pdf"
                          />
                          {formFile || existingFileName ? (
                            <div className="flex flex-col items-center text-green-600">
                               <FileText size={32} className="mb-2" />
                               <span className="font-medium text-sm">{formFile ? formFile.name : existingFileName}</span>
                               <span className="text-xs text-gray-400 mt-1">{formFile ? '(Siap Upload)' : '(Sudah Tersimpan)'}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-gray-400">
                               <UploadCloud size={32} className="mb-2" />
                               <span className="text-sm font-medium text-gray-600">Klik untuk upload file</span>
                               <span className="text-xs">Mendukung JPG, PNG, PDF (Max 2MB)</span>
                            </div>
                          )}
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
