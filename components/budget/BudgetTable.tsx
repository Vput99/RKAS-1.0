import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, AlertTriangle, Sparkles, CheckCircle, Edit2, Trash2, Calculator, Printer } from 'lucide-react';
import { MONTHS_FULL, CURRENT_YEAR } from './BudgetTypes';
import { formatRupiah, getMonthCount } from './BudgetUtils';
import { Budget } from '../../types';

interface BudgetTableProps {
    activeMonth: number;
    setActiveMonth: (m: number) => void;
    monthExpenses: Budget[];
    allExpenses: Budget[];
    allAccounts: Record<string, string>;
    handleOpenAdd: () => void;
    handleOpenEdit: (item: Budget) => void;
    setDeleteConfirmId: (id: string) => void;
    setIsReviewOpen: (v: boolean) => void;
    setReviewPeriod: (v: 'yearly' | 'monthly') => void;
    totalBudgeted: number;
    itemVariants: any;
}

const BudgetTable = ({
    activeMonth, setActiveMonth, monthExpenses, allExpenses, allAccounts,
    handleOpenAdd, handleOpenEdit, setDeleteConfirmId,
    setIsReviewOpen, setReviewPeriod, totalBudgeted, itemVariants
}: BudgetTableProps) => {
    return (
        <div className="flex-1 px-6 py-6">

            {/* Period Header */}
            <motion.div variants={itemVariants} className="mb-5">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    Periode Anggaran {CURRENT_YEAR}
                </h2>
            </motion.div>

            {/* ── MONTH TABS ── */}
            <motion.div
                variants={itemVariants}
                className="relative bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/70 shadow-sm mb-0 overflow-hidden"
            >
                {/* Tabs strip */}
                <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200/80">
                    {MONTHS_FULL.map((month, idx) => {
                        const monthNum = idx + 1;
                        const isActive = activeMonth === monthNum;
                        const count = getMonthCount(allExpenses, monthNum);
                        return (
                            <button
                                key={monthNum}
                                onClick={() => setActiveMonth(monthNum)}
                                className={`relative flex-shrink-0 px-4 py-3.5 text-xs font-bold transition-all whitespace-nowrap ${isActive
                                    ? 'text-blue-700'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/60'
                                    }`}
                            >
                                {month}
                                {count > 0 && (
                                    <span
                                        className={`ml-1.5 inline-flex items-center justify-center text-[9px] font-black w-4 h-4 rounded-full ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-200 text-slate-600'
                                            }`}
                                    >
                                        {count}
                                    </span>
                                )}
                                {isActive && (
                                    <motion.div
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── TABLE ── */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed min-w-[900px]">
                        <colgroup>
                            <col className="w-9" />
                            <col className="w-40" />
                            <col className="w-36" />
                            <col className="w-auto" />
                            <col className="w-16" />
                            <col className="w-20" />
                            <col className="w-28" />
                            <col className="w-28" />
                            <col className="w-24" />
                            <col className="w-16" />
                        </colgroup>
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">#</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Kegiatan</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Rekening Belanja</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Uraian</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Jml</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Satuan</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Harga Satuan</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Total</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                                <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/70">
                            <AnimatePresence mode="popLayout">
                                {monthExpenses.length === 0 ? (
                                    <motion.tr
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <td colSpan={10} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                                                    <FileText size={32} strokeWidth={1.2} className="opacity-40" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-500">
                                                        Belum ada kegiatan di bulan {MONTHS_FULL[activeMonth - 1]}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Klik "Tambah Kegiatan" untuk menambah rencana belanja
                                                    </p>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleOpenAdd}
                                                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/30 transition-all"
                                                >
                                                    <Plus size={14} strokeWidth={2.5} />
                                                    Tambah Kegiatan
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    monthExpenses.map((item, index) => (
                                        <motion.tr
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.18, delay: index * 0.03 }}
                                            className="group hover:bg-blue-50/30 transition-colors"
                                        >
                                            <td className="px-3 py-3 text-xs font-bold text-slate-400 text-center">
                                                {index + 1}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span
                                                    title={item.category || '-'}
                                                    className="block truncate text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg"
                                                >
                                                    {item.category || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                {item.account_code ? (
                                                    <div>
                                                        <span className="text-[10px] font-black font-mono text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded block w-fit">
                                                            {item.account_code}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 block truncate leading-tight">
                                                            {allAccounts[item.account_code] || ''}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div
                                                    title={item.description}
                                                    className="font-semibold text-slate-800 text-xs leading-snug line-clamp-2"
                                                >
                                                    {item.description}
                                                </div>
                                                {item.warning_message && (
                                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-rose-500 font-semibold">
                                                        <AlertTriangle size={8} strokeWidth={2.5} className="flex-shrink-0" />
                                                        <span className="truncate">{item.warning_message}</span>
                                                    </div>
                                                )}
                                                {item.ai_analysis_logic && (
                                                    <div className="flex items-start gap-1 mt-1 text-[9px] text-indigo-500/80 font-medium italic leading-tight">
                                                        <Sparkles size={8} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
                                                        <span className="line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                                            AI: {item.ai_analysis_logic}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="font-bold text-slate-800 text-sm tabular-nums">
                                                    {item.month_quantities?.[String(activeMonth)] ?? Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1))}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    {item.unit || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-600 tabular-nums">
                                                {formatRupiah(item.unit_price || 0)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="font-black font-mono text-blue-700 tabular-nums text-sm">
                                                    {formatRupiah((item.month_quantities?.[String(activeMonth)] ?? Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1))) * (item.unit_price || 0))}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {(() => {
                                                    const realized = (item.realizations || []).some(r =>
                                                        (r.target_month ?? r.month) === activeMonth
                                                    );
                                                    return realized ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle size={10} strokeWidth={3} />
                                                            Realisasi
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
                                                            <span className="w-2 h-2 rounded-full border-2 border-slate-300 inline-block" />
                                                            Belum
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={12} strokeWidth={2.5} />
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setDeleteConfirmId(item.id)}
                                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={12} strokeWidth={2.5} />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                        {monthExpenses.length > 0 && (
                            <tfoot>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/80 border-t-2 border-blue-100">
                                    <td colSpan={7} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">
                                        Total {MONTHS_FULL[activeMonth - 1]}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <span className="font-black font-mono text-blue-700 tabular-nums text-sm">
                                            {formatRupiah(monthExpenses.reduce((s, i) =>
                                                s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1))
                                                , 0))}
                                        </span>
                                    </td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </motion.div>

            {/* Grand Total Footer Card */}
            {allExpenses.length > 0 && (
                <motion.div
                    variants={itemVariants}
                    className="mt-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-5 flex justify-between items-center shadow-xl shadow-blue-700/20 border border-blue-500/30"
                >
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">
                            Total Seluruh Anggaran
                        </p>
                        <p className="text-3xl font-black text-white font-mono tracking-tight">
                            {formatRupiah(totalBudgeted)}
                        </p>
                    </div>
                    <button
                        onClick={() => { setReviewPeriod('yearly'); setIsReviewOpen(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border border-white/30 transition-all font-bold text-sm shadow-xl active:scale-95"
                    >
                        <Printer size={18} />
                        Cetak RKAS
                    </button>
                    <div className="hidden md:block p-4 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
                        <Calculator className="text-white" size={36} strokeWidth={1.5} />
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default BudgetTable;
