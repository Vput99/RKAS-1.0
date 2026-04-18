import { motion } from 'framer-motion';
import { List, Search, Printer } from 'lucide-react';
import { formatRupiah } from './WithdrawalUtils';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupedData: any[];
    totalSelectedAmount: number;
    onPrint: () => void;
}

const PreviewModal = ({
    isOpen,
    onClose,
    groupedData,
    totalSelectedAmount,
    onPrint
}: PreviewModalProps) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 24 }}
                className="bg-white/95 w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 relative z-10"
            >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-md">Print Preview</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pratinjau Daftar Rincian Transfer</h3>
                        <p className="text-xs text-slate-400 font-medium">Pastikan penggabungan nominal dan data rekening sudah sesuai</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-200">
                        <List size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white/30">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-100/80">
                                <th className="p-4 border-y border-l rounded-tl-2xl text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">No</th>
                                <th className="p-4 border-y text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Penerima</th>
                                <th className="p-4 border-y text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">No. Rekening</th>
                                <th className="p-4 border-y text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Nominal</th>
                                <th className="p-4 border-y border-r rounded-tr-2xl text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedData.map((item, idx) => {
                                const tTax = item.taxes.ppn + item.taxes.pph21 + item.taxes.pph22 + item.taxes.pph23 + item.taxes.pajakDaerah;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-xs text-center text-slate-400 font-mono">{idx + 1}</td>
                                        <td className="p-4 text-sm font-black text-slate-800 uppercase tracking-tight">{item.name}</td>
                                        <td className="p-4 text-xs font-mono font-bold text-blue-600">{item.account}</td>
                                        <td className="p-4 text-right">
                                            <div className="text-sm font-black text-slate-900">{formatRupiah(item.amount)}</div>
                                            {tTax > 0 && <div className="text-[9px] text-rose-500 font-bold">- Pot. Pajak {formatRupiah(tTax)}</div>}
                                        </td>
                                        <td className="p-4 text-[10px] text-slate-500 max-w-xs leading-relaxed italic">
                                            {item.descriptions.join(', ').length > 120
                                                ? `${item.descriptions[0]} dan ${item.descriptions.length - 1} rincian lainnya`
                                                : item.descriptions.join(', ')
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {groupedData.length === 0 && (
                        <div className="p-20 text-center">
                            <div className="inline-block p-4 bg-slate-50 rounded-full mb-4">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-400 font-medium">Belum ada data yang dipilih untuk pratinjau</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total Pencairan</p>
                        <p className="text-2xl font-black text-blue-600">{formatRupiah(totalSelectedAmount)}</p>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-3.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            Kembali
                        </button>
                        <button
                            onClick={onPrint}
                            className="flex-1 sm:flex-none px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Printer size={20} />
                            Cetak PDF Sekarang
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default PreviewModal;
