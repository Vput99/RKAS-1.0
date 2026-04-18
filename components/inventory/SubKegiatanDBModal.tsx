import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Loader2, Edit3, Trash2 } from 'lucide-react';
import { SubKegiatanEntry } from './InventoryTypes';

interface SubKegiatanDBModalProps {
  isOpen: boolean;
  onClose: () => void;
  skForm: { kode: string; nama: string };
  setSkForm: (form: any) => void;
  skEditId: string | null;
  setSkEditId: (id: string | null) => void;
  isSkDBLoading: boolean;
  subKegiatanDB: SubKegiatanEntry[];
  handleAddOrUpdateSk: () => void;
  handleDeleteSk: (id: string) => void;
}

const SubKegiatanDBModal = ({
  isOpen,
  onClose,
  skForm,
  setSkForm,
  skEditId,
  setSkEditId,
  isSkDBLoading,
  subKegiatanDB,
  handleAddOrUpdateSk,
  handleDeleteSk
}: SubKegiatanDBModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
          >
            <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Database Kode Sub Kegiatan</h3>
                  <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Kelola daftar kode & nama sub kegiatan</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="px-7 py-5 border-b border-slate-100 bg-indigo-50/50 shrink-0">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">
                {skEditId ? '✏️ Edit Data' : '➕ Tambah Kode Baru'}
              </p>
              <div className="flex gap-3">
                <div className="w-36 shrink-0">
                  <input
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:border-indigo-500 outline-none"
                    placeholder="Kode (1.01.01)"
                    value={skForm.kode}
                    onChange={e => setSkForm({ ...skForm, kode: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <input
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none"
                    placeholder="Nama sub kegiatan..."
                    value={skForm.nama}
                    onChange={e => setSkForm({ ...skForm, nama: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdateSk())}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateSk}
                    disabled={!skForm.kode.trim() || !skForm.nama.trim() || isSkDBLoading}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap flex items-center gap-1.5"
                  >
                    {isSkDBLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                    {skEditId ? 'Update' : 'Simpan ke Supabase'}
                  </button>
                  {skEditId && (
                    <button
                      type="button"
                      onClick={() => { setSkEditId(null); setSkForm({ kode: '', nama: '' }); }}
                      className="px-4 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
              {subKegiatanDB.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Database size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">Belum ada data kode sub kegiatan.</p>
                  <p className="text-xs mt-1">Isi form di atas lalu klik Tambah.</p>
                </div>
              ) : (
                subKegiatanDB.map((sk, idx) => (
                  <motion.div
                    key={sk.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl border group transition-all ${skEditId === sk.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                      }`}
                  >
                    <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shrink-0 min-w-[70px] text-center">
                      {sk.kode}
                    </span>
                    <span className="flex-1 text-sm font-bold text-slate-700">{sk.nama}</span>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => { setSkEditId(sk.id); setSkForm({ kode: sk.kode, nama: sk.nama }); }}
                        className="p-1.5 hover:bg-indigo-100 text-indigo-500 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSk(sk.id)}
                        className="p-1.5 hover:bg-red-100 text-red-400 rounded-lg transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                {isSkDBLoading && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                {subKegiatanDB.length} data tersimpan di Supabase
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all"
              >
                Selesai
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SubKegiatanDBModal;
