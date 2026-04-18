import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, FileText, Grid, Download, Printer, Search, ChevronRight } from 'lucide-react';
import { MONTHS_FULL, CURRENT_YEAR } from './BudgetTypes';
import { formatRupiah } from './BudgetUtils';
import { Budget } from '../../types';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeMonth: number;
    reviewPeriod: 'yearly' | 'monthly';
    setReviewPeriod: (p: 'yearly' | 'monthly') => void;
    reviewTab: 'pdf' | 'excel';
    setReviewTab: (t: 'pdf' | 'excel') => void;
    isGroupedByAccount: boolean;
    setIsGroupedByAccount: (v: boolean) => void;
    allExpenses: Budget[];
    monthExpenses: Budget[];
    groupedExpenses: [string, Budget[]][];
    totalBudgeted: number;
    remainingBudget: number;
    paguDana: number;
    allAccounts: Record<string, string>;
    handleExportPDF: () => void;
    profile: any;
}

const ReviewModal = ({
    isOpen, onClose, activeMonth, reviewPeriod, setReviewPeriod,
    reviewTab, setReviewTab, isGroupedByAccount, setIsGroupedByAccount,
    allExpenses, monthExpenses, groupedExpenses, totalBudgeted, remainingBudget, paguDana,
    allAccounts, handleExportPDF, profile
}: ReviewModalProps) => {
    if (!isOpen) return null;

    const currentExpenses = reviewPeriod === 'yearly' ? allExpenses : monthExpenses;
    const currentTotal = reviewPeriod === 'yearly' ? totalBudgeted : monthExpenses.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                            <Eye size={16} className="text-white" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Pratinjau Kertas Kerja</h3>
                            <p className="text-[10px] text-slate-400 font-medium">BOSP  {CURRENT_YEAR}</p>
                        </div>
                    </div>
                    {/* Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setReviewPeriod('yearly')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reviewPeriod === 'yearly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                1 Tahun
                            </button>
                            <button
                                onClick={() => setReviewPeriod('monthly')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reviewPeriod === 'monthly'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Bulan {MONTHS_FULL[activeMonth - 1]}
                            </button>
                        </div>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setIsGroupedByAccount(false)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!isGroupedByAccount
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Kegiatan
                            </button>
                            <button
                                onClick={() => setIsGroupedByAccount(true)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isGroupedByAccount
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Per Rekening
                            </button>
                        </div>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setReviewTab('pdf')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reviewTab === 'pdf'
                                    ? 'bg-white text-rose-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <FileText size={13} strokeWidth={2.5} />
                                PDF
                            </button>
                            <button
                                onClick={() => setReviewTab('excel')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${reviewTab === 'excel'
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Grid size={13} strokeWidth={2.5} />
                                Excel
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={15} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Preview Body */}
                <div className="flex-1 overflow-y-auto bg-slate-100">
                    <AnimatePresence mode="wait">
                        {/* ─── PDF View ─── */}
                        {reviewTab === 'pdf' && (
                            <motion.div
                                key="pdf"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="p-6 flex justify-center"
                            >
                                <div className="bg-white shadow-xl w-full max-w-3xl rounded-lg overflow-hidden" style={{ fontFamily: 'Times New Roman, serif' }}>
                                    <div className="px-12 py-8 border-b-4 border-slate-900 text-center">
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">PEMERINTAH KOTA / KABUPATEN</p>
                                        <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide mt-1">RENCANA KEGIATAN DAN ANGGARAN SEKOLAH</h1>
                                        <h2 className="text-base font-bold text-slate-800 mt-0.5">(RKAS)</h2>
                                        <div className="mt-3 text-sm text-slate-700">
                                            <p className="font-semibold">Tahun Anggaran {CURRENT_YEAR}</p>
                                            <p className="font-semibold mt-0.5">BOSP {reviewPeriod === 'monthly' ? `- ${MONTHS_FULL[activeMonth - 1]}` : ''}</p>
                                        </div>
                                    </div>

                                    <div className="px-12 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-x-8 text-xs">
                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <span className="w-32 font-semibold text-slate-600">Satuan Pendidikan</span>
                                                <span className="font-bold text-slate-900">: {profile?.name || 'SD Negeri Tempurejo 1'}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="w-32 font-semibold text-slate-600">NPSN</span>
                                                <span className="font-bold text-slate-900">: {profile?.npsn || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {reviewPeriod === 'yearly' ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        <span className="w-32 font-semibold text-slate-600">Pagu Dana</span>
                                                        <span className="font-bold text-slate-900">: {formatRupiah(paguDana)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="w-32 font-semibold text-slate-600">Sudah Dianggarkan</span>
                                                        <span className="font-bold text-slate-900">: {formatRupiah(totalBudgeted)}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="w-32 font-semibold text-slate-600">Sisa</span>
                                                        <span className={`font-bold ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                            : {formatRupiah(remainingBudget)}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <span className="w-32 font-semibold text-slate-600">Total Anggaran Bulan Ini</span>
                                                    <span className="font-bold text-slate-900">: {formatRupiah(currentTotal)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-6 py-4">
                                        <table className="w-full text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-800 text-white">
                                                    <th className="px-2 py-2 text-center border border-slate-600 w-8">No</th>
                                                    <th className="px-2 py-2 text-left border border-slate-600">Uraian</th>
                                                    <th className="px-2 py-2 text-center border border-slate-600 w-16">Vol</th>
                                                    <th className="px-2 py-2 text-center border border-slate-600 w-16">Satuan</th>
                                                    <th className="px-2 py-2 text-right border border-slate-600 w-24">Harga Satuan</th>
                                                    <th className="px-2 py-2 text-right border border-slate-600 w-24">{reviewPeriod === 'monthly' ? 'Total (Bulan Ini)' : 'Jumlah'}</th>
                                                    <th className="px-2 py-2 text-center border border-slate-600 w-20">Bulan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentExpenses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic border border-slate-200">
                                                            Belum ada data anggaran
                                                        </td>
                                                    </tr>
                                                ) : !isGroupedByAccount ? (
                                                    currentExpenses.map((item, i) => {
                                                        const qty = reviewPeriod === 'yearly' ? item.quantity : Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1));
                                                        const amt = reviewPeriod === 'yearly' ? item.amount : Math.round((item.amount) / Math.max(item.realization_months?.length || 1, 1));
                                                        return (
                                                            <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                                                <td className="px-2 py-1.5 text-center border border-slate-200">{i + 1}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200">
                                                                    <div className="font-semibold text-slate-900">{item.description}</div>
                                                                    {item.account_code && (
                                                                        <div className="text-[10px] text-slate-400 font-mono">{item.account_code} — {allAccounts[item.account_code] || ''}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-center border border-slate-200">{qty}</td>
                                                                <td className="px-2 py-1.5 text-center border border-slate-200">{item.unit || '-'}</td>
                                                                <td className="px-2 py-1.5 text-right border border-slate-200 font-mono">{formatRupiah(item.unit_price || 0)}</td>
                                                                <td className="px-2 py-1.5 text-right border border-slate-200 font-mono font-bold text-slate-900">{formatRupiah(amt)}</td>
                                                                <td className="px-2 py-1.5 text-center border border-slate-200">
                                                                    <span className="text-[9px] leading-tight">
                                                                        {(item.realization_months || []).map(m => MONTHS_FULL[m - 1].slice(0, 3)).join(', ')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })
                                                ) : (
                                                    groupedExpenses.map(([code, items]) => (
                                                        <React.Fragment key={code}>
                                                            <tr className="bg-slate-100/80">
                                                                <td colSpan={7} className="px-2 py-1.5 border border-slate-200">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded font-mono">{code}</span>
                                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{allAccounts[code] || 'Tanpa Kode Rekening'}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {items.map((item, i) => {
                                                                const qty = reviewPeriod === 'yearly' ? item.quantity : Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1));
                                                                const amt = reviewPeriod === 'yearly' ? item.amount : Math.round((item.amount) / Math.max(item.realization_months?.length || 1, 1));
                                                                return (
                                                                    <tr key={item.id} className="bg-white">
                                                                        <td className="px-2 py-1 text-center border border-slate-200 text-slate-400">{i + 1}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 pl-4">
                                                                            <div className="text-[11px] font-medium text-slate-700">{item.description}</div>
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center border border-slate-200">{qty}</td>
                                                                        <td className="px-2 py-1 text-center border border-slate-200">{item.unit || '-'}</td>
                                                                        <td className="px-2 py-1 text-right border border-slate-200 font-mono">{formatRupiah(item.unit_price || 0)}</td>
                                                                        <td className="px-2 py-1 text-right border border-slate-200 font-mono font-bold text-slate-900">{formatRupiah(amt)}</td>
                                                                        <td className="px-2 py-1 text-center border border-slate-200">
                                                                            <span className="text-[9px]">
                                                                                {(item.realization_months || []).map(m => MONTHS_FULL[m - 1].slice(0, 3)).join(', ')}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                            <tr className="bg-slate-50 font-bold border-b-2 border-slate-200">
                                                                <td colSpan={5} className="px-2 py-1 text-right border border-slate-200 text-[10px] text-slate-500 italic">Subtotal {code}</td>
                                                                <td className="px-2 py-1 text-right border border-slate-200 font-mono text-blue-700">
                                                                    {formatRupiah(items.reduce((s, it) => s + (reviewPeriod === 'yearly' ? it.amount : Math.round(it.amount / Math.max(it.realization_months?.length || 1, 1))), 0))}
                                                                </td>
                                                                <td className="border border-slate-200" />
                                                            </tr>
                                                        </React.Fragment>
                                                    ))
                                                )}
                                                {currentExpenses.length > 0 && (
                                                    <tr className="bg-slate-800 text-white font-bold">
                                                        <td colSpan={5} className="px-2 py-2 text-right border border-slate-600 uppercase tracking-widest text-[10px]">
                                                            TOTAL
                                                        </td>
                                                        <td className="px-2 py-2 text-right border border-slate-600 font-mono">
                                                            {formatRupiah(currentTotal)}
                                                        </td>
                                                        <td className="border border-slate-600" />
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="px-12 py-6 grid grid-cols-2 gap-12 text-xs text-slate-700">
                                        <div className="text-center">
                                            <p>Mengetahui,</p>
                                            <p className="font-semibold">{profile?.kepalaSekolah || 'Kepala Sekolah'}</p>
                                            <div className="h-14" />
                                            <p className="font-bold border-t border-slate-700 pt-1">({profile?.kepalaSekolah || '__________________________'})</p>
                                            <p>NIP. {profile?.nipKepsek || ''}</p>
                                        </div>
                                        <div className="text-center">
                                            <p>Bendahara BOS,</p>
                                            <div className="h-14" />
                                            <p className="font-bold border-t border-slate-700 pt-1">({profile?.bendahara || '__________________________'})</p>
                                            <p>NIP. {profile?.nipBendahara || ''}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ─── Excel View ─── */}
                        {reviewTab === 'excel' && (
                            <motion.div
                                key="excel"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="p-6"
                            >
                                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white">
                                        <Grid size={15} />
                                        <span className="text-xs font-bold">Kertas Kerja RKAS — BOSP {CURRENT_YEAR}{reviewPeriod === 'monthly' ? ` (Bulan ${MONTHS_FULL[activeMonth - 1]})` : ''}.xlsx</span>
                                    </div>
                                    <div className="flex text-[10px] font-bold text-slate-500 bg-slate-100 border-b border-slate-200">
                                        {['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((c, i) => (
                                            <div key={i} className={`border-r border-slate-200 text-center py-1 ${i === 0 ? 'w-8' : i === 4 ? 'flex-1' : 'w-20'
                                                }`}>{c}</div>
                                        ))}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
                                            <thead>
                                                <tr className="bg-emerald-600 text-white">
                                                    <th className="w-8 px-2 py-2 border border-emerald-500 text-center">No</th>
                                                    <th className="w-28 px-2 py-2 border border-emerald-500 text-left">Kegiatan</th>
                                                    <th className="w-24 px-2 py-2 border border-emerald-500 text-left">Rekening</th>
                                                    <th className="w-20 px-2 py-2 border border-emerald-500 text-left">Kode Akun</th>
                                                    <th className="px-2 py-2 border border-emerald-500 text-left">Uraian Kegiatan</th>
                                                    <th className="w-12 px-2 py-2 border border-emerald-500 text-center">Vol</th>
                                                    <th className="w-16 px-2 py-2 border border-emerald-500 text-center">Satuan</th>
                                                    <th className="w-24 px-2 py-2 border border-emerald-500 text-right">Harga Satuan</th>
                                                    <th className="w-24 px-2 py-2 border border-emerald-500 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentExpenses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">
                                                            Belum ada data anggaran
                                                        </td>
                                                    </tr>
                                                ) : !isGroupedByAccount ? (
                                                    currentExpenses.map((item, i) => {
                                                        const qty = reviewPeriod === 'yearly' ? item.quantity : Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1));
                                                        const amt = reviewPeriod === 'yearly' ? item.amount : Math.round((item.amount) / Math.max(item.realization_months?.length || 1, 1));
                                                        return (
                                                            <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                                                                <td className="px-2 py-1.5 border border-slate-200 text-center text-slate-500">{i + 1}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200">
                                                                    <span className="text-teal-700 font-semibold truncate block max-w-[108px]">{item.category}</span>
                                                                </td>
                                                                <td className="px-2 py-1.5 border border-slate-200">
                                                                    <span className="text-slate-500 font-semibold truncate block max-w-[88px]">{allAccounts[item.account_code || ''] || '-'}</span>
                                                                </td>
                                                                <td className="px-2 py-1.5 border border-slate-200 font-mono text-[10px] text-blue-600">{item.account_code || '-'}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200 font-semibold text-slate-800">{item.description}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200 text-center">{qty}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200 text-center text-slate-600">{item.unit || '-'}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200 text-right font-mono">{formatRupiah(item.unit_price || 0)}</td>
                                                                <td className="px-2 py-1.5 border border-slate-200 text-right font-mono font-bold text-emerald-800">{formatRupiah(amt)}</td>
                                                            </tr>
                                                        )
                                                    })
                                                ) : (
                                                    groupedExpenses.map(([code, items]) => (
                                                        <React.Fragment key={code}>
                                                            <tr className="bg-emerald-100/50 font-bold border-y border-emerald-200">
                                                                <td colSpan={4} className="px-2 py-1 border border-slate-200 text-emerald-800 font-mono text-[10px]">{code}</td>
                                                                <td colSpan={5} className="px-2 py-1 border border-slate-200 text-emerald-900 uppercase tracking-tight">{allAccounts[code] || 'Tanpa Kode Rekening'}</td>
                                                            </tr>
                                                            {items.map((item, i) => {
                                                                const qty = reviewPeriod === 'yearly' ? item.quantity : Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1));
                                                                const amt = reviewPeriod === 'yearly' ? item.amount : Math.round((item.amount) / Math.max(item.realization_months?.length || 1, 1));
                                                                return (
                                                                    <tr key={item.id} className="bg-white">
                                                                        <td className="px-2 py-1 border border-slate-200 text-center text-slate-400">{i + 1}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-slate-400 truncate max-w-[80px]">{item.category}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-slate-400 truncate max-w-[70px] font-semibold">{allAccounts[code]?.split(' ').slice(0, 2).join(' ')}...</td>
                                                                        <td className="px-2 py-1 border border-slate-200 font-mono text-[9px] text-slate-400">{code}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 pl-4 text-slate-700">{item.description}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-center">{qty}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-center">{item.unit || '-'}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-right font-mono">{formatRupiah(item.unit_price || 0)}</td>
                                                                        <td className="px-2 py-1 border border-slate-200 text-right font-mono font-bold text-emerald-700">{formatRupiah(amt)}</td>
                                                                    </tr>
                                                                )
                                                            })}
                                                            <tr className="bg-emerald-50/50 font-bold">
                                                                <td colSpan={8} className="px-2 py-1 text-right border border-slate-200 text-[10px] text-emerald-600 italic uppercase">Subtotal {code}</td>
                                                                <td className="px-2 py-1 text-right border border-slate-200 font-mono text-emerald-800">
                                                                    {formatRupiah(items.reduce((s, it) => s + (reviewPeriod === 'yearly' ? it.amount : Math.round(it.amount / Math.max(it.realization_months?.length || 1, 1))), 0))}
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    ))
                                                )}
                                                {currentExpenses.length > 0 && (
                                                    <tr className="bg-emerald-700 text-white font-bold">
                                                        <td colSpan={8} className="px-3 py-2 text-right border border-emerald-600 text-[10px] uppercase tracking-widest">TOTAL ANGGARAN {reviewPeriod === 'monthly' ? 'BULAN INI' : ''}</td>
                                                        <td className="px-2 py-2 text-right border border-emerald-600 font-mono">{formatRupiah(currentTotal)}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
                    <p className="text-xs text-slate-400">
                        {currentExpenses.length} kegiatan · {formatRupiah(currentTotal)} {reviewPeriod === 'yearly' ? `dari ${formatRupiah(paguDana)}` : ''}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg transition-colors"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                            <Download size={13} strokeWidth={2.5} />
                            Unduh / Cetak
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ReviewModal;
