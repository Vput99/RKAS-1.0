import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { TransactionType, TransferDetail, WithdrawalHistory } from '../types';
import { Landmark, Calculator } from 'lucide-react';

import { getWithdrawalHistory, saveWithdrawalHistory, deleteWithdrawalHistory, uploadWithdrawalFile } from '../lib/db';

// Sub-components & Utilities
import { MONTHS, BankWithdrawalProps } from './withdrawal/WithdrawalTypes';
import { formatRupiah, getTerbilang } from './withdrawal/WithdrawalUtils';
import * as PDFGen from './withdrawal/WithdrawalPDF';

import BulkEditModal from './withdrawal/BulkEditModal';
import TaxModal from './withdrawal/TaxModal';
import PreviewModal from './withdrawal/PreviewModal';
import RincianTab from './withdrawal/RincianTab';
import HistoryTab from './withdrawal/HistoryTab';
import SuratKuasaTab from './withdrawal/SuratKuasaTab';
import PemindahbukuanTab from './withdrawal/PemindahbukuanTab';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const BankWithdrawal: React.FC<BankWithdrawalProps> = ({ data, profile, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'rincian' | 'surat_kuasa' | 'pemindahbukuan' | 'riwayat'>('rincian');
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGroupingEnabled, setIsGroupingEnabled] = useState(true);

    const [startMonth, setStartMonth] = useState<number>(1);
    const [endMonth, setEndMonth] = useState<number>(new Date().getMonth() + 1);
    const [accountCodeFilter, setAccountCodeFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
    const [chequeNo, setChequeNo] = useState('');
    const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);

    const [historyList, setHistoryList] = useState<WithdrawalHistory[]>([]);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const [suratNo, setSuratNo] = useState('');
    const [ksName, setKsName] = useState('');
    const [ksTitle] = useState('Kepala Sekolah');
    const [ksNip, setKsNip] = useState('');
    const [ksAddress, setKsAddress] = useState('');
    const [trName, setTrName] = useState('');
    const [trTitle] = useState('Bendahara BOS');
    const [trNip, setTrNip] = useState('');
    const [trAddress, setTrAddress] = useState('');

    const [recipientDetails, setRecipientDetails] = useState<Record<string, TransferDetail>>({});
    const [bulkName, setBulkName] = useState('');
    const [bulkAccount, setBulkAccount] = useState('');

    useEffect(() => {
        if (profile) {
            setKsName(profile.headmaster || '');
            setKsNip(profile.headmasterNip || '');
            setKsAddress(profile.address || '');
            setTrName(profile.treasurer || '');
            setTrNip(profile.treasurerNip || '');
            setTrAddress(profile.address || '');
            const year = new Date().getFullYear();
            setSuratNo(`422 / 024 / ${profile.npsn} / ${year}`);
        }
    }, [profile]);

    useEffect(() => {
        if (activeTab === 'riwayat') loadHistory();
    }, [activeTab]);

    const loadHistory = async () => {
        const historyData = await getWithdrawalHistory();
        setHistoryList(historyData);
    };

    const filteredRealizations = useMemo(() => {
        const expenses = data.filter(d => d.type === TransactionType.EXPENSE && d.status !== 'rejected');
        const aggregatedMap: Record<string, any> = {};

        expenses.forEach(item => {
            item.realizations?.forEach((realization, index) => {
                if (realization.amount > 0 && realization.month >= startMonth && realization.month <= endMonth) {
                    const tMonth = realization.target_month !== undefined ? realization.target_month : realization.month;
                    const key = `${item.id}_${tMonth}_${index}`;
                    if (!aggregatedMap[key]) {
                        aggregatedMap[key] = {
                            id: key, budgetId: item.id, description: `${item.description} (${MONTHS[tMonth - 1]})`,
                            account_code: item.account_code || '', amount: 0, date: realization.date,
                            targetMonth: tMonth, original: item, vendor: realization.vendor, vendor_account: realization.vendor_account
                        };
                    }
                    aggregatedMap[key].amount += realization.amount;
                }
            });
        });

        let finalItems = Object.values(aggregatedMap);
        if (accountCodeFilter) finalItems = finalItems.filter(item => item.account_code.startsWith(accountCodeFilter));
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            finalItems = finalItems.filter(item => item.description.toLowerCase().includes(lower) || item.account_code.includes(searchTerm));
        }
        return finalItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data, startMonth, endMonth, accountCodeFilter, searchTerm]);

    useEffect(() => {
        const newDetails = { ...recipientDetails };
        let changed = false;
        filteredRealizations.forEach(item => {
            if (!newDetails[item.id] || (item.original.transfer_details && (!newDetails[item.id].account || newDetails[item.id].account === '') && item.original.transfer_details.account !== '')) {
                if (item.vendor || item.vendor_account) {
                    newDetails[item.id] = { name: item.vendor || '', account: item.vendor_account || '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
                    changed = true;
                } else if (item.original.transfer_details) {
                    newDetails[item.id] = { ...item.original.transfer_details };
                    changed = true;
                }
            }
        });
        if (changed) setRecipientDetails(newDetails);
    }, [filteredRealizations]);

    const totalSelectedAmount = useMemo(() => {
        return filteredRealizations.filter(d => selectedBudgetIds.includes(d.id)).reduce((acc, curr) => acc + curr.amount, 0);
    }, [filteredRealizations, selectedBudgetIds]);

    useEffect(() => { setSelectedBudgetIds([]); }, [startMonth, endMonth, accountCodeFilter, searchTerm]);

    const getGroupedData = () => {
        const selectedItems = filteredRealizations.filter(d => selectedBudgetIds.includes(d.id));
        if (selectedItems.length === 0) return [];

        const groups: Record<string, any> = {};

        selectedItems.forEach(item => {
            const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
            const rawAccount = (detail.account?.trim() || bulkAccount.trim() || '');
            const normalizedAccount = rawAccount.replace(/[\s-]/g, '');
            const name = (detail.name?.trim() || bulkName.trim() || 'Penerima Belum Diisi');

            let key = '';
            if (isGroupingEnabled) {
                key = normalizedAccount || 'no_account_group';
            } else {
                if (normalizedAccount && normalizedAccount !== '') {
                    key = `grouped_${normalizedAccount}`;
                } else {
                    key = `individual_${item.id}`;
                }
            }

            if (!groups[key]) {
                groups[key] = {
                    key, name, account: rawAccount || '-', amount: 0, descriptions: [], items: [],
                    taxes: { ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 }
                };
            }

            groups[key].amount += item.amount;
            groups[key].descriptions.push(item.description);
            groups[key].items.push({ budgetId: item.budgetId, budgetDescription: item.description, accountCode: item.account_code, amount: item.amount });
            groups[key].taxes.ppn += (detail.ppn || 0);
            groups[key].taxes.pph21 += (detail.pph21 || 0);
            groups[key].taxes.pph22 += (detail.pph22 || 0);
            groups[key].taxes.pph23 += (detail.pph23 || 0);
            groups[key].taxes.pajakDaerah += (detail.pajakDaerah || 0);
        });

        return Object.values(groups);
    };

    const toggleSelection = (id: string) => setSelectedBudgetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const isAllSelected = filteredRealizations.length > 0 && selectedBudgetIds.length === filteredRealizations.length;
    const toggleSelectAll = () => isAllSelected ? setSelectedBudgetIds([]) : setSelectedBudgetIds(filteredRealizations.map(d => d.id));

    const handleRecipientChange = (id: string, field: string, value: string | number) => {
        const item = filteredRealizations.find(r => r.id === id);
        if (!item) return;

        const updatedDetail = {
            ...recipientDetails[id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 },
            [field]: value
        };

        setRecipientDetails(prev => ({ ...prev, [id]: updatedDetail }));

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onUpdate(item.budgetId, { transfer_details: updatedDetail });
        }, 1000);
    };

    const applyBulkRecipient = () => {
        setRecipientDetails(prev => {
            const newState = { ...prev };
            selectedBudgetIds.forEach(id => {
                newState[id] = { ...newState[id], name: bulkName, account: bulkAccount };
                const realItem = filteredRealizations.find(r => r.id === id);
                if (realItem) onUpdate(realItem.budgetId, { transfer_details: newState[id] });
            });
            return newState;
        });
        setIsGroupingEnabled(true);
        setIsBulkEditOpen(false);
    };

    const applyAutoTax = (type: string) => {
        setRecipientDetails(prev => {
            const newState = { ...prev };
            selectedBudgetIds.forEach(id => {
                const item = filteredRealizations.find(r => r.id === id);
                if (!item) return;
                const amount = item.amount;
                let newTax = { ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
                switch (type) {
                    case 'barang_pkp': const dpp = Math.round(amount / 1.11); newTax.ppn = Math.round(dpp * 0.11); newTax.pph22 = Math.round(dpp * 0.015); break;
                    case 'mamin_daerah': newTax.pajakDaerah = Math.round(amount * 0.10); break;
                    case 'mamin_pph': case 'jasa': case 'honor_2': newTax.pph23 = Math.round(amount * 0.02); break;
                    case 'honor_5': case 'honor_non_asn': newTax.pph21 = Math.round(amount * 0.05); break;
                    case 'honor_6': newTax.pph21 = Math.round(amount * 0.02); break;
                    case 'clear': break;
                }
                newState[id] = { ...newState[id], ...newTax };
            });
            return newState;
        });
        setIsTaxModalOpen(false);
    };

    const performArchiving = async (fileBlob?: Blob, fileName?: string) => {
        const budgetIdsToUpdate = new Set<string>();
        selectedBudgetIds.forEach(id => budgetIdsToUpdate.add(id.split('_')[0]));
        const updatePromises = Array.from(budgetIdsToUpdate).map(budgetId => {
            const realizationId = selectedBudgetIds.find(id => id.startsWith(budgetId) && recipientDetails[id]);
            if (realizationId && recipientDetails[realizationId]) return onUpdate(budgetId, { transfer_details: recipientDetails[realizationId] });
            return Promise.resolve();
        });
        await Promise.all(updatePromises);

        let uploadedUrl = null, uploadedPath = null;
        if (fileBlob && fileName) {
            const uploadResult = await uploadWithdrawalFile(fileBlob, fileName);
            uploadedUrl = uploadResult.url; uploadedPath = uploadResult.path;
        }

        const snapshot = { selectedIds: selectedBudgetIds, recipientDetails, groupedRecipients: getGroupedData(), ksName, ksTitle, ksNip, trName, trTitle, trNip, startMonth, endMonth, isGroupingEnabled, bulkName, bulkAccount };
        await saveWithdrawalHistory({
            letter_number: suratNo, letter_date: withdrawDate, bank_name: profile?.bankName || '', bank_branch: profile?.bankBranch || '',
            total_amount: totalSelectedAmount, item_count: selectedBudgetIds.length, snapshot_data: snapshot,
            notes: `Pencairan ${startMonth === endMonth ? MONTHS[startMonth - 1] : `${MONTHS[startMonth - 1]} - ${MONTHS[endMonth - 1]}`} - ${formatRupiah(totalSelectedAmount)}`,
            file_url: uploadedUrl || undefined, file_path: uploadedPath || undefined
        });
    };

    const handleArchiveData = async () => {
        if (selectedBudgetIds.length === 0) return alert("Pilih minimal satu item anggaran untuk diarsipkan.");
        if (!confirm("Simpan data ini ke Riwayat Pencairan?")) return;
        setIsSaving(true);
        try { await performArchiving(); alert("Berhasil diarsipkan! Cek tab Riwayat."); setActiveTab('riwayat'); } catch { alert("Gagal mengarsipkan data."); } finally { setIsSaving(false); }
    };

    const handlePrintAndArchive = async () => {
        if (selectedBudgetIds.length === 0) return alert("Pilih item yang akan dicetak dan dicairkan.");
        if (!confirm("Cetak dokumen dan Simpan ke Riwayat?")) return;
        setIsSaving(true);
        try {
            const doc = PDFGen.createRincianDoc({ profile, startMonth, endMonth, groupedData: getGroupedData(), totalAmount: totalSelectedAmount, ksName, ksNip, trName, trNip });
            if (doc) {
                const pdfBlob = doc.output('blob');
                await performArchiving(pdfBlob, `Rincian_Transfer_${new Date().getTime()}.pdf`);
                doc.save('Daftar_Rincian_Transfer.pdf');
                setActiveTab('riwayat');
            }
        } catch { alert("Gagal menyimpan arsip, melanjutkan download."); const doc = PDFGen.createRincianDoc({ profile, startMonth, endMonth, groupedData: getGroupedData(), totalAmount: totalSelectedAmount, ksName, ksNip, trName, trNip }); if (doc) doc.save('Daftar_Rincian_Transfer.pdf'); } finally { setIsSaving(false); }
    };

    const handleRestoreFromHistory = (item: WithdrawalHistory) => {
        if (!confirm("Kembalikan data ini ke formulir pencairan?")) return;
        const snap = item.snapshot_data;
        setSuratNo(item.letter_number); setWithdrawDate(item.letter_date);
        if (snap) {
            if (snap.startMonth) setStartMonth(snap.startMonth);
            if (snap.endMonth) setEndMonth(snap.endMonth);
            if (snap.recipientDetails) setRecipientDetails(prev => ({ ...prev, ...snap.recipientDetails }));
            if (snap.selectedIds) setSelectedBudgetIds(snap.selectedIds);
            if (snap.ksName) setKsName(snap.ksName);
            if (snap.trName) setTrName(snap.trName);
            if (snap.isGroupingEnabled !== undefined) setIsGroupingEnabled(snap.isGroupingEnabled);
            if (snap.bulkName) setBulkName(snap.bulkName);
            if (snap.bulkAccount) setBulkAccount(snap.bulkAccount);
        }
        setActiveTab('rincian');
    };

    const handleDeleteHistory = async (id: string) => {
        if (!confirm("Hapus riwayat ini?")) return;
        const success = await deleteWithdrawalHistory(id);
        if (success) setHistoryList(prev => prev.filter(h => h.id !== id));
        else alert("Gagal menghapus riwayat.");
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative space-y-6 pb-12 w-full max-w-[1500px] mx-auto min-h-[90vh]">
            <div className="absolute top-0 right-0 w-full h-[800px] bg-gradient-to-b from-indigo-50/40 via-blue-50/20 to-transparent pointer-events-none -z-10 rounded-t-[4rem]" />
            <div className="absolute -top-[10%] -right-[10%] w-[60vh] h-[60vh] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
            
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between bg-white/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                        <div className="p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl shadow-xl shadow-blue-500/20 text-white shrink-0 relative">
                            <Landmark size={36} className="drop-shadow-md" strokeWidth={2} />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-indigo-50/50 backdrop-blur border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-sm">Modul Keuangan</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pencairan Bank</span>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">Pengajuan Pencairan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">BOSP</span></h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Kelola dan cetak rincian transfer bank dengan aman dan sistematis.</p>
                    </div>
                </div>
                <div className="hidden lg:block absolute -right-12 -top-12 opacity-[0.03] pointer-events-none z-0"><Landmark size={320} /></div>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <motion.div variants={itemVariants} className="xl:col-span-1 flex flex-col gap-6">
                    <motion.div whileHover={{ y: -8, scale: 1.01 }} className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-900/20 text-white relative overflow-hidden flex flex-col justify-center min-h-[240px] group border border-white/10">
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 opacity-80" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.3em]">Total Terpilih</p>
                                <div className="p-2.5 bg-white/10 rounded-2xl"><Calculator size={15} /></div>
                            </div>
                            <h2 className="text-3xl font-black mb-4 tracking-tighter">{formatRupiah(totalSelectedAmount)}</h2>
                            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                <p className="text-[11px] text-indigo-100 font-bold italic">"# {getTerbilang(totalSelectedAmount)} Rupiah #"</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                        <div className="relative space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1 block">No Cek / Giro</label>
                                <input type="text" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 font-mono text-sm shadow-sm" value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="Masukkan No. Cek" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1 block">Tanggal Pencairan</label>
                                <input type="date" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 font-mono text-sm shadow-sm" value={withdrawDate} onChange={e => setWithdrawDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="xl:col-span-3 space-y-6">
                    <div className="glass-panel rounded-[2rem] border border-white/90 shadow-2xl bg-white/60 backdrop-blur-3xl overflow-hidden flex flex-col min-h-[600px]">
                        <div className="flex flex-wrap bg-slate-50/50 p-2 gap-2 border-b border-slate-100">
                            {['rincian', 'surat_kuasa', 'pemindahbukuan', 'riwayat'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`relative flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === tab ? 'text-white' : 'text-slate-400'}`}>
                                    {activeTab === tab && <motion.div layoutId="activeTabP" className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-lg" />}
                                    <span className="relative z-10">{tab.replace('_', ' ')}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6">
                            {activeTab === 'rincian' && (
                                <RincianTab
                                    {...{ startMonth, setStartMonth, endMonth, setEndMonth, searchTerm, setSearchTerm, accountCodeFilter, setAccountCodeFilter, isGroupingEnabled, setIsGroupingEnabled, selectedBudgetIds, toggleSelectAll, isAllSelected, filteredRealizations, toggleSelection, recipientDetails, handleRecipientChange, setIsTaxModalOpen, bulkName, setBulkName, bulkAccount, setBulkAccount, handleArchiveData, setIsPreviewOpen, handlePrintAndArchive, totalSelectedAmount, isSaving }}
                                />
                            )}
                            {activeTab === 'riwayat' && <HistoryTab historyList={historyList} handleRestoreFromHistory={handleRestoreFromHistory} handleDeleteHistory={handleDeleteHistory} />}
                            {activeTab === 'surat_kuasa' && (
                                <SuratKuasaTab
                                    totalAmount={totalSelectedAmount} selectedCount={selectedBudgetIds.length} suratNo={suratNo} setSuratNo={setSuratNo} ksName={ksName} setKsName={setKsName} ksNip={ksNip} setKsNip={setKsNip} trName={trName} setTrName={setTrName} trNip={trNip} setTrNip={setTrNip}
                                    onDownload={() => { const doc = PDFGen.createSuratKuasaDoc({ profile, suratNo, ksName, ksTitle, ksNip, ksAddress, trName, trTitle, trNip, trAddress, withdrawDate, totalAmount: totalSelectedAmount, recipientCount: getGroupedData().length }); if (doc) doc.save('surat_kuasa.pdf'); }}
                                />
                            )}
                            {activeTab === 'pemindahbukuan' && (
                                <PemindahbukuanTab
                                    totalAmount={totalSelectedAmount} selectedCount={selectedBudgetIds.length}
                                    onDownload={() => { const doc = PDFGen.createPemindahbukuanDoc({ profile, suratNo, ksName, ksTitle, ksNip, trName, trNip, withdrawDate }); if (doc) doc.save('pemindahbukuan.pdf'); }}
                                />
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    <BulkEditModal isOpen={isBulkEditOpen} onClose={() => setIsBulkEditOpen(false)} bulkName={bulkName} setBulkName={setBulkName} bulkAccount={bulkAccount} setBulkAccount={setBulkAccount} onApply={applyBulkRecipient} />
                    <TaxModal isOpen={isTaxModalOpen} onClose={() => setIsTaxModalOpen(false)} onApply={applyAutoTax} />
                    <PreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} groupedData={getGroupedData()} totalSelectedAmount={totalSelectedAmount} onPrint={() => { const doc = PDFGen.createRincianDoc({ profile, startMonth, endMonth, groupedData: getGroupedData(), totalAmount: totalSelectedAmount, ksName, ksNip, trName, trNip }); doc?.save('Rincian_Transfer.pdf'); }} />
                </AnimatePresence>,
                document.body
            )}
        </motion.div>
    );
};

export default BankWithdrawal;