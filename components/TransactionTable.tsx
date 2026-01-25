
import React, { useState, useEffect } from 'react';
import { Budget, SNPStandard, BOSPComponent, TransactionType, AccountCodes } from '../types';
import { Plus, Trash2, Sparkles, Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getStoredAccounts } from '../lib/db';

interface TransactionTableProps {
  type: TransactionType;
  data: Budget[];
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
  onDelete: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ type, data, onAdd, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(type === TransactionType.INCOME ? 'Dana Transfer' : SNPStandard.SARPRAS);
  const [bospComponent, setBospComponent] = useState(type === TransactionType.INCOME ? 'Penerimaan' : BOSPComponent.SARPRAS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Validation states
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Store Accounts
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);

  useEffect(() => {
      // Load accounts once to provide AI with full context (including custom accounts)
      getStoredAccounts().then(setAllAccounts);
  }, []);

  const filteredData = data.filter(d => d.type === type);

  const handleAIAnalysis = async () => {
    if (!description || description.length < 3) return;
    setIsAnalyzing(true);
    setWarningMessage('');
    setIsEligible(null);

    // Pass allAccounts (custom + default) to AI for better matching
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
      date: new Date().toISOString(),
      category,
      bosp_component: bospComponent,
      status: 'draft',
      is_bosp_eligible: isEligible === null ? true : isEligible, // Default to true if manual entry
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
    setIsEligible(null);
    setWarningMessage('');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 capitalize">Data {type}</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Tambah {type === TransactionType.INCOME ? 'Pendapatan' : 'Kegiatan'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
                <th className="px-6 py-4 font-semibold">Uraian Kegiatan</th>
                <th className="px-6 py-4 font-semibold">Komponen BOSP</th>
                <th className="px-6 py-4 font-semibold text-right">Jumlah</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">Belum ada data transaksi.</td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{item.description}</div>
                      {item.warning_message && (
                        <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} /> {item.warning_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block mb-1">
                          {item.bosp_component.replace(/^\d+\.\s/, '')}
                       </div>
                       <div className="text-xs text-gray-400">{item.category}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onDelete(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">
                {type === TransactionType.INCOME ? 'Tambah Sumber Dana' : 'Tambah Kegiatan RKAS'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* AI Helper for Expense */}
              {type === TransactionType.EXPENSE && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                    <div className="w-full">
                      <p className="text-sm text-blue-900 mb-1 font-bold">Validasi Otomatis Juknis BOSP</p>
                      <p className="text-xs text-blue-700 mb-3">
                        Masukkan rencana kegiatan, AI akan menentukan Komponen BOSP, Kode SNP, dan mengecek larangan penggunaan dana.
                      </p>
                      <div className="flex gap-2">
                         <input 
                           type="text" 
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           className="flex-1 text-sm border-blue-200 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-400 outline-none"
                           placeholder="Misal: Perbaikan atap perpustakaan bocor"
                         />
                        <button 
                          type="button" 
                          onClick={handleAIAnalysis}
                          disabled={isAnalyzing || !description}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                          Cek Juknis
                        </button>
                      </div>
                      
                      {/* Validation Result */}
                      {isEligible === true && (
                         <div className="mt-3 text-xs text-green-700 flex items-center gap-1 bg-green-50 p-2 rounded border border-green-100">
                            <CheckCircle size={14} /> Kegiatan ini diperbolehkan dalam Juknis BOSP.
                         </div>
                      )}
                      {isEligible === false && (
                         <div className="mt-3 text-xs text-red-700 flex items-start gap-1 bg-red-50 p-2 rounded border border-red-100">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> 
                            <span><b>Peringatan:</b> {warningMessage}</span>
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uraian / Nama Kegiatan</label>
                  <input 
                    required
                    type="text" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="Uraian kegiatan lengkap..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Anggaran (Rp)</label>
                  <input 
                    required
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === TransactionType.INCOME ? 'Jenis Penerimaan' : 'Komponen BOSP'}
                  </label>
                  <select 
                    value={bospComponent} 
                    onChange={(e) => setBospComponent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standar Nasional Pendidikan (SNP)</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  >
                     {Object.values(SNPStandard).map((std) => (
                       <option key={std} value={std}>{std}</option>
                     ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Dipetakan otomatis dari Komponen BOSP jika menggunakan AI.</p>
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
                  disabled={isEligible === false}
                  className={`px-4 py-2 text-white rounded-lg transition shadow-sm ${
                    isEligible === false ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Simpan Data
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
