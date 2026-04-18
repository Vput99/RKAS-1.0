import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Sparkles, Loader2, CheckCircle, AlertTriangle, ChevronDown, Check, Trash2, Plus } from 'lucide-react';
import { MONTHS_FULL, SNPStandard, BOSPComponent, MonthEntry } from './BudgetTypes';
import { formatRupiah } from './BudgetUtils';

interface BudgetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingId: string | null;
    kegiatanQuery: string;
    setKegiatanQuery: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    bospComponent: string;
    setBospComponent: (v: string) => void;
    snpStandard: string;
    setSnpStandard: (v: string) => void;
    accountCode: string;
    accountSearchTerm: string;
    setAccountSearchTerm: (v: string) => void;
    isAccountDropdownOpen: boolean;
    setIsAccountDropdownOpen: (v: boolean) => void;
    filteredAccounts: [string, any][];
    selectAccount: (code: string, name: string) => void;
    unitPrice: number;
    setUnitPrice: (v: number) => void;
    monthEntries: MonthEntry[];
    updateEntry: (id: string, field: keyof MonthEntry, value: number | string) => void;
    addEntry: () => void;
    removeEntry: (id: string) => void;
    totalAmount: number;
    isAnalyzing: boolean;
    handleAIAnalysis: () => void;
    isEligible: boolean | null;
    aiWarning: string;
    handleSubmit: (e: React.FormEvent) => void;
    dropdownRef: React.RefObject<any>;
}

const BudgetFormModal = ({
    isOpen, onClose, editingId, kegiatanQuery, setKegiatanQuery,
    description, setDescription, bospComponent, setBospComponent,
    snpStandard, setSnpStandard, accountCode, accountSearchTerm, setAccountSearchTerm,
    isAccountDropdownOpen, setIsAccountDropdownOpen, filteredAccounts, selectAccount,
    unitPrice, setUnitPrice, monthEntries, updateEntry, addEntry, removeEntry,
    totalAmount, isAnalyzing, handleAIAnalysis, isEligible, aiWarning,
    handleSubmit, dropdownRef
}: BudgetFormModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 340 }}
                className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* ── Modal Header ── */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-base font-bold text-slate-900">
                        Isi Detail Anggaran Kegiatan
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X size={15} strokeWidth={2.5} />
                    </button>
                </div>

                {/* ── Scrollable Form Body ── */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-6 py-5 space-y-4 flex-1">

                        {/* ─── Kegiatan (AI Search) ─── */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                Kegiatan
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative">
                                    <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        value={kegiatanQuery}
                                        onChange={e => setKegiatanQuery(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAIAnalysis(); } }}
                                        placeholder="Apa kegiatan yang ingin Anda anggarkan?"
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                                    />
                                </div>
                                <motion.button
                                    type="button"
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzing || !kegiatanQuery}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {isAnalyzing
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <Sparkles size={14} strokeWidth={2.5} />
                                    }
                                    Generate AI
                                </motion.button>
                            </div>

                            {/* AI result badge */}
                            <AnimatePresence>
                                {isEligible !== null && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`mt-2 flex items-start gap-2 text-xs p-2.5 rounded-lg border ${isEligible
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-rose-50 border-rose-200 text-rose-700'
                                            }`}
                                    >
                                        {isEligible
                                            ? <CheckCircle size={13} className="mt-0.5 flex-shrink-0" />
                                            : <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                                        }
                                        <span className="font-medium">
                                            {isEligible ? 'Rekomendasi AI sudah diterapkan. Periksa kembali sebelum menyimpan.' : aiWarning}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ─── Standar SNP (Dropdown) ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Standar SNP
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        value={snpStandard}
                                        onChange={e => setSnpStandard(e.target.value)}
                                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer transition-all shadow-sm"
                                    >
                                        {Object.values(SNPStandard).slice(0, 8).map((std) => (
                                            <option key={std as string} value={std as string}>{std as string}</option>
                                        ))}
                                        <option value={SNPStandard.LAINNYA}>{SNPStandard.LAINNYA}</option>
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Komponen BOSP
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        value={bospComponent}
                                        onChange={e => setBospComponent(e.target.value)}
                                        className="w-full appearance-none bg-white border border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer transition-all shadow-sm"
                                    >
                                        {Object.values(BOSPComponent).map((comp) => (
                                            <option key={comp as string} value={comp as string}>{comp as string}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown size={16} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Rekening Belanja ─── */}
                        <div className="relative" ref={dropdownRef}>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                Rekening Belanja
                            </label>
                            <div className="relative">
                                <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={accountSearchTerm}
                                    onChange={e => { setAccountSearchTerm(e.target.value); setIsAccountDropdownOpen(true); }}
                                    onFocus={() => setIsAccountDropdownOpen(true)}
                                    placeholder="Apa jenis rekening belanja yang ingin Anda anggarkan untuk kegiatan tersebut?"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <AnimatePresence>
                                {isAccountDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1.5 max-h-52 overflow-y-auto custom-scrollbar"
                                    >
                                        {filteredAccounts.length === 0 ? (
                                            <div className="p-4 text-xs text-slate-400 text-center">Rekening tidak ditemukan.</div>
                                        ) : filteredAccounts.map(([code, name]) => (
                                            <div
                                                key={code}
                                                onClick={() => selectAccount(code, name)}
                                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors ${accountCode === code ? 'bg-blue-50' : ''}`}
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-mono text-xs font-bold text-indigo-600">{code}</span>
                                                    <span className="text-xs text-slate-600 font-medium">{name}</span>
                                                </div>
                                                {accountCode === code && <Check size={13} strokeWidth={3} className="text-blue-600 flex-shrink-0" />}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ─── Uraian + Harga Satuan ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Uraian</label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Apa detail barang atau jasanya? (mis. papan tulis, honor narasumber)"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Harga Satuan yang Dianggarkan</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={unitPrice || ''}
                                    onChange={e => setUnitPrice(Number(e.target.value))}
                                    placeholder="Berapa perkiraaan harganya?"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* ─── Dianggarkan untuk Bulan ─── */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-3">Dianggarkan untuk Bulan</label>

                            <div className="space-y-2.5">
                                <AnimatePresence initial={false}>
                                    {monthEntries.map((entry) => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                            className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2"
                                        >
                                            {/* Bulan */}
                                            <div className="relative w-1/3 min-w-[120px]">
                                                <select
                                                    value={entry.month}
                                                    onChange={e => updateEntry(entry.id, 'month', Number(e.target.value))}
                                                    className="w-full appearance-none bg-white border border-slate-300 rounded-md py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 cursor-pointer transition-all shadow-sm"
                                                >
                                                    {MONTHS_FULL.map((m, i) => (
                                                        <option key={i + 1} value={i + 1}>{m}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>

                                            {/* Jumlah */}
                                            <input
                                                type="number"
                                                min="0"
                                                value={entry.quantity || ''}
                                                onChange={e => updateEntry(entry.id, 'quantity', Number(e.target.value))}
                                                placeholder="Qty"
                                                className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                                            />

                                            {/* Satuan */}
                                            <div className="relative flex-1 min-w-[100px]">
                                                <input
                                                    type="text"
                                                    value={entry.unit}
                                                    onChange={e => updateEntry(entry.id, 'unit', e.target.value)}
                                                    placeholder="Satuan (cth: Rim)"
                                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                                                />
                                            </div>

                                            {/* Subtotal */}
                                            <div className="w-28 text-right hidden sm:block">
                                                <span className="text-xs font-mono font-bold text-slate-700">
                                                    {formatRupiah((entry.quantity || 0) * unitPrice)}
                                                </span>
                                            </div>

                                            {/* Hapus */}
                                            <div className="w-8 flex justify-center">
                                                {monthEntries.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEntry(entry.id)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        title="Hapus bulan"
                                                    >
                                                        <Trash2 size={13} strokeWidth={2.5} />
                                                    </button>
                                                ) : (
                                                    <div className="w-7 h-7" />
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 gap-3">
                                    <motion.button
                                        type="button"
                                        onClick={addEntry}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="py-2 px-4 shadow-sm bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <Plus size={14} strokeWidth={2.5} />
                                        Tambah Bulan
                                    </motion.button>

                                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-4 py-2 flex items-center justify-between sm:justify-end gap-4 min-w-[200px]">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Anggaran</p>
                                        <p className="text-base font-black font-mono text-blue-700 tabular-nums">
                                            {formatRupiah(totalAmount)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── Footer Buttons ── */}
                    <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0 bg-white">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-all"
                        >
                            Batal
                        </button>
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-all shadow-sm bg-slate-900 hover:bg-slate-700 shadow-slate-400/30"
                        >
                            <Plus size={15} strokeWidth={2.5} />
                            {editingId ? 'Simpan Perubahan' : 'Masukkan ke Anggaran'}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default BudgetFormModal;
