import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Budget, TransactionType, BOSPComponent, SNPStandard, AccountCodes, SchoolProfile } from '../types';
import {
  Plus, Search, Edit2, Trash2, X, Calculator, Sparkles, Loader2,
  AlertTriangle, CheckCircle, ChevronDown, Check, FileText, ArrowLeft,
  Shield, HelpCircle, ChevronRight,
  Eye, Download, Grid, Printer
} from 'lucide-react';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getStoredAccounts } from '../lib/db';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BudgetPlanningProps {
  data: Budget[];
  profile: SchoolProfile | null;
  onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, updates: Partial<Budget>) => void;
  onDelete: (id: string) => void;
}

type MonthEntry = {
  id: string;
  month: number;
  quantity: number;
  unit: string;
};

const mkEntry = (month: number): MonthEntry => ({
  id: Math.random().toString(36).slice(2),
  month,
  quantity: 1,
  unit: '',
});

const MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CURRENT_YEAR = new Date().getFullYear();
const BOSP_PER_SISWA = 900_000;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } }
};

const BudgetPlanning: React.FC<BudgetPlanningProps> = ({ data, profile, onAdd, onUpdate, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Tab / Filter State
  const [activeMonth, setActiveMonth] = useState<number>(new Date().getMonth() + 1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<'pdf' | 'excel'>('pdf');
  const [reviewPeriod, setReviewPeriod] = useState<'yearly' | 'monthly'>('yearly');

  // ── Form: Kegiatan (description / AI trigger) ──
  const [kegiatanQuery, setKegiatanQuery] = useState('');       // top search field
  const [description, setDescription] = useState('');           // Uraian detail
  const [bospComponent, setBospComponent] = useState<string>(Object.values(BOSPComponent)[0]);
  const [snpStandard, setSnpStandard] = useState<string>(Object.values(SNPStandard)[0]);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // ── Form: Rekening Belanja ──
  const [accountCode, setAccountCode] = useState<string>('');
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  // ── Form: Month Entries ──
  const defaultMonth = new Date().getMonth() + 1;
  const [monthEntries, setMonthEntries] = useState<MonthEntry[]>([mkEntry(defaultMonth)]);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiWarning, setAiWarning] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [aiLogic, setAiLogic] = useState<string>(''); // NEW: AI Logic State

  // Custom Accounts State
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const accs = await getStoredAccounts();
      setAllAccounts(accs);
    };
    if (isModalOpen) load();
  }, [isModalOpen]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (accountCode && allAccounts[accountCode]) {
      if (!accountSearchTerm.includes(accountCode)) {
        setAccountSearchTerm(`${accountCode} - ${allAccounts[accountCode]}`);
      }
    } else if (!accountCode) {
      setAccountSearchTerm('');
    }
  }, [accountCode, allAccounts]);

  const filteredAccounts = useMemo(() => {
    const term = accountSearchTerm.toLowerCase();
    return Object.entries(allAccounts).filter(
      ([code, name]) =>
        code.toLowerCase().includes(term) ||
        (name as string).toLowerCase().includes(term)
    );
  }, [allAccounts, accountSearchTerm]);

  // All expenses
  const allExpenses = useMemo(
    () => data.filter((d) => d.type === TransactionType.EXPENSE),
    [data]
  );

  // Expenses for active month tab
  const monthExpenses = useMemo(() => {
    return allExpenses
      .filter((d) => d.realization_months?.includes(activeMonth))
      .filter((d) =>
        searchTerm
          ? d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (d.account_code || '').toLowerCase().includes(searchTerm.toLowerCase())
          : true
      );
  }, [allExpenses, activeMonth, searchTerm]);

  // Budget numbers
  const PAGU_DANA = useMemo(() => {
    const count = profile?.studentCount || 0;
    return count > 0 ? count * BOSP_PER_SISWA : 900_000_000;
  }, [profile?.studentCount]);

  const totalBudgeted = useMemo(
    () => allExpenses.reduce((acc, curr) => acc + curr.amount, 0),
    [allExpenses]
  );
  const remainingBudget = PAGU_DANA - totalBudgeted;

  const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);

  // Month item count badge helper
  const getMonthCount = (monthNum: number) =>
    allExpenses.filter((d) => d.realization_months?.includes(monthNum)).length;

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `Rencana Kegiatan dan Anggaran Sekolah (RKAS) - ${reviewPeriod === 'monthly' ? MONTHS_FULL[activeMonth - 1] : 'Tahunan'}`;
    const startY = generatePDFHeader(doc, profile, title);

    const exportData = reviewPeriod === 'yearly' ? allExpenses : monthExpenses;

    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['No', 'Uraian', 'Vol', 'Satuan', 'Harga Satuan', 'Jumlah', 'Bulan']],
      body: exportData.map((item, i) => {
        const qty = reviewPeriod === 'yearly' ? item.quantity : Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1));
        const amt = reviewPeriod === 'yearly' ? item.amount : Math.round((item.amount) / Math.max(item.realization_months?.length || 1, 1));
        return [
          i + 1,
          {
            content: `${item.description}${item.account_code ? `\n${item.account_code} — ${allAccounts[item.account_code] || ''}` : ''}`,
            styles: { fontSize: 8 }
          },
          qty || 0,
          item.unit || '-',
          formatCurrency(item.unit_price || 0),
          formatCurrency(amt || 0),
          (item.realization_months || []).map(m => MONTHS_FULL[m - 1]?.slice(0, 3) || '').join(', ')
        ];
      }) as any[][],
      foot: [[
        { content: 'TOTAL ANGGARAN', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrency(reviewPeriod === 'yearly' ? totalBudgeted : exportData.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0)), styles: { fontStyle: 'bold' } },
        ''
      ]],
    });

    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`RKAS_${reviewPeriod}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  /* ─────────────── Form Logic ─────────────── */
  const resetForm = useCallback(() => {
    setEditingId(null);
    setKegiatanQuery('');
    setDescription('');
    setBospComponent(Object.values(BOSPComponent)[0]);
    setSnpStandard(Object.values(SNPStandard)[0]);
    setAccountCode('');
    setAccountSearchTerm('');
    setUnitPrice(0);
    setMonthEntries([mkEntry(new Date().getMonth() + 1)]);
    setAiWarning('');
    setAiLogic(''); // NEW: Reset Logic
    setIsEligible(null);
  }, []);

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Budget) => {
    setEditingId(item.id);
    setKegiatanQuery(item.description);
    setDescription(item.description);
    setBospComponent(item.bosp_component);
    setSnpStandard(item.category);
    const code = item.account_code || '';
    setAccountCode(code);
    setAccountSearchTerm(code && allAccounts[code] ? `${code} - ${allAccounts[code]}` : code);
    setUnitPrice(item.unit_price || item.amount);
    // Rebuild monthEntries from stored data
    const months = item.realization_months || [];
    if (months.length > 0) {
      setMonthEntries(months.map(m => ({
        id: Math.random().toString(36).slice(2),
        month: m,
        quantity: item.quantity || 1,
        unit: item.unit || '',
      })));
    } else {
      setMonthEntries([mkEntry(new Date().getMonth() + 1)]);
    }
    setAiWarning(item.warning_message || '');
    setAiLogic(item.ai_analysis_logic || ''); // NEW: Load stored logic
    setIsEligible(item.is_bosp_eligible !== undefined ? item.is_bosp_eligible : null);
    setIsModalOpen(true);
  };

  const handleAIAnalysis = async () => {
    const query = kegiatanQuery.trim();
    if (!query || query.length < 3) return;
    setIsAnalyzing(true);
    setAiWarning('');
    setIsEligible(null);
    const result = await analyzeBudgetEntry(query, allAccounts);
    if (result) {
      setBospComponent(result.bosp_component);
      setSnpStandard(result.snp_standard);
      if (result.account_code) {
        setAccountCode(result.account_code);
        const name = allAccounts[result.account_code] || '';
        setAccountSearchTerm(`${result.account_code} - ${name}`);
      }
      setIsEligible(result.is_eligible);
      setAiWarning(result.warning);
      setAiLogic(result.suggestion_logic || ''); // NEW: Store rationale
      if (result.suggestion) { setKegiatanQuery(result.suggestion); setDescription(result.suggestion); }
      else { setDescription(query); }
      if (result.price_estimate > 0) setUnitPrice(result.price_estimate);
      if ((result.quantity_estimate > 0 || result.unit_estimate) && monthEntries.length > 0) {
        setMonthEntries(prev => prev.map((e, i) => i === 0 ? {
          ...e,
          quantity: result.quantity_estimate > 0 ? result.quantity_estimate : e.quantity,
          unit: result.unit_estimate || e.unit,
        } : e));
      }
      if (result.realization_months_estimate?.length && monthEntries.every(e => e.month === defaultMonth)) {
        setMonthEntries(result.realization_months_estimate.map(m => mkEntry(m)));
      }
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalQty = monthEntries.reduce((s, e) => s + (e.quantity || 0), 0);
    const totalAmount = totalQty * unitPrice;
    const realization_months = [...new Set(monthEntries.map(e => e.month))].sort((a, b) => a - b);
    const firstUnit = monthEntries.find(e => e.unit)?.unit || '';
    const payload = {
      type: TransactionType.EXPENSE,
      description: description || kegiatanQuery,
      bosp_component: bospComponent,
      category: snpStandard,
      account_code: accountCode,
      quantity: totalQty,
      unit: firstUnit,
      unit_price: unitPrice,
      amount: totalAmount,
      realization_months,
      status: 'draft' as const,
      is_bosp_eligible: isEligible === null ? true : isEligible,
      warning_message: aiWarning,
      ai_analysis_logic: aiLogic, // NEW: Persist to DB
      date: new Date().toISOString(),
    };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
    }
    setIsModalOpen(false);
  };

  const updateEntry = (id: string, field: keyof MonthEntry, value: number | string) => {
    setMonthEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    // pick next month not yet in the list, cycling if needed
    const usedMonths = new Set(monthEntries.map(e => e.month));
    let next = (monthEntries[monthEntries.length - 1]?.month ?? 0) % 12 + 1;
    for (let i = 0; i < 12; i++) {
      if (!usedMonths.has(next)) break;
      next = next % 12 + 1;
    }
    setMonthEntries(prev => [...prev, mkEntry(next)]);
  };

  const removeEntry = (id: string) => {
    setMonthEntries(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);
  };

  const selectAccount = (code: string, name: string) => {
    setAccountCode(code);
    setAccountSearchTerm(`${code} - ${name}`);
    setIsAccountDropdownOpen(false);
  };

  // Derived total
  const totalAmount = useMemo(() =>
    monthEntries.reduce((s, e) => s + (e.quantity || 0) * unitPrice, 0),
    [monthEntries, unitPrice]
  );

  /* ─────────────── Render ─────────────── */
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col"
    >
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
              {formatRupiah(PAGU_DANA)}
            </p>
            {(profile?.studentCount ?? 0) > 0 && (
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                {profile!.studentCount} siswa × {formatRupiah(BOSP_PER_SISWA)}
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

      {/* ── MAIN CONTENT ── */}
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
          <div
            ref={tabsRef}
            className="flex overflow-x-auto scrollbar-none border-b border-slate-200/80"
          >
            {MONTHS_FULL.map((month, idx) => {
              const monthNum = idx + 1;
              const isActive = activeMonth === monthNum;
              const count = getMonthCount(monthNum);
              return (
                <button
                  key={monthNum}
                  id={`tab-bulan-${monthNum}`}
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
                <col className="w-9" />         {/* No */}
                <col className="w-40" />        {/* Kegiatan */}
                <col className="w-36" />        {/* Rekening Belanja */}
                <col className="w-auto" />      {/* Uraian — flex */}
                <col className="w-16" />        {/* Jumlah */}
                <col className="w-20" />        {/* Satuan */}
                <col className="w-28" />        {/* Harga Satuan */}
                <col className="w-28" />        {/* Total */}
                <col className="w-24" />        {/* Status */}
                <col className="w-16" />        {/* Aksi */}
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
                      <td colSpan={9} className="px-6 py-16 text-center">
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
                        {/* No */}
                        <td className="px-3 py-3 text-xs font-bold text-slate-400 text-center">
                          {index + 1}
                        </td>

                        {/* Kegiatan (SNP/Category) */}
                        <td className="px-3 py-3">
                          <span
                            title={item.category || '-'}
                            className="block truncate text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg"
                          >
                            {item.category || '-'}
                          </span>
                        </td>

                        {/* Rekening Belanja */}
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

                        {/* Uraian */}
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

                        {/* Jumlah — per-month */}
                        <td className="px-3 py-3 text-right">
                          <span className="font-bold text-slate-800 text-sm tabular-nums">
                            {Math.round((item.quantity ?? 0) / Math.max(item.realization_months?.length || 1, 1))}
                          </span>
                        </td>

                        {/* Satuan */}
                        <td className="px-3 py-3 text-center">
                          <span className="text-[11px] font-semibold text-slate-500">
                            {item.unit || '-'}
                          </span>
                        </td>

                        {/* Harga Satuan */}
                        <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-slate-600 tabular-nums">
                          {formatRupiah(item.unit_price || 0)}
                        </td>

                        {/* Total — per-month */}
                        <td className="px-3 py-3 text-right">
                          <span className="font-black font-mono text-blue-700 tabular-nums text-sm">
                            {formatRupiah(Math.round(item.amount / Math.max(item.realization_months?.length || 1, 1)))}
                          </span>
                        </td>

                        {/* Status Realisasi */}
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

                        {/* Aksi */}
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

              {/* Table Footer — monthly total */}
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
                    <td />
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

      {/* ═══════════════════════════════════════════════════
          REVIEW PREVIEW MODAL
          ═══════════════════════════════════════════════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isReviewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsReviewOpen(false)}
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
                  <div className="flex items-center gap-2">
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
                    onClick={() => setIsReviewOpen(false)}
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
                        {/* A4-ish paper */}
                        <div className="bg-white shadow-xl w-full max-w-3xl rounded-lg overflow-hidden" style={{ fontFamily: 'Times New Roman, serif' }}>
                          {/* Document Header */}
                          <div className="px-12 py-8 border-b-4 border-slate-900 text-center">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">PEMERINTAH KOTA / KABUPATEN</p>
                            <h1 className="text-lg font-black text-slate-900 uppercase tracking-wide mt-1">RENCANA KEGIATAN DAN ANGGARAN SEKOLAH</h1>
                            <h2 className="text-base font-bold text-slate-800 mt-0.5">(RKAS)</h2>
                            <div className="mt-3 text-sm text-slate-700">
                              <p className="font-semibold">Tahun Anggaran {CURRENT_YEAR}</p>
                              <p className="font-semibold mt-0.5">BOSP {reviewPeriod === 'monthly' ? `- ${MONTHS_FULL[activeMonth - 1]}` : ''}</p>
                            </div>
                          </div>

                          {/* Info Box */}
                          <div className="px-12 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 gap-x-8 text-xs">
                            <div className="space-y-1">
                              <div className="flex gap-2">
                                <span className="w-32 font-semibold text-slate-600">Satuan Pendidikan</span>
                                <span className="font-bold text-slate-900">: SD Negeri Tempurejo 1</span>
                              </div>
                              <div className="flex gap-2">
                                <span className="w-32 font-semibold text-slate-600">NPSN</span>
                                <span className="font-bold text-slate-900">: -</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {reviewPeriod === 'yearly' ? (
                                <>
                                  <div className="flex gap-2">
                                    <span className="w-32 font-semibold text-slate-600">Pagu Dana</span>
                                    <span className="font-bold text-slate-900">: {formatRupiah(PAGU_DANA)}</span>
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
                                  <span className="font-bold text-slate-900">: {formatRupiah(monthExpenses.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0))}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Table */}
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
                                {(reviewPeriod === 'yearly' ? allExpenses : monthExpenses).length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic border border-slate-200">
                                      Belum ada data anggaran
                                    </td>
                                  </tr>
                                ) : (reviewPeriod === 'yearly' ? allExpenses : monthExpenses).map((item, i) => {
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
                                })}
                                {(reviewPeriod === 'yearly' ? allExpenses : monthExpenses).length > 0 && (
                                  <tr className="bg-slate-800 text-white font-bold">
                                    <td colSpan={5} className="px-2 py-2 text-right border border-slate-600 uppercase tracking-widest text-[10px]">
                                      TOTAL
                                    </td>
                                    <td className="px-2 py-2 text-right border border-slate-600 font-mono">
                                      {formatRupiah(reviewPeriod === 'yearly' ? totalBudgeted : monthExpenses.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0))}
                                    </td>
                                    <td className="border border-slate-600" />
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Signature */}
                          <div className="px-12 py-6 grid grid-cols-2 gap-12 text-xs text-slate-700">
                            <div className="text-center">
                              <p>Mengetahui,</p>
                              <p className="font-semibold">Kepala Sekolah</p>
                              <div className="h-14" />
                              <p className="font-bold border-t border-slate-700 pt-1">(__________________________)</p>
                              <p>NIP.</p>
                            </div>
                            <div className="text-center">
                              <p>Bendahara BOS,</p>
                              <div className="h-14" />
                              <p className="font-bold border-t border-slate-700 pt-1">(__________________________)</p>
                              <p>NIP.</p>
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
                          {/* Excel toolbar mock */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white">
                            <Grid size={15} />
                            <span className="text-xs font-bold">Kertas Kerja RKAS — BOSP {CURRENT_YEAR}{reviewPeriod === 'monthly' ? ` (Bulan ${MONTHS_FULL[activeMonth - 1]})` : ''}.xlsx</span>
                          </div>
                          {/* Column letters a la Excel */}
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
                                {(reviewPeriod === 'yearly' ? allExpenses : monthExpenses).length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400 italic">
                                      Belum ada data anggaran
                                    </td>
                                  </tr>
                                ) : (reviewPeriod === 'yearly' ? allExpenses : monthExpenses).map((item, i) => {
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
                                })}
                                {(reviewPeriod === 'yearly' ? allExpenses : monthExpenses).length > 0 && (
                                  <tr className="bg-emerald-700 text-white font-bold">
                                    <td colSpan={8} className="px-3 py-2 text-right border border-emerald-600 text-[10px] uppercase tracking-widest">TOTAL ANGGARAN {reviewPeriod === 'monthly' ? 'BULAN INI' : ''}</td>
                                    <td className="px-2 py-2 text-right border border-emerald-600 font-mono">{formatRupiah(reviewPeriod === 'yearly' ? totalBudgeted : monthExpenses.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0))}</td>
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
                    {reviewPeriod === 'yearly' ? allExpenses.length : monthExpenses.length} kegiatan · {formatRupiah(reviewPeriod === 'yearly' ? totalBudgeted : monthExpenses.reduce((s, i) => s + Math.round((i.amount) / Math.max(i.realization_months?.length || 1, 1)), 0))} {reviewPeriod === 'yearly' ? `dari ${formatRupiah(PAGU_DANA)}` : ''}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsReviewOpen(false)}
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
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════
          MODAL: Add / Edit Kegiatan — ARKAS style
          ═══════════════════════════════════════════════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={() => setIsModalOpen(false)}
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
                    onClick={() => setIsModalOpen(false)}
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
                            <option key={std} value={std}>{std}</option>
                          ))}
                          <option value={SNPStandard.LAINNYA}>{SNPStandard.LAINNYA}</option>
                        </select>
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown size={16} strokeWidth={2.5} />
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

                        {/* Footer bar for Month Entries */}
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
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg transition-all"
                    >
                      Batal
                    </button>
                    <motion.button
                      type="submit"
                      disabled={isEligible === false}
                      whileHover={{ scale: isEligible === false ? 1 : 1.02 }}
                      whileTap={{ scale: isEligible === false ? 1 : 0.98 }}
                      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-all shadow-sm ${isEligible === false
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-slate-900 hover:bg-slate-700 shadow-slate-400/30'
                        }`}
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      Masukkan ke Anggaran
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════
          MODAL: Delete Confirmation
          ═══════════════════════════════════════════════════ */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setDeleteConfirmId(null)}
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
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (deleteConfirmId) onDelete(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }}
                    className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};

export default BudgetPlanning;