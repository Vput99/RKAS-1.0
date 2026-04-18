import { motion } from 'framer-motion';
import { Calculator, Percent } from 'lucide-react';

interface TaxModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (type: string) => void;
}

const TaxModal = ({ isOpen, onClose, onApply }: TaxModalProps) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-white/50 relative z-10">
                <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-tight flex items-center gap-2"><Calculator size={20} className="text-emerald-500" /> Otomatisasi Pajak</h3>
                <div className="space-y-2 mt-2">
                    <button onClick={() => onApply('barang_pkp')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                        <span>Barang {'>'} 2 Juta (PPN & PPh22)</span>
                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                    <button onClick={() => onApply('mamin_daerah')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                        <span>Mamin Resto (PB1 10%)</span>
                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                    <button onClick={() => onApply('jasa')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                        <span>Jasa (PPh23 2%)</span>
                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                    <button onClick={() => onApply('honor_5')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                        <span>Honor ASN/Ber-NPWP (PPh21 5%)</span>
                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-6 px-4 py-3.5 border border-slate-200 hover:bg-slate-100/80 rounded-xl text-sm font-bold text-slate-600 transition-colors">Tutup</button>
            </motion.div>
        </div>
    );
};

export default TaxModal;
