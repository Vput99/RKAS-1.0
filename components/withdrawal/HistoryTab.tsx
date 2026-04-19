import { FileText, RefreshCcw, Trash2 } from 'lucide-react';
import { formatRupiah } from './WithdrawalUtils';

interface HistoryTabProps {
    historyList: any[];
    handleRestoreFromHistory: (h: any) => void;
    handleDeleteHistory: (id: string) => void;
}

const HistoryTab = ({ historyList, handleRestoreFromHistory, handleDeleteHistory }: HistoryTabProps) => {
    return (
        <div className="space-y-4 border border-slate-100/60 rounded-[2.5rem] overflow-hidden bg-white/40 shadow-inner">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50/80 backdrop-blur-md uppercase tracking-[0.2em] text-[10px] text-slate-400 font-black border-b border-slate-100">
                    <tr><th className="p-5">Tanggal</th><th className="p-5">Nomor Surat</th><th className="p-5 text-right">Total Nominal</th><th className="p-5 text-center">Status Berkas</th><th className="p-5 text-right">Opsi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                    {historyList.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">Belum ada riwayat</td></tr>
                    ) : historyList.map(h => (
                        <tr key={h.id} className="hover:bg-white transition-all duration-200">
                            <td className="p-5">
                                <div className="font-bold text-slate-700">{new Date(h.letter_date).toLocaleDateString('id', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Disimpan {new Date(h.created_at || '').toLocaleTimeString('id', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>
                            <td className="p-5 font-mono text-xs font-bold text-indigo-600 bg-indigo-50/30">{h.letter_number}</td>
                            <td className="p-5 text-right font-black text-slate-900">{formatRupiah(h.total_amount)}</td>
                            <td className="p-5 text-center">
                                {h.file_url ? (
                                    <a href={h.file_url} target="_blank" className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black border border-rose-100 hover:bg-rose-100 transition-colors uppercase tracking-tight">
                                        <FileText size={12} /> PDF Ready
                                    </a>
                                ) : (
                                    <span className="text-[10px] text-slate-300 font-bold uppercase">No File</span>
                                )}
                            </td>
                            <td className="p-5 text-right flex justify-end gap-3">
                                <button
                                    onClick={() => handleRestoreFromHistory(h)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 shadow-sm uppercase tracking-tight active:scale-95"
                                >
                                    <RefreshCcw size={12} />
                                    <span>Pulihkan</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteHistory(h.id)}
                                    className="p-2.5 bg-white text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-slate-100 shadow-sm active:scale-95"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default HistoryTab;
