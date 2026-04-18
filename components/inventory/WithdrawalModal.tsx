import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { InventoryItem } from '../../lib/gemini';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInventoryItem: InventoryItem | null;
  setSelectedInventoryItem: (item: InventoryItem | null) => void;
  combinedItems: InventoryItem[];
  withdrawalForm: {
    date: string;
    docNumber: string;
    quantity: number;
    notes: string;
  };
  setWithdrawalForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  saveStatus: string;
}

const WithdrawalModal = ({
  isOpen,
  onClose,
  selectedInventoryItem,
  setSelectedInventoryItem,
  combinedItems,
  withdrawalForm,
  setWithdrawalForm,
  onSubmit,
  isSaving,
  saveStatus
}: WithdrawalModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <ArrowRightLeft size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Catat Pengeluaran Barang</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    Manajemen Stok Keluar
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
              {!selectedInventoryItem ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      Pilih Barang yang Keluar
                    </p>
                    <span className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full font-bold">
                      {combinedItems.length} Item
                    </span>
                  </div>
                  <div className="space-y-2">
                    {combinedItems.length === 0 ? (
                      <div className="py-20 text-center">
                        <p className="text-slate-400 font-bold italic text-sm">Belum ada barang masuk untuk dikeluarkan.</p>
                      </div>
                    ) : (
                      combinedItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setWithdrawalForm({ ...withdrawalForm, quantity: item.quantity, docNumber: item.docNumber });
                          }}
                          className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-orange-500 hover:shadow-lg transition-all group flex justify-between items-center"
                        >
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-slate-800 text-sm mb-1">{item.name}</p>
                            <div className="flex gap-3 items-center text-[10px]">
                              <span className="text-orange-600 font-black">STOK : {item.quantity} {item.unit}</span>
                              <span className="text-slate-400 italic truncate max-w-[200px]">{item.spec}</span>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Detail Barang</span>
                      <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded uppercase tracking-tighter">{selectedInventoryItem.category}</span>
                    </div>
                    <h4 className="text-lg font-bold leading-tight">{selectedInventoryItem.name}</h4>
                    <p className="text-sm text-slate-300 italic">Spec: {selectedInventoryItem.spec}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tanggal Keluar</label>
                      <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all" value={withdrawalForm.date} onChange={e => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nomor Dokumen</label>
                      <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all font-mono" placeholder="No. BAST/Kuitansi" value={withdrawalForm.docNumber} onChange={e => setWithdrawalForm({ ...withdrawalForm, docNumber: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Jumlah Keluar (STOK : {selectedInventoryItem.quantity} {selectedInventoryItem.unit})</label>
                      <input required type="number" max={selectedInventoryItem.quantity} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-orange-600 focus:border-orange-500 outline-none transition-all" value={withdrawalForm.quantity || ''} onChange={e => setWithdrawalForm({ ...withdrawalForm, quantity: Number(e.target.value) })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Keterangan / Peruntukan</label>
                      <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all" placeholder="Misal: Untuk Kelas 6" value={withdrawalForm.notes} onChange={e => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedInventoryItem(null)}
                      className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`flex-[2] py-3 px-6 rounded-xl ${saveStatus === 'success' ? 'bg-emerald-600' : 'bg-orange-600'} text-white font-black hover:opacity-90 shadow-lg shadow-orange-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50`}
                    >
                      {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : saveStatus === 'success' ? (
                        <CheckCircle size={18} />
                      ) : (
                        <ArrowRightLeft size={18} />
                      )}
                      {isSaving ? 'Menyimpan...' : saveStatus === 'success' ? 'Berhasil Catat!' : 'Catat Pengeluaran'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WithdrawalModal;
