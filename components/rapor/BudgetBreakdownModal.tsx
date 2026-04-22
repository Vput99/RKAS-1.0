import React from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { PBDRecommendation } from '../../types';

interface BudgetBreakdownModalProps {
  selectedRec: PBDRecommendation;
  setSelectedRec: (rec: PBDRecommendation | null) => void;
  isAddingToBudget: boolean;
  handleConfirmAddToBudget: () => Promise<void>;
}

const BudgetBreakdownModal: React.FC<BudgetBreakdownModalProps> = ({
  selectedRec,
  setSelectedRec,
  isAddingToBudget,
  handleConfirmAddToBudget
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800">Rincian Anggaran Kegiatan</h3>
                <button onClick={() => setSelectedRec(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
            </div>
            <div className="p-6">
                <div className="mb-4">
                    <h4 className="font-bold text-gray-800">{selectedRec.activityName}</h4>
                    {selectedRec.comparisonSolution && (
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                            <p className="text-[11px] text-orange-700 font-bold mb-1 uppercase tracking-wider">Solusi Strategis Penurunan:</p>
                            <p className="text-xs text-orange-600 italic">"{selectedRec.comparisonSolution}"</p>
                        </div>
                    )}
                    <p className="text-sm text-gray-500 mt-4">Item berikut akan ditambahkan ke Draft Anggaran:</p>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-6">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2">Uraian / Barang</th>
                                <th className="px-3 py-2 text-right">Vol</th>
                                <th className="px-3 py-2 text-right">Harga</th>
                                <th className="px-3 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {selectedRec.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-gray-800">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{item.accountCode}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs">{item.quantity} {item.unit}</td>
                                    <td className="px-3 py-2 text-right text-xs">{new Intl.NumberFormat('id-ID').format(item.price)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-xs">{new Intl.NumberFormat('id-ID').format(item.quantity * item.price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setSelectedRec(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50">Batal</button>
                    <button onClick={handleConfirmAddToBudget} disabled={isAddingToBudget} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                       {isAddingToBudget ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                       Konfirmasi Simpan
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default BudgetBreakdownModal;
