import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemCount: number;
}

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemCount
}: DeleteConfirmModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && onClose()}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="bg-gradient-to-br from-red-500 to-red-700 px-8 pt-8 pb-10 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                  <Trash2 size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Hapus Semua Catatan?</h3>
                <p className="text-red-100 text-sm mt-1 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="px-8 pb-8 -mt-4 relative">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                <p className="text-sm text-red-800 font-semibold text-center leading-relaxed">
                  Semua <span className="font-black">{itemCount} catatan stok opname</span> akan dihapus secara permanen dari Supabase dan perangkat ini.
                </p>
              </div>

              <ul className="text-xs text-slate-500 space-y-2 mb-6 pl-1">
                {[
                  'Semua item inventaris manual akan terhapus',
                  'Data yang sudah dihapus tidak bisa dikembalikan',
                  'Data pengeluaran barang tidak ikut terhapus',
                ].map((txt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-[10px] font-black">!</span>
                    {txt}
                  </li>
                ))}
              </ul>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isDeleting || itemCount === 0}
                  className="flex-[2] py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-lg shadow-red-500/30 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <><Loader2 size={16} className="animate-spin" /> Menghapus...</>
                  ) : (
                    <><Trash2 size={16} /> Ya, Hapus Semua</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmModal;
