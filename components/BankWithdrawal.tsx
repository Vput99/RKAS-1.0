import React, { useState, useMemo, useEffect } from 'react';
import { Budget, TransactionType, SchoolProfile, TransferDetail, WithdrawalHistory } from '../types';
import { FileText, Printer, Landmark, CheckSquare, Square, DollarSign, Calendar, User, CreditCard, Edit3, Eye, ExternalLink, List, X, Coins, Users, Save, Loader2, Archive, History, RefreshCcw, Trash2, Download, Filter, Settings, Info } from 'lucide-react';
import jsPDF from 'jspdf';
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

const BankWithdrawal: React.FC<BankWithdrawalProps> = ({ data, profile, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'rincian' | 'surat_kuasa' | 'pemindahbukuan' | 'riwayat'>('rincian');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Withdrawal Month State
  const [withdrawalMonth, setWithdrawalMonth] = useState<number>(new Date().getMonth() + 1);

  // History State
  const [historyList, setHistoryList] = useState<WithdrawalHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form States - Transaction Specific
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [chequeNo, setChequeNo] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States - Surat Kuasa Specific (Editable)
  const [suratNo, setSuratNo] = useState('');
  
  // Pihak 1 (KS) & Pihak 2 (Bendahara) - Read from profile initially
  const [ksName, setKsName] = useState('');
  const [ksTitle, setKsTitle] = useState('Kepala Sekolah');
  const [ksNip, setKsNip] = useState('');
  const [ksAddress, setKsAddress] = useState('');
  
  const [trName, setTrName] = useState('');
  const [trTitle, setTrTitle] = useState('Bendahara BOS');
  const [trNip, setTrNip] = useState('');
  const [trAddress, setTrAddress] = useState('');

  // Recipient Details State (Nama, No Rekening, & Pajak per Item)
  const [recipientDetails, setRecipientDetails] = useState<Record<string, TransferDetail>>({});
  
  // Bulk Edit State
  const [bulkName, setBulkName] = useState('');
  const [bulkAccount, setBulkAccount] = useState('');

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Sync profile data when loaded
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

  // Load History when tab changes
  useEffect(() => {
      if (activeTab === 'riwayat') {
          loadHistory();
      }
  }, [activeTab]);

  const loadHistory = async () => {
      setIsLoadingHistory(true);
      const data = await getWithdrawalHistory();
      setHistoryList(data);
      setIsLoadingHistory(false);
  };

  // LOAD SAVED TRANSFER DETAILS FROM BUDGET DATA
  useEffect(() => {
      const savedDetails: Record<string, TransferDetail> = {};
      data.forEach(item => {
          if (item.transfer_details) {
              savedDetails[item.id] = item.transfer_details;
          }
      });
      setRecipientDetails(prev => {
          if (Object.keys(prev).length === 0) return savedDetails;
          const merged = { ...prev };
          Object.keys(savedDetails).forEach(key => {
              if (!merged[key]) merged[key] = savedDetails[key];
          });
          return merged;
      });
  }, [data]);

  // CHANGED: Filter expenses based on REALIZATION (SPJ) in the selected Month
  const monthlyRealizations = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE && d.status !== 'rejected');
    const realizedItems: Array<{
        id: string; 
        description: string;
        account_code: string;
        amount: number;
        date: string;
        original: Budget;
    }> = [];

    expenses.forEach(item => {
        const realization = item.realizations?.find(r => r.month === withdrawalMonth);
        if (realization && realization.amount > 0) {
            realizedItems.push({
                id: item.id,
                description: item.description,
                account_code: item.account_code || '',
                amount: realization.amount,
                date: realization.date,
                original: item
            });
        }
    });

    return realizedItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, withdrawalMonth]);

  const totalSelectedAmount = useMemo(() => {
    return monthlyRealizations
      .filter(d => selectedBudgetIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyRealizations, selectedBudgetIds]);

  // Clear selection when month changes
  useEffect(() => {
      setSelectedBudgetIds([]);
  }, [withdrawalMonth]);

  // --- LOGIC PENGELOMPOKAN (GROUPING) ---
  const getGroupedData = () => {
      const selectedItems = monthlyRealizations.filter(d => selectedBudgetIds.includes(d.id));
      
      const groups: Record<string, { 
          name: string, 
          account: string, 
          amount: number, 
          descriptions: string[],
          taxes: { ppn: number, pph21: number, pph22: number, pph23: number, pajakDaerah: number }
      }> = {};

      selectedItems.forEach(item => {
          const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
          const cleanName = detail.name?.trim() || '';
          const cleanAccount = detail.account?.trim() || '';

          const key = (cleanName && cleanAccount) 
              ? `${cleanName.toLowerCase()}_${cleanAccount}` 
              : `individual_${item.id}`;

          if (!groups[key]) {
              groups[key] = {
                  name: cleanName,
                  account: cleanAccount,
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

  const toggleSelection = (id: string) => {
    setSelectedBudgetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = monthlyRealizations.length > 0 && selectedBudgetIds.length === monthlyRealizations.length;
  
  const toggleSelectAll = () => {
      if (isAllSelected) {
          setSelectedBudgetIds([]);
      } else {
          setSelectedBudgetIds(monthlyRealizations.map(d => d.id));
      }
  };

  const handleRecipientChange = (id: string, field: string, value: string | number) => {
      setRecipientDetails(prev => ({
          ...prev,
          [id]: {
              ...prev[id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 },
              [field]: value
          }
      }));
  };

  const applyBulkRecipient = () => {
      setRecipientDetails(prev => {
          const newState = { ...prev };
          selectedBudgetIds.forEach(id => {
              newState[id] = { 
                  ...newState[id], 
                  name: bulkName, 
                  account: bulkAccount,
                  ppn: newState[id]?.ppn || 0,
                  pph21: newState[id]?.pph21 || 0,
                  pph22: newState[id]?.pph22 || 0,
                  pph23: newState[id]?.pph23 || 0,
                  pajakDaerah: newState[id]?.pajakDaerah || 0
              };
          });
          return newState;
      });
      setIsBulkEditOpen(false);
      setBulkName('');
      setBulkAccount('');
  };

  // --- CORE ARCHIVE LOGIC ---
  const performArchiving = async (fileBlob?: Blob, fileName?: string) => {
      // 1. Update Recipient Details in Budget Items
      const idsToUpdate = Object.keys(recipientDetails).filter(id => selectedBudgetIds.includes(id));
      const updatePromises = idsToUpdate.map(id => {
          return onUpdate(id, { transfer_details: recipientDetails[id] });
      });
      await Promise.all(updatePromises);

      // 2. Upload File (If exists)
      let uploadedUrl = null;
      let uploadedPath = null;
      if (fileBlob && fileName) {
          const uploadResult = await uploadWithdrawalFile(fileBlob, fileName);
          uploadedUrl = uploadResult.url;
          uploadedPath = uploadResult.path;
      }

      // 3. Create History Record
      const snapshot = {
          selectedIds: selectedBudgetIds,
          recipientDetails: recipientDetails,
          ksName, ksTitle, ksNip,
          trName, trTitle, trNip,
          month: withdrawalMonth
      };

      await saveWithdrawalHistory({
          letter_number: suratNo,
          letter_date: withdrawDate,
          bank_name: profile?.bankName || '',
          bank_branch: profile?.bankBranch || '',
          total_amount: totalSelectedAmount,
          item_count: selectedBudgetIds.length,
          snapshot_data: snapshot,
          notes: `Pencairan ${MONTHS[withdrawalMonth-1]} - ${formatRupiah(totalSelectedAmount)}`,
          file_url: uploadedUrl || undefined,
          file_path: uploadedPath || undefined
      });
  };

  const handleArchiveData = async () => {
      if (selectedBudgetIds.length === 0) {
          alert("Pilih minimal satu item anggaran untuk diarsipkan.");
          return;
      }
      
      if (!confirm("Simpan data ini ke Riwayat Pencairan?")) return;

      setIsSaving(true);
      try {
          await performArchiving();
          alert("Berhasil diarsipkan! Cek tab Riwayat.");
          setActiveTab('riwayat');
      } catch (error) {
          console.error("Archive failed", error);
          alert("Gagal mengarsipkan data.");
      } finally {
          setIsSaving(false);
      }
  };

  const handlePrintAndArchive = async () => {
      if (selectedBudgetIds.length === 0) {
          alert("Pilih item yang akan dicetak dan dicairkan.");
          return;
      }

      if (!confirm("Cetak dokumen dan Simpan ke Riwayat?\n\nData yang dicetak akan otomatis diarsipkan (beserta file PDF) agar bisa dibuka kembali nanti.")) return;

      setIsSaving(true);
      try {
          const doc = createRincianDoc();
          const pdfBlob = doc.output('blob');
          const fileName = `Rincian_Transfer_${MONTHS[withdrawalMonth-1]}_${new Date().getTime()}.pdf`;

          await performArchiving(pdfBlob, fileName);
          
          doc.save('Daftar_Rincian_Transfer.pdf');
          setActiveTab('riwayat');
      } catch (error) {
          console.error("Print/Archive failed", error);
          alert("Gagal menyimpan riwayat/upload file, namun proses download akan dilanjutkan.");
          createRincianDoc().save('Daftar_Rincian_Transfer.pdf');
      } finally {
          setIsSaving(false);
      }
  };

  const handleRestoreFromHistory = (item: WithdrawalHistory) => {
      if(!confirm("Kembalikan data ini ke formulir pencairan? Data yang sedang diedit akan tertimpa.")) return;

      try {
          const snap = item.snapshot_data;
          setSuratNo(item.letter_number);
          setWithdrawDate(item.letter_date);
          
          if (snap) {
              if (snap.month) setWithdrawalMonth(snap.month);
              if (snap.recipientDetails) setRecipientDetails(prev => ({ ...prev, ...snap.recipientDetails }));
              if (snap.selectedIds && Array.isArray(snap.selectedIds)) setSelectedBudgetIds(snap.selectedIds);
              if (snap.ksName) setKsName(snap.ksName);
              if (snap.trName) setTrName(snap.trName);
          }

          setActiveTab('rincian');
      } catch (e) {
          console.error("Restore failed", e);
          alert("Gagal memulihkan data.");
      }
  };

  const handleDeleteHistory = async (id: string) => {
      if(!confirm("Hapus riwayat ini? Data (dan file PDF tersimpan) tidak bisa dikembalikan.")) return;
      await deleteWithdrawalHistory(id);
      loadHistory();
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

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
  }

  // --- PDF GENERATORS LOGIC ---
  
  // Helper for City formatting
  const getCityName = () => {
      let c = profile?.city || '';
      if (!c) return 'Tempat';
      
      // Remove KOTA/KABUPATEN prefix case insensitive
      c = c.replace(/^(KOTA|KABUPATEN|KAB\.?)\s*/i, '');
      
      // Title Case
      c = c.toLowerCase().replace(/(?:^|\s)\w/g, m => m.toUpperCase());
      return c || 'Tempat';
  };

  const generateHeader = (doc: jsPDF) => {
    if (profile?.headerImage) {
        try {
            doc.addImage(profile.headerImage, 'PNG', 15, 10, 25, 25);
        } catch (e) {
            console.warn("Failed to add header image", e);
        }
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`PEMERINTAH ${profile?.city || 'KAB/KOTA'}`, 105, 15, { align: 'center' }); 
    doc.text('DINAS PENDIDIKAN', 105, 20, { align: 'center' });
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text((profile?.name || 'NAMA SEKOLAH').toUpperCase(), 105, 26, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(profile?.address || '', 105, 32, { align: 'center' });
    const detailLine = `${profile?.district ? 'Kecamatan ' + profile.district : ''} ${profile?.city || ''} ${profile?.postalCode ? 'Kode Pos : ' + profile.postalCode : ''}`.trim();
    doc.text(detailLine, 105, 36, { align: 'center' });
    doc.text(`NPSN : ${profile?.npsn || '-'}`, 105, 40, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(15, 43, 195, 43);
    doc.setLineWidth(0.2);
    doc.line(15, 44, 195, 44);
  };

  const createSuratKuasaDoc = () => {
    const doc = new jsPDF();
    generateHeader(doc);
    
    const uniqueRecipientCount = getGroupedData().length;
    const topMargin = 55;
    
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('SURAT KUASA', 105, topMargin, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(85, topMargin + 1, 125, topMargin + 1); 
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`NOMOR : ${suratNo}`, 105, topMargin + 7, { align: 'center' });
    
    const bankName = profile?.bankName || 'BANK';
    const bankBranch = profile?.bankBranch || 'CABANG';
    const bankAddress = profile?.bankAddress || 'ALAMAT BANK';
    const accountNo = profile?.accountNo || '...';
    
    const startY = topMargin + 15;
    doc.text("Yang bertanda tangan dibawah ini :", 20, startY);
    const p1Y = startY + 8;
    const labelX = 20; const colonX = 45; const valueX = 48; const lineHeight = 6;
    doc.text("1. Nama", labelX, p1Y); doc.text(":", colonX, p1Y); doc.text(ksName, valueX, p1Y);
    doc.text("    Jabatan", labelX, p1Y + lineHeight); doc.text(":", colonX, p1Y + lineHeight); doc.text(`${ksTitle} ${profile?.name || ''}`, valueX, p1Y + lineHeight);
    doc.text("    Alamat", labelX, p1Y + (lineHeight * 2)); doc.text(":", colonX, p1Y + (lineHeight * 2));
    const ksAddrLines = doc.splitTextToSize(ksAddress, 130);
    doc.text(ksAddrLines, valueX, p1Y + (lineHeight * 2));
    
    const afterP1Y = p1Y + (lineHeight * 2) + (ksAddrLines.length * 5) + 3;
    doc.text("2. Nama", labelX, afterP1Y); doc.text(":", colonX, afterP1Y); doc.text(trName, valueX, afterP1Y);
    doc.text("    Jabatan", labelX, afterP1Y + lineHeight); doc.text(":", colonX, afterP1Y + lineHeight); doc.text(trTitle, valueX, afterP1Y + lineHeight);
    doc.text("    Alamat", labelX, afterP1Y + (lineHeight * 2)); doc.text(":", colonX, afterP1Y + (lineHeight * 2));
    const trAddrLines = doc.splitTextToSize(trAddress, 130);
    doc.text(trAddrLines, valueX, afterP1Y + (lineHeight * 2));

    const afterP2Y = afterP1Y + (lineHeight * 2) + (trAddrLines.length * 5) + 6;
    const textKuasa = `Bertindak untuk dan atas nama ${profile?.name || 'Sekolah'} ${profile?.city || ''}. Dengan ini memberikan kuasa penuh yang tidak dapat di cabut kembali dengan substitusi kepada :`;
    const splitKuasa = doc.splitTextToSize(textKuasa, 170);
    doc.text(splitKuasa, 20, afterP2Y);
    
    const bankY = afterP2Y + (splitKuasa.length * 6) + 4;
    doc.setFont('times', 'bold');
    doc.text(`${bankName} CABANG ${bankBranch}`, 105, bankY, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text(`Berkedudukan di ${bankAddress}`, 105, bankY + 5, { align: 'center' });
    
    const khususY = bankY + 15;
    doc.setFont('times', 'bold');
    doc.text("KHUSUS", 105, khususY, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(90, khususY + 1, 120, khususY + 1);
    
    const contentY = khususY + 8;
    doc.setFont('times', 'normal');
    const itemCountText = getTerbilang(uniqueRecipientCount);
    const nominalFormatted = formatRupiah(totalSelectedAmount).replace(',00', '').replace('Rp', 'Rp ');
    const nominalTerbilang = getTerbilang(totalSelectedAmount);
    
    const mainContent = `Untuk memindahbukuan dari rekening Giro/ Tabungan kami yang ada di ${bankName} Cabang ${bankBranch} dengan nomor rekening ${accountNo} atas nama ${profile?.name} untuk dilimpahkan kepada rekening terlampir yang tidak terpisahkan dari surat kuasa ini sebanyak ${uniqueRecipientCount} ( ${itemCountText} ) rekening dengan total nominal ${nominalFormatted}- ( ${nominalTerbilang} Rupiah), Dengan data sesuai Lampiran.`;
    const splitMain = doc.splitTextToSize(mainContent, 170);
    doc.text(splitMain, 20, contentY);
    
    const closingY = contentY + (splitMain.length * 6) + 6;
    const closingText = `Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya. Segala akibat yang timbul atas pemberian kuasa ini menajdi tanggung jawab pemberi kuasa sepenuhnya dengan membebaskan ${bankName} Cabang ${bankBranch} dari segala akibat tuntutan atau gugatan yang timbul dari transaksi rekening tersebut diatas.`;
    const splitClosing = doc.splitTextToSize(closingText, 170);
    doc.text(splitClosing, 20, closingY);
    
    const ttdY = closingY + (splitClosing.length * 6) + 10;
    const d = new Date(withdrawDate);
    const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const cityTitle = getCityName();
    const dateLine = `${cityTitle}, ${dateStr}`;
    const col1X = 20; const col2X = 85; const col3X = 150;
    doc.text(dateLine, col3X, ttdY, { align: 'center' });
    
    const titleY = ttdY + 6;
    doc.text("Yang diberi Kuasa", col1X + 15, titleY, { align: 'center' });
    doc.text(ksTitle, col2X, titleY, { align: 'center' });
    doc.text(trTitle, col3X, titleY, { align: 'center' });
    const subTitleY = titleY + 5;
    doc.text("PT BPD JATIM", col1X + 15, subTitleY, { align: 'center' });
    doc.text(profile?.name || 'Sekolah', col2X, subTitleY, { align: 'center' });
    const branchY = subTitleY + 5;
    doc.text(`CABANG ${bankBranch}`, col1X + 15, branchY, { align: 'center' });
    const nameY = branchY + 30;
    doc.setFont('times', 'bold');
    doc.text(ksName, col2X, nameY, { align: 'center' });
    doc.text(trName, col3X, nameY, { align: 'center' });
    doc.setLineWidth(0.2);
    doc.line(col2X - 20, nameY + 1, col2X + 20, nameY + 1);
    doc.line(col3X - 20, nameY + 1, col3X + 20, nameY + 1);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${ksNip}`, col2X, nameY + 5, { align: 'center' });
    doc.text(`NIP. ${trNip}`, col3X, nameY + 5, { align: 'center' });

    return doc;
  };

  const createPemindahbukuanDoc = () => {
    const doc = new jsPDF();
    generateHeader(doc);
    const topMargin = 55;
    const bankName = profile?.bankName || 'BANK';
    const bankBranch = profile?.bankBranch || 'CABANG';
    const accountNo = profile?.accountNo || '...';

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`NOMOR : ${suratNo}`, 105, topMargin, { align: 'center' });
    const recipientY = topMargin + 10;
    const leftMargin = 20;
    doc.text('Kepada Yth : Bapak Direktur', leftMargin, recipientY);
    const bankShort = bankName.replace('PT. ', '').replace('BANK PEMBANGUNAN DAERAH JAWA TIMUR', 'BANK JATIM');
    doc.text(`${bankShort} CABANG ${bankBranch}`, leftMargin, recipientY + 5); 
    doc.text('DI', leftMargin, recipientY + 10);
    const cityClean = (profile?.city || '').replace('KOTA ', '').replace('KABUPATEN ', '');
    doc.text(cityClean, leftMargin, recipientY + 15);
    const perihalY = recipientY + 25;
    doc.text('Perihal : ', leftMargin, perihalY);
    const perihalTitle = "Kuasa Pemindahbukuan";
    doc.text(perihalTitle, leftMargin + 17, perihalY);
    const titleWidth = doc.getTextWidth(perihalTitle);
    doc.setLineWidth(0.3);
    doc.line(leftMargin + 17, perihalY + 1, leftMargin + 17 + titleWidth, perihalY + 1);
    const bodyY = perihalY + 10;
    const body1 = `Sehubungan dengan adanya rekening kami di ${bankShort} Cabang ${bankBranch} atas nama ${profile?.name} nomor rekening ${accountNo} bersama ini kami mengajukan kuasa pemindahbukuan. (Terlampir)`;
    const splitBody1 = doc.splitTextToSize(body1, 170);
    doc.text(splitBody1, leftMargin, bodyY);
    const body2Y = bodyY + (splitBody1.length * 5) + 5;
    const body2 = `Kami harap dengan adanya kuasa tersebut dapat dilakukan pemindahbukuan secara otomatis dari rekening Giro kami yang ada di ${bankShort} Cabang ${bankBranch}`;
    const splitBody2 = doc.splitTextToSize(body2, 170);
    doc.text(splitBody2, leftMargin, body2Y);
    const closingY = body2Y + (splitBody2.length * 5) + 5;
    doc.text('Demikian atas kerja sama yang baik sampaikan terima kasih.', leftMargin, closingY);
    
    // Signature Block with Date
    const signY = closingY + 10;
    const d = new Date(withdrawDate);
    const dateStr = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    const cityTitle = getCityName();
    doc.text(`${cityTitle}, ${dateStr}`, 140, signY); // Add date line here
    
    const titleY = signY + 6;
    const leftColX = 60;
    const rightColX = 150;
    
    doc.setFont('times', 'bold');
    doc.text(profile?.name || 'SEKOLAH', 105, titleY, { align: 'center' });
    
    const jabatanY = titleY + 6;
    doc.setFont('times', 'normal');
    doc.text(ksTitle, leftColX, jabatanY, { align: 'center' });
    doc.text('Bendahara', rightColX, jabatanY, { align: 'center' });
    
    const nameY = jabatanY + 30;
    doc.setFont('times', 'bold');
    doc.text(ksName, leftColX, nameY, { align: 'center' });
    const ksNameWidth = doc.getTextWidth(ksName);
    doc.line(leftColX - (ksNameWidth/2), nameY + 1, leftColX + (ksNameWidth/2), nameY + 1);
    doc.text(trName, rightColX, nameY, { align: 'center' });
    const trNameWidth = doc.getTextWidth(trName);
    doc.line(rightColX - (trNameWidth/2), nameY + 1, rightColX + (trNameWidth/2), nameY + 1);
    
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${ksNip}`, leftColX, nameY + 5, { align: 'center' });
    doc.text(`NIP. ${trNip}`, rightColX, nameY + 5, { align: 'center' });
    
    return doc;
  };

  const createRincianDoc = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR RINCIAN TRANSFER', 148, 15, { align: 'center' });
    doc.text(`${(profile?.name || 'SEKOLAH').toUpperCase()}`, 148, 20, { align: 'center' });
    doc.text((profile?.city || 'KOTA').toUpperCase(), 148, 25, { align: 'center' });
    const d = new Date(withdrawDate);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(`Bulan ${MONTHS[d.getMonth()]} (Realisasi)`, 15, 35);

    const groupedData = getGroupedData();
    let totalPph21 = 0; let totalPph22 = 0; let totalPph23 = 0; let totalPajakDaerah = 0; let totalPotonganAll = 0; let totalBersihAll = 0;

    const tableBody = groupedData.map((item, idx) => {
        let mergedDesc = item.descriptions.join(', ');
        if (mergedDesc.length > 50 && item.descriptions.length > 1) {
            mergedDesc = `${item.descriptions[0]} dan ${item.descriptions.length - 1} item lainnya`;
        }
        const totalTaxes = item.taxes.ppn + item.taxes.pph21 + item.taxes.pph22 + item.taxes.pph23 + item.taxes.pajakDaerah;
        const netAmount = item.amount - totalTaxes;
        totalPph21 += item.taxes.pph21; totalPph22 += item.taxes.pph22; totalPph23 += item.taxes.pph23; totalPajakDaerah += item.taxes.pajakDaerah; totalPotonganAll += totalTaxes; totalBersihAll += netAmount;

        return [
            idx + 1, item.name || '(Isi Nama)', item.account || '(Isi No Rek)', formatRupiah(item.amount),
            formatRupiah(item.taxes.ppn), formatRupiah(item.taxes.pph21), formatRupiah(item.taxes.pph22), formatRupiah(item.taxes.pph23), formatRupiah(item.taxes.pajakDaerah),
            formatRupiah(totalTaxes), formatRupiah(netAmount), mergedDesc
        ]
    });

    tableBody.push([
        '', 'JUMLAH', '', formatRupiah(totalSelectedAmount), '', 
        formatRupiah(totalPph21), formatRupiah(totalPph22), formatRupiah(totalPph23), formatRupiah(totalPajakDaerah),
        formatRupiah(totalPotonganAll), formatRupiah(totalBersihAll), ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: [
          [
              { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nama', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nomor Rekening', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nominal', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Potongan Pajak', colSpan: 5, styles: { halign: 'center', fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Jml Potongan', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Jumlah Bersih', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [200, 200, 255] } },
              { content: 'Keterangan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          ],
          [
              { content: 'PPN', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 21', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 22', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 23', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Daerah', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
          ]
      ],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 20 }, 3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 15, halign: 'right' }, 7: { cellWidth: 15, halign: 'right' }, 8: { cellWidth: 15, halign: 'right' },
        9: { cellWidth: 20, halign: 'right' }, 10: { cellWidth: 22, halign: 'right', fillColor: [200, 200, 255] }, 11: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.name || 'SEKOLAH', 148, finalY, { align: 'center' });
    const titleY = finalY + 5;
    const col1 = 40; const col2 = 148; const col3 = 240;
    doc.setFont('helvetica', 'normal');
    doc.text('Kuasa Pengguna Anggaran', col1, titleY, { align: 'center' });
    doc.text('Diterima Pihak Bank Jatim', col2, titleY, { align: 'center' });
    doc.text('Bendahara BOP', col3, titleY, { align: 'center' });
    const nameY = titleY + 25;
    doc.text('( ................................. )', col2, nameY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(ksName, col1, nameY, { align: 'center' });
    doc.text(trName, col3, nameY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${ksNip}`, col1, nameY + 5, { align: 'center' });
    doc.text(`NIP. ${trNip}`, col3, nameY + 5, { align: 'center' });
    return doc;
  };

  // --- PREVIEW GENERATOR ---
  useEffect(() => {
    const generatePreview = () => {
      // Clean up previous URL
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }

      if (activeTab !== 'surat_kuasa' && activeTab !== 'pemindahbukuan') {
        setPdfPreviewUrl(null);
        return;
      }

      setIsPreviewLoading(true);
      
      // Debounce slightly to allow state to settle
      const timeoutId = setTimeout(() => {
        try {
          let doc: jsPDF;
          if (activeTab === 'surat_kuasa') {
            doc = createSuratKuasaDoc();
          } else {
            doc = createPemindahbukuanDoc();
          }
          
          const blob = doc.output('blob');
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
        } catch (error) {
          console.error("Preview generation failed", error);
        } finally {
          setIsPreviewLoading(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    // Run preview generation when relevant data changes
    const cleanup = generatePreview();
    
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
    
  }, [
    activeTab, 
    suratNo, 
    withdrawDate, 
    ksName, ksTitle, ksNip, ksAddress, 
    trName, trTitle, trNip, trAddress, 
    selectedBudgetIds, 
    monthlyRealizations, 
    profile,
    recipientDetails // Important: Re-generate if recipient details (names) change
  ]);

  // CHANGED: Converted from Component inside Component to a Variable to prevent re-render focus loss
  const budgetTableContent = (
     <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[500px] overflow-y-auto relative">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="px-4 py-3 w-10 text-center">
                        <button onClick={toggleSelectAll} className="flex items-center justify-center w-full text-blue-600 hover:text-blue-700">
                            {isAllSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                    </th>
                    <th className="px-4 py-3 min-w-[200px]">Uraian Kegiatan (Keterangan)</th>
                    <th className="px-4 py-3 min-w-[150px]">
                       <div className="flex items-center justify-between">
                          <span>Nama Penerima</span>
                          {selectedBudgetIds.length > 1 && (
                             <button 
                                onClick={() => setIsBulkEditOpen(true)}
                                className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center gap-1"
                                title="Isi nama penerima untuk semua item yang dicentang"
                             >
                                <Users size={12} /> Isi Sekaligus
                             </button>
                          )}
                       </div>
                    </th>
                    <th className="px-4 py-3 min-w-[120px]">No. Rekening</th>
                    {/* New Tax Columns */}
                    <th className="px-2 py-3 w-20 text-center text-xs">PPh 21</th>
                    <th className="px-2 py-3 w-20 text-center text-xs">PPh 22</th>
                    <th className="px-2 py-3 w-20 text-center text-xs">PPh 23</th>
                    <th className="px-2 py-3 w-20 text-center text-xs">Daerah</th>
                    <th className="px-4 py-3 text-right">Nominal Cair (SPJ)</th>
                    <th className="px-4 py-3 text-right bg-blue-50">Jml Bersih</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
                {monthlyRealizations.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-gray-400">Tidak ada realisasi pada bulan {MONTHS[withdrawalMonth-1]}. Silakan input SPJ terlebih dahulu.</td></tr>
                ) : (
                    monthlyRealizations.map(item => {
                        const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
                        const totalPotongan = (detail.ppn || 0) + (detail.pph21 || 0) + (detail.pph22 || 0) + (detail.pph23 || 0) + (detail.pajakDaerah || 0);
                        const jumlahBersih = item.amount - totalPotongan;

                        return (
                        <tr key={item.id} className={`hover:bg-gray-50 ${selectedBudgetIds.includes(item.id) ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3 text-center text-blue-600 cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                {selectedBudgetIds.includes(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                            </td>
                            <td className="px-4 py-3 cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                <div className="font-medium text-gray-800 text-xs">{item.description}</div>
                                <div className="text-[10px] text-gray-400">{item.account_code || '-'}</div>
                            </td>
                            <td className="px-2 py-2">
                                {selectedBudgetIds.includes(item.id) ? (
                                    <input 
                                    type="text" 
                                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="Nama..."
                                    value={detail.name}
                                    onChange={(e) => handleRecipientChange(item.id, 'name', e.target.value)}
                                    />
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </td>
                            <td className="px-2 py-2">
                                {selectedBudgetIds.includes(item.id) ? (
                                    <input 
                                    type="text" 
                                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="No Rek..."
                                    value={detail.account}
                                    onChange={(e) => handleRecipientChange(item.id, 'account', e.target.value)}
                                    />
                                ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                )}
                            </td>
                            
                            {/* TAX INPUTS */}
                            <td className="px-1 py-2">
                                {selectedBudgetIds.includes(item.id) && (
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                    value={detail.pph21 || ''}
                                    onChange={(e) => handleRecipientChange(item.id, 'pph21', Number(e.target.value))}
                                    />
                                )}
                            </td>
                            <td className="px-1 py-2">
                                {selectedBudgetIds.includes(item.id) && (
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                    value={detail.pph22 || ''}
                                    onChange={(e) => handleRecipientChange(item.id, 'pph22', Number(e.target.value))}
                                    />
                                )}
                            </td>
                            <td className="px-1 py-2">
                                {selectedBudgetIds.includes(item.id) && (
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                    value={detail.pph23 || ''}
                                    onChange={(e) => handleRecipientChange(item.id, 'pph23', Number(e.target.value))}
                                    />
                                )}
                            </td>
                            <td className="px-1 py-2">
                                {selectedBudgetIds.includes(item.id) && (
                                    <input 
                                    type="number" min="0"
                                    className="w-full border border-gray-300 rounded px-1 py-1 text-[10px] text-right focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                    value={detail.pajakDaerah || ''}
                                    onChange={(e) => handleRecipientChange(item.id, 'pajakDaerah', Number(e.target.value))}
                                    />
                                )}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-xs text-gray-500">
                                {formatRupiah(item.amount)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-800 bg-blue-50">
                                {formatRupiah(jumlahBersih)}
                            </td>
                        </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Landmark className="text-blue-600" /> Pengajuan Pencairan BOSP
        </h2>
        <p className="text-sm text-gray-500">Cetak dokumen administrasi untuk penarikan dana di Bank berdasarkan Realisasi (SPJ).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Transaction Specifics & Summary */}
         <div className="lg:col-span-1 space-y-6">
            
            {/* Informasi Pencairan */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar size={18} /> Detail Pencairan
               </h3>
               <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Cek/Giro</label>
                    <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="Kosongkan jika tunai" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Tanggal Pencairan</label>
                    <div className="relative">
                       <Calendar size={16} className="absolute left-3 top-2.5 text-gray-400" />
                       <input type="date" value={withdrawDate} onChange={e => setWithdrawDate(e.target.value)} className="w-full border rounded pl-9 pr-3 py-2 text-sm" />
                    </div>
                  </div>
               </div>
            </div>

            {/* Read-only Bank Summary */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
                <h4 className="font-bold text-gray-600 mb-2 flex items-center gap-2">
                    <CreditCard size={14} /> Sumber Dana (Dari Profil)
                </h4>
                <div className="space-y-1 text-gray-500">
                    <p className="font-bold text-gray-700">{profile?.bankName || 'Nama Bank Belum Diatur'}</p>
                    <p>Cabang: {profile?.bankBranch || '-'}</p>
                    <p className="font-mono">{profile?.accountNo || '-'}</p>
                </div>
                {!profile?.bankName && (
                    <div className="mt-3 text-xs bg-yellow-100 text-yellow-800 p-2 rounded flex gap-1 items-start">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        <span>Data bank belum lengkap. Harap lengkapi di menu Pengaturan.</span>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-xs font-bold text-blue-800 uppercase mb-1">Total Pencairan</p>
                <p className="text-2xl font-bold text-blue-900">{formatRupiah(totalSelectedAmount)}</p>
                <p className="text-[10px] text-blue-700 mt-2 italic capitalize leading-tight">"{getTerbilang(totalSelectedAmount)} Rupiah"</p>
                <div className="mt-2 text-[10px] text-blue-600 border-t border-blue-200 pt-1">
                    Item Terpilih: <b>{selectedBudgetIds.length}</b> rekening
                </div>
            </div>
         </div>

         {/* Right Column: Transaction Selection & Document Generation */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                  <button 
                    onClick={() => setActiveTab('rincian')}
                    className={`flex-1 min-w-[120px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'rincian' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                     <FileText size={16} /> 1. Rincian
                  </button>
                  <button 
                    onClick={() => setActiveTab('surat_kuasa')}
                    className={`flex-1 min-w-[120px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'surat_kuasa' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                     <User size={16} /> 2. Surat Kuasa
                  </button>
                  <button 
                    onClick={() => setActiveTab('pemindahbukuan')}
                    className={`flex-1 min-w-[120px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'pemindahbukuan' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                     <DollarSign size={16} /> 3. Pemindahbukuan
                  </button>
                  <button 
                    onClick={() => setActiveTab('riwayat')}
                    className={`flex-1 min-w-[120px] py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'riwayat' ? 'bg-white text-blue-600 border-t-2 border-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                     <History size={16} /> 4. Riwayat
                  </button>
               </div>

               <div className="p-6">
                  {activeTab === 'rincian' && (
                     <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                           <div>
                               <p className="text-sm font-bold text-gray-800">Daftar Item Transfer (Berdasarkan SPJ)</p>
                               <p className="text-xs text-gray-500">
                                   Pilih item realisasi untuk bulan ini.
                               </p>
                           </div>
                           
                           {/* Month Filter */}
                           <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                               <Filter size={14} className="text-gray-500 ml-2" />
                               <select 
                                  value={withdrawalMonth}
                                  onChange={(e) => setWithdrawalMonth(Number(e.target.value))}
                                  className="bg-transparent text-sm font-bold text-gray-700 py-1 px-2 outline-none cursor-pointer"
                               >
                                  {MONTHS.map((m, idx) => (
                                     <option key={idx} value={idx + 1}>{m}</option>
                                  ))}
                               </select>
                           </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end mb-2">
                               <button 
                                    onClick={handleArchiveData} 
                                    disabled={isSaving}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
                                    title="Simpan tanpa mencetak"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />} 
                                    Simpan Draft Arsip
                                </button>
                               <button onClick={handlePrintAndArchive} disabled={totalSelectedAmount === 0} className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition disabled:opacity-50">
                                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} 
                                  Cetak & Simpan PDF
                               </button>
                        </div>

                        {budgetTableContent}
                     </div>
                  )}

                  {/* HISTORY TAB */}
                  {activeTab === 'riwayat' && (
                      <div className="space-y-4">
                          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                              <History className="text-blue-600 mt-1" size={20} />
                              <div>
                                  <h4 className="text-sm font-bold text-blue-800">Arsip Pencairan</h4>
                                  <p className="text-xs text-blue-600">
                                      Data yang sudah diarsipkan bisa dikembalikan (restore) ke form untuk dicetak ulang.
                                  </p>
                              </div>
                          </div>

                          <div className="border border-gray-200 rounded-xl overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-50 font-bold text-gray-700 border-b border-gray-200">
                                      <tr>
                                          <th className="px-4 py-3">Tanggal Surat</th>
                                          <th className="px-4 py-3">Nomor Surat</th>
                                          <th className="px-4 py-3 text-right">Total Cair</th>
                                          <th className="px-4 py-3 text-center">File</th>
                                          <th className="px-4 py-3 text-right">Aksi</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {isLoadingHistory ? (
                                          <tr><td colSpan={5} className="text-center py-8 text-gray-400">Memuat riwayat...</td></tr>
                                      ) : historyList.length === 0 ? (
                                          <tr><td colSpan={5} className="text-center py-8 text-gray-400">Belum ada riwayat pencairan.</td></tr>
                                      ) : (
                                          historyList.map((hist) => (
                                              <tr key={hist.id} className="hover:bg-gray-50">
                                                  <td className="px-4 py-3">
                                                      {new Date(hist.letter_date).toLocaleDateString('id-ID')}
                                                  </td>
                                                  <td className="px-4 py-3 font-mono text-xs">{hist.letter_number}</td>
                                                  <td className="px-4 py-3 text-right font-bold text-gray-700">
                                                      {formatRupiah(hist.total_amount)}
                                                  </td>
                                                  <td className="px-4 py-3 text-center">
                                                      {hist.file_url ? (
                                                          <a 
                                                            href={hist.file_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 border border-red-100"
                                                          >
                                                              <FileText size={12} /> PDF
                                                          </a>
                                                      ) : (
                                                          <span className="text-xs text-gray-400">-</span>
                                                      )}
                                                  </td>
                                                  <td className="px-4 py-3 text-right">
                                                      <div className="flex justify-end gap-2">
                                                          <button 
                                                              onClick={() => handleRestoreFromHistory(hist)}
                                                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                                              title="Buka / Pulihkan Data"
                                                          >
                                                              <RefreshCcw size={16} />
                                                          </button>
                                                          <button 
                                                              onClick={() => handleDeleteHistory(hist.id)}
                                                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                                              title="Hapus Riwayat"
                                                          >
                                                              <Trash2 size={16} />
                                                          </button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}

                  {(activeTab === 'surat_kuasa' || activeTab === 'pemindahbukuan') && (
                     <div className="flex flex-col xl:flex-row gap-6 h-full">
                        {/* LEFT COLUMN: EDIT DATA */}
                        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                               <Edit3 size={16} />
                               <span>Edit data untuk ditampilkan di preview.</span>
                            </div>
                            
                            {/* NEW: Selection Summary in Edit Panel */}
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-yellow-800 uppercase">Total Anggaran</p>
                                    <p className="text-lg font-bold text-yellow-900">{formatRupiah(totalSelectedAmount)}</p>
                                    <p className="text-[10px] text-yellow-700">{selectedBudgetIds.length} item terpilih</p>
                                </div>
                                <button 
                                    onClick={() => setIsSelectionModalOpen(true)}
                                    className="bg-white border border-yellow-300 text-yellow-700 hover:bg-yellow-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                >
                                    <Coins size={14} /> Ubah
                                </button>
                            </div>

                            {activeTab === 'surat_kuasa' && (
                                <div className="space-y-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Surat</label>
                                        <input type="text" value={suratNo} onChange={e => setSuratNo(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="422 / ... / ..." />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Pihak I (Pemberi Kuasa - KS)</p>
                                        <input type="text" value={ksName} onChange={e => setKsName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama" />
                                        <input type="text" value={ksTitle} onChange={e => setKsTitle(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Jabatan (ex: Plt. Kepala Sekolah)" />
                                        <input type="text" value={ksNip} onChange={e => setKsNip(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="NIP" />
                                        <input type="text" value={ksAddress} onChange={e => setKsAddress(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Alamat" />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Pihak II (Penerima Kuasa - Bendahara)</p>
                                        <input type="text" value={trName} onChange={e => setTrName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama" />
                                        <input type="text" value={trTitle} onChange={e => setTrTitle(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Jabatan (ex: Bendahara BOS)" />
                                        <input type="text" value={trNip} onChange={e => setTrNip(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="NIP" />
                                        <input type="text" value={trAddress} onChange={e => setTrAddress(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Alamat" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pemindahbukuan' && (
                                <div className="space-y-4">
                                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                       <p className="text-xs text-gray-500 mb-2">Pastikan data Bank dan Rekening di panel kiri sudah benar.</p>
                                   </div>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => activeTab === 'surat_kuasa' ? createSuratKuasaDoc().save('Surat_Kuasa.pdf') : createPemindahbukuanDoc().save('Pemindahbukuan.pdf')} 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition"
                                >
                                    <Printer size={18} /> Download PDF
                                </button>

                                <button 
                                    onClick={handlePrintAndArchive} 
                                    className="w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                >
                                    <List size={18} /> Cetak Lampiran Transfer & Simpan
                                </button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: PREVIEW */}
                        <div className="flex-1 xl:flex-[1.5] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                    <Eye size={14} /> Preview Dokumen
                                </span>
                                <div className="flex items-center gap-2">
                                    {pdfPreviewUrl && (
                                        <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-white px-2 py-1 rounded border border-gray-300">
                                            <ExternalLink size={12} /> Buka Tab Baru
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 bg-gray-500 overflow-hidden flex items-center justify-center relative">
                                {isPreviewLoading ? (
                                    <div className="text-white text-sm">Memuat preview...</div>
                                ) : pdfPreviewUrl ? (
                                    <>
                                        <iframe 
                                            key={pdfPreviewUrl} // Force re-render on URL change
                                            src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                            className="w-full h-full"
                                            title="PDF Preview"
                                        />
                                        {/* Mobile Fallback */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 lg:hidden text-center p-4">
                                            <div>
                                                <p className="text-white text-sm mb-4">Preview PDF mungkin tidak muncul di perangkat mobile.</p>
                                                <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 mx-auto w-fit">
                                                    <ExternalLink size={16} /> Buka PDF Fullscreen
                                                </a>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-white text-sm">Menyiapkan preview...</div>
                                )}
                            </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>

         </div>
      </div>
      
      {/* BULK EDIT MODAL */}
      {isBulkEditOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-up">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                  <h3 className="font-bold text-gray-800">Set Penerima Sekaligus</h3>
                  <button onClick={() => setIsBulkEditOpen(false)}><X size={20} className="text-gray-400" /></button>
               </div>
               <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-600">
                     Data ini akan diterapkan ke <b>{selectedBudgetIds.length} item</b> yang sedang dicentang.
                  </p>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">Nama Penerima / Toko</label>
                     <input 
                        type="text" 
                        value={bulkName} 
                        onChange={e => setBulkName(e.target.value)} 
                        className="w-full border rounded px-3 py-2 text-sm" 
                        placeholder="Contoh: CV. Sinar Jaya"
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Rekening</label>
                     <input 
                        type="text" 
                        value={bulkAccount} 
                        onChange={e => setBulkAccount(e.target.value)} 
                        className="w-full border rounded px-3 py-2 text-sm" 
                        placeholder="Contoh: 1234567890"
                     />
                  </div>
                  <button 
                     onClick={applyBulkRecipient}
                     className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                  >
                     Terapkan ke Semua
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* SELECTION MODAL */}
      {isSelectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Pilih Anggaran untuk Dicairkan</h3>
                    <button onClick={() => setIsSelectionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {budgetTableContent}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="text-sm">
                        <span className="text-gray-500">Total Terpilih: </span>
                        <span className="font-bold text-blue-600">{formatRupiah(totalSelectedAmount)}</span>
                    </div>
                    <button 
                        onClick={() => setIsSelectionModalOpen(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default BankWithdrawal;