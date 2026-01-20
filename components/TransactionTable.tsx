import React, { useState } from 'react';
import { Budget, SNPStandard, TransactionType } from '../types';
import { Plus, Trash2, Sparkles, Search, Loader2 } from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';

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
  const [category, setCategory] = useState(type === TransactionType.INCOME ? 'Dana BOS' : SNPStandard.SARPRAS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const filteredData = data.filter(d => d.type === type);

  const handleAIAnalysis = async () => {
    if (!description || description.length < 3) return;
    setIsAnalyzing(true);
    const result = await analyzeBudgetEntry(description);
    if (result) {
      setCategory(result.category);
      if (result.amount_estimate > 0 && !amount) {
        setAmount(result.amount_estimate.toString());
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
      status: 'draft',
      notes: ''
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory(type === TransactionType.INCOME ? 'Dana BOS' : SNPStandard.SARPRAS);
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
                <th className="px-6 py-4 font-semibold">Uraian</th>
                <th className="px-6 py-4 font-semibold">Kategori</th>
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
                    <td className="px-6 py-4">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{item.description}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 truncate max-w-[200px] block">
                        {item.category.length > 30 ? item.category.substring(0, 30) + '...' : item.category}
                      </span>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Tambah {type === TransactionType.INCOME ? 'Sumber Dana' : 'Kegiatan'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* AI Helper for Expense */}
              {type === TransactionType.EXPENSE && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-indigo-600 mt-1 flex-shrink-0" size={20} />
                    <div className="w-full">
                      <p className="text-sm text-indigo-800 mb-2 font-medium">Bantuan AI Gemini</p>
                      <p className="text-xs text-indigo-600 mb-3">
                        Ketik rencana kegiatan (misal: "Beli laptop") lalu klik tombol di bawah untuk auto-kategori.
                      </p>
                      <button 
                        type="button" 
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition flex items-center gap-2"
                      >
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Analisa & Estimasi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uraian / Nama Kegiatan</label>
                <input 
                  required
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  placeholder={type === TransactionType.INCOME ? "Contoh: Dana BOS Tahap 1" : "Contoh: Pembelian Alat Tulis Kantor"}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori / Standar SNP</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  {type === TransactionType.INCOME ? (
                    <>
                      <option value="Dana BOS">Dana BOS</option>
                      <option value="BOP">BOP</option>
                      <option value="Lainnya">Sumber Lain</option>
                    </>
                  ) : (
                     Object.values(SNPStandard).map((std) => (
                       <option key={std} value={std}>{std}</option>
                     ))
                  )}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
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
