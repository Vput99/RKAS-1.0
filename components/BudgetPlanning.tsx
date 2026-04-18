import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, Variants } from 'framer-motion';
import { Budget, TransactionType, BOSPComponent, SNPStandard, AccountCodes } from '../types';
import { analyzeBudgetEntry } from '../lib/gemini';
import { getStoredAccounts } from '../lib/db';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { BudgetPlanningProps, MonthEntry, MONTHS_FULL, BOSP_PER_SISWA } from './budget/BudgetTypes';
import { mkEntry } from './budget/BudgetUtils';
import BudgetHeader from './budget/BudgetHeader';
import BudgetTable from './budget/BudgetTable';
import ReviewModal from './budget/ReviewModal';
import BudgetFormModal from './budget/BudgetFormModal';
import DeleteBudgetModal from './budget/DeleteBudgetModal';

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
  const [isGroupedByAccount, setIsGroupedByAccount] = useState(false);

  // ── Form State ──
  const [kegiatanQuery, setKegiatanQuery] = useState('');
  const [description, setDescription] = useState('');
  const [bospComponent, setBospComponent] = useState<string>(Object.values(BOSPComponent)[0]);
  const [snpStandard, setSnpStandard] = useState<string>(Object.values(SNPStandard)[0]);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [accountCode, setAccountCode] = useState<string>('');
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [monthEntries, setMonthEntries] = useState<MonthEntry[]>([mkEntry(new Date().getMonth() + 1)]);

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiWarning, setAiWarning] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [aiLogic, setAiLogic] = useState<string>('');

  // Custom Accounts State
  const [allAccounts, setAllAccounts] = useState<Record<string, string>>(AccountCodes);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load accounts
  useEffect(() => {
    const load = async () => {
      try {
        const accs = await getStoredAccounts();
        if (Object.keys(accs).length > 0) setAllAccounts(accs);
      } catch (e) {
        console.warn("Failed to load accounts from DB, using defaults");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      const load = async () => {
        const accs = await getStoredAccounts();
        if (Object.keys(accs).length > 0) setAllAccounts(accs);
      };
      load();
    }
  }, [isModalOpen]);

  // Click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync account search term
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

  // Expenses filtering
  const allExpenses = useMemo(() => data.filter((d) => d.type === TransactionType.EXPENSE), [data]);
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

  // Budget calculations
  const PAGU_DANA = useMemo(() => {
    const count = profile?.studentCount || 0;
    return count > 0 ? count * BOSP_PER_SISWA : 900_000_000;
  }, [profile?.studentCount]);

  const totalBudgeted = useMemo(() => allExpenses.reduce((acc, curr) => acc + curr.amount, 0), [allExpenses]);
  const remainingBudget = PAGU_DANA - totalBudgeted;
  
  const groupedExpenses = useMemo(() => {
    const expenses = reviewPeriod === 'yearly' ? allExpenses : monthExpenses;
    const groups: Record<string, Budget[]> = {};
    expenses.forEach(item => {
      const code = item.account_code || 'Tanpa Kode';
      if (!groups[code]) groups[code] = [];
      groups[code].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [allExpenses, monthExpenses, reviewPeriod]);

  // Handlers
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
    setAiLogic('');
    setIsEligible(null);
  }, []);

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
    const months = item.realization_months || [];
    const mq = item.month_quantities || {};
    if (months.length > 0) {
      setMonthEntries(months.map(m => ({
        id: Math.random().toString(36).slice(2),
        month: m,
        quantity: mq[String(m)] ?? item.quantity ?? 1,
        unit: item.unit || '',
      })));
    } else {
      setMonthEntries([mkEntry(new Date().getMonth() + 1)]);
    }
    setAiWarning(item.warning_message || '');
    setAiLogic(item.ai_analysis_logic || '');
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
      setAiLogic(result.suggestion_logic || '');
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
      if (result.realization_months_estimate?.length && monthEntries.every(e => e.month === (new Date().getMonth() + 1))) {
        setMonthEntries(result.realization_months_estimate.map(m => mkEntry(m)));
      }
    }
    setIsAnalyzing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalQty = monthEntries.reduce((s, e) => s + (e.quantity || 0), 0);
    const totalAmtValue = monthEntries.reduce((s, e) => s + (e.quantity || 0) * unitPrice, 0);
    const realization_months = [...new Set(monthEntries.map(e => e.month))].sort((a, b) => a - b);
    const firstUnit = monthEntries.find(e => e.unit)?.unit || '';
    const monthQuantities: Record<string, number> = {};
    for (const entry of monthEntries) {
      monthQuantities[String(entry.month)] = entry.quantity || 0;
    }
    const payload = {
      type: TransactionType.EXPENSE,
      description: description || kegiatanQuery,
      bosp_component: bospComponent,
      category: snpStandard,
      account_code: accountCode,
      quantity: totalQty,
      unit: firstUnit,
      unit_price: unitPrice,
      amount: totalAmtValue,
      realization_months,
      month_quantities: monthQuantities,
      status: 'draft' as const,
      is_bosp_eligible: isEligible === null ? true : isEligible,
      warning_message: aiWarning,
      ai_analysis_logic: aiLogic,
      date: new Date().toISOString(),
    };
    if (editingId) onUpdate(editingId, payload);
    else onAdd(payload);
    setIsModalOpen(false);
  };

  const updateEntry = (id: string, field: keyof MonthEntry, value: number | string) => {
    setMonthEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
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

  const totalAmount = useMemo(() => monthEntries.reduce((s, e) => s + (e.quantity || 0) * unitPrice, 0), [monthEntries, unitPrice]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex flex-col"
    >
      <BudgetHeader
        profile={profile}
        totalBudgeted={totalBudgeted}
        paguDana={PAGU_DANA}
        remainingBudget={remainingBudget}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleOpenAdd={() => { resetForm(); setIsModalOpen(true); }}
        setIsReviewOpen={setIsReviewOpen}
        setReviewTab={setReviewTab}
        searchInputRef={searchInputRef}
        itemVariants={itemVariants}
      />

      <BudgetTable
        activeMonth={activeMonth}
        setActiveMonth={setActiveMonth}
        monthExpenses={monthExpenses}
        allExpenses={allExpenses}
        allAccounts={allAccounts}
        handleOpenAdd={() => { resetForm(); setIsModalOpen(true); }}
        handleOpenEdit={handleOpenEdit}
        setDeleteConfirmId={setDeleteConfirmId}
        setIsReviewOpen={setIsReviewOpen}
        setReviewPeriod={setReviewPeriod}
        totalBudgeted={totalBudgeted}
        itemVariants={itemVariants}
      />

      {typeof document !== 'undefined' && createPortal(
        <>
          <ReviewModal
            isOpen={isReviewOpen}
            onClose={() => setIsReviewOpen(false)}
            activeMonth={activeMonth}
            reviewPeriod={reviewPeriod}
            setReviewPeriod={setReviewPeriod}
            reviewTab={reviewTab}
            setReviewTab={setReviewTab}
            isGroupedByAccount={isGroupedByAccount}
            setIsGroupedByAccount={setIsGroupedByAccount}
            allExpenses={allExpenses}
            monthExpenses={monthExpenses}
            groupedExpenses={groupedExpenses as [string, Budget[]][]}
            totalBudgeted={totalBudgeted}
            remainingBudget={remainingBudget}
            paguDana={PAGU_DANA}
            allAccounts={allAccounts}
            handleExportPDF={handleExportPDF}
            profile={profile}
          />

          <BudgetFormModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            editingId={editingId}
            kegiatanQuery={kegiatanQuery}
            setKegiatanQuery={setKegiatanQuery}
            description={description}
            setDescription={setDescription}
            bospComponent={bospComponent}
            setBospComponent={setBospComponent}
            snpStandard={snpStandard}
            setSnpStandard={setSnpStandard}
            accountCode={accountCode}
            accountSearchTerm={accountSearchTerm}
            setAccountSearchTerm={setAccountSearchTerm}
            isAccountDropdownOpen={isAccountDropdownOpen}
            setIsAccountDropdownOpen={setIsAccountDropdownOpen}
            filteredAccounts={filteredAccounts}
            selectAccount={selectAccount}
            unitPrice={unitPrice}
            setUnitPrice={setUnitPrice}
            monthEntries={monthEntries}
            updateEntry={updateEntry}
            addEntry={addEntry}
            removeEntry={removeEntry}
            totalAmount={totalAmount}
            isAnalyzing={isAnalyzing}
            handleAIAnalysis={handleAIAnalysis}
            isEligible={isEligible}
            aiWarning={aiWarning}
            handleSubmit={handleSubmit}
            dropdownRef={dropdownRef}
          />

          <DeleteBudgetModal
            isOpen={!!deleteConfirmId}
            onClose={() => setDeleteConfirmId(null)}
            onConfirm={() => {
                if (deleteConfirmId) onDelete(deleteConfirmId);
                setDeleteConfirmId(null);
            }}
          />
        </>,
        document.body
      )}
    </motion.div>
  );
};

export default BudgetPlanning;