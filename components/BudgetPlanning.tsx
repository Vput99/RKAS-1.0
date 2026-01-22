import React, { useState, useMemo } from 'react';
import { Budget, TransactionType, BOSPComponent, SNPStandard, AccountCodes } from '../types';
import { Plus, Search, Edit2, Trash2, X, Save, Calculator, Calendar } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState('');
  const [bospComponent, setBospComponent] = useState<string>(Object.values(BOSPComponent)[0]);
  const [snpStandard, setSnpStandard] = useState<string>(Object.values(SNPStandard)[0]);
  const [accountCode, setAccountCode] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Derived State
  const expenses = useMemo(() => {
    return data
      .filter(d => d.type === TransactionType.EXPENSE)
      .filter(d => d.description.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [data, searchTerm]);

  const totalBudget = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const resetForm = () => {
    setEditingId(null);
    setDescription('');
    setBospComponent(Object.values(BOSPComponent)[0]);
    setSnpStandard(Object.values(SNPStandard)[0]);
    setAccountCode('');
    setQuantity(0);
    setUnit('');
    setUnitPrice(0);
    setSelectedMonths([]);
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
    setAccountCode(item.account_code || '');
    setQuantity(item.quantity || 1);
    setUnit(item.unit || 'Paket');
    setUnitPrice(item.unit_price || item.amount);
    setSelectedMonths(item.realization_months || []);
    setIsModalOpen(true);
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
      date: new Date().toISOString() // Or keep original date on edit? usually updated_at
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

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Perencanaan Anggaran (RKAS)</h2>
          <p className="text-sm text-gray-500">Susun rencana belanja sekolah selama satu tahun anggaran.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
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
             className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition"
           >
             <Plus size={18} /> Tambah
           </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
         <div>
            <p className="text-xs text-blue-600 font-bold uppercase">Total Rencana Belanja</p>
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
                     <tr><td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data perencanaan.</td></tr>
                  ) : (
                     expenses.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                           <td className="px-4 py-3 text-xs font-mono">{item.account_code || '-'}</td>
                           <td className="px-4 py-3">
                              <div className="font-medium text-gray-800">{item.description}</div>
                              <div className="text-xs text-gray-400">{item.category}</div>
                           </td>
                           <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                           <td className="px-4 py-3 text-right">{formatRupiah(item.unit_price || 0)}</td>
                           <td className="px-4 py-3 text-right font-bold text-gray-800">{formatRupiah(item.amount)}</td>
                           <td className="px-4 py-3 text-center">
                              <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                                 {item.realization_months?.map(m => (
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
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Uraian Kegiatan</label>
                     <textarea 
                        required
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={2}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Contoh: Belanja Alat Tulis Kantor untuk KBM"
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Komponen BOSP</label>
                        <select 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={bospComponent}
                           onChange={e => setBospComponent(e.target.value)}
                        >
                           {Object.values(BOSPComponent).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SNP</label>
                        <select 
                           className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                           value={snpStandard}
                           onChange={e => setSnpStandard(e.target.value)}
                        >
                           {Object.values(SNPStandard).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Kode Rekening (Akun Belanja)</label>
                     <select 
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        value={accountCode}
                        onChange={e => setAccountCode(e.target.value)}
                     >
                        <option value="">-- Pilih Kode Rekening --</option>
                        {Object.entries(AccountCodes).map(([code, name]) => (
                           <option key={code} value={code}>{code} - {name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                        <input 
                           type="number"
                           min="0"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={quantity}
                           onChange={e => setQuantity(Number(e.target.value))}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                        <input 
                           type="text"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={unit}
                           onChange={e => setUnit(e.target.value)}
                           placeholder="Paket/Rim"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan</label>
                        <input 
                           type="number"
                           min="0"
                           className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                           value={unitPrice}
                           onChange={e => setUnitPrice(Number(e.target.value))}
                        />
                     </div>
                  </div>

                  <div className="bg-gray-100 p-3 rounded-lg text-right">
                     <span className="text-xs text-gray-500">Total Anggaran:</span>
                     <p className="text-xl font-bold text-gray-800">{formatRupiah(quantity * unitPrice)}</p>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Rencana Realisasi (Bulan)</label>
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

                  <div className="pt-4 flex gap-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                     <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-2">
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