import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Budget, TransactionType, BOSPComponent, SNPStandard, AccountCodes } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save, Calculator, Sparkles, Loader2, AlertTriangle, CheckCircle, ChevronDown, Check, FileText } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getStoredAccounts } from '../lib/db';

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
     const load = async () => {
         const accs = await getStoredAccounts();
         setAllAccounts(accs);
     }
     if (isModalOpen) load();
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

  // Update Display Text when accountCode changes programmatically
  useEffect(() => {
      if (accountCode && allAccounts[accountCode]) {
          if (!accountSearchTerm.includes(accountCode)) {
              setAccountSearchTerm(`${accountCode} - ${allAccounts[accountCode]}`);
          }
      } else if (!accountCode) {
          setAccountSearchTerm('');
      }
  }, [accountCode, allAccounts]); 

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

    const result = await analyzeBudgetEntry(description, allAccounts);
    
    if (result) {
      setBospComponent(result.bosp_component);
      setSnpStandard(result.snp_standard);
      
      if (result.account_code) {
          setAccountCode(result.account_code);
          const name = allAccounts[result.account_code] || '';
          setAccountSearchTerm(`${result.account_code} - ${name}`);
      }

      setIsEligible(result.is_eligible);
      setAiWarning(result.warning);
      
      if (result.suggestion) setDescription(result.suggestion);

      if (result.quantity_estimate > 0) setQuantity(result.quantity_estimate);
      if (result.unit_estimate) setUnit(result.unit_estimate);
      if (result.price_estimate > 0) setUnitPrice(result.price_estimate);
      
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 rounded-full blur-[80px] -mr-20 -mt-20 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        
        <div className="relative z-10 w-full lg:w-auto">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-blue-100/80 rounded-xl text-blue-600 shadow-inner">
                <Calculator size={20} strokeWidth={2.5} />
             </div>
             <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100/50 shadow-sm">
                Perencanaan
             </span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Perencanaan RKAS</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Susunan rencana belanja sekolah tahun ini.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto relative z-10">
           {/* Filters */}
           <div className="grid grid-cols-2 sm:flex gap-3 w-full sm:w-auto">
              <div className="relative group">
                 <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-4 pr-10 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer tracking-tight shadow-sm transition-all focus:bg-white"
                 >
                    <option value="">Semua Bulan</option>
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                 </select>
                 <ChevronDown size={16} strokeWidth={2.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="relative group">
                 <select
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none cursor-pointer truncate tracking-tight sm:max-w-[200px] shadow-sm transition-all focus:bg-white"
                 >
                    <option value="">Semua Kode Rekening</option>
                    {Object.entries(allAccounts).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                    ))}
                 </select>
                 <ChevronDown size={16} strokeWidth={2.5} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
              </div>
           </div>

           <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={2.5} />
              <input 
                type="text" 
                placeholder="Cari kegiatan..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm transition-all focus:bg-white placeholder-slate-400"
              />
           </div>
           
           <motion.button 
             whileHover={{ scale: 1.02, y: -2 }}
             whileTap={{ scale: 0.98 }}
             onClick={handleOpenAdd}
             className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-500/30 w-full sm:w-auto"
           >
             <Plus size={20} strokeWidth={2.5} /> Tambah Kegiatan
           </motion.button>
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-500 via-blue-600 to-blue-700 p-8 rounded-[2rem] flex justify-between items-center relative overflow-hidden shadow-xl shadow-blue-900/10 border border-blue-400/30">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
         <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
         
         <div className="relative z-10">
            <p className="text-sm font-black text-blue-100 uppercase tracking-widest mb-1 opacity-90">Total Rencana Belanja (Filtered)</p>
            <p className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">{formatRupiah(totalBudget)}</p>
         </div>
         <div className="relative z-10 hidden md:block">
            <div className="p-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl">
               <Calculator className="text-white drop-shadow-md" size={48} strokeWidth={1.5} />
            </div>
         </div>
      </motion.div>

      {/* Table Section */}
      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden relative">
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap md:whitespace-normal">
               <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100/80">
                  <tr>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] w-24">Kode</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px]">Uraian Kegiatan</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Vol</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Harga</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Total</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-center w-32">Bulan</th>
                     <th className="px-5 py-5 font-bold text-slate-700 uppercase tracking-widest text-[10px] text-right">Aksi</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100/60 bg-white/40">
                  <AnimatePresence>
                     {expenses.length === 0 ? (
                        <motion.tr 
                          initial={{ opacity: 0 }} 
                          animate={{ opacity: 1 }} 
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                               <FileText size={48} strokeWidth={1} className="mb-4 opacity-30" />
                               <p className="text-sm font-semibold">Tidak ada kegiatan yang cocok dengan filter.</p>
                            </div>
                          </td>
                        </motion.tr>
                     ) : (
                        expenses.map((item, index) => (
                           <motion.tr 
                             key={item.id} 
                             custom={index}
                             initial={{ opacity: 0, y: 10 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, x: -20 }}
                             transition={{ duration: 0.2 }}
                             whileHover={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                             className="group transition-colors"
                           >
                              <td className="px-5 py-4">
                                 <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50/80 px-2 py-1 rounded border border-indigo-100/50">
                                    {item.account_code || '-'}
                                 </span>
                              </td>
                              <td className="px-5 py-4 max-w-[200px]">
                                 <div className="font-bold text-slate-800 tracking-tight leading-snug">{item.description}</div>
                                 <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest mt-1">
                                    <ChevronDown size={10} className="text-slate-300 -rotate-90" />
                                    {item.category}
                                 </div>
                                 {item.warning_message && (
                                   <div className="text-[10px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 bg-rose-50/50 px-2 py-1 rounded inline-flex border border-rose-100">
                                      <AlertTriangle size={10} strokeWidth={2.5} /> {item.warning_message}
                                   </div>
                                 )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                 <span className="font-bold text-slate-700">{item.quantity}</span>
                                 <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                              </td>
                              <td className="px-5 py-4 text-right font-mono font-medium text-slate-600">
                                 {formatRupiah(item.unit_price || 0)}
                              </td>
                              <td className="px-5 py-4 text-right font-mono font-black text-slate-800 text-base tracking-tight">
                                 {formatRupiah(item.amount)}
                              </td>
                              <td className="px-5 py-4 text-center">
                                 <div className="flex flex-wrap gap-1 justify-center max-w-[120px] mx-auto">
                                    {item.realization_months?.sort((a,b)=>a-b).map(m => (
                                       <span key={m} className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded shadow-sm">
                                          {MONTHS[m-1]}
                                       </span>
                                    ))}
                                 </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                 <div className="flex justify-end gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <motion.button 
                                       whileHover={{ scale: 1.15, rotate: 5 }}
                                       whileTap={{ scale: 0.9 }}
                                       onClick={() => handleOpenEdit(item)} 
                                       className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-colors"
                                    >
                                       <Edit2 size={18} strokeWidth={2.5} />
                                    </motion.button>
                                    <motion.button 
                                       whileHover={{ scale: 1.15, rotate: 10 }}
                                       whileTap={{ scale: 0.9 }}
                                       onClick={() => onDelete(item.id)} 
                                       className="text-slate-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-xl transition-colors"
                                    >
                                       <Trash2 size={18} strokeWidth={2.5} />
                                    </motion.button>
                                 </div>
                              </td>
                           </motion.tr>
                        ))
                     )}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
         {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                 onClick={() => setIsModalOpen(false)}
               />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 transition={{ type: "spring", damping: 25, stiffness: 300 }}
                 className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-10 custom-scrollbar"
               >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                  <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 sticky top-0 z-20 backdrop-blur-md">
                     <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit Kegiatan RKAS' : 'Tambah Kegiatan RKAS'}</h3>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Lengkapi form di bawah ini</p>
                     </div>
                     <button 
                       onClick={() => setIsModalOpen(false)}
                       className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors focus:outline-none"
                     >
                       <span className="text-xl font-bold leading-none">&times;</span>
                     </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10">
                     
                     {/* AI Assistant Section */}
                     <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-6 rounded-[1.5rem] border border-indigo-100 shadow-inner group">
                        <div className="flex items-start gap-4">
                           <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl text-indigo-500 shadow-sm border border-white group-hover:scale-110 transition-transform flex-shrink-0">
                              <Sparkles size={24} strokeWidth={2.5} />
                           </div>
                           <div className="w-full">
                              <div className="flex items-center gap-3 mb-1">
                                 <p className="text-sm font-black text-indigo-900 uppercase tracking-widest">Asisten Perencana AI</p>
                                 {isEligible !== null && (
                                   <motion.span 
                                     initial={{ opacity: 0, scale: 0.8 }}
                                     animate={{ opacity: 1, scale: 1 }}
                                     className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold tracking-widest uppercase shadow-sm ${isEligible ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                                   >
                                       {isEligible ? 'Sesuai Juknis' : 'Dilarang Juknis'}
                                   </motion.span>
                                 )}
                              </div>
                              <p className="text-xs font-semibold text-indigo-700/70 mb-4 leading-relaxed">
                                 Ketik rencana kegiatan, AI akan merekomendasikan Komponen, Kode Rekening, Harga Satuan, dan mengecek aturan Juknis BOSP.
                              </p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                 <textarea 
                                    required
                                    className="flex-1 bg-white/70 backdrop-blur-sm text-sm border border-indigo-200/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none resize-none shadow-sm transition-all focus:bg-white placeholder-slate-400 font-medium"
                                    rows={2}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Contoh: Pembelian laptop ASUS Core i5 untuk lab komputer sebanyak 2 unit"
                                 />
                                 <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button" 
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzing || !description}
                                    className="bg-indigo-600 text-white px-5 py-0 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-md shadow-indigo-600/20 sm:w-auto w-full sm:h-auto h-12"
                                 >
                                    {isAnalyzing ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Sparkles size={16} strokeWidth={3} />}
                                    <span className="sm:hidden md:block">Analisis AI</span>
                                 </motion.button>
                              </div>
                              
                              {/* Validation Result Box */}
                              <AnimatePresence>
                                 {isEligible === true && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                      className="text-[11px] bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-sm flex items-start gap-3"
                                    >
                                       <CheckCircle size={18} strokeWidth={2.5} className="text-emerald-600 mt-0.5" />
                                       <div>
                                          <p className="font-black text-emerald-800 uppercase tracking-widest mb-0.5">Sesuai Regulasi</p>
                                          <p className="text-emerald-700 font-medium">Sistem telah mengisi rekomendasi Harga, Volume, dan Akun.</p>
                                       </div>
                                    </motion.div>
                                 )}
                                 {isEligible === false && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                      animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                      className="text-[11px] bg-rose-50/80 p-4 rounded-xl border border-rose-200 shadow-sm flex items-start gap-3"
                                    >
                                       <AlertTriangle size={18} strokeWidth={2.5} className="text-rose-600 mt-0.5" />
                                       <div>
                                          <p className="font-black text-rose-800 uppercase tracking-widest mb-0.5">Dilarang / Berisiko</p>
                                          <p className="text-rose-700 font-medium">{aiWarning}</p>
                                       </div>
                                    </motion.div>
                                 )}
                              </AnimatePresence>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Komponen BOSP</label>
                           <div className="relative group">
                              <select 
                                 className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-semibold text-sm text-slate-700 appearance-none"
                                 value={bospComponent}
                                 onChange={e => setBospComponent(e.target.value)}
                              >
                                 {Object.values(BOSPComponent).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <ChevronDown size={16} strokeWidth={2.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Standar SNP</label>
                           <div className="relative group">
                              <select 
                                 className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-semibold text-sm text-slate-700 appearance-none"
                                 value={snpStandard}
                                 onChange={e => setSnpStandard(e.target.value)}
                              >
                                 {Object.values(SNPStandard).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <ChevronDown size={16} strokeWidth={2.5} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                           </div>
                        </div>
                     </div>

                     {/* SEARCHABLE ACCOUNT DROPDOWN */}
                     <div className="relative z-20" ref={dropdownRef}>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                            Kode Rekening (Cari Kode / Uraian)
                        </label>
                        <div className="relative">
                           <input
                              type="text"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none font-semibold text-slate-700 transition-all focus:bg-white placeholder-slate-400"
                              placeholder="Ketik Kode atau Nama Rekening..."
                              value={accountSearchTerm}
                              onChange={(e) => {
                                  setAccountSearchTerm(e.target.value);
                                  setIsAccountDropdownOpen(true);
                              }}
                              onFocus={() => setIsAccountDropdownOpen(true)}
                           />
                           <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer transition-transform ${isAccountDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} size={16} strokeWidth={2.5} onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)} />
                        </div>
                        
                        <AnimatePresence>
                           {isAccountDropdownOpen && (
                              <motion.div 
                                 initial={{ opacity: 0, y: -10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -10 }}
                                 className="absolute z-50 w-full bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-2xl mt-2 max-h-64 overflow-y-auto custom-scrollbar"
                              >
                                  {filteredAccounts.length === 0 ? (
                                      <div className="p-4 text-xs font-semibold text-slate-500 text-center uppercase tracking-widest">Rekening tidak ditemukan.</div>
                                  ) : (
                                      filteredAccounts.map(([code, name]) => (
                                          <div 
                                              key={code} 
                                              onClick={() => selectAccount(code, name)}
                                              className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 flex flex-col border-b border-slate-50 last:border-0 transition-colors ${accountCode === code ? 'bg-blue-50' : ''}`}
                                          >
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="font-bold font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{code}</span>
                                                  {accountCode === code && <Check size={16} strokeWidth={3} className="text-blue-600" />}
                                              </div>
                                              <span className="text-slate-700 font-medium leading-tight">{name}</span>
                                          </div>
                                      ))
                                  )}
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Volume</label>
                           <input 
                              type="number"
                              min="0"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white"
                              value={quantity}
                              onChange={e => setQuantity(Number(e.target.value))}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Satuan</label>
                           <input 
                              type="text"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white placeholder-slate-400"
                              value={unit}
                              onChange={e => setUnit(e.target.value)}
                              placeholder="Paket/Rim/Unit"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Harga Satuan (Rp)</label>
                           <input 
                              type="number"
                              min="0"
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 font-bold font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white"
                              value={unitPrice}
                              onChange={e => setUnitPrice(Number(e.target.value))}
                           />
                        </div>
                     </div>

                     <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-2xl text-right border border-blue-100 shadow-sm relative overflow-hidden"
                     >
                        <div className="absolute inset-y-0 left-0 w-2 bg-blue-500"></div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Total Anggaran (1 Tahun)</span>
                        <p className="text-3xl font-black font-mono text-slate-800 tracking-tight">{formatRupiah(quantity * unitPrice)}</p>
                     </motion.div>

                     <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-3">Pilih Rencana Realisasi (Bulan)</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
                           {MONTHS.map((m, idx) => {
                              const monthNum = idx + 1;
                              const isSelected = selectedMonths.includes(monthNum);
                              return (
                                 <motion.button
                                    key={monthNum}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => toggleMonth(monthNum)}
                                    className={`py-3 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all shadow-sm ${
                                       isSelected 
                                       ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' 
                                       : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                 >
                                    {m}
                                 </motion.button>
                              )
                           })}
                        </div>
                     </div>

                     <div className="pt-6 flex gap-3 border-t border-slate-100/80 mt-8">
                        <button 
                           type="button" 
                           onClick={() => setIsModalOpen(false)} 
                           className="flex-1 py-3 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold transition-colors"
                        >
                           Batal
                        </button>
                        <motion.button 
                           whileHover={{ scale: isEligible === false ? 1 : 1.02 }}
                           whileTap={{ scale: isEligible === false ? 1 : 0.98 }}
                           type="submit" 
                           disabled={isEligible === false}
                           className={`flex-1 py-3 text-sm text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                              isEligible === false 
                              ? 'bg-slate-300 shadow-none cursor-not-allowed' 
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30'
                           }`}
                        >
                           <Save size={18} strokeWidth={2.5} /> Simpan Data
                        </motion.button>
                     </div>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BudgetPlanning;