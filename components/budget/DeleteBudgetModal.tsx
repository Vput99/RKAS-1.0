import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface DeleteBudgetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteBudgetModal = ({ isOpen, onClose, onConfirm }: DeleteBudgetModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-10 bg-white rounded-[24px] shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center border border-white/50"
            >
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-4 shadow-inner">
                    <Trash2 size={28} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">Hapus Anggaran?</h3>
                <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                    Tindakan ini tidak dapat dibatalkan. Data anggaran ini akan dihapus secara permanen dari sistem.
                </p>
                <div className="flex gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                    >
                        Ya, Hapus
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default DeleteBudgetModal;
