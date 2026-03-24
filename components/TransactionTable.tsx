import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Budget, SNPStandard, BOSPComponent, TransactionType, AccountCodes } from '../types';
import { Plus, Trash2, Sparkles, Search, Loader2, AlertTriangle, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getStoredAccounts } from '../lib/db';

interface TransactionTableProps {
  type: TransactionType;
  data: Budget[];
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
  onDelete: (id: string) => void;
}

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

const TransactionTable: React.FC<TransactionTableProps> = ({ type, data, onAdd, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(type === TransactionType.INCOME ? 'Dana Transfer' : SNPStandard.SARPRAS);
  const [bospComponent, setBospComponent] = useState(type === TransactionType.INCOME ? 'Penerimaan' : BOSPComponent.SARPRAS);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Validation states
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Store Accounts
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);

  useEffect(() => {
      getStoredAccounts().then(setAllAccounts);
  }, []);

  const filteredData = data.filter(d => d.type === type);

  const handleAIAnalysis = async () => {
    if (!description || description.length < 3) return;
    setIsAnalyzing(true);
    setWarningMessage('');
    setIsEligible(null);

    const result = await analyzeBudgetEntry(description, allAccounts);
    
    if (result) {
      setCategory(result.snp_standard);
      setBospComponent(result.bosp_component);
      setIsEligible(result.is_eligible);
      setWarningMessage(result.warning);

      const estimatedAmount = result.quantity_estimate * result.price_estimate;
      if (estimatedAmount > 0 && !amount) {
        setAmount(estimatedAmount.toString());
      }
      if (result.suggestion) {
        setDescription(result.suggestion);
      }
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      type,
      description,
      amount: Number(amount),
      date: new Date(date).toISOString(),
      category,
      bosp_component: bospComponent,
      status: 'draft',
      is_bosp_eligible: isEligible === null ? true : isEligible,
      warning_message: warningMessage,
      notes: ''
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory(type === TransactionType.INCOME ? 'Dana Transfer' : SNPStandard.SARPRAS);
    setBospComponent(type === TransactionType.INCOME ? 'Penerimaan' : BOSPComponent.SARPRAS);
    setDate(new Date().toISOString().split('T')[0]);
    setIsEligible(null);
    setWarningMessage('');
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 rounded-full blur-[80px] -mr-20 -mt-20 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
        
        <div className="relative z-10 mb-4 md:mb-0">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-blue-100/80 rounded-xl text-blue-600 shadow-inner">
                <FileText size={20} strokeWidth={2.5} />
             </div>
             <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100/50 shadow-sm">
                Manajemen
             </span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight capitalize">Data {type}</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Kelola pencatatan aliran dana {type} secara efisien.</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30 overflow-hidden font-bold"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 blur-md opacity-0 hover:opacity-100 transition-opacity"></div>
          <Plus size={20} className="relative z-10" />
          <span className="relative z-10 drop-shadow-sm tracking-wide">Tambah {type === TransactionType.INCOME ? 'Pendapatan' : 'Kegiatan'}</span>
        </motion.button>
      </motion.div>

      {/* Table Section */}
      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white/60 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap md:whitespace-normal">
            <thead className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100/80">
              <tr>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px]">Tanggal</th>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px]">Uraian Kegiatan</th>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px]">Komponen BOSP</th>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px] text-right">Jumlah</th>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px] text-center">Status</th>
                <th className="px-6 py-5 font-bold text-slate-700 uppercase tracking-widest text-[11px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 bg-white/40">
              <AnimatePresence>
                {filteredData.length === 0 ? (
                  <motion.tr 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                         <FileText size={48} strokeWidth={1} className="mb-4 opacity-30" />
                         <p className="text-sm font-semibold">Belum ada data transaksi.</p>
                         <p className="text-xs mt-1">Klik tombol tambah untuk memulai pencatatan.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  filteredData.map((item) => (
                    <motion.tr 
                      key={item.id} 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.8)' }}
                      className="transition-colors group"
                    >
                      <td className="px-6 py-5 whitespace-nowrap text-slate-500 font-medium">
                        {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 max-w-[250px] md:max-w-md">
                        <div className="font-bold text-slate-800 tracking-tight leading-relaxed">{item.description}</div>
                        {item.warning_message && (
                          <div className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 mt-1.5 bg-rose-50/50 px-2 py-1 rounded inline-flex border border-rose-100">
                            <AlertTriangle size={12} strokeWidth={2.5} /> {item.warning_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                         <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100 px-2.5 py-1 rounded-lg inline-block mb-1.5 shadow-sm uppercase tracking-wider">
                            {item.bosp_component.replace(/^\d+\.\s/, '')}
                         </div>
                         <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                            <ChevronRight size={10} className="text-slate-300" />
                            {item.category}
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right font-mono font-bold text-slate-700 tracking-tight text-base">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.amount)}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                          item.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          item.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <motion.button 
                          whileHover={{ scale: 1.15, rotate: 10 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDelete(item.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={20} strokeWidth={2.5} />
                        </motion.button>
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
              className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white max-w-2xl w-full relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center relative z-10">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                     {type === TransactionType.INCOME ? 'Tambah Sumber Dana' : 'Tambah Kegiatan RKAS'}
                   </h3>
                   <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Form Input Data Baru</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors focus:outline-none"
                >
                  <span className="text-xl font-bold leading-none">&times;</span>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10">
                
                {/* AI Helper for Expense */}
                {type === TransactionType.EXPENSE && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-6 rounded-[1.5rem] border border-indigo-100 shadow-inner group">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/80 backdrop-blur-sm rounded-xl text-indigo-500 shadow-sm border border-white group-hover:scale-110 transition-transform flex-shrink-0">
                         <Sparkles size={24} strokeWidth={2.5} />
                      </div>
                      <div className="w-full">
                        <p className="text-sm text-indigo-900 mb-1 font-black uppercase tracking-widest">Validasi Otomatis AI</p>
                        <p className="text-xs font-semibold text-indigo-700/70 mb-4 leading-relaxed">
                          Ketik rencana belanja, AI akan memetakan otomatis ke Komponen BOSP, Kode Rekening, dan mengecek kesesuaian dengan Juknis.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                           <input 
                             type="text" 
                             value={description}
                             onChange={(e) => setDescription(e.target.value)}
                             className="flex-1 bg-white/70 backdrop-blur-sm text-sm border border-indigo-200/50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm transition-all focus:bg-white placeholder-slate-400 font-medium"
                             placeholder="Contoh: Beli 2 rim kertas HVS A4"
                           />
                          <motion.button 
                            type="button" 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing || !description}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 font-bold shadow-md shadow-indigo-600/20 sm:w-auto w-full"
                          >
                            {isAnalyzing ? <Loader2 size={16} strokeWidth={3} className="animate-spin" /> : <Search size={16} strokeWidth={3} />}
                            Analisis
                          </motion.button>
                        </div>
                        
                        {/* Validation Result */}
                        <AnimatePresence>
                           {isEligible === true && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="text-[11px] font-bold text-emerald-700 flex items-center gap-2 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 shadow-sm"
                              >
                                 <CheckCircle size={16} strokeWidth={2.5} className="flex-shrink-0" /> 
                                 Sesuai dengan regulasi dan diperbolehkan dalam Juknis BOSP.
                              </motion.div>
                           )}
                           {isEligible === false && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                className="text-[11px] font-bold text-rose-700 flex items-start gap-2 bg-rose-50/80 p-3 rounded-xl border border-rose-200 shadow-sm"
                              >
                                 <AlertTriangle size={16} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" /> 
                                 <span className="leading-relaxed"><b className="uppercase tracking-widest text-rose-800">Dilarang:</b> {warningMessage}</span>
                              </motion.div>
                           )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Uraian Transaksi</label>
                    <input 
                      required
                      type="text" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-medium text-slate-800 placeholder-slate-400"
                      placeholder="Uraian kegiatan lengkap..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Tanggal Transaksi</label>
                    <input 
                      required
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Nominal (Rp)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                       <input 
                         required
                         type="number" 
                         value={amount}
                         onChange={(e) => setAmount(e.target.value)}
                         className="w-full bg-slate-50/50 pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-bold font-mono text-slate-800 placeholder-slate-400"
                         placeholder="0"
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                      {type === TransactionType.INCOME ? 'Jenis Penerimaan' : 'Komponen BOSP'}
                    </label>
                    <select 
                      value={bospComponent} 
                      onChange={(e) => setBospComponent(e.target.value)}
                      className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-semibold text-sm text-slate-700 appearance-none"
                    >
                      {type === TransactionType.INCOME ? (
                        <>
                          <option value="Penerimaan">Dana Transfer BOSP</option>
                          <option value="Lainnya">Sumber Lain</option>
                        </>
                      ) : (
                         Object.values(BOSPComponent).map((comp) => (
                           <option key={comp} value={comp}>{comp}</option>
                         ))
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Standar Nasional Pendidikan (SNP)</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50/50 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all focus:bg-white font-semibold text-sm text-slate-700 appearance-none"
                    >
                       {Object.values(SNPStandard).map((std) => (
                         <option key={std} value={std}>{std}</option>
                       ))}
                    </select>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                       Dipetakan otomatis oleh AI jika menggunakan fitur analisis.
                    </p>
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100/80">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <motion.button 
                    whileHover={{ scale: isEligible === false ? 1 : 1.02 }}
                    whileTap={{ scale: isEligible === false ? 1 : 0.98 }}
                    type="submit" 
                    disabled={isEligible === false}
                    className={`px-8 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-md ${
                      isEligible === false 
                        ? 'bg-slate-300 shadow-none cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                    }`}
                  >
                    Simpan Data
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

export default TransactionTable;
