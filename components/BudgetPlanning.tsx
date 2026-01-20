import React, { useState, useEffect } from 'react';
import { Budget, SNPStandard, BOSPComponent, TransactionType, AccountCodes } from '../types';
import { Plus, Trash2, Edit2, Sparkles, Search, Loader2, AlertTriangle, CheckCircle, Save, X, Calculator, Calendar } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';

interface BudgetPlanningProps {
  data: Budget[];
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, item: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const BudgetPlanning: React.FC<BudgetPlanningProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [description, setDescription] = useState('');
  
  // Rincian Anggaran
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unit, setUnit] = useState('Paket');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [totalAmount, setTotalAmount] = useState<number>(0);

  const [category, setCategory] = useState(SNPStandard.SARPRAS);
  const [bospComponent, setBospComponent] = useState(BOSPComponent.SARPRAS);
  const [accountCode, setAccountCode] = useState('');
  const [realizationMonths, setRealizationMonths] = useState<number[]>([1]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Filter only expenses for planning
  const expenseData = data.filter(d => d.type === TransactionType.EXPENSE);

  // Auto calculate total
  useEffect(() => {
    const qty = quantity === '' ? 0 : quantity;
    const price = unitPrice === '' ? 0 : unitPrice;
    setTotalAmount(qty * price);
  }, [quantity, unitPrice]);

  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setQuantity(1);
    setUnit('Paket');
    setUnitPrice('');
    setTotalAmount(0);
    setCategory(SNPStandard.SARPRAS);
    setBospComponent(BOSPComponent.SARPRAS);
    setAccountCode('');
    setRealizationMonths([1]);
    setIsEligible(null);
    setWarningMessage('');
  };

  const handleEditClick = (item: Budget) => {
    setEditingId(item.id);
    setDescription(item.description);
    setQuantity(item.quantity || 1);
    setUnit(item.unit || 'Paket');
    setUnitPrice(item.unit_price || item.amount);
    setTotalAmount(item.amount);
    setCategory(item.category as SNPStandard);
    setBospComponent(item.bosp_component as BOSPComponent);
    setAccountCode(item.account_code || '');
    setRealizationMonths(item.realization_months || [1]);
    setIsEligible(item.is_bosp_eligible !== undefined ? item.is_bosp_eligible : true);
    setWarningMessage(item.warning_message || '');
    setIsModalOpen(true);
  };

  const toggleMonth = (monthIndex: number) => {
    setRealizationMonths(prev => {
      if (prev.includes(monthIndex)) {
        return prev.filter(m => m !== monthIndex);
      } else {
        return [...prev, monthIndex].sort((a, b) => a - b);
      }
    });
  };

  const toggleAllMonths = () => {
    if (realizationMonths.length === 12) {
      setRealizationMonths([]);
    } else {
      setRealizationMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  };

  const handleAIAnalysis = async () => {
    if (!description || description.length < 3) return;
    setIsAnalyzing(true);
    setWarningMessage('');
    setIsEligible(null);

    const result = await analyzeBudgetEntry(description);
    
    if (result) {
      setCategory(result.snp_standard as SNPStandard);
      setBospComponent(result.bosp_component as BOSPComponent);
      setAccountCode(result.account_code);
      setIsEligible(result.is_eligible);
      setWarningMessage(result.warning);

      // Set Details
      if (result.quantity_estimate) setQuantity(result.quantity_estimate);
      if (result.unit_estimate) setUnit(result.unit_estimate);
      if (result.price_estimate) setUnitPrice(result.price_estimate);
      if (result.realization_months_estimate && result.realization_months_estimate.length > 0) {
        setRealizationMonths(result.realization_months_estimate);
      }

      if (result.suggestion) {
        setDescription(result.suggestion);
      }
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (realizationMonths.length === 0) {
      alert("Pilih setidaknya satu bulan realisasi.");
      return;
    }

    const budgetData = {
      type: TransactionType.EXPENSE,
      description,
      amount: totalAmount,
      quantity: Number(quantity),
      unit: unit,
      unit_price: Number(unitPrice),
      date: editingId ? (data.find(d => d.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
      category,
      bosp_component: bospComponent,
      account_code: accountCode,
      realization_months: realizationMonths,
      status: 'draft' as const,
      is_bosp_eligible: isEligible === null ? true : isEligible,
      warning_message: warningMessage,
    };

    if (editingId) {
      onUpdate(editingId, budgetData);
    } else {
      onAdd(budgetData);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const formatMonthsDisplay = (months?: number[]) => {
    if (!months || months.length === 0) return '-';
    if (months.length === 12) return 'Jan - Des (Rutin)';
    if (months.length > 4) return `${months.length} Bulan`;
    return months.map(m => MONTHS[m-1]).join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Penganggaran (RKAS)</h2>
          <p className="text-sm text-gray-500">Perencanaan belanja dengan detail harga satuan.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Tambah Kegiatan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 font-semibold w-28">Kode Rekening</th>
                <th className="px-4 py-4 font-semibold">Uraian & Rincian</th>
                <th className="px-4 py-4 font-semibold text-center w-32">Bulan</th>
                <th className="px-4 py-4 font-semibold text-right">Total Anggaran</th>
                <th className="px-4 py-4 font-semibold text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenseData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada rencana kegiatan.</td>
                </tr>
              ) : (
                expenseData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs font-semibold text-gray-700 align-top">
                      {item.account_code || '-'}
                      {item.account_code && AccountCodes[item.account_code as keyof typeof AccountCodes] && (
                         <div className="text-[10px] font-normal text-gray-400 truncate max-w-[120px]">
                           {AccountCodes[item.account_code as keyof typeof AccountCodes]}
                         </div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-gray-800">{item.description}</div>
                      
                      {/* Rincian Display */}
                      <div className="mt-1 text-xs text-gray-500 font-mono bg-gray-50 inline-block px-2 py-1 rounded border border-gray-100">
                         {item.quantity || 0} {item.unit} x {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.unit_price || 0)}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                          {item.bosp_component.split('.')[1] || item.bosp_component}
                        </span>
                        {item.warning_message && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1">
                            <AlertTriangle size={10} /> Prohibited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center align-top">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-center block">
                        {formatMonthsDisplay(item.realization_months)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-medium text-gray-900 align-top">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(item)}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(item.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {editingId ? 'Edit Rencana Kegiatan' : 'Tambah Rencana Kegiatan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* AI Helper */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                    <div className="w-full">
                      <p className="text-sm text-blue-900 mb-1 font-bold">Asisten Cerdas RKAS</p>
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           className="flex-1 text-sm border-blue-200 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-400 outline-none"
                           placeholder="Contoh: Tagihan Listrik 1 Tahun"
                         />
                        <button 
                          type="button" 
                          onClick={handleAIAnalysis}
                          disabled={isAnalyzing || !description}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          Analisa
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">AI akan mengisi otomatis volume, harga, kode rekening, dan bulan rutin.</p>
                      {isEligible === false && (
                         <div className="mt-2 text-xs text-red-700 flex items-start gap-1 bg-white/50 p-2 rounded">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> 
                            <span>{warningMessage}</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  {/* Uraian */}
                  <div className="md:col-span-12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uraian Kegiatan</label>
                    <input 
                      required
                      type="text" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Calculator Section */}
                  <div className="md:col-span-12 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                       <Calculator size={12} /> Rincian Biaya
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Volume</label>
                        <div className="flex">
                           <input 
                              required
                              type="number" 
                              min="0"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0"
                            />
                        </div>
                       </div>
                       <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Satuan</label>
                        <input 
                            required
                            type="text" 
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            list="unit-suggestions"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Box/Rim/Orang"
                          />
                          <datalist id="unit-suggestions">
                            <option value="Bulan" />
                            <option value="Orang" />
                            <option value="Orang/Bulan" />
                            <option value="Paket" />
                            <option value="Unit" />
                            <option value="Rim" />
                            <option value="Box" />
                            <option value="Eksemplar" />
                            <option value="Kegiatan" />
                          </datalist>
                       </div>
                       <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Harga Satuan (Rp)</label>
                        <input 
                            required
                            type="number" 
                            min="0"
                            value={unitPrice}
                            onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0"
                          />
                       </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                       <span className="text-sm text-gray-600">Total Anggaran:</span>
                       <span className="text-lg font-bold text-blue-700 font-mono">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount)}
                       </span>
                    </div>
                  </div>

                  {/* Kode Rekening */}
                  <div className="md:col-span-12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode Rekening Belanja</label>
                    <select 
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    >
                      <option value="">-- Pilih Kode Rekening --</option>
                      {Object.entries(AccountCodes).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Komponen BOSP */}
                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Komponen BOSP</label>
                    <select 
                      value={bospComponent} 
                      onChange={(e) => setBospComponent(e.target.value as BOSPComponent)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                       {Object.values(BOSPComponent).map((comp) => (
                         <option key={comp} value={comp}>{comp}</option>
                       ))}
                    </select>
                  </div>

                  {/* SNP */}
                  <div className="md:col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Standar Nasional (SNP)</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value as SNPStandard)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                       {Object.values(SNPStandard).map((std) => (
                         <option key={std} value={std}>{std}</option>
                       ))}
                    </select>
                  </div>

                  {/* Bulan Realisasi Multi Select */}
                  <div className="md:col-span-12">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Bulan Realisasi</label>
                      <button 
                        type="button" 
                        onClick={toggleAllMonths}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {realizationMonths.length === 12 ? 'Hapus Semua' : 'Pilih Rutin (Jan-Des)'}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {MONTHS.map((m, idx) => {
                        const monthNum = idx + 1;
                        const isSelected = realizationMonths.includes(monthNum);
                        return (
                          <button
                            key={monthNum}
                            type="button"
                            onClick={() => toggleMonth(monthNum)}
                            className={`py-2 px-1 text-xs rounded border transition ${
                              isSelected 
                                ? 'bg-blue-600 text-white border-blue-600' 
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm flex items-center gap-2"
                  >
                    <Save size={16} />
                    {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanning;
