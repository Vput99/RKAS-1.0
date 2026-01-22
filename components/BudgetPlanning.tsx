import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Budget, TransactionType, BOSPComponent, SNPStandard, AccountCodes } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save, Calculator, Calendar, Sparkles, Loader2, AlertTriangle, CheckCircle, Filter, Info, ChevronDown, Check } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getCustomAccounts } from '../lib/db';

interface BudgetPlanningProps {
  data: Budget[];
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const BudgetPlanning: React.FC<BudgetPlanningProps> = ({ data, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | ''>('');
  const [filterAccount, setFilterAccount] = useState<string>('');

  // Form State
  const [description, setDescription] = useState('');
  const [bospComponent, setBospComponent] = useState<string>(Object.values(BOSPComponent)[0]);
  const [snpStandard, setSnpStandard] = useState<string>(Object.values(SNPStandard)[0]);
  
  // Account Selection State (Searchable)
  const [accountCode, setAccountCode] = useState<string>('');
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiWarning, setAiWarning] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  
  // Custom Accounts State
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     const custom = getCustomAccounts();
     setAllAccounts({ ...AccountCodes, ...custom });
  }, [isModalOpen]); 

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update Display Text when accountCode changes programmatically (e.g. Edit or AI)
  useEffect(() => {
      if (accountCode && allAccounts[accountCode]) {
          // Only update text if it doesn't match current code (prevents typing overwrite issues)
          // But for "Edit" or "AI", we want to force update.
          // Simple check: if search term is empty or doesn't contain the code, update it.
          if (!accountSearchTerm.includes(accountCode)) {
              setAccountSearchTerm(`${accountCode} - ${allAccounts[accountCode]}`);
          }
      } else if (!accountCode) {
          setAccountSearchTerm('');
      }
  }, [accountCode, allAccounts]); // Depend on accountCode

  // Filtered Accounts List
  const filteredAccounts = useMemo(() => {
      const term = accountSearchTerm.toLowerCase();
      return Object.entries(allAccounts).filter(([code, name]) => 
          code.toLowerCase().includes(term) || 
          (name as string).toLowerCase().includes(term)
      );
  }, [allAccounts, accountSearchTerm]);

  // Derived State (Table Filtering Logic)
  const expenses = useMemo(() => {
    return data
      .filter(d => d.type === TransactionType.EXPENSE)
      .filter(d => {
         const matchSearch = d.description.toLowerCase().includes(searchTerm.toLowerCase());
         const matchMonth = filterMonth !== '' ? d.realization_months?.includes(Number(filterMonth)) : true;
         const matchAccount = filterAccount !== '' ? d.account_code === filterAccount : true;
         
         return matchSearch && matchMonth && matchAccount;
      });
  }, [data, searchTerm, filterMonth, filterAccount]);

  const totalBudget = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setBospComponent(Object.values(BOSPComponent)[0]);
    setSnpStandard(Object.values(SNPStandard)[0]);
    setAccountCode('');
    setAccountSearchTerm('');
    setQuantity(0);
    setUnit('');
    setUnitPrice(0);
    setSelectedMonths([]);
    setAiWarning('');
    setIsEligible(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Budget) => {
    setEditingId(item.id);
    setDescription(item.description);
    setBospComponent(item.bosp_component);
    setSnpStandard(item.category);
    
    // Set account code & display text
    const code = item.account_code || '';
    setAccountCode(code);
    setAccountSearchTerm(code && allAccounts[code] ? `${code} - ${allAccounts[code]}` : code);

    setQuantity(item.quantity || 1);
    setUnit(item.unit || 'Paket');
    setUnitPrice(item.unit_price || item.amount);
    setSelectedMonths(item.realization_months || []);
    setAiWarning(item.warning_message || '');
    setIsEligible(item.is_bosp_eligible !== undefined ? item.is_bosp_eligible : null);
    setIsModalOpen(true);
  };

  // AI Helper Function
  const handleAIAnalysis = async () => {
    if (!description || description.length < 3) return;
    setIsAnalyzing(true);
    setAiWarning('');
    setIsEligible(null);

    // Pass all accounts (default + custom) to AI for context
    const result = await analyzeBudgetEntry(description, allAccounts);
    
    if (result) {
      setBospComponent(result.bosp_component);
      setSnpStandard(result.snp_standard);
      
      // Update Account & Search Term for Display
      if (result.account_code) {
          setAccountCode(result.account_code);
          const name = allAccounts[result.account_code] || '';
          setAccountSearchTerm(`${result.account_code} - ${name}`);
      }

      setIsEligible(result.is_eligible);
      setAiWarning(result.warning);
      
      if (result.suggestion) setDescription(result.suggestion);

      // Auto-fill estimates
      if (result.quantity_estimate > 0) setQuantity(result.quantity_estimate);
      if (result.unit_estimate) setUnit(result.unit_estimate);
      if (result.price_estimate > 0) setUnitPrice(result.price_estimate);
      
      // Suggest months if not selected
      if (selectedMonths.length === 0 && result.realization_months_estimate) {
         setSelectedMonths(result.realization_months_estimate);
      }
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = quantity * unitPrice;

    const payload = {
      type: TransactionType.EXPENSE,
      description,
      bosp_component: bospComponent,
      category: snpStandard,
      account_code: accountCode,
      quantity,
      unit,
      unit_price: unitPrice,
      amount: totalAmount,
      realization_months: selectedMonths,
      status: 'draft' as const,
      is_bosp_eligible: isEligible === null ? true : isEligible,
      warning_message: aiWarning,
      date: new Date().toISOString() 
    };

    if (editingId) {
       onUpdate(editingId, payload);
    } else {
       onAdd(payload);
    }
    setIsModalOpen(false);
  };

  const toggleMonth = (idx: number) => {
    setSelectedMonths(prev => 
       prev.includes(idx) ? prev.filter(m => m !== idx) : [...prev, idx].sort((a,b)=>a-b)
    );
  };

  const selectAccount = (code: string, name: string) => {
      setAccountCode(code);
      setAccountSearchTerm(`${code} - ${name}`);
      setIsAccountDropdownOpen(false);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Perencanaan Anggaran (RKAS)</h2>
          <p className="text-sm text-gray-500">Susun rencana belanja sekolah selama satu tahun anggaran.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
           {/* Filters */}
           <div className="flex gap-2">
              <div className="relative">
                 <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : '')}
                    className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
                 >
                    <option value="">Semua Bulan</option>
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                 </select>
                 <Filter size={14} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative max-w-[150px] sm:max-w-[200px]">
                 <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer truncate"
                 >
                    <option value="">Semua Rekening</option>
                    {Object.entries(allAccounts).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                    ))}
                 </select>
                 <Filter size={14} className="absolute right-2 top-3 text-gray-400 pointer-events-none" />
              </div>
           </div>

           <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari kegiatan..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
           </div>
           
           <button 
             onClick={handleOpenAdd}
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition shadow-sm whitespace-nowrap"
           >
             <Plus size={18} /> Tambah
           </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
         <div>
            <p className="text-xs text-blue-600 font-bold uppercase">Total Rencana Belanja (Filtered)</p>
            <p className="text-2xl font-bold text-blue-900">{formatRupiah(totalBudget)}</p>
         </div>
         <Calculator className="text-blue-300" size={40} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
               <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                  <tr>
                     <th className="px-4 py-3 font-bold">Kode Rekening</th>
                     <th className="px-4 py-3 font-bold">Uraian Kegiatan</th>
                     <th className="px-4 py-3 font-bold text-right">Vol</th>
                     <th className="px-4 py-3 font-bold text-right">Harga</th>
                     <th className="px-4 py-3 font-bold text-right">Total</th>
                     <th className="px-4 py-3 font-bold text-center">Bulan</th>
                     <th className="px-4 py-3 font-bold text-right">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {expenses.length === 0 ? (
                     <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada data perencanaan yang cocok dengan filter.</td></tr>
                  ) : (
                     expenses.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                           <td className="px-4 py-3 text-xs font-mono">{item.account_code || '-'}</td>
                           <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">{item.description}</div>
                              <div className="text-xs text-gray-400">{item.category}</div>
                              {item.warning_message && (
                                <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                                   <AlertTriangle size={10} /> {item.warning_message}
                                </div>
                              )}
                           </td>
                           <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                           <td className="px-4 py-3 text-right">{formatRupiah(item.unit_price || 0)}</td>
                           <td className="px-4 py-3 text-right font-bold text-gray-800">{formatRupiah(item.amount)}</td>
                           <td className="px-4 py-3 text-center">
                              <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                                 {item.realization_months?.sort((a,b)=>a-b).map(m => (
                                    <span key={m} className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                                       {MONTHS[m-1]}
                                    </span>
                                 ))}
                              </div>
                           </td>
                           <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => handleOpenEdit(item)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                 <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                              </div>
                           </td>
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                  <h3 className="font-bold text-gray-800">{editingId ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
                  <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
               </div>
               
               <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  
                  {/* AI Assistant Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100 shadow-inner">
                     <div className="flex items-start gap-3">
                        <Sparkles className="text-blue-600 mt-1 flex-shrink-0" size={24} />
                        <div className="w-full">
                           <p className="text-sm text-blue-900 mb-1 font-bold flex items-center gap-2">
                              Asisten AI & Auditor Juknis
                              {isEligible !== null && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isEligible ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                    {isEligible ? 'Sesuai Juknis' : 'Dilarang Juknis'}
                                </span>
                              )}
                           </p>
                           <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                              Ketik rencana kegiatan, AI akan mengisi otomatis (Volume, Harga, Akun) dan mengecek aturan Juknis BOSP 2026.
                           </p>
                           <div className="flex gap-2">
                              <textarea 
                                 required
                                 className="flex-1 text-sm border border-blue-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 outline-none resize-none shadow-sm"
                                 rows={2}
                                 value={description}
                                 onChange={e => setDescription(e.target.value)}
                                 placeholder="Contoh: Beli 2 unit Laptop untuk ANBK"
                              />
                           </div>
                           <div className="flex justify-end mt-2">
                              <button 
                                 type="button" 
                                 onClick={handleAIAnalysis}
                                 disabled={isAnalyzing || !description}
                                 className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 font-bold shadow-md"
                              >
                                 {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                 {isAnalyzing ? 'Menganalisis...' : 'Isi Otomatis & Cek Juknis'}
                              </button>
                           </div>
                           
                           {/* Validation Result Box */}
                           {isEligible === true && (
                              <div className="mt-3 text-xs bg-green-50 p-3 rounded-lg border border-green-200 flex items-start gap-2">
                                 <CheckCircle size={16} className="text-green-600 mt-0.5" />
                                 <div>
                                    <p className="font-bold text-green-800">Kegiatan Diperbolehkan</p>
                                    <p className="text-green-700">Data anggaran telah diisi otomatis. Silakan cek kembali harga dan volume.</p>
                                 </div>
                              </div>
                           )}
                           {isEligible === false && (
                              <div className="mt-3 text-xs bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                                 <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                                 <div>
                                    <p className="font-bold text-red-800">Kegiatan Berisiko / Dilarang</p>
                                    <p className="text-red-700 mt-1">{aiWarning}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Komponen BOSP</label>
                        <select 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={bospComponent}
                           onChange={e => setBospComponent(e.target.value)}
                        >
                           {Object.values(BOSPComponent).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Standar SNP</label>
                        <select 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={snpStandard}
                           onChange={e => setSnpStandard(e.target.value)}
                        >
                           {Object.values(SNPStandard).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* SEARCHABLE ACCOUNT DROPDOWN */}
                  <div className="relative" ref={dropdownRef}>
                     <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                         Kode Rekening (Cari Kode / Uraian)
                     </label>
                     <div className="relative">
                        <input
                           type="text"
                           className="w-full border border-gray-300 rounded-lg p-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                           placeholder="Ketik Kode atau Nama Rekening..."
                           value={accountSearchTerm}
                           onChange={(e) => {
                               setAccountSearchTerm(e.target.value);
                               setIsAccountDropdownOpen(true);
                           }}
                           onFocus={() => setIsAccountDropdownOpen(true)}
                        />
                        <ChevronDown className="absolute right-2 top-2.5 text-gray-400 cursor-pointer" size={16} onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)} />
                     </div>
                     
                     {isAccountDropdownOpen && (
                        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                            {filteredAccounts.length === 0 ? (
                                <div className="p-3 text-xs text-gray-500 text-center">Rekening tidak ditemukan.</div>
                            ) : (
                                filteredAccounts.map(([code, name]) => (
                                    <div 
                                        key={code} 
                                        onClick={() => selectAccount(code, name)}
                                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex flex-col border-b border-gray-50 last:border-0 ${accountCode === code ? 'bg-blue-50' : ''}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-blue-800 font-mono text-xs">{code}</span>
                                            {accountCode === code && <Check size={14} className="text-blue-600" />}
                                        </div>
                                        <span className="text-gray-700 text-xs">{name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Volume</label>
                        <input 
                           type="number"
                           min="0"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={quantity}
                           onChange={e => setQuantity(Number(e.target.value))}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Satuan</label>
                        <input 
                           type="text"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={unit}
                           onChange={e => setUnit(e.target.value)}
                           placeholder="Paket/Rim"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Harga Satuan (Rp)</label>
                        <input 
                           type="number"
                           min="0"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={unitPrice}
                           onChange={e => setUnitPrice(Number(e.target.value))}
                        />
                     </div>
                  </div>

                  <div className="bg-gray-100 p-3 rounded-lg text-right border border-gray-200">
                     <span className="text-xs text-gray-500 font-bold uppercase">Total Anggaran (1 Tahun):</span>
                     <p className="text-2xl font-bold text-gray-800">{formatRupiah(quantity * unitPrice)}</p>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Rencana Realisasi (Bulan)</label>
                     <div className="grid grid-cols-6 gap-2">
                        {MONTHS.map((m, idx) => {
                           const monthNum = idx + 1;
                           const isSelected = selectedMonths.includes(monthNum);
                           return (
                              <button
                                 key={monthNum}
                                 type="button"
                                 onClick={() => toggleMonth(monthNum)}
                                 className={`py-2 text-xs font-bold rounded border transition ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}
                              >
                                 {m}
                              </button>
                           )
                        })}
                     </div>
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-gray-100">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Batal</button>
                     <button 
                        type="submit" 
                        disabled={isEligible === false}
                        className={`flex-1 py-2.5 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isEligible === false ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'}`}
                     >
                        <Save size={18} /> Simpan
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default BudgetPlanning;