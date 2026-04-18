import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, HelpCircle, Plus, Search, Shield, X, ChevronRight } from 'lucide-react';
import { CURRENT_YEAR, SchoolProfile } from './BudgetTypes';
import { formatRupiah } from './BudgetUtils';

interface BudgetHeaderProps {
    profile: SchoolProfile | null;
    totalBudgeted: number;
    paguDana: number;
    remainingBudget: number;
    isSearchOpen: boolean;
    setIsSearchOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    handleOpenAdd: () => void;
    setIsReviewOpen: (v: boolean) => void;
    setReviewTab: (v: 'pdf' | 'excel') => void;
    searchInputRef: React.RefObject<any>;
    itemVariants: any;
}

const BudgetHeader = ({
    profile, totalBudgeted, paguDana, remainingBudget,
    isSearchOpen, setIsSearchOpen, searchTerm, setSearchTerm,
    handleOpenAdd, setIsReviewOpen, setReviewTab,
    searchInputRef, itemVariants
}: BudgetHeaderProps) => {
    return (
        <>
            {/* ── TOP NAVIGATION BAR ── */}
            <motion.div
                variants={itemVariants}
                className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-2.5 flex items-center justify-between shadow-sm"
            >
                <button className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-semibold transition-colors group">
                    <ArrowLeft size={14} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                    Kembali ke Penganggaran
                </button>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <HelpCircle size={14} className="text-slate-400" />
                    <span>Butuh panduan mengisi?</span>
                    <button className="text-blue-500 hover:text-blue-700 font-semibold underline underline-offset-2 transition-colors">
                        Baca Panduan Selengkapnya
                    </button>
                </div>
            </motion.div>

            {/* ── PAGE HEADER ── */}
            <motion.div
                variants={itemVariants}
                className="bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-6 pt-5 pb-4 shadow-sm"
            >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            Menyusun Kertas Kerja
                        </h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            BOSP  {CURRENT_YEAR}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <motion.button
                            id="btn-tambah-kegiatan"
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={handleOpenAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 transition-all shadow-sm"
                        >
                            <Plus size={15} strokeWidth={2.5} className="text-blue-600" />
                            Tambah Kegiatan
                        </motion.button>

                        <motion.button
                            id="btn-cari"
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setIsSearchOpen((v) => !v)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-all shadow-sm ${isSearchOpen
                                ? 'bg-blue-50 border-blue-400 text-blue-700'
                                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                                }`}
                        >
                            <Search size={14} strokeWidth={2.5} />
                            Cari
                        </motion.button>

                        <motion.button
                            id="btn-review"
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setReviewTab('pdf'); setIsReviewOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-900 rounded-lg text-sm font-semibold text-white transition-all shadow-sm"
                        >
                            <Shield size={14} strokeWidth={2.5} />
                            Review
                        </motion.button>
                    </div>
                </div>

                {/* Search Bar (animated) */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="relative mt-3">
                                <Search
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={16}
                                    strokeWidth={2.5}
                                />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Cari kegiatan, kode rekening..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm placeholder-slate-400"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ── BUDGET SUMMARY BAR ── */}
            <motion.div
                variants={itemVariants}
                className="bg-white/60 backdrop-blur-md border-b border-slate-200/50 px-6 py-3.5 flex flex-wrap items-center gap-4"
            >
                {/* Pagu Dana */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm min-w-[200px]">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-300 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Pagu Dana BOSP
                        </p>
                        <p className="text-sm font-black font-mono text-slate-800 mt-0.5">
                            {formatRupiah(paguDana)}
                        </p>
                        {(profile?.studentCount ?? 0) > 0 && (
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                {profile!.studentCount} siswa × {formatRupiah(900000)}
                            </p>
                        )}
                    </div>
                </div>

                <ChevronRight size={14} className="text-slate-300 hidden sm:block" />

                {/* Sudah Dianggarkan */}
                <div className="flex items-center gap-3 bg-emerald-50/80 rounded-xl border border-emerald-200 px-4 py-2.5 shadow-sm min-w-[200px]">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-300 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Sudah Dianggarkan
                        </p>
                        <p className="text-sm font-black font-mono text-emerald-800 mt-0.5">
                            {formatRupiah(totalBudgeted)}
                        </p>
                    </div>
                </div>

                <ChevronRight size={14} className="text-slate-300 hidden sm:block" />

                {/* Belum Dianggarkan */}
                <div
                    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 shadow-sm min-w-[200px] ${remainingBudget < 0
                        ? 'bg-rose-50/80 border-rose-200'
                        : 'bg-amber-50/80 border-amber-200'
                        }`}
                >
                    <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${remainingBudget < 0 ? 'bg-rose-500 shadow-rose-300' : 'bg-amber-500 shadow-amber-300'
                            } shadow-sm`}
                    />
                    <div>
                        <p
                            className={`text-[10px] font-black uppercase tracking-widest ${remainingBudget < 0 ? 'text-rose-700' : 'text-amber-700'
                                }`}
                        >
                            Belum Dianggarkan
                        </p>
                        <p
                            className={`text-sm font-black font-mono mt-0.5 ${remainingBudget < 0 ? 'text-rose-800' : 'text-amber-800'
                                }`}
                        >
                            {formatRupiah(Math.abs(remainingBudget))}
                            {remainingBudget < 0 && (
                                <span className="text-[10px] ml-1 font-bold">(Melebihi Pagu!)</span>
                            )}
                        </p>
                    </div>
                </div>
            </motion.div>
        </>
    );
};

export default BudgetHeader;
