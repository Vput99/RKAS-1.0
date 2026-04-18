import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Plus, ArrowRight, Database, CheckCircle, Loader2, ShoppingBag } from 'lucide-react';
import { Budget } from '../../types';
import { InventoryItem } from '../../lib/gemini';
import { SubKegiatanEntry } from './InventoryTypes';

interface ManualInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItemId: string | null;
  selectedBudget: Budget | null;
  budgets: Budget[];
  manualForm: Partial<InventoryItem> & { nomor?: string };
  setManualForm: (form: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
  saveStatus: string;
  subKegiatanDB: SubKegiatanEntry[];
  setIsSkDBModalOpen: (open: boolean) => void;
  selectedSkId: string;
  handleSelectSk: (sk: SubKegiatanEntry) => void;
  setSelectedSkId: (id: string) => void;
  handleManualAdd: (b: Budget) => void;
  currentSubCategory: string;
  setCurrentSubCategory: (cat: string) => void;
  CATEGORY_SUB_MAP: Record<string, string[]>;
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

const ManualInventoryModal = ({
  isOpen,
  onClose,
  editingItemId,
  selectedBudget,
  budgets,
  manualForm,
  setManualForm,
  onSubmit,
  isSaving,
  saveStatus,
  subKegiatanDB,
  setIsSkDBModalOpen,
  selectedSkId,
  handleSelectSk,
  setSelectedSkId,
  handleManualAdd,
  currentSubCategory,
  setCurrentSubCategory,
  CATEGORY_SUB_MAP
}: ManualInventoryModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
          >
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${editingItemId ? 'bg-amber-500' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg ${editingItemId ? 'shadow-amber-500/20' : 'shadow-blue-500/20'}`}>
                  {editingItemId ? <Edit3 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    {editingItemId ? 'Edit Data Inventaris' : selectedBudget?.id === 'manual-inventory' ? 'Sisa Tahun Sebelumnya' : 'Input Manual Inventaris'}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {selectedBudget?.id === 'manual-inventory' ? 'Input Manual Saldo Awal' : 'Data Anggaran SPJ Terealisasi'}
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
              {!selectedBudget ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      Pilih Anggaran Belanja
                    </p>
                    <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                      {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length} Item
                    </span>
                  </div>

                  <div className="space-y-2">
                    {budgets
                      .filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0)
                      .map(b => (
                        <button
                          key={b.id}
                          onClick={() => handleManualAdd(b)}
                          className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all group flex justify-between items-center"
                        >
                          <div className="flex-1 pr-4">
                            <p className="font-bold text-slate-800 text-sm mb-1">{b.description}</p>
                            <div className="flex gap-3 items-center text-[10px]">
                              <span className="text-slate-500 font-mono">{b.account_code}</span>
                              <span className="text-blue-600 font-black">{formatRupiah(b.amount)}</span>
                              <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                                {b.realizations?.length} SPJ
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length === 0 && (
                      <div className="py-20 text-center">
                        <p className="text-slate-400 font-bold italic text-sm">Belum ada data SPJ yang dapat dipilih.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Detail Anggaran</span>
                      <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded">{selectedBudget.account_code}</span>
                    </div>
                    <h4 className="text-base font-bold leading-tight">{selectedBudget.description}</h4>
                    <p className="text-sm font-black text-blue-200">{formatRupiah(selectedBudget.amount)}</p>
                    {selectedBudget.unit_price && (
                      <p className="text-[10px] text-emerald-400 font-bold">✓ Harga satuan SPJ: {formatRupiah(selectedBudget.unit_price)} / {selectedBudget.unit || 'unit'}</p>
                    )}
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Kode & Sub Kegiatan</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">Pilih dari database atau kelola daftar sub kegiatan</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSkDBModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                      >
                        <Database size={12} /> Kelola DB
                      </button>
                    </div>

                    {subKegiatanDB.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {subKegiatanDB.map(sk => (
                          <button
                            type="button"
                            key={sk.id}
                            onClick={() => handleSelectSk(sk)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all border text-xs ${selectedSkId === sk.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white border-indigo-100 hover:border-indigo-400 text-slate-700'
                              }`}
                          >
                            {selectedSkId === sk.id && <CheckCircle size={12} className="shrink-0" />}
                            <span className="font-mono font-black text-[10px] shrink-0">{sk.kode}</span>
                            <span className="font-medium truncate">{sk.nama}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-indigo-400 text-xs">
                        Belum ada data. Klik <strong>Kelola DB</strong> untuk menambahkan kode sub kegiatan.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-indigo-600 uppercase ml-1">Kode (manual)</label>
                        <input
                          className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 outline-none"
                          placeholder="e.g. 1.01.01"
                          value={manualForm.subActivityCode || ''}
                          onChange={e => { setSelectedSkId(''); setManualForm({ ...manualForm, subActivityCode: e.target.value }); }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-indigo-600 uppercase ml-1">Nama Sub Kegiatan (manual)</label>
                        <input
                          className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                          placeholder="Nama sub kegiatan"
                          value={manualForm.subActivityName || ''}
                          onChange={e => { setSelectedSkId(''); setManualForm({ ...manualForm, subActivityName: e.target.value }); }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nama Barang</label>
                      <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all" value={manualForm.name || ''} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Spesifikasi</label>
                      <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all" value={manualForm.spec || ''} onChange={e => setManualForm({ ...manualForm, spec: e.target.value })} placeholder="Merk, Ukuran, dll" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Kategori Persediaan</label>
                      <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer" value={manualForm.category || 'Lainnya'} onChange={e => {
                        const newCat = e.target.value;
                        setManualForm({ ...manualForm, category: newCat as any });
                        if (CATEGORY_SUB_MAP[newCat]) setCurrentSubCategory(CATEGORY_SUB_MAP[newCat][0]);
                        else setCurrentSubCategory('');
                      }}>
                        <option value="Bahan">Bahan</option>
                        <option value="Suku Cadang">Suku Cadang</option>
                        <option value="Alat Atau Bahan Untuk Kegiatan Kantor">Kegiatan Kantor</option>
                        <option value="Obat Obatan">Obat Obatan</option>
                        <option value="Natura dan Pakan">Natura & Pakan</option>
                        <option value="Lainnya">Lainnya (Umum)</option>
                      </select>
                    </div>

                    {manualForm.category && CATEGORY_SUB_MAP[manualForm.category] && (
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Sub Jenis : {manualForm.category}</label>
                        <select className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all cursor-pointer" value={currentSubCategory} onChange={e => setCurrentSubCategory(e.target.value)}>
                          {CATEGORY_SUB_MAP[manualForm.category].map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Jumlah & Satuan</label>
                      <div className="flex gap-2">
                        <input required type="number" className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={manualForm.quantity || ''} onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
                        <input required className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={manualForm.unit || ''} onChange={e => setManualForm({ ...manualForm, unit: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-emerald-600 uppercase ml-1 flex items-center gap-1">
                        <CheckCircle size={10} /> Harga Satuan (SPJ)
                      </label>
                      <input
                        required
                        type="number"
                        className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-sm font-black text-emerald-700 focus:border-emerald-500 outline-none transition-all"
                        value={manualForm.price || ''}
                        onChange={e => setManualForm({ ...manualForm, price: Number(e.target.value) })}
                      />
                      {manualForm.price && manualForm.price > 0 && (
                        <p className="text-[9px] text-emerald-600 ml-1 font-bold">{formatRupiah(manualForm.price as number)} / {manualForm.unit || 'unit'}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tanggal Perolehan</label>
                      <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={(manualForm.date || '').split('T')[0]} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-amber-600 uppercase ml-1">No (Kuitansi/Faktur)</label>
                      <input className="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-sm font-bold font-mono focus:border-amber-500 outline-none transition-all" placeholder="Nomor dokumen" value={(manualForm as any).nomor || manualForm.docNumber || ''} onChange={e => setManualForm({ ...manualForm, nomor: e.target.value } as any)} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Rekening Belanja</label>
                      <input
                        readOnly={selectedBudget.id !== 'manual-inventory'}
                        className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold transition-all ${selectedBudget.id === 'manual-inventory' ? 'bg-white focus:border-blue-500 outline-none' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                        value={manualForm.accountCode || ''}
                        onChange={e => setManualForm({ ...manualForm, accountCode: e.target.value })}
                      />
                    </div>
                    
                    {selectedBudget.id === 'manual-inventory' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Saldo Awal (Tahun Lalu)</label>
                        <input 
                          type="number" 
                          className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-black text-blue-700 focus:border-blue-500 outline-none transition-all" 
                          placeholder="0"
                          value={manualForm.lastYearBalance || ''} 
                          onChange={e => setManualForm({ ...manualForm, lastYearBalance: Number(e.target.value) })} 
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nama Penyedia</label>
                      <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" placeholder="Nama toko/vendor" value={manualForm.vendor || ''} onChange={e => setManualForm({ ...manualForm, vendor: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Bentuk Dokumen</label>
                      <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none appearance-none" value={manualForm.contractType || 'Kuitansi'} onChange={e => setManualForm({ ...manualForm, contractType: e.target.value })}>
                        <option>Kuitansi</option>
                        <option>Faktur/Invoice</option>
                        <option>BAST</option>
                        <option>Nota</option>
                        <option>Kontrak</option>
                      </select>
                    </div>
                  </div>

                  {(manualForm.quantity || 0) > 0 && (manualForm.price || 0) > 0 && (
                    <div className="bg-blue-600 text-white rounded-xl px-5 py-3 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest">Total Nilai Barang</span>
                      <span className="text-lg font-black">{formatRupiah(Number(manualForm.quantity) * Number(manualForm.price))}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => { onClose(); }}
                      className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`flex-[2] py-3 px-6 rounded-xl ${saveStatus === 'success' ? 'bg-emerald-600' : 'bg-blue-600'} text-white font-black hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50`}
                    >
                      {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : saveStatus === 'success' ? (
                        <CheckCircle size={18} />
                      ) : editingItemId ? (
                        <Edit3 size={18} />
                      ) : (
                        <ShoppingBag size={18} />
                      )}
                      {isSaving ? 'Menyimpan...' : saveStatus === 'success' ? 'Berhasil Simpan!' : editingItemId ? 'Simpan Perubahan' : 'Simpan Inventaris'}
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

export default ManualInventoryModal;
