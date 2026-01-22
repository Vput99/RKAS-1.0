import React, { useState, useMemo, useEffect } from 'react';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { FileText, Printer, Landmark, CheckSquare, Square, DollarSign, Calendar, User, CreditCard, Edit3, Upload, Image as ImageIcon, Eye, RefreshCw, ExternalLink, List, X, Coins, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankWithdrawalProps {
  data: Budget[];
  profile: SchoolProfile | null;
}

const BankWithdrawal: React.FC<BankWithdrawalProps> = ({ data, profile }) => {
  const [activeTab, setActiveTab] = useState<'rincian' | 'surat_kuasa' | 'pemindahbukuan'>('rincian');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  
  // Form States - General
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [bankName, setBankName] = useState('PT. BANK PEMBANGUNAN DAERAH JAWA TIMUR');
  const [bankBranch, setBankBranch] = useState('KEDIRI');
  const [bankAddress, setBankAddress] = useState('Jl. Pahlawan Kusuma Bangsa Kota Kediri');
  const [accountNo, setAccountNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States - Surat Kuasa Specific (Editable)
  const [suratNo, setSuratNo] = useState('');
  
  // Pihak 1 (KS)
  const [ksName, setKsName] = useState('');
  const [ksTitle, setKsTitle] = useState('Kepala Sekolah');
  const [ksNip, setKsNip] = useState('');
  const [ksAddress, setKsAddress] = useState('');
  
  // Pihak 2 (Bendahara)
  const [trName, setTrName] = useState('');
  const [trTitle, setTrTitle] = useState('Bendahara BOS');
  const [trNip, setTrNip] = useState('');
  const [trAddress, setTrAddress] = useState('');
  
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolCity, setSchoolCity] = useState('KOTA KEDIRI');
  const [schoolKecamatan, setSchoolKecamatan] = useState('');
  const [schoolPostal, setSchoolPostal] = useState('');

  // Recipient Details State (Nama & No Rekening per Item)
  const [recipientDetails, setRecipientDetails] = useState<Record<string, { name: string, account: string }>>({});
  
  // Bulk Edit State
  const [bulkName, setBulkName] = useState('');
  const [bulkAccount, setBulkAccount] = useState('');

  // Kop Surat Image State (Base64)
  const [headerImage, setHeaderImage] = useState<string | null>(null);

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
        setSchoolAddress(profile.address || '');
        
        const year = new Date().getFullYear();
        setSuratNo(`422 / 024 / 419.109.3.135 / ${year}`);
    }
  }, [profile]);

  // Filter expenses: Show EVERYTHING except Rejected items.
  const availableExpenses = useMemo(() => {
    return data
        .filter(d => d.type === TransactionType.EXPENSE && d.status !== 'rejected')
        .sort((a, b) => {
            const dateA = new Date(a.created_at || a.date).getTime();
            const dateB = new Date(b.created_at || b.date).getTime();
            return dateB - dateA;
        });
  }, [data]);

  const totalSelectedAmount = useMemo(() => {
    return availableExpenses
      .filter(d => selectedBudgetIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [availableExpenses, selectedBudgetIds]);

  // --- LOGIC PENGELOMPOKAN (GROUPING) ---
  // Menggabungkan item jika Nama & Rekening SAMA PERSIS
  const getGroupedData = () => {
      const selectedItems = availableExpenses.filter(d => selectedBudgetIds.includes(d.id));
      
      const groups: Record<string, { 
          name: string, 
          account: string, 
          amount: number, 
          descriptions: string[] 
      }> = {};

      selectedItems.forEach(item => {
          const detail = recipientDetails[item.id] || { name: '', account: '' };
          const cleanName = detail.name.trim();
          const cleanAccount = detail.account.trim();

          // Kunci Pengelompokan: Nama + Akun. Jika kosong, gunakan ID item (tidak digabung)
          const key = (cleanName && cleanAccount) 
              ? `${cleanName.toLowerCase()}_${cleanAccount}` 
              : `individual_${item.id}`;

          if (!groups[key]) {
              groups[key] = {
                  name: cleanName,
                  account: cleanAccount,
                  amount: 0,
                  descriptions: []
              };
          }

          groups[key].amount += item.amount;
          groups[key].descriptions.push(item.description);
      });

      return Object.values(groups);
  };

  const toggleSelection = (id: string) => {
    setSelectedBudgetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = availableExpenses.length > 0 && selectedBudgetIds.length === availableExpenses.length;
  
  const toggleSelectAll = () => {
      if (isAllSelected) {
          setSelectedBudgetIds([]);
      } else {
          setSelectedBudgetIds(availableExpenses.map(d => d.id));
      }
  };

  const handleRecipientChange = (id: string, field: 'name' | 'account', value: string) => {
      setRecipientDetails(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              [field]: value
          }
      }));
  };

  const applyBulkRecipient = () => {
      setRecipientDetails(prev => {
          const newState = { ...prev };
          selectedBudgetIds.forEach(id => {
              newState[id] = { name: bulkName, account: bulkAccount };
          });
          return newState;
      });
      setIsBulkEditOpen(false);
      setBulkName('');
      setBulkAccount('');
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

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- PDF GENERATORS LOGIC ---
  const generateHeader = (doc: jsPDF) => {
    if (headerImage) {
        doc.addImage(headerImage, 'PNG', 15, 10, 25, 25);
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`PEMERINTAH ${schoolCity}`, 105, 15, { align: 'center' }); 
    doc.text('DINAS PENDIDIKAN', 105, 20, { align: 'center' });
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text((profile?.name || 'NAMA SEKOLAH').toUpperCase(), 105, 26, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(schoolAddress, 105, 32, { align: 'center' });
    const detailLine = `${schoolKecamatan ? 'Kecamatan ' + schoolKecamatan : ''} ${schoolCity} ${schoolPostal ? 'Kode Pos : ' + schoolPostal : ''}`.trim();
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
    
    // Gunakan Data yang sudah dikelompokkan
    const groupedData = getGroupedData();
    const uniqueRecipientCount = groupedData.length;

    const topMargin = 55;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('SURAT KUASA', 105, topMargin, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(85, topMargin + 1, 125, topMargin + 1); 
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`NOMOR : ${suratNo}`, 105, topMargin + 7, { align: 'center' });
    const startY = topMargin + 15;
    doc.text("Yang bertanda tangan dibawah ini :", 20, startY);
    const p1Y = startY + 8;
    const labelX = 20;
    const colonX = 45;
    const valueX = 48;
    const lineHeight = 6;
    doc.text("1. Nama", labelX, p1Y);
    doc.text(":", colonX, p1Y);
    doc.text(ksName, valueX, p1Y);
    doc.text("    Jabatan", labelX, p1Y + lineHeight);
    doc.text(":", colonX, p1Y + lineHeight);
    doc.text(`${ksTitle} ${profile?.name || ''}`, valueX, p1Y + lineHeight);
    doc.text("    Alamat", labelX, p1Y + (lineHeight * 2));
    doc.text(":", colonX, p1Y + (lineHeight * 2));
    const ksAddrLines = doc.splitTextToSize(ksAddress, 130);
    doc.text(ksAddrLines, valueX, p1Y + (lineHeight * 2));
    const afterP1Y = p1Y + (lineHeight * 2) + (ksAddrLines.length * 5) + 3;
    doc.text("2. Nama", labelX, afterP1Y);
    doc.text(":", colonX, afterP1Y);
    doc.text(trName, valueX, afterP1Y);
    doc.text("    Jabatan", labelX, afterP1Y + lineHeight);
    doc.text(":", colonX, afterP1Y + lineHeight);
    doc.text(trTitle, valueX, afterP1Y + lineHeight);
    doc.text("    Alamat", labelX, afterP1Y + (lineHeight * 2));
    doc.text(":", colonX, afterP1Y + (lineHeight * 2));
    const trAddrLines = doc.splitTextToSize(trAddress, 130);
    doc.text(trAddrLines, valueX, afterP1Y + (lineHeight * 2));
    const afterP2Y = afterP1Y + (lineHeight * 2) + (trAddrLines.length * 5) + 6;
    const textKuasa = `Bertindak untuk dan atas nama ${profile?.name || 'Sekolah'} ${schoolCity}. Dengan ini memberikan kuasa penuh yang tidak dapat di cabut kembali dengan substitusi kepada :`;
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
    
    // UPDATE: Gunakan uniqueRecipientCount untuk jumlah rekening
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
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const d = new Date(withdrawDate);
    const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const cityTitle = schoolCity.replace('KOTA ', '').replace('KABUPATEN ', '');
    const dateLine = `${cityTitle}, ${dateStr}`;
    const col1X = 20; 
    const col2X = 85; 
    const col3X = 150;
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
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.text(`NOMOR : ${suratNo}`, 105, topMargin, { align: 'center' });
    const recipientY = topMargin + 10;
    const leftMargin = 20;
    doc.text('Kepada Yth : Bapak Direktur', leftMargin, recipientY);
    const bankShort = bankName.replace('PT. ', '').replace('BANK PEMBANGUNAN DAERAH JAWA TIMUR', 'BANK JATIM');
    doc.text(`${bankShort} CABANG ${bankBranch}`, leftMargin, recipientY + 5); 
    doc.text('DI', leftMargin, recipientY + 10);
    const cityClean = schoolCity.replace('KOTA ', '').replace('KABUPATEN ', '');
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
    const signY = closingY + 20;
    doc.setFont('times', 'bold');
    doc.text(profile?.name || 'SEKOLAH', 105, signY, { align: 'center' });
    const titleY = signY + 6;
    doc.setFont('times', 'normal');
    const leftColX = 60;
    const rightColX = 150;
    doc.text(ksTitle, leftColX, titleY, { align: 'center' });
    doc.text('Bendahara', rightColX, titleY, { align: 'center' });
    const nameY = titleY + 30;
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

  const generateRincian = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR RINCIAN TRANSFER', 148, 15, { align: 'center' });
    doc.text(`${(profile?.name || 'SEKOLAH').toUpperCase()}`, 148, 20, { align: 'center' });
    doc.text(schoolCity.toUpperCase(), 148, 25, { align: 'center' });
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const d = new Date(withdrawDate);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(`Bulan ${months[d.getMonth()]}`, 15, 35);

    // UPDATE: Gunakan Grouped Data
    const groupedData = getGroupedData();

    const tableBody = groupedData.map((item, idx) => {
        // Gabungkan deskripsi jika banyak
        let mergedDesc = item.descriptions.join(', ');
        if (mergedDesc.length > 50 && item.descriptions.length > 1) {
            mergedDesc = `${item.descriptions[0]} dan ${item.descriptions.length - 1} item lainnya`;
        }

        return [
            idx + 1,
            item.name || '(Isi Nama)',
            item.account || '(Isi No Rek)',
            formatRupiah(item.amount),
            '', '', '', '', '', // Tax Columns (Empty)
            '-', // Jml Potongan
            formatRupiah(item.amount), // Bersih
            mergedDesc // Keterangan (Gabungan)
        ]
    });

    tableBody.push([
        '', 'JUMLAH', '', formatRupiah(totalSelectedAmount), '', '', '', '', '', '-', formatRupiah(totalSelectedAmount), ''
    ]);
    autoTable(doc, {
      startY: 40,
      head: [
          [
              { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nama', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nomor Rekening', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Nominal', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
              { content: 'Potongan KPPN', colSpan: 5, styles: { halign: 'center', fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Jumlah Potongan', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Jumlah Bersih', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fillColor: [200, 200, 255] } },
              { content: 'Keterangan', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          ],
          [
              { content: 'PPN', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 21', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 22', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'PPh 23', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
              { content: 'Daerah/Pajak Lain', styles: { fillColor: [255, 255, 0], textColor: [0,0,0] } },
          ]
      ],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 15, halign: 'right' }, 7: { cellWidth: 15, halign: 'right' }, 8: { cellWidth: 15, halign: 'right' },
        9: { cellWidth: 20, halign: 'right' }, 10: { cellWidth: 25, halign: 'right', fillColor: [200, 200, 255] }, 11: { cellWidth: 'auto' }
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
    doc.save('Daftar_Rincian_Transfer.pdf');
  };

  // --- PREVIEW HANDLER ---
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const generatePreview = () => {
        setIsPreviewLoading(true);
        try {
            let doc: jsPDF | null = null;
            if (activeTab === 'surat_kuasa') {
                doc = createSuratKuasaDoc();
            } else if (activeTab === 'pemindahbukuan') {
                doc = createPemindahbukuanDoc();
            }
            if (doc) {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                setPdfPreviewUrl(prev => {
                    if (prev) URL.revokeObjectURL(prev);
                    return url;
                });
            }
        } catch (e) {
            console.error("Preview generation failed", e);
        } finally {
            setIsPreviewLoading(false);
        }
    };
    if (activeTab === 'surat_kuasa' || activeTab === 'pemindahbukuan') {
        timeoutId = setTimeout(generatePreview, 800);
    }
    return () => clearTimeout(timeoutId);
  }, [
      activeTab, 
      suratNo, ksName, ksNip, ksTitle, ksAddress, 
      trName, trNip, trTitle, trAddress, 
      bankName, bankBranch, bankAddress, accountNo, chequeNo, withdrawDate, 
      totalSelectedAmount, headerImage, profile, schoolAddress, schoolCity, schoolKecamatan, schoolPostal,
      selectedBudgetIds, recipientDetails
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
                    <th className="px-4 py-3 w-1/4">Uraian Kegiatan (Keterangan)</th>
                    <th className="px-4 py-3 w-1/4">
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
                    <th className="px-4 py-3 w-1/5">No. Rekening</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
                {availableExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-400">Tidak ada anggaran disetujui.</td></tr>
                ) : (
                    availableExpenses.map(item => (
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
                                placeholder="Ketik Nama..."
                                value={recipientDetails[item.id]?.name || ''}
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
                                placeholder="Ketik No Rek..."
                                value={recipientDetails[item.id]?.account || ''}
                                onChange={(e) => handleRecipientChange(item.id, 'account', e.target.value)}
                                />
                            ) : (
                                <span className="text-xs text-gray-400">-</span>
                            )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-bold text-gray-700">
                            {formatRupiah(item.amount)}
                        </td>
                    </tr>
                    ))
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
        <p className="text-sm text-gray-500">Cetak dokumen administrasi untuk penarikan dana di Bank.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Input Details (General) */}
         <div className="lg:col-span-1 space-y-6">
            
            {/* KOP SURAT CONFIG */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <ImageIcon size={18} /> Kop Surat (Logo Kiri)
                </h3>
                <div className="space-y-3">
                   {headerImage ? (
                      <div className="relative border border-gray-200 rounded-lg overflow-hidden h-24 flex items-center justify-center bg-gray-50">
                          <img src={headerImage} alt="Kop Surat" className="max-w-full max-h-full object-contain" />
                          <button 
                            onClick={() => setHeaderImage(null)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                          >
                             <Edit3 size={12} />
                          </button>
                      </div>
                   ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                         <div className="flex flex-col items-center justify-center pt-5 pb-6">
                             <Upload className="w-6 h-6 text-gray-400 mb-1" />
                             <p className="text-xs text-gray-500"><span className="font-semibold">Upload Logo Sekolah/Pemda</span></p>
                             <p className="text-[10px] text-gray-400">JPG/PNG (Disarankan Transparan)</p>
                         </div>
                         <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                   )}
                   
                   {/* Header Text Inputs */}
                   <div className="grid grid-cols-2 gap-2 mt-2">
                      <input type="text" value={schoolCity} onChange={e => setSchoolCity(e.target.value)} className="border rounded px-2 py-1 text-xs" placeholder="KOTA KEDIRI" />
                      <input type="text" value={schoolKecamatan} onChange={e => setSchoolKecamatan(e.target.value)} className="border rounded px-2 py-1 text-xs" placeholder="Kecamatan..." />
                      <input type="text" value={schoolPostal} onChange={e => setSchoolPostal(e.target.value)} className="border rounded px-2 py-1 text-xs" placeholder="Kode Pos" />
                      <input type="text" value={schoolAddress} onChange={e => setSchoolAddress(e.target.value)} className="border rounded px-2 py-1 text-xs" placeholder="Jl. Raya..." />
                   </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <CreditCard size={18} /> Data Bank (Tujuan Kuasa)
               </h3>
               <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nama Bank</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: PT. BANK PEMBANGUNAN DAERAH JAWA TIMUR" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cabang</label>
                    <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: KEDIRI" />
                  </div>
                   <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Alamat Bank</label>
                    <input type="text" value={bankAddress} onChange={e => setBankAddress(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: Jl. Pahlawan..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Rekening Sekolah</label>
                    <input type="text" value={accountNo} onChange={e => setAccountNo(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" />
                  </div>
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
               </div>

               <div className="p-6">
                  {activeTab === 'rincian' && (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                           <div>
                               <p className="text-sm font-bold text-gray-800">Daftar Item Transfer</p>
                               <p className="text-xs text-gray-500">
                                   Pilih item dan lengkapi data penerima. 
                                   <span className="text-blue-600 font-bold"> Item dengan Nama & Rekening SAMA otomatis digabung saat cetak.</span>
                               </p>
                           </div>
                           <button onClick={generateRincian} disabled={totalSelectedAmount === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition disabled:opacity-50">
                              <Printer size={14} /> Cetak Lampiran Transfer
                           </button>
                        </div>
                        {budgetTableContent}
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
                                    onClick={generateRincian} 
                                    className="w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                >
                                    <List size={18} /> Cetak Lampiran Transfer
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