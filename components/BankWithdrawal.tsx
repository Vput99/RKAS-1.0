import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Budget, TransactionType, SchoolProfile, TransferDetail, WithdrawalHistory } from '../types';
import { Printer, Landmark, CheckSquare, Square, Calendar, Users, Archive, RefreshCcw, Trash2, Calculator, Percent, List, Search, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getWithdrawalHistory, saveWithdrawalHistory, deleteWithdrawalHistory, uploadWithdrawalFile } from '../lib/db';

interface BankWithdrawalProps {
    data: Budget[];
    profile: SchoolProfile | null;
    onUpdate: (id: string, updates: Partial<Budget>) => void;
}

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
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
        const aggregatedMap: Record<string, {
            id: string; budgetId: string; description: string; account_code: string; amount: number;
            date: string; targetMonth: number; original: Budget; vendor?: string; vendor_account?: string;
        }> = {};

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
            // Only initialize if we don't have local edits yet, or if the budget item has data we haven't loaded
            if (!newDetails[item.id] || (item.original.transfer_details && newDetails[item.id].account === '' && item.original.transfer_details.account !== '')) {
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

        const groups: Record<string, {
            name: string; account: string; amount: number; descriptions: string[];
            taxes: { ppn: number; pph21: number; pph22: number; pph23: number; pajakDaerah: number; }
        }> = {};

        selectedItems.forEach(item => {
            const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };

            // PENTING: Nomor Rekening adalah kunci penggabungan UTAMA
            const rawAccount = (detail.account?.trim() || bulkAccount.trim() || '');
            const normalizedAccount = rawAccount.replace(/[\s-]/g, '');
            const name = (detail.name?.trim() || bulkName.trim() || 'Penerima Belum Diisi');

            // SMART GROUPING LOGIC:
            // 1. Jika ada Mode Gabungan -> Semua digabung berdasarkan Account (atau '-' jika kosong)
            // 2. Jika Mode Terpisah -> Hanya digabung jika Account Number sama & tidak kosong

            let key = '';
            if (isGroupingEnabled) {
                // Semua digabung berdasarkan account (normalized)
                key = normalizedAccount || 'no_account_group';
            } else {
                // Hanya digabung jika account tersedia (bukan empty/default)
                if (normalizedAccount && normalizedAccount !== '') {
                    key = `grouped_${normalizedAccount}`;
                } else {
                    // Jika tidak ada account, biarkan terpisah (key unik per item)
                    key = `individual_${item.id}`;
                }
            }

            if (!groups[key]) {
                groups[key] = {
                    name,
                    account: rawAccount || '-',
                    amount: 0,
                    descriptions: [],
                    taxes: { ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 }
                };
            }

            groups[key].amount += item.amount;
            groups[key].descriptions.push(item.description);
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

        setRecipientDetails(prev => ({
            ...prev,
            [id]: updatedDetail
        }));

        // Debounced Save to Parent/DB
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

                // Persist each updated item
                const realItem = filteredRealizations.find(r => r.id === id);
                if (realItem) {
                    onUpdate(realItem.budgetId, { transfer_details: newState[id] });
                }
            });
            return newState;
        });

        // CRITICAL: When bulk applying, force the "Gabungkan" mode to ensure "1 transaksi, 1 rekening"
        setIsGroupingEnabled(true);

        setIsBulkEditOpen(false);
        // Do not clear bulkName/bulkAccount because they are used by the grouping panel now
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
        try {
            await performArchiving();
            alert("Berhasil diarsipkan! Cek tab Riwayat.");
            setActiveTab('riwayat');
        } catch (error) { alert("Gagal mengarsipkan data."); } finally { setIsSaving(false); }
    };

    const handlePrintAndArchive = async () => {
        if (selectedBudgetIds.length === 0) return alert("Pilih item yang akan dicetak dan dicairkan.");
        if (!confirm("Cetak dokumen dan Simpan ke Riwayat?")) return;
        setIsSaving(true);
        try {
            const doc = createRincianDoc();
            if (doc) {
                const pdfBlob = doc.output('blob');
                await performArchiving(pdfBlob, `Rincian_Transfer_${new Date().getTime()}.pdf`);
                doc.save('Daftar_Rincian_Transfer.pdf');
                setActiveTab('riwayat');
            }
        } catch (error) {
            alert("Gagal menyimpan arsip, melanjutkan download.");
            const doc = createRincianDoc(); if (doc) doc.save('Daftar_Rincian_Transfer.pdf');
        } finally { setIsSaving(false); }
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

    const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const getTerbilang = (nilai: number): string => {
        const angka = Math.abs(nilai);
        const baca = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
        let terbilang = "";
        if (angka < 12) terbilang = " " + baca[angka];
        else if (angka < 20) terbilang = getTerbilang(angka - 10) + " Belas";
        else if (angka < 100) terbilang = getTerbilang(Math.floor(angka / 10)) + " Puluh " + getTerbilang(angka % 10);
        else if (angka < 200) terbilang = " Seratus " + getTerbilang(angka - 100);
        else if (angka < 1000) terbilang = getTerbilang(Math.floor(angka / 100)) + " Ratus " + getTerbilang(angka % 100);
        else if (angka < 2000) terbilang = " Seribu " + getTerbilang(angka - 1000);
        else if (angka < 1000000) terbilang = getTerbilang(Math.floor(angka / 1000)) + " Ribu " + getTerbilang(angka % 1000);
        else if (angka < 1000000000) terbilang = getTerbilang(Math.floor(angka / 1000000)) + " Juta" + getTerbilang(angka % 1000000);
        return terbilang.trim();
    };

    const initJsPDF = (options?: any) => { try { return new jsPDF(options); } catch { return null; } };
    const getCityName = (includePrefix = false) => {
        let c = profile?.city || ''; if (!c) return 'Tempat';
        const titleCase = c.toLowerCase().replace(/(?:^|\s)\w/g, m => m.toUpperCase());
        if (includePrefix) return titleCase;
        return titleCase.replace(/^(Kota|Kabupaten|Kab\.?)\s*/i, '') || 'Tempat';
    };

    const generateHeader = (doc: jsPDF) => {
        if (profile?.headerImage) try { doc.addImage(profile.headerImage, 'PNG', 15, 10, 25, 25); } catch { }
        doc.setFont('times', 'normal'); doc.setFontSize(12);
        doc.text(`PEMERINTAH ${profile?.city || 'KAB/KOTA'}`, 105, 15, { align: 'center' });
        doc.text('DINAS PENDIDIKAN', 105, 20, { align: 'center' });
        doc.setFont('times', 'bold'); doc.setFontSize(14);
        doc.text((profile?.name || 'NAMA SEKOLAH').toUpperCase(), 105, 26, { align: 'center' });
        doc.setFont('times', 'normal'); doc.setFontSize(10);
        doc.text(profile?.address || '', 105, 32, { align: 'center' });
        doc.text(`${profile?.district ? 'Kecamatan ' + profile.district : ''} ${getCityName(true)} ${profile?.postalCode ? 'Kode Pos : ' + profile.postalCode : ''}`.trim(), 105, 36, { align: 'center' });
        doc.text(`NPSN : ${profile?.npsn || '-'}`, 105, 40, { align: 'center' });
        doc.setLineWidth(0.5); doc.line(15, 43, 195, 43);
        doc.setLineWidth(0.2); doc.line(15, 44, 195, 44);
    };

    const createSuratKuasaDoc = () => {
        const doc = initJsPDF(); if (!doc) return null;
        generateHeader(doc);
        const uniqueRecipientCount = getGroupedData().length;
        doc.setFont('times', 'bold'); doc.setFontSize(12); doc.text('SURAT KUASA', 105, 55, { align: 'center' });
        doc.setLineWidth(0.5); doc.line(85, 56, 125, 56);
        doc.setFont('times', 'normal'); doc.text(`NOMOR : ${suratNo}`, 105, 62, { align: 'center' });

        const branchDisplay = profile?.bankBranch?.toUpperCase().includes('CABANG') ? profile.bankBranch : `CABANG ${profile?.bankBranch}`;
        let startY = 70; doc.text("Yang bertanda tangan dibawah ini :", 20, startY); startY += 8;
        doc.text(`1. Nama      : ${ksName}`, 20, startY); doc.text(`   Jabatan   : ${ksTitle} ${profile?.name || ''}`, 20, startY + 6); doc.text(`   Alamat    : ${ksAddress}`, 20, startY + 12);
        startY += 24;
        doc.text(`2. Nama      : ${trName}`, 20, startY); doc.text(`   Jabatan   : ${trTitle}`, 20, startY + 6); doc.text(`   Alamat    : ${trAddress}`, 20, startY + 12);

        startY += 24;
        const textKuasa = `Bertindak untuk dan atas nama ${profile?.name || 'Sekolah'} ${getCityName(true)}. Dengan ini memberikan kuasa penuh yang tidak dapat di cabut kembali dengan substitusi kepada :`;
        doc.text(doc.splitTextToSize(textKuasa, 170), 20, startY);

        startY += 15; doc.setFont('times', 'bold'); doc.text(`${profile?.bankName || 'BANK'} ${branchDisplay}`, 105, startY, { align: 'center' });
        doc.setFont('times', 'normal'); doc.text(`Berkedudukan di ${profile?.bankAddress || 'ALAMAT BANK'}`, 105, startY + 5, { align: 'center' });

        startY += 15; doc.setFont('times', 'bold'); doc.text("KHUSUS", 105, startY, { align: 'center' }); doc.setLineWidth(0.5); doc.line(90, startY + 1, 120, startY + 1);

        startY += 8; doc.setFont('times', 'normal');
        const mainContent = `Untuk memindahbukuan dari rekening Giro/ Tabungan kami yang ada di ${profile?.bankName} ${branchDisplay} dengan nomor rekening ${profile?.accountNo} atas nama ${profile?.name} untuk dilimpahkan kepada rekening terlampir yang tidak terpisahkan dari surat kuasa ini sebanyak ${uniqueRecipientCount} ( ${getTerbilang(uniqueRecipientCount)} ) rekening dengan total nominal Rp ${formatRupiah(totalSelectedAmount).replace('Rp', '').trim()}- ( ${getTerbilang(totalSelectedAmount)} Rupiah), Dengan data sesuai Lampiran.`;
        doc.text(doc.splitTextToSize(mainContent, 170), 20, startY);

        startY += 25;
        const closingText = `Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya. Segala akibat yang timbul atas pemberian kuasa ini menajdi tanggung jawab pemberi kuasa sepenuhnya dengan membebaskan bank dari segala akibat tuntutan.`;
        doc.text(doc.splitTextToSize(closingText, 170), 20, startY);

        startY += 20; const d = new Date(withdrawDate); doc.text(`${getCityName()}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, 150, startY, { align: 'center' });
        startY += 6; doc.text("Yang diberi Kuasa", 35, startY, { align: 'center' }); doc.text(ksTitle, 85, startY, { align: 'center' }); doc.text(trTitle, 150, startY, { align: 'center' });
        startY += 5; doc.text(profile?.bankName || '', 35, startY, { align: 'center' }); doc.text(profile?.name || 'Sekolah', 85, startY, { align: 'center' });
        startY += 5; doc.text(branchDisplay, 35, startY, { align: 'center' });

        startY += 30; doc.setFont('times', 'bold'); doc.text(ksName, 85, startY, { align: 'center' }); doc.text(trName, 150, startY, { align: 'center' });
        doc.setLineWidth(0.2); doc.line(65, startY + 1, 105, startY + 1); doc.line(130, startY + 1, 170, startY + 1);
        doc.setFont('times', 'normal'); doc.text(`NIP. ${ksNip}`, 85, startY + 5, { align: 'center' }); doc.text(`NIP. ${trNip}`, 150, startY + 5, { align: 'center' });
        return doc;
    };

    const createPemindahbukuanDoc = () => {
        const doc = initJsPDF(); if (!doc) return null;
        generateHeader(doc);
        const branchDisplay = profile?.bankBranch?.toUpperCase().includes('CABANG') ? profile.bankBranch : `CABANG ${profile?.bankBranch}`;
        const bankShort = (profile?.bankName || '').replace('PT. ', '').replace('BANK PEMBANGUNAN DAERAH JAWA TIMUR', 'BANK JATIM');

        doc.setFont('times', 'normal'); doc.setFontSize(12); doc.text(`NOMOR : ${suratNo}`, 105, 55, { align: 'center' });
        doc.text('Kepada Yth : Bapak Direktur', 20, 65); doc.text(`${bankShort} ${branchDisplay}`, 20, 70);
        doc.text('DI', 20, 75); doc.text(getCityName().toUpperCase(), 20, 80);

        doc.text('Perihal : ', 20, 90); doc.text("Kuasa Pemindahbukuan", 37, 90); doc.setLineWidth(0.3); doc.line(37, 91, 75, 91);
        const body1 = `Sehubungan dengan adanya rekening kami di ${bankShort} ${branchDisplay} atas nama ${profile?.name} nomor rekening ${profile?.accountNo} bersama ini kami mengajukan kuasa pemindahbukuan. (Terlampir)`;
        doc.text(doc.splitTextToSize(body1, 170), 20, 100);
        const body2 = `Kami harap dengan adanya kuasa tersebut dapat dilakukan pemindahbukuan secara otomatis dari rekening Giro kami yang ada di ${bankShort} ${branchDisplay}`;
        doc.text(doc.splitTextToSize(body2, 170), 20, 115);
        doc.text('Demikian atas kerja sama yang baik sampaikan terima kasih.', 20, 130);

        const d = new Date(withdrawDate); doc.text(`${getCityName()}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, 140, 140);

        doc.setFont('times', 'bold'); doc.text(profile?.name || 'SEKOLAH', 105, 146, { align: 'center' });
        doc.setFont('times', 'normal'); doc.text(ksTitle, 60, 152, { align: 'center' }); doc.text('Bendahara', 150, 152, { align: 'center' });

        doc.setFont('times', 'bold'); doc.text(ksName, 60, 182, { align: 'center' }); doc.text(trName, 150, 182, { align: 'center' });
        doc.line(40, 183, 80, 183); doc.line(130, 183, 170, 183);
        doc.setFont('times', 'normal'); doc.text(`NIP. ${ksNip}`, 60, 187, { align: 'center' }); doc.text(`NIP. ${trNip}`, 150, 187, { align: 'center' });
        return doc;
    };

    const createRincianDoc = () => {
        const doc = initJsPDF({ orientation: 'landscape' }); if (!doc) return null;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('DAFTAR RINCIAN TRANSFER', 148, 15, { align: 'center' });
        doc.text(`${(profile?.name || 'SEKOLAH').toUpperCase()}`, 148, 20, { align: 'center' }); doc.text((profile?.city || 'KOTA').toUpperCase(), 148, 25, { align: 'center' });
        const monthLabel = startMonth === endMonth ? `Bulan ${MONTHS[startMonth - 1]}` : `Bulan ${MONTHS[startMonth - 1]} - ${MONTHS[endMonth - 1]}`;
        doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.text(`${monthLabel} (Realisasi)`, 15, 35);

        let tp1 = 0, tp2 = 0, tp3 = 0, tpd = 0, tpAll = 0, tbAll = 0;
        const tableBody = getGroupedData().map((item, idx) => {
            let mDesc = item.descriptions.join(', '); if (mDesc.length > 50) mDesc = `${item.descriptions[0]} dan ${item.descriptions.length - 1} item lain`;
            const tTax = item.taxes.ppn + item.taxes.pph21 + item.taxes.pph22 + item.taxes.pph23 + item.taxes.pajakDaerah; const net = item.amount - tTax;
            tp1 += item.taxes.pph21; tp2 += item.taxes.pph22; tp3 += item.taxes.pph23; tpd += item.taxes.pajakDaerah; tpAll += tTax; tbAll += net;
            return [idx + 1, item.name, item.account, formatRupiah(item.amount), formatRupiah(item.taxes.ppn), formatRupiah(item.taxes.pph21), formatRupiah(item.taxes.pph22), formatRupiah(item.taxes.pph23), formatRupiah(item.taxes.pajakDaerah), formatRupiah(tTax), formatRupiah(net), mDesc];
        });
        tableBody.push(['', 'JUMLAH', '', formatRupiah(totalSelectedAmount), '', formatRupiah(tp1), formatRupiah(tp2), formatRupiah(tp3), formatRupiah(tpd), formatRupiah(tpAll), formatRupiah(tbAll), '']);

        autoTable(doc, {
            startY: 40, theme: 'grid', styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 }, headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
            head: [
                [{ content: 'No.', rowSpan: 2 }, { content: 'Nama', rowSpan: 2 }, { content: 'Nomor Rekening', rowSpan: 2 }, { content: 'Nominal', rowSpan: 2 }, { content: 'Potongan Pajak', colSpan: 5, styles: { fillColor: [255, 255, 0] } }, { content: 'Jml Potongan', rowSpan: 2, styles: { fillColor: [255, 255, 0] } }, { content: 'Jumlah Bersih', rowSpan: 2, styles: { fillColor: [200, 200, 255] } }, { content: 'Keterangan', rowSpan: 2 }],
                [{ content: 'PPN', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 21', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 22', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 23', styles: { fillColor: [255, 255, 0] } }, { content: 'Daerah', styles: { fillColor: [255, 255, 0] } }]
            ],
            body: tableBody,
            columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 20 }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 15, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 15, halign: 'right' }, 7: { cellWidth: 15, halign: 'right' }, 8: { cellWidth: 15, halign: 'right' }, 9: { cellWidth: 20, halign: 'right' }, 10: { cellWidth: 22, halign: 'right', fillColor: [200, 200, 255] }, 11: { cellWidth: 'auto' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(profile?.name || 'SEKOLAH', 148, finalY, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.text('Kuasa Pengguna Anggaran', 40, finalY + 5, { align: 'center' }); doc.text('Diterima Pihak Bank', 148, finalY + 5, { align: 'center' }); doc.text('Bendahara BOP', 240, finalY + 5, { align: 'center' });
        doc.text('( .................... )', 148, finalY + 30, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.text(ksName, 40, finalY + 30, { align: 'center' }); doc.text(trName, 240, finalY + 30, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${ksNip}`, 40, finalY + 35, { align: 'center' }); doc.text(`NIP. ${trNip}`, 240, finalY + 35, { align: 'center' });
        return doc;
    };

    const budgetTableContent = (
        <motion.div variants={itemVariants} className="space-y-4">
            {/* ── Filter Modern ── */}
            <div className="flex flex-col lg:flex-row items-center gap-6 p-6 mt-6 bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all">
                <div className="flex-shrink-0">
                    <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/50 border border-slate-200/60 rounded-[1.5rem] shadow-sm">
                        <Calendar size={16} className="text-indigo-500" />
                        <div className="flex items-center gap-2">
                            <select className="bg-transparent outline-none font-bold text-xs text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors appearance-none" value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                            <span className="text-slate-300 font-medium">→</span>
                            <select className="bg-transparent outline-none font-bold text-xs text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors appearance-none" value={endMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 items-center gap-4 w-full">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-12 pr-6 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                            placeholder="Cari Uraian Transaksi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative w-1/4 min-w-[150px]">
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm font-mono font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium text-center"
                            placeholder="Kode Rek."
                            value={accountCodeFilter}
                            onChange={(e) => setAccountCodeFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-shrink-0">
                    <button
                        onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                        className={`group flex items-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-300 active:scale-95 ${isGroupingEnabled
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10'
                                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'
                            }`}
                    >
                        {isGroupingEnabled ? <Users size={16} /> : <List size={16} />}
                        <span>{isGroupingEnabled ? 'Mode Gabungan' : 'Mode Terpisah'}</span>
                    </button>
                </div>
            </div>

            {/* ── Panel Penerima Gabungan (hanya muncul saat mode Gabung + ada item dicentang) ── */}
            {isGroupingEnabled && selectedBudgetIds.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-sm"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-600 rounded-xl text-white"><Users size={16} /></div>
                        <div>
                            <h4 className="font-bold text-sm text-blue-900">Penerima Gabungan</h4>
                            <p className="text-[10px] text-blue-600">{selectedBudgetIds.length} item dicentang → akan digabung menjadi 1 transaksi</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">Nama Toko / Penerima</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/15 text-sm font-semibold text-slate-800 shadow-sm transition-all focus:border-blue-400 placeholder:text-slate-400 placeholder:font-normal" placeholder="Contoh: Toko Makmur Sejahtera" value={bulkName} onChange={e => setBulkName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">No. Rekening Penerima</label>
                            <input type="text" className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/15 text-sm font-mono font-bold text-slate-800 shadow-sm transition-all focus:border-blue-400 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal" placeholder="Contoh: 1234567890" value={bulkAccount} onChange={e => setBulkAccount(e.target.value)} />
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-white/60 shadow-2xl shadow-slate-200/40 relative max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 uppercase tracking-[0.2em] text-[10px] text-slate-400 font-black">
                        <tr>
                            <th className="p-5 w-14 text-center">
                                <button onClick={toggleSelectAll} className="hover:text-indigo-600 transition-all active:scale-90">
                                    {isAllSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-300" />}
                                </button>
                            </th>
                            <th className="p-5">Uraian Transaksi</th>
                            {!isGroupingEnabled && (
                                <>
                                    <th className="p-5">Penerima</th>
                                    <th className="p-5">No. Rekening</th>
                                </>
                            )}
                            <th className="p-5 text-center">Pajak</th>
                            <th className="p-5 text-right">Nominal SPJ</th>
                            <th className="p-5 text-right w-40 bg-indigo-50/30">Total Bersih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 bg-white/40">
                        {filteredRealizations.length === 0 ? (
                            <tr><td colSpan={isGroupingEnabled ? 5 : 7} className="p-20 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-30">
                                    <Archive size={48} />
                                    <p className="font-bold tracking-widest uppercase text-xs">Data tidak ditemukan</p>
                                </div>
                            </td></tr>
                        ) : (
                            filteredRealizations.map((item) => {
                                const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
                                const totalPot = detail.ppn + detail.pph21 + detail.pph22 + detail.pph23 + detail.pajakDaerah;
                                const isSel = selectedBudgetIds.includes(item.id);
                                return (
                                    <motion.tr
                                        key={item.id}
                                        whileHover={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                                        className={`transition-all duration-200 ${isSel ? 'bg-indigo-50/40' : ''}`}
                                    >
                                        <td className="p-5 text-center cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                            <div className="flex justify-center">
                                                {isSel ? (
                                                    <div className="w-5 h-5 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                                        <CheckSquare size={14} />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 border-2 border-slate-200 rounded-lg group-hover:border-indigo-300 transition-colors" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-5 cursor-pointer group" onClick={() => toggleSelection(item.id)}>
                                            <div className={`font-bold transition-colors ${isSel ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-600'}`}>{item.description}</div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono font-bold tracking-tight">{item.account_code}</span>
                                                <span className="text-[10px] text-slate-400 font-medium italic">{new Date(item.date).toLocaleDateString('id', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </td>
                                        {!isGroupingEnabled && (
                                            <>
                                                <td className="p-4">
                                                    {isSel ? (
                                                        <input
                                                            type="text"
                                                            className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-400"
                                                            value={detail.name}
                                                            onChange={(e) => handleRecipientChange(item.id, 'name', e.target.value)}
                                                            placeholder="Nama Toko"
                                                        />
                                                    ) : <span className="text-slate-300 font-medium text-xs">—</span>}
                                                </td>
                                                <td className="p-4">
                                                    {isSel ? (
                                                        <input
                                                            type="text"
                                                            className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 font-mono font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-400"
                                                            value={detail.account}
                                                            onChange={(e) => handleRecipientChange(item.id, 'account', e.target.value)}
                                                            placeholder="No. Rekening"
                                                        />
                                                    ) : <span className="text-slate-300 font-medium text-xs">—</span>}
                                                </td>
                                            </>
                                        )}
                                        <td className="p-5 text-center">
                                            {isSel ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsTaxModalOpen(true); }}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight transition-all active:scale-95 flex items-center gap-2 mx-auto ${totalPot > 0
                                                            ? 'bg-amber-100 text-amber-700 shadow-sm hover:bg-amber-200'
                                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    <Calculator size={12} />
                                                    {totalPot > 0 ? formatRupiah(totalPot) : 'Atur Pajak'}
                                                </button>
                                            ) : (
                                                <div className="w-1 h-1 bg-slate-200 rounded-full mx-auto" />
                                            )}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-slate-500 text-xs">
                                            {formatRupiah(item.amount)}
                                        </td>
                                        <td className={`p-5 text-right font-mono font-black text-xs transition-colors ${isSel ? 'text-indigo-600 bg-indigo-50/20' : 'text-slate-800'}`}>
                                            {formatRupiah(item.amount - totalPot)}
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative space-y-6 pb-12 w-full max-w-[1500px] mx-auto min-h-[90vh]">
            {/* Background Ambience / Blobs */}
            <div className="absolute top-0 right-0 w-full h-[800px] bg-gradient-to-b from-indigo-50/40 via-blue-50/20 to-transparent pointer-events-none -z-10 rounded-t-[4rem]" />
            <div className="absolute -top-[10%] -right-[10%] w-[60vh] h-[60vh] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
            <div className="absolute top-[30%] -left-[10%] w-[50vh] h-[50vh] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-blob" />

            {/* Header Master */}
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
                <div className="hidden lg:block absolute -right-12 -top-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-1000">
                    <Landmark size={320} />
                </div>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Panel Sidebar */}
                <motion.div variants={itemVariants} className="xl:col-span-1 flex flex-col gap-6">
                    {/* Total Card Premium */}
                    <motion.div
                        whileHover={{ y: -8, scale: 1.01 }}
                        className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-900/20 text-white relative overflow-hidden flex flex-col justify-center min-h-[240px] group transition-all duration-500 border border-white/10"
                    >
                        {/* Interactive Gradients */}
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />

                        <Landmark size={200} className="absolute -right-12 -bottom-12 text-white/5 rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-700 ease-out z-0" />

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                                    Total Terpilih
                                </p>
                                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                                    <Calculator size={15} className="text-indigo-200" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-4xl 2xl:text-5xl font-black tracking-tighter mb-4 drop-shadow-lg leading-none">
                                    {formatRupiah(totalSelectedAmount)}
                                </h3>
                                <div className="p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-white/5">
                                    <p className="text-[11px] text-indigo-100 font-bold italic leading-relaxed uppercase tracking-tight opacity-90">
                                        "# {getTerbilang(totalSelectedAmount)} Rupiah #"
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Info Cek Card */}
                    <div className="bg-white/40 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all hover:bg-white/60 group">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                <Calendar size={20} strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-slate-800 text-xs uppercase tracking-[0.2em]">Detail Cek / Giro</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1 block">No Cek / Giro</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-sm shadow-sm focus:border-indigo-400 placeholder:font-sans placeholder:text-slate-300 placeholder:font-medium"
                                    value={chequeNo}
                                    onChange={e => setChequeNo(e.target.value)}
                                    placeholder="Masukkan No. Cek"
                                />
                            </div>
                            <div className="relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2.5 ml-1 block">Tanggal Pencairan</label>
                                <div className="relative group/input">
                                    <input
                                        type="date"
                                        className="w-full px-5 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-sm shadow-sm focus:border-indigo-400 cursor-pointer appearance-none"
                                        value={withdrawDate}
                                        onChange={e => setWithdrawDate(e.target.value)}
                                    />
                                    <Calendar size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover/input:text-indigo-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Panel Main Area */}
                <motion.div variants={itemVariants} className="xl:col-span-3 space-y-6">
                    <div className="glass-panel rounded-[2rem] border border-white/90 shadow-2xl shadow-indigo-900/5 bg-white/60 backdrop-blur-3xl overflow-hidden flex flex-col min-h-[600px]">
                        <div className="flex flex-wrap bg-slate-50/50 p-2 gap-2 relative border-b border-slate-100">
                            {['rincian', 'surat_kuasa', 'pemindahbukuan', 'riwayat'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`relative flex-1 min-w-[140px] py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl overflow-hidden group/tab ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {activeTab === tab && (
                                        <motion.div
                                            layoutId="activeTabPencairan"
                                            className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 shadow-lg shadow-indigo-200"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab.replace('_', ' ')}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6">
                            {activeTab === 'rincian' && (
                                <div className="space-y-4">
                                    <div className="flex justify-end items-center gap-4 mb-6">
                                        <button
                                            onClick={handleArchiveData}
                                            disabled={isSaving}
                                            className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                                        >
                                            <Archive size={16} /> Simpan Draft
                                        </button>
                                        <button
                                            onClick={() => setIsPreviewOpen(true)}
                                            disabled={selectedBudgetIds.length === 0}
                                            className="flex items-center gap-3 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                                        >
                                            <Search size={16} />
                                            Preview
                                        </button>
                                        <button
                                            onClick={handlePrintAndArchive}
                                            disabled={totalSelectedAmount === 0 || isSaving}
                                            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center gap-3 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <Printer size={16} /> Cetak & Arsipkan
                                        </button>
                                    </div>
                                    {budgetTableContent}
                                </div>
                            )}

                            {activeTab === 'riwayat' && (
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
                            )}

                            {(activeTab === 'surat_kuasa' || activeTab === 'pemindahbukuan') && (
                                <div className="space-y-6">
                                    <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center border border-amber-100">
                                        <div>
                                            <p className="text-[10px] font-black tracking-widest text-amber-600 uppercase">Akan Dicairkan</p>
                                            <p className="font-mono font-bold text-amber-900">{formatRupiah(totalSelectedAmount)} ({selectedBudgetIds.length} item)</p>
                                        </div>
                                    </div>
                                    {activeTab === 'surat_kuasa' && (
                                        <div className="space-y-4">
                                            <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm bg-white" placeholder="Nomor Surat" value={suratNo} onChange={e => setSuratNo(e.target.value)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pihak 1 (KS)</p>
                                                    <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={ksName} onChange={e => setKsName(e.target.value)} />
                                                    <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={ksNip} onChange={e => setKsNip(e.target.value)} />
                                                </div>
                                                <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Pihak 2 (Bendahara)</p>
                                                    <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={trName} onChange={e => setTrName(e.target.value)} />
                                                    <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={trNip} onChange={e => setTrNip(e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={() => {
                                        const doc = activeTab === 'surat_kuasa' ? createSuratKuasaDoc() : createPemindahbukuanDoc();
                                        if (doc) doc.save(`${activeTab}.pdf`);
                                    }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg"><Printer size={18} /> Download PDF</button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {/* Modals are kept minimal or matching original structure with glass styling */}
                    {isBulkEditOpen && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative z-10">
                                <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-tight">Set Penerima Massal</h3>
                                <input type="text" placeholder="Nama Penerima" className="w-full border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none rounded-xl px-4 py-3 text-sm mb-3 bg-slate-50 transition-all font-semibold text-slate-700" value={bulkName} onChange={e => setBulkName(e.target.value)} />
                                <input type="text" placeholder="No Rekening" className="w-full border border-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none rounded-xl px-4 py-3 text-sm mb-4 bg-slate-50 transition-all font-mono font-bold text-slate-700" value={bulkAccount} onChange={e => setBulkAccount(e.target.value)} />
                                <div className="flex gap-3 mt-2">
                                    <button onClick={() => setIsBulkEditOpen(false)} className="flex-1 px-4 py-3.5 border border-slate-200 hover:bg-slate-100/80 rounded-xl text-sm font-bold text-slate-600 transition-colors">Batal</button>
                                    <button onClick={applyBulkRecipient} className="flex-1 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95">Terapkan</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                    {isTaxModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-white/50 relative z-10">
                                <h3 className="font-bold text-lg mb-4 text-slate-800 tracking-tight flex items-center gap-2"><Calculator size={20} className="text-emerald-500" /> Otomatisasi Pajak</h3>
                                <div className="space-y-2 mt-2">
                                    <button onClick={() => applyAutoTax('barang_pkp')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                                        <span>Barang {'>'} 2 Juta (PPN & PPh22)</span>
                                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                    <button onClick={() => applyAutoTax('mamin_daerah')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                                        <span>Mamin Resto (PB1 10%)</span>
                                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                    <button onClick={() => applyAutoTax('jasa')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                                        <span>Jasa (PPh23 2%)</span>
                                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                    <button onClick={() => applyAutoTax('honor_5')} className="w-full p-3.5 text-left border border-slate-200 rounded-xl text-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 font-bold transition-all flex items-center justify-between group">
                                        <span>Honor ASN/Ber-NPWP (PPh21 5%)</span>
                                        <Percent size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                    </button>
                                </div>
                                <button onClick={() => setIsTaxModalOpen(false)} className="w-full mt-6 px-4 py-3.5 border border-slate-200 hover:bg-slate-100/80 rounded-xl text-sm font-bold text-slate-600 transition-colors">Tutup</button>
                            </motion.div>
                        </div>
                    )}

                    {isPreviewOpen && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
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
                                    <button onClick={() => setIsPreviewOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-200">
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
                                            {getGroupedData().map((item, idx) => {
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
                                    {getGroupedData().length === 0 && (
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
                                            onClick={() => setIsPreviewOpen(false)}
                                            className="flex-1 sm:flex-none px-8 py-3.5 bg-white text-slate-600 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                        >
                                            Kembali
                                        </button>
                                        <button
                                            onClick={() => {
                                                createRincianDoc();
                                                setIsPreviewOpen(false);
                                            }}
                                            className="flex-1 sm:flex-none px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Printer size={20} />
                                            Cetak PDF Sekarang
                                        </button>
                                    </div>
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

export default BankWithdrawal;