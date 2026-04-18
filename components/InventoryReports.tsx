// Build Trigger: 2026-04-18 13:21
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ClipboardList, Calendar, ArrowRightLeft, Package, ArrowRight, Layers } from 'lucide-react';
import { Budget } from '../types';
import { analyzeInventoryItems, InventoryItem } from '../lib/gemini';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import { 
  getInventoryItems, saveInventoryItem, deleteInventoryItem, 
  getWithdrawalTransactions, saveWithdrawalTransaction, deleteWithdrawalTransaction, 
  getInventoryOverrides, saveInventoryOverride, getMutationOverrides, saveMutationOverride, 
  migrateLocalStorageToSupabase, getSubKegiatanDB, saveSubKegiatanItem, 
  deleteSubKegiatanItem, updateSubKegiatanItem 
} from '../lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Sub-components & Modals
import { SubKegiatanEntry, WithdrawalTransaction, InventoryReportsProps } from './inventory/InventoryTypes';
import ReportHeader from './inventory/ReportHeader';
import PengadaanView from './inventory/PengadaanView';
import PengeluaranView from './inventory/PengeluaranView';
import PersediaanView from './inventory/PersediaanView';
import MutasiView from './inventory/MutasiView';
import KibBView from './inventory/KibBView';
import ManualInventoryModal from './inventory/ManualInventoryModal';
import WithdrawalModal from './inventory/WithdrawalModal';
import SubKegiatanDBModal from './inventory/SubKegiatanDBModal';
import DeleteConfirmModal from './inventory/DeleteConfirmModal';

// Helper functions

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '-';
    return d.toLocaleDateString('id-ID');
  } catch (e) {
    return dateStr || '-';
  }
};

const CATEGORY_SUB_MAP: Record<string, string[]> = {
  'Bahan': [
    'Bahan Bangunan dan Konstruksi', 'Bahan Kimia', 'Bahan Peldak', 'Bahan Bakar dan Pelumas', 
    'Bahan Baku : Kawat, Kayu', 'Bahan kimia nuklir', 'Barang dalam proses', 'Bahan/bibit tanaman', 
    'Isi tabung pemadam kebakaran', 'Isi tabung gas: isi tabung gas LPG', 'Bahan/bibit ternak/bibit ikan', 'Bahan lainnya'
  ],
  'Suku Cadang': [
    'Suku cadang alat angkutan', 'Suku cadang alat besar', 'Suku cadang alat kedokteran', 'Suku cadang alat laboratorium', 
    'Suku cadang alat pemancar', 'Suku cadang alat studio dan komunikasi', 'Suku cadang alat pertanian', 
    'Suku cadang alat bengkel', 'Suku cadang alat persenjataan', 'Persediaan dari belanja bantuan sosial', 'Suku cadang lainnya'
  ],
  'Alat Atau Bahan Untuk Kegiatan Kantor': [
    'Alat tulis kantor', 'Kertas dan cover', 'Bahan cetak', 'Benda pos', 'Persediaan dokumen/administrasi tender', 
    'Bahan komputer', 'Perabot kantor', 'Alat listrik', 'Perlengkapan dinas', 'Kaporlap dan perlengkapan satwa', 
    'Perlengkapan pendukung olah raga', 'Suvenir/cindera mata', 'Alat/bahan untuk kegiatan kantor lainnya'
  ],
  'Obat Obatan': ['Obat', 'Obat Lainnya'],
  'Persediaan Untuk dijual atau diserahkan': [
    'Persediaan untuk dijual/diserahkan kepada masyarakat', 'Persediaan untuk dijual/diserahkan lainnya'
  ],
  'Natura dan Pakan': ['Natura: makanan/ sembako, minuman', 'Pakan', 'Natura dan Pakan Lainnya'],
  'Persediaan Penelitian': [
    'Persediaan Penelitian Biologi', 'Persediaan Penelitian Biologi Lainnya', 'Persediaan Penelitian Teknologi', 'Persediaan Penelitian Lainnya'
  ]
};

const InventoryReports: React.FC<InventoryReportsProps> = ({ budgets, schoolProfile }) => {
  // --- STATE MANAGEMENT ---
  const [activeReport, setActiveReport] = useState<string>('pengadaan');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [manualInventoryItems, setManualInventoryItems] = useState<InventoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [withdrawalTransactions, setWithdrawalTransactions] = useState<WithdrawalTransaction[]>([]);
  
  const [itemOverrides, setItemOverrides] = useState<Record<string, { usedQuantity?: number; lastYearBalance?: number }>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rkas_inventory_overrides_v1') : null;
    return saved ? JSON.parse(saved) : {};
  });
  
  const [mutationOverrides, setMutationOverrides] = useState<Record<string, { awal?: number; tambah?: number; kurang?: number }>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('rkas_mutation_overrides_v1') : null;
    return saved ? JSON.parse(saved) : {};
  });

  // --- MODAL & FORM STATE ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [manualForm, setManualForm] = useState<Partial<InventoryItem> & { nomor?: string }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [currentSubCategory, setCurrentSubCategory] = useState<string>('');

  const [subKegiatanDB, setSubKegiatanDB] = useState<SubKegiatanEntry[]>([]);
  const [isSkDBLoading, setIsSkDBLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [isSkDBModalOpen, setIsSkDBModalOpen] = useState(false);
  const [skForm, setSkForm] = useState({ kode: '', nama: '' });
  const [skEditId, setSkEditId] = useState<string | null>(null);
  const [selectedSkId, setSelectedSkId] = useState<string>('');

  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    docNumber: '',
    quantity: 0,
    notes: ''
  });

  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    const loadDataFromDB = async () => {
      try {
        await migrateLocalStorageToSupabase();
        const [dbItems, dbWithdrawals, dbOverrides, dbMutationOv] = await Promise.all([
          getInventoryItems(),
          getWithdrawalTransactions(),
          getInventoryOverrides(),
          getMutationOverrides()
        ]);
        
        if (dbItems.length > 0) {
          setManualInventoryItems(dbItems.map(d => ({
            id: d.id, name: d.name, spec: d.spec, quantity: d.quantity, unit: d.unit, price: d.price, total: d.total,
            subActivityCode: d.sub_activity_code, subActivityName: d.sub_activity_name, accountCode: d.account_code,
            date: d.date, contractType: d.contract_type, vendor: d.vendor || '', docNumber: d.doc_number,
            category: d.category, codification: d.codification, usedQuantity: d.used_quantity, lastYearBalance: d.last_year_balance || 0
          })));
        } else {
          const localManual = localStorage.getItem('rkas_manual_inventory_v1');
          if (localManual) setManualInventoryItems(JSON.parse(localManual));
        }

        if (dbWithdrawals.length > 0) {
          setWithdrawalTransactions(dbWithdrawals.map(d => ({
            id: d.id, inventoryItemId: d.inventory_item_id, date: d.date, docNumber: d.doc_number, quantity: d.quantity, notes: d.notes
          })));
        } else {
          const localWithdrawals = localStorage.getItem('rkas_withdrawal_transactions_v1');
          if (localWithdrawals) setWithdrawalTransactions(JSON.parse(localWithdrawals));
        }

        if (Object.keys(dbOverrides).length > 0) setItemOverrides(dbOverrides);
        if (Object.keys(dbMutationOv).length > 0) setMutationOverrides(dbMutationOv);

        const dbSkData = await getSubKegiatanDB();
        setSubKegiatanDB(dbSkData);
      } catch (e) {
        console.error('Failed to load inventory from DB, using localStorage fallback', e);
      }
    };
    loadDataFromDB();
  }, []);

  const saveManualItems = (items: InventoryItem[]) => {
    setManualInventoryItems(items);
    localStorage.setItem('rkas_manual_inventory_v1', JSON.stringify(items));
  };

  const saveManualItemToDB = async (item: InventoryItem) => {
    setIsSaving(true); setSaveStatus('saving');
    try {
      await saveInventoryItem({
        id: item.id, name: item.name, spec: item.spec, quantity: item.quantity, unit: item.unit, price: item.price, total: item.total,
        sub_activity_code: item.subActivityCode, sub_activity_name: item.subActivityName, account_code: item.accountCode,
        date: item.date, contract_type: item.contractType, vendor: item.vendor, doc_number: item.docNumber,
        category: item.category, codification: item.codification, used_quantity: item.usedQuantity, last_year_balance: item.lastYearBalance
      });
      setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) { setSaveStatus('error'); } finally { setIsSaving(false); }
  };

  const saveWithdrawals = (txs: WithdrawalTransaction[]) => {
    setWithdrawalTransactions(txs);
    localStorage.setItem('rkas_withdrawal_transactions_v1', JSON.stringify(txs));
  };

  const saveWithdrawalToDB = async (tx: WithdrawalTransaction) => {
    setIsSaving(true); setSaveStatus('saving');
    try {
      await saveWithdrawalTransaction({
        id: tx.id, inventory_item_id: tx.inventoryItemId, date: tx.date, doc_number: tx.docNumber, quantity: tx.quantity, notes: tx.notes
      });
      setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) { setSaveStatus('error'); } finally { setIsSaving(false); }
  };

  const saveOverrides = (newOverrides: typeof itemOverrides) => {
    setItemOverrides(newOverrides);
    localStorage.setItem('rkas_inventory_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleOverride = (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number) => {
    const updated = { ...itemOverrides, [itemId]: { ...(itemOverrides[itemId] || {}), [field]: value } };
    saveOverrides(updated);
    saveInventoryOverride(itemId, field, value);
  };

  const saveMutationOverridesLocal = (newOverrides: typeof mutationOverrides) => {
    setMutationOverrides(newOverrides);
    localStorage.setItem('rkas_mutation_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleMutationOverride = (category: string, field: 'awal' | 'tambah' | 'kurang', value: number) => {
    const updated = { ...mutationOverrides, [category]: { ...(mutationOverrides[category] || {}), [field]: value } };
    saveMutationOverridesLocal(updated);
    saveMutationOverride(category, field, value);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeInventoryItems(budgets);
      setInventoryItems(results);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Gagal menganalisis data. Cek koneksi Anda.");
    } finally { setIsAnalyzing(false); }
  };

  const handleSaveAllAIResults = async () => {
    if (inventoryItems.length === 0) return;
    if (!confirm(`Simpan ${inventoryItems.length} hasil analisa AI ke database utama?`)) return;

    setIsSaving(true); setSaveStatus('saving');
    try {
      const resultsToSave = inventoryItems.map(item => ({
        ...item,
        id: item.id.includes('-') ? item.id : `ai-saved-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }));
      saveManualItems([...resultsToSave, ...manualInventoryItems]);
      setInventoryItems([]);

      for (const item of resultsToSave) {
        await saveInventoryItem({
          id: item.id, name: item.name, spec: item.spec, quantity: item.quantity, unit: item.unit, price: item.price, total: item.total,
          sub_activity_code: item.subActivityCode, sub_activity_name: item.subActivityName, account_code: item.accountCode,
          date: item.date, contract_type: item.contractType, vendor: item.vendor, doc_number: item.docNumber,
          category: item.category, codification: item.codification, used_quantity: item.usedQuantity, last_year_balance: item.lastYearBalance
        });
      }
      setSaveStatus('success'); alert('Berhasil menyimpan semua hasil analisa ke database!');
    } catch (e) { setSaveStatus('error'); alert('Gagal menyimpan beberapa item.'); } finally {
      setIsSaving(false); setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleAddOrUpdateSk = async () => {
    if (!skForm.kode.trim() || !skForm.nama.trim()) return;
    setIsSkDBLoading(true);
    try {
      if (skEditId) {
        await updateSubKegiatanItem(skEditId, skForm.kode.trim(), skForm.nama.trim());
        setSubKegiatanDB(prev => prev.map(s => s.id === skEditId ? { ...s, kode: skForm.kode.trim(), nama: skForm.nama.trim() } : s));
        setSkEditId(null);
      } else {
        const entry: SubKegiatanEntry = { id: `sk-${Date.now()}`, kode: skForm.kode.trim(), nama: skForm.nama.trim(), createdAt: new Date().toISOString() };
        await saveSubKegiatanItem(entry);
        setSubKegiatanDB(prev => [...prev, entry]);
      }
      setSkForm({ kode: '', nama: '' });
    } finally { setIsSkDBLoading(false); }
  };

  const handleDeleteSk = async (id: string) => {
    if (!confirm('Hapus data kode sub kegiatan ini?')) return;
    setIsSkDBLoading(true);
    try {
      await deleteSubKegiatanItem(id);
      setSubKegiatanDB(prev => prev.filter(s => s.id !== id));
      if (selectedSkId === id) {
        setSelectedSkId('');
        setManualForm(prev => ({ ...prev, subActivityCode: '', subActivityName: '' }));
      }
    } finally { setIsSkDBLoading(false); }
  };

  const handleSelectSk = (sk: SubKegiatanEntry) => {
    setSelectedSkId(sk.id);
    setManualForm(prev => ({ ...prev, subActivityCode: sk.kode, subActivityName: sk.nama }));
  };

  const handleManualAdd = (budgetItem: any) => {
    const isManualBalance = !budgetItem;
    const budget = budgetItem || { id: 'manual-inventory', description: 'Saldo Awal / Input Manual Persediaan', account_code: '0.00', bosp_component: '0.00 Saldo Awal' };
    setSelectedBudget(budget); setIsManualModalOpen(true);
    const firstRealization = budgetItem?.realizations?.[0];
    const subCode = typeof budget?.bosp_component === 'string' ? budget.bosp_component.split(/[.\s]/)[0] : '';
    const subName = typeof budget?.bosp_component === 'string' ? budget.bosp_component.replace(/^\d+[.\s]*/, '') : budget?.bosp_component;
    const totalRealizedQty = budget.realizations?.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) || 0;
    const autoQty = totalRealizedQty > 0 ? totalRealizedQty : (budget.quantity || 1);
    const unit = budget.unit || 'Pcs';
    const unitPrice = budget.unit_price || (firstRealization ? Math.round(firstRealization.amount / (firstRealization.quantity || 1)) : 0) || 0;

    setManualForm({
      name: isManualBalance ? '' : budget.description, spec: isManualBalance ? '' : (budget.notes || firstRealization?.notes || ''),
      quantity: isManualBalance ? 0 : autoQty, unit: unit, price: isManualBalance ? 0 : unitPrice,
      category: 'Alat Atau Bahan Untuk Kegiatan Kantor', date: firstRealization?.date || new Date().toISOString().split('T')[0],
      subActivityCode: subCode || '', subActivityName: subName || '', accountCode: budget.account_code || '',
      vendor: firstRealization?.vendor || '', docNumber: firstRealization?.notes || '', nomor: '', lastYearBalance: 0
    });
    setCurrentSubCategory(CATEGORY_SUB_MAP['Alat Atau Bahan Untuk Kegiatan Kantor'][0]);
    const match = subKegiatanDB.find(s => s.kode === subCode);
    setSelectedSkId(match?.id || '');
  };

  const handleEditManual = (item: InventoryItem) => {
    setEditingItemId(item.id);
    const budget = budgets.find(b => b.account_code === item.accountCode && b.description === item.name);
    setSelectedBudget(budget || { description: item.name, account_code: item.accountCode, amount: item.total, realizations: [] } as any);
    const [baseCat, subCat] = item.category.includes(' - ') ? item.category.split(' - ') : [item.category, ''];

    setManualForm({
      name: item.name, spec: item.spec, quantity: item.quantity, unit: item.unit, price: item.price, category: baseCat as any,
      date: item.date, vendor: item.vendor, docSerialNumber: item.docNumber, accountCode: item.accountCode,
      subActivityCode: item.subActivityCode, subActivityName: item.subActivityName, nomor: item.docNumber, lastYearBalance: item.lastYearBalance || 0
    } as any);

    if (subCat) setCurrentSubCategory(subCat);
    else if (CATEGORY_SUB_MAP[baseCat]) setCurrentSubCategory(CATEGORY_SUB_MAP[baseCat][0]);
    setIsManualModalOpen(true);
  };

  const submitManualForm = (e: React.FormEvent) => {
    e.preventDefault(); if (!manualForm.name || !selectedBudget) return;
    const newItem: InventoryItem = {
      id: `manual-${Date.now()}`, name: manualForm.name!, spec: manualForm.spec || '', quantity: Number(manualForm.quantity),
      unit: manualForm.unit || 'Unit', price: Number(manualForm.price), total: Number(manualForm.quantity) * Number(manualForm.price),
      subActivityCode: manualForm.subActivityCode, subActivityName: manualForm.subActivityName, accountCode: manualForm.accountCode || '',
      date: manualForm.date!, contractType: manualForm.contractType || 'Kuitansi', vendor: manualForm.vendor || '',
      docNumber: (manualForm as any).nomor || manualForm.docNumber || '',
      category: manualForm.category && CATEGORY_SUB_MAP[manualForm.category] ? `${manualForm.category} - ${currentSubCategory}` : (manualForm.category || 'Lainnya'),
      usedQuantity: Number(manualForm.quantity), lastYearBalance: Number(manualForm.lastYearBalance || 0)
    };

    if (editingItemId) {
      saveManualItems(manualInventoryItems.map(item => item.id === editingItemId ? { ...newItem, id: editingItemId } : item));
      saveManualItemToDB({ ...newItem, id: editingItemId });
    } else {
      saveManualItems([newItem, ...manualInventoryItems]);
      saveManualItemToDB(newItem);
    }
    setIsManualModalOpen(false); setSelectedBudget(null); setEditingItemId(null);
  };

  const submitWithdrawalForm = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedInventoryItem || !withdrawalForm.quantity) return;
    const newTx = { id: `wd-${Date.now()}`, inventoryItemId: selectedInventoryItem.id, date: withdrawalForm.date, docNumber: withdrawalForm.docNumber, quantity: Number(withdrawalForm.quantity), notes: withdrawalForm.notes };
    saveWithdrawals([...withdrawalTransactions, newTx]);
    saveWithdrawalToDB(newTx);
    setIsWithdrawalModalOpen(false); setSelectedInventoryItem(null);
    setWithdrawalForm({ date: new Date().toISOString().split('T')[0], docNumber: '', quantity: 0, notes: '' });
  };

  const deleteWithdrawal = (id: string) => {
    saveWithdrawals(withdrawalTransactions.filter(tx => tx.id !== id)); deleteWithdrawalTransaction(id);
  };

  const deleteManualItem = (id: string) => {
    saveManualItems(manualInventoryItems.filter(item => item.id !== id)); deleteInventoryItem(id);
  };

  const handleDeleteAllInventory = async () => {
    setIsDeletingAll(true);
    try {
      await Promise.all(manualInventoryItems.map(item => deleteInventoryItem(item.id)));
      setManualInventoryItems([]); localStorage.removeItem('rkas_manual_inventory_v1');
    } catch (e) { console.error(e); alert('Terjadi kesalahan saat menghapus.'); } finally {
      setIsDeletingAll(false); setIsDeleteAllOpen(false);
    }
  };

  const getItemStats = (item: InventoryItem) => {
    const overrides = itemOverrides[item.id] || {};
    const lastYearBalance = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
    const totalIn = item.quantity;
    const transactionsQuantity = withdrawalTransactions.filter(tx => tx.inventoryItemId === item.id).reduce((sum, tx) => sum + tx.quantity, 0);
    const totalOut = overrides.usedQuantity ?? transactionsQuantity;
    return { lastYearBalance, totalIn, totalOut, remaining: (lastYearBalance + totalIn) - totalOut };
  };

  const combinedItems = useMemo(() => [...inventoryItems, ...manualInventoryItems], [inventoryItems, manualInventoryItems]);

  const kibBItems = useMemo(() => {
    const isModalCode = (code?: string) => code && code.startsWith('5.2');
    const manualModal = manualInventoryItems.filter(item => isModalCode(item.accountCode));
    const spjModal: any[] = [];
    budgets.forEach(b => {
      if (!isModalCode(b.account_code)) return;
      b.realizations?.forEach(r => {
        const qty = r.quantity || b.quantity || 1;
        spjModal.push({
          id: `spj-kib-${b.id}-${r.month}`, accountCode: b.account_code || '-', name: b.description, spec: r.notes || b.notes || '',
          merk: '', ukuran: '', bahan: '', 
          year: r.date ? new Date(r.date).getFullYear() : (b.date ? new Date(b.date).getFullYear() : '-'),
          quantity: qty, unit: b.unit || 'Unit', price: r.amount > 0 && qty > 0 ? Math.round(r.amount / qty) : (b.unit_price || 0),
          total: r.amount, contractType: 'Kuitansi', vendor: r.vendor || '', docNumber: r.notes || '', date: r.date || b.date,
          subActivityCode: (typeof b.bosp_component === 'string' ? b.bosp_component : '').split('.')[0] || '',
          subActivityName: typeof b.bosp_component === 'string' ? b.bosp_component.replace(/^\d+[.\s]*/, '') : String(b.bosp_component),
          programCode: (b.account_code || '').split('.')[0] || '', programName: b.category || '',
          kegiatanCode: (b.account_code || '').split('.').slice(0, 2).join('.') || '', kegiatanName: '',
          address: schoolProfile?.address || '', cv: '', imageUrl: '',
        });
      });
    });
    const manualIds = new Set(manualModal.map(m => m.accountCode + '|' + m.name));
    return [
      ...manualModal.map(item => ({
        ...item, programCode: (item.accountCode || '').split('.')[0] || '', programName: '',
        kegiatanCode: (item.accountCode || '').split('.').slice(0, 2).join('.') || '', kegiatanName: '',
        address: schoolProfile?.address || '', cv: '', imageUrl: '', merk: '', ukuran: '', bahan: '',
        year: item.date ? new Date(item.date).getFullYear() : '',
      })),
      ...spjModal.filter(s => !manualIds.has(s.accountCode + '|' + s.name))
    ];
  }, [manualInventoryItems, budgets, schoolProfile]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach(item => {
      const cat = item.category || '99 LAINNYA';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [combinedItems]);

  const procurementGroupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach(item => {
      if (getItemStats(item).totalIn <= 0) return;
      const cat = item.category || '99 LAINNYA';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [combinedItems, getItemStats]);

  const mutationData = useMemo(() => {
    const data: Record<string, { awal: number; tambah: number; kurang: number }> = {};
    combinedItems.forEach(item => {
      const cat = item.category || '99 LAINNYA';
      if (!data[cat]) data[cat] = { awal: 0, tambah: 0, kurang: 0 };
      const stats = getItemStats(item);
      data[cat].awal += stats.lastYearBalance * item.price;
      data[cat].tambah += stats.totalIn * item.price;
      data[cat].kurang += stats.totalOut * item.price;
    });
    return data;
  }, [combinedItems, itemOverrides, withdrawalTransactions]);

  const groupedWithdrawalData = useMemo(() => {
    const sorted = [...withdrawalTransactions].sort((a, b) => {
      const d1 = new Date(a.date).getTime(), d2 = new Date(b.date).getTime();
      return d1 !== d2 ? d1 - d2 : (a.docNumber || "").trim().localeCompare((b.docNumber || "").trim());
    });
    const groups: Record<string, { date: string; docNumber: string; items: any[] }> = {};
    sorted.forEach(tx => {
      const docKey = (tx.docNumber || "TANPA NOMOR").trim();
      if (!groups[docKey]) groups[docKey] = { date: tx.date, docNumber: tx.docNumber, items: [] };
      const item = combinedItems.find(it => it.id === tx.inventoryItemId);
      if (item) groups[docKey].items.push({ ...tx, item });
    });
    return Object.values(groups);
  }, [withdrawalTransactions, combinedItems]);

  const reportMenu = [
    { id: 'pengadaan', title: 'Laporan Pengadaan BMD', subtitle: 'Aset Lancar Persediaan', description: 'Laporan daftar pengadaan barang milik daerah dalam bentuk aset lancar persediaan.', icon: Package, color: 'blue' },
    { id: 'pengeluaran', title: 'Buku Pengeluaran Persediaan', subtitle: 'Catatan Keluar Barang', description: 'Buku catatan kronologis pengeluaran barang persediaan dari gudang/penyimpanan.', icon: ClipboardList, color: 'orange' },
    { id: 'semester', title: 'Laporan Persediaan Semester', subtitle: 'Per 6 Bulan', description: 'Rekapitulasi posisi stok barang persediaan setiap periode semester.', icon: Calendar, color: 'green' },
    { id: 'persediaan', title: 'Laporan Persediaan', subtitle: 'Stok & Saldo Akhir', description: 'Rekapitulasi persediaan barang dengan penggolongan dan kodefikasi manual.', icon: ClipboardList, color: 'indigo' },
    { id: 'mutasi', title: 'Laporan Mutasi Persediaan', subtitle: 'Tambah & Kurang', description: 'Laporan rincian mutasi tambah dan kurang menurut objek sumber dana keseluruhan.', icon: ArrowRightLeft, color: 'purple' },
    { id: 'kib_b', title: 'KIB B - Peralatan & Mesin', subtitle: 'Kartu Inventaris Barang', description: 'Kartu inventaris barang berupa peralatan dan mesin yang diperoleh dari belanja modal (kode rekening 5.2.xx).', icon: Layers, color: 'teal' },
  ];

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    let title = '', headers: any[][] = [], body: any[][] = [];

    if (activeReport === 'pengadaan') {
      title = 'LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN';
      headers = [
        [
          { content: 'No', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Nama Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Spesifikasi Nama Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Jumlah Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Satuan Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Harga Satuan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Total Nilai Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Sub Kegiatan dan Rekening Anggaran Belanja Daerah Atas Pengadaan Barang', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Tgl Perolehan', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Dokumen Sumber Perolehan', colSpan: 3, styles: { halign: 'center' } }
        ],
        [
          { content: 'Sub Kegiatan', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Rekening Anggaran Belanja Daerah', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Bentuk Kontrak', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Nama Penyedia', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Nomor', rowSpan: 2, styles: { halign: 'center' } }
        ],
        [ { content: '(Rp.)', styles: { halign: 'center' } }, { content: '(Rp.)', styles: { halign: 'center' } }, { content: 'Kode', styles: { halign: 'center' } }, { content: 'Nama', styles: { halign: 'center' } } ],
        ['1', '2', '3', '5', '6', '7', '8=(5x7)', '12', '13', '14', '16', '17', '18', '19'].map(n => ({ content: n, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }))
      ];
      Object.entries(procurementGroupedItems).forEach(([category, items]) => {
        if (items.length === 0) return;
        body.push([{ content: category.toUpperCase(), colSpan: 6, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [51, 65, 85] } }, { content: formatCurrency(items.reduce((sum, item) => sum + item.total, 0)), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } }, { content: '', colSpan: 7, styles: { fillColor: [240, 240, 240] } }]);
        const itemsByDoc: Record<string, InventoryItem[]> = {};
        items.forEach(it => { const key = (it.docNumber || 'TANPA NOMOR').trim(); if (!itemsByDoc[key]) itemsByDoc[key] = []; itemsByDoc[key].push(it); });
        Object.entries(itemsByDoc).forEach(([_docKey, docItems], docIdx) => {
          docItems.forEach((item, itemIdx) => {
            body.push([itemIdx === 0 ? docIdx + 1 : '', item.name, item.spec, item.quantity, item.unit, formatCurrency(item.price), formatCurrency(item.total), item.subActivityCode || '-', item.subActivityName || '-', item.accountCode || '-', itemIdx === 0 ? formatDate(item.date) : '', itemIdx === 0 ? (item.contractType || '-') : '', itemIdx === 0 ? (item.vendor || '-') : '', itemIdx === 0 ? item.docNumber : '']);
          });
        });
      });
    } else if (activeReport === 'pengeluaran') {
      title = 'BUKU PENGELUARAN PERSEDIAAN';
      headers = [
        [
          { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Dokumen', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Nama Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Spesifikasi Nama Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Jumlah', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Satuan Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Harga Satuan (Rp)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Nilai Total (Rp)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Keterangan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [ { content: 'Tanggal', styles: { halign: 'center' } }, { content: 'Nomor', styles: { halign: 'center' } } ],
        ['1', '2', '3', '6', '8', '9', '10', '11', '12=(9x11)', '13'].map(n => ({ content: n, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }))
      ];
      let totalVal = 0;
      groupedWithdrawalData.forEach((group: any, groupIdx: number) => {
        group.items.forEach((tx: any, itemIdx: number) => {
          const item = tx.item; const total = tx.quantity * item.price; totalVal += total;
          body.push([itemIdx === 0 ? groupIdx + 1 : '', itemIdx === 0 ? formatDate(group.date) : '', itemIdx === 0 ? group.docNumber : '', item.name, item.spec, tx.quantity, item.unit, formatCurrency(item.price), formatCurrency(total), tx.notes || '']);
        });
      });
      body.push([{ content: 'Jumlah', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(totalVal), styles: { halign: 'right', fontStyle: 'bold' } }, '']);
    } else if (activeReport === 'persediaan') {
      title = 'Laporan Persediaan Barang';
      headers = [['No', 'Kodefikasi', 'Nama Barang', 'Sisa Lalu', 'Masuk', 'Keluar', 'Sisa', 'Satuan', 'Harga', 'Total']];
      Object.entries(groupedItems).forEach(([catName, items]) => {
        const groupCode = items[0]?.codification?.split('.').slice(0, 5).join('.') || '1.1.7.xx.xx';
        const displayCatName = catName.includes(' - ') ? catName.split(' - ')[1] : catName;
        body.push([{ content: '', styles: { fillColor: [240, 240, 240] } }, { content: groupCode, styles: { halign: 'center', fontStyle: 'bold', textColor: [0, 102, 204], fillColor: [240, 240, 240] } }, { content: displayCatName.toUpperCase(), colSpan: 8, styles: { fontStyle: 'bold', textColor: [0, 51, 102], fillColor: [240, 240, 240] } }]);
        items.forEach((item, i) => {
          const stats = getItemStats(item);
          body.push([i + 1, item.codification || '-', item.name, stats.lastYearBalance, stats.totalIn, stats.totalOut, stats.remaining, item.unit, formatCurrency(item.price), formatCurrency(stats.remaining * item.price)]);
        });
      });
    } else if (activeReport === 'mutasi') {
      title = 'Laporan Mutasi Persediaan';
      headers = [['No', 'Kategori / Nama Barang', 'Saldo Awal', 'Pengadaan', 'Pengeluaran', 'Saldo Akhir', 'Satuan', 'Keterangan']];
      Object.entries(mutationData).forEach(([cat, vals]: any) => {
        const awal = mutationOverrides[cat]?.awal ?? vals.awal, tambah = mutationOverrides[cat]?.tambah ?? vals.tambah, kurang = mutationOverrides[cat]?.kurang ?? vals.kurang, akhir = (awal + tambah) - kurang;
        body.push([{ content: cat.toUpperCase(), colSpan: 8, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [51, 65, 85] } }]);
        body.push(['-', `REKAPITULASI ${cat.toUpperCase()}`, formatCurrency(awal), formatCurrency(tambah), formatCurrency(kurang), formatCurrency(akhir), '-', '']);
        combinedItems.filter(i => (i.category || '99 LAINNYA') === cat).forEach((item, i) => {
          const stats = getItemStats(item);
          body.push([i + 1, item.name, formatCurrency(stats.lastYearBalance), formatCurrency(stats.totalIn), formatCurrency(stats.totalOut), formatCurrency(stats.remaining), item.unit, '']);
        });
      });
    } else if (activeReport === 'kib_b') {
      title = 'KIB B - Kartu Inventaris Barang Peralatan Dan Mesin';
      headers = [['No', 'Kode Rekening', 'Nama Barang', 'Merk', 'Tipe/Spek', 'Ukuran', 'Bahan', 'Th. Pembelian', 'Jml', 'Cara Beli', 'Dari', 'Status', 'Harga Satuan', 'Jumlah', 'Kode Prog', 'Nama Program', 'Kode Keg', 'Nama Kegiatan', 'Kode Sub', 'Nama Sub Kegiatan', 'No. Dokumen', 'Tgl Perolehan', 'Alamat', 'CV']];
      kibBItems.forEach((item: any, i: number) => {
        body.push([i + 1, item.accountCode, item.name, item.merk || '-', item.spec || '-', item.ukuran || '-', item.bahan || '-', item.year || '-', item.quantity, item.contractType || 'Kuitansi', item.vendor || '-', item.status || '-', formatCurrency(item.price), item.quantity * item.price, item.programCode || '-', item.programName || '-', item.kegiatanCode || '-', item.kegiatanName || '-', item.subActivityCode || '-', item.subActivityName || '-', item.docNumber || '-', item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-', schoolProfile?.address || '-', item.cv || '-']);
      });
    }

    const startY = generatePDFHeader(doc, schoolProfile, title);
    autoTable(doc, { 
      ...defaultTableStyles, startY, head: headers, body: body, styles: { fontSize: 7 }, headStyles: { fillColor: [51, 65, 85] } 
    });
    generateSignatures(doc, schoolProfile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`${title.replace(/ /g, '_')}_${schoolProfile?.fiscalYear || '2026'}.pdf`);
  };

  const handleExportExcel = () => {
    let title = '', sheetData: any[][] = [];
    const fileName = `${schoolProfile?.name || 'SD'}_${activeReport}_${schoolProfile?.fiscalYear || '2026'}.xlsx`;

    if (activeReport === 'pengadaan') {
      title = 'LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN';
      sheetData = [[title], [schoolProfile?.name || ''], [`TAHUN ANGGARAN ${schoolProfile?.fiscalYear || ''}`], [], ['No', 'Nama Barang', 'Spesifikasi', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Nilai', 'Sub Kegiatan Kode', 'Sub Kegiatan Nama', 'Rekening Kode', 'Tgl Perolehan', 'Bentuk Kontrak', 'Penyedia', 'Nomor']];
      Object.entries(procurementGroupedItems).forEach(([category, items]) => {
        if (items.length === 0) return;
        sheetData.push([category.toUpperCase(), '', '', '', '', '', items.reduce((sum, item) => sum + item.total, 0), '', '', '', '', '', '', '']);
        const itemsByDoc: Record<string, InventoryItem[]> = {};
        items.forEach(it => { const key = (it.docNumber || 'TANPA NOMOR').trim(); if (!itemsByDoc[key]) itemsByDoc[key] = []; itemsByDoc[key].push(it); });
        Object.entries(itemsByDoc).forEach(([_docKey, docItems], docIdx) => {
          docItems.forEach((item, itemIdx) => {
            sheetData.push([itemIdx === 0 ? docIdx + 1 : '', item.name, item.spec, item.quantity, item.unit, item.price, item.total, item.subActivityCode, item.subActivityName, item.accountCode, itemIdx === 0 ? item.date : '', itemIdx === 0 ? item.contractType : '', itemIdx === 0 ? item.vendor : '', itemIdx === 0 ? item.docNumber : '']);
          });
        });
      });
    } else if (activeReport === 'pengeluaran') {
      title = 'BUKU PENGELUARAN PERSEDIAAN';
      sheetData = [[title], [schoolProfile?.name || ''], ['No', 'Tanggal', 'Nomor Dokumen', 'Nama Barang', 'Spesifikasi', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Nilai', 'Keterangan']];
      groupedWithdrawalData.forEach((group: any, groupIdx: number) => {
        group.items.forEach((tx: any, itemIdx: number) => {
          const item = tx.item; sheetData.push([itemIdx === 0 ? groupIdx + 1 : '', itemIdx === 0 ? group.date : '', itemIdx === 0 ? group.docNumber : '', item.name, item.spec, tx.quantity, item.unit, item.price, tx.quantity * item.price, tx.notes || '']);
        });
      });
    } else if (activeReport === 'persediaan') {
      title = 'LAPORAN PERSEDIAAN BARANG';
      sheetData = [[title], ['No', 'Kodefikasi', 'Nama Barang', 'Saldo Awal', 'Masuk', 'Keluar', 'Sisa', 'Satuan', 'Harga', 'Total']];
      Object.entries(groupedItems).forEach(([catName, items]) => {
        const groupCode = items[0]?.codification?.split('.').slice(0, 5).join('.') || '1.1.7.xx.xx', displayCatName = catName.includes(' - ') ? catName.split(' - ')[1] : catName;
        sheetData.push(['', groupCode, displayCatName.toUpperCase(), '', '', '', '', '', '', '']);
        items.forEach((item, i) => {
          const stats = getItemStats(item); sheetData.push([i + 1, item.codification || '-', item.name, stats.lastYearBalance, stats.totalIn, stats.totalOut, stats.remaining, item.unit, item.price, stats.remaining * item.price]);
        });
      });
    } else if (activeReport === 'mutasi') {
      title = 'LAPORAN MUTASI PERSEDIAAN';
      sheetData = [[title], [schoolProfile?.name || ''], ['No', 'Kategori / Nama Barang', 'Saldo Awal', 'Pengadaan', 'Pengeluaran', 'Saldo Akhir', 'Satuan', 'Keterangan']];
      Object.entries(mutationData).forEach(([cat, vals]: any) => {
        const awal = mutationOverrides[cat]?.awal ?? vals.awal, tambah = mutationOverrides[cat]?.tambah ?? vals.tambah, kurang = mutationOverrides[cat]?.kurang ?? vals.kurang, akhir = (awal + tambah) - kurang;
        sheetData.push([cat.toUpperCase(), '', awal, tambah, kurang, akhir, '', '']);
        combinedItems.filter(i => (i.category || '99 LAINNYA') === cat).forEach((item, i) => {
          const stats = getItemStats(item); sheetData.push([i + 1, item.name, stats.lastYearBalance, stats.totalIn, stats.totalOut, stats.remaining, item.unit, '']);
        });
      });
    } else if (activeReport === 'kib_b') {
      title = 'KIB B - Peralatan dan Mesin';
      sheetData = [[title], ['No', 'Kode Rekening', 'Nama Barang', 'Merk', 'Tipe', 'Ukuran', 'Bahan', 'Tahun', 'Jumlah', 'Cara Beli', 'Harga', 'Total', 'Program', 'Kegiatan', 'Sub Kegiatan', 'No. Dokumen', 'Tgl Perolehan']];
      kibBItems.forEach((item: any, i: number) => {
        sheetData.push([i + 1, item.accountCode, item.name, item.merk || '', item.spec || '', item.ukuran || '', item.bahan || '', item.year || '', item.quantity, item.contractType || '', item.price, item.price * item.quantity, item.programName || '', item.kegiatanName || '', item.subActivityName || '', item.docNumber || '', item.date || '']);
      });
    } else { sheetData = [['No Data For This Report Types']]; }

    const ws = XLSX.utils.aoa_to_sheet(sheetData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1"); XLSX.writeFile(wb, fileName);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 flex items-center gap-1"><Package size={12} /> Inventaris</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stok Opname & Persediaan</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manajemen dan pelaporan aset lancar serta barang persediaan.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportMenu.map((report) => (
          <motion.button
            key={report.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveReport(report.id)}
            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group ${activeReport === report.id ? `bg-gradient-to-br from-white to-${report.color}-50/50 border-${report.color}-200 shadow-xl shadow-${report.color}-500/10` : 'bg-white/60 backdrop-blur-md border-white hover:border-blue-100 hover:shadow-lg shadow-sm'}`}
          >
            {activeReport === report.id && <motion.div layoutId="active-report-bg" className={`absolute inset-0 bg-${report.color}-500/5 z-0`} />}
            {(() => {
              const Icon = report.icon;
              return <div className={`p-3 rounded-xl bg-${report.color}-100 text-${report.color}-600 relative z-10 shadow-inner`}><Icon size={24} className={activeReport === report.id ? 'animate-pulse' : ''} /></div>;
            })()}
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight text-sm">{report.title}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-${report.color}-600 mb-2`}>{report.subtitle}</p>
                </div>
                <div className={`text-${report.color}-500 opacity-30 transform group-hover:scale-110 group-hover:opacity-100 transition-all`}><ArrowRight size={16} /></div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{report.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden relative min-h-[500px]">
        <ReportHeader
          title={reportMenu.find(r => r.id === activeReport)?.title}
          icon={reportMenu.find(r => r.id === activeReport)?.icon || FileText}
          onExport={handleExportPDF} onDownload={handleExportExcel}
        />

        <AnimatePresence mode="wait">
          {activeReport === 'pengadaan' && (
            <PengadaanView
              inventoryItems={inventoryItems} combinedItems={combinedItems} groupedItems={procurementGroupedItems}
              isAnalyzing={isAnalyzing} isSaving={isSaving} onManualAdd={() => { setEditingItemId(null); setIsManualModalOpen(true); }}
              onEditManual={handleEditManual} onAnalyze={handleAnalyze} onSaveAllAI={handleSaveAllAIResults}
              onDeleteManual={deleteManualItem} onDeleteAll={() => setIsDeleteAllOpen(true)} schoolProfile={schoolProfile}
            />
          )}

          {activeReport === 'pengeluaran' && (
            <PengeluaranView
              withdrawalTransactions={withdrawalTransactions} combinedItems={combinedItems} schoolProfile={schoolProfile}
              onRecordWithdrawal={() => setIsWithdrawalModalOpen(true)} onDeleteWithdrawal={deleteWithdrawal}
              onAddPreviousYear={() => handleManualAdd(null)} onEditManual={handleEditManual}
              onDeleteManual={deleteManualItem} manualInventoryItems={manualInventoryItems} groupedWithdrawalData={groupedWithdrawalData}
            />
          )}

          {activeReport === 'persediaan' && (
            <PersediaanView combinedItems={combinedItems} getItemStats={getItemStats} schoolProfile={schoolProfile} handleOverride={handleOverride} groupedItems={groupedItems} />
          )}

          {activeReport === 'mutasi' && (
            <MutasiView combinedItems={combinedItems} mutationData={mutationData} schoolProfile={schoolProfile} handleMutationOverride={handleMutationOverride} mutationOverrides={mutationOverrides} />
          )}

          {activeReport === 'kib_b' && (
            <KibBView kibBItems={kibBItems} schoolProfile={schoolProfile} />
          )}

          {activeReport !== 'pengadaan' && activeReport !== 'pengeluaran' && activeReport !== 'persediaan' && activeReport !== 'mutasi' && activeReport !== 'kib_b' && activeReport !== 'semester' && (
            <motion.div key="other" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center text-slate-400">
              <p className="text-sm font-medium">Modul laporan ini sedang dalam pengembangan.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ManualInventoryModal
        isOpen={isManualModalOpen} onClose={() => { setIsManualModalOpen(false); setSelectedBudget(null); }}
        editingItemId={editingItemId} selectedBudget={selectedBudget} budgets={budgets} 
        manualForm={manualForm} setManualForm={setManualForm} onSubmit={submitManualForm}
        isSaving={isSaving} saveStatus={saveStatus} subKegiatanDB={subKegiatanDB}
        setIsSkDBModalOpen={setIsSkDBModalOpen} selectedSkId={selectedSkId}
        handleSelectSk={handleSelectSk} setSelectedSkId={setSelectedSkId}
        handleManualAdd={handleManualAdd} currentSubCategory={currentSubCategory}
        setCurrentSubCategory={setCurrentSubCategory} CATEGORY_SUB_MAP={CATEGORY_SUB_MAP}
      />

      <WithdrawalModal
        isOpen={isWithdrawalModalOpen} onClose={() => { setIsWithdrawalModalOpen(false); setSelectedInventoryItem(null); }}
        selectedInventoryItem={selectedInventoryItem} setSelectedInventoryItem={setSelectedInventoryItem}
        combinedItems={combinedItems} withdrawalForm={withdrawalForm} setWithdrawalForm={setWithdrawalForm}
        onSubmit={submitWithdrawalForm} isSaving={isSaving} saveStatus={saveStatus}
      />

      <SubKegiatanDBModal
        isOpen={isSkDBModalOpen} onClose={() => { setIsSkDBModalOpen(false); setSkEditId(null); setSkForm({ kode: '', nama: '' }); }}
        skForm={skForm} setSkForm={setSkForm} skEditId={skEditId} setSkEditId={setSkEditId}
        isSkDBLoading={isSkDBLoading} subKegiatanDB={subKegiatanDB}
        handleAddOrUpdateSk={handleAddOrUpdateSk} handleDeleteSk={handleDeleteSk}
      />

      <DeleteConfirmModal
        isOpen={isDeleteAllOpen} onClose={() => setIsDeleteAllOpen(false)}
        onConfirm={handleDeleteAllInventory} isDeleting={isDeletingAll} itemCount={manualInventoryItems.length}
      />
    </motion.div>
  );
};

export default InventoryReports;
