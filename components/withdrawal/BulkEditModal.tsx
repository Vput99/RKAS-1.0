import { motion } from 'framer-motion';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    bulkName: string;
    setBulkName: (val: string) => void;
    bulkAccount: string;
    setBulkAccount: (val: string) => void;
    onApply: () => void;
}

const BulkEditModal = ({
    isOpen,
    onClose,
    bulkName,
    setBulkName,
    bulkAccount,
    setBulkAccount,
    onApply
}: BulkEditModalProps) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative z-10">
                <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-tight">Set Penerima Massal</h3>
                <input type="text" placeholder="Nama Penerima" className="w-full border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none rounded-xl px-4 py-3 text-sm mb-3 bg-slate-50 transition-all font-semibold text-slate-700" value={bulkName} onChange={e => setBulkName(e.target.value)} />
                <input type="text" placeholder="No Rekening" className="w-full border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none rounded-xl px-4 py-3 text-sm mb-4 bg-slate-50 transition-all font-mono font-bold text-slate-700" value={bulkAccount} onChange={e => setBulkAccount(e.target.value)} />
                <div className="flex gap-3 mt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-3.5 border border-slate-200 hover:bg-slate-100/80 rounded-xl text-sm font-bold text-slate-600 transition-colors">Batal</button>
                    <button onClick={onApply} className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95">Terapkan</button>
                </div>
            </motion.div>
        </div>
    );
};

export default BulkEditModal;
