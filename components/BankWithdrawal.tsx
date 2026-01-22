import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Budget, TransactionType, SchoolProfile } from '../types';
import { FileText, Printer, Landmark, CheckSquare, Square, DollarSign, Calendar, User, CreditCard, Edit3, Upload, Image as ImageIcon, Eye, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankWithdrawalProps {
  data: Budget[];
  profile: SchoolProfile | null;
}

const BankWithdrawal: React.FC<BankWithdrawalProps> = ({ data, profile }) => {
  const [activeTab, setActiveTab] = useState<'rincian' | 'surat_kuasa' | 'pemindahbukuan'>('rincian');
  
  // Form States - General
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [bankName, setBankName] = useState('PT. BANK PEMBANGUNAN DAERAH JAWA TIMUR');
  const [bankBranch, setBankBranch] = useState('CABANG KEDIRI');
  const [accountNo, setAccountNo] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States - Surat Kuasa Specific (Editable)
  const [suratNo, setSuratNo] = useState('');
  const [ksName, setKsName] = useState('');
  const [ksNip, setKsNip] = useState('');
  const [ksAddress, setKsAddress] = useState('');
  const [trName, setTrName] = useState('');
  const [trNip, setTrNip] = useState('');
  const [trAddress, setTrAddress] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');

  // Kop Surat Image State (Base64)
  const [headerImage, setHeaderImage] = useState<string | null>(null);

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
        setKsName(profile.headmaster || '');
        setKsNip(profile.headmasterNip || '');
        setKsAddress(profile.address || ''); // Default alamat sekolah
        setTrName(profile.treasurer || '');
        setTrNip(profile.treasurerNip || '');
        setTrAddress(profile.address || ''); // Default alamat sekolah
        setSchoolAddress(profile.address || '');
        
        const year = new Date().getFullYear();
        setSuratNo(`422 / 001 / 419.109.3.135 / ${year}`);
    }
  }, [profile]);

  // Filter approved expenses
  const availableExpenses = useMemo(() => {
    return data.filter(d => d.type === TransactionType.EXPENSE && d.status === 'approved');
  }, [data]);

  const totalSelectedAmount = useMemo(() => {
    return availableExpenses
      .filter(d => selectedBudgetIds.includes(d.id))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [availableExpenses, selectedBudgetIds]);

  const toggleSelection = (id: string) => {
    setSelectedBudgetIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
    else if (angka < 100) terbilang = getTerbilang(Math.floor(angka / 10)) + " Puluh" + getTerbilang(angka % 10);
    else if (angka < 200) terbilang = " Seratus" + getTerbilang(angka - 100);
    else if (angka < 1000) terbilang = getTerbilang(Math.floor(angka / 100)) + " Ratus" + getTerbilang(angka % 100);
    else if (angka < 2000) terbilang = " Seribu" + getTerbilang(angka - 1000);
    else if (angka < 1000000) terbilang = getTerbilang(Math.floor(angka / 1000)) + " Ribu" + getTerbilang(angka % 1000);
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
        // Use uploaded image as header
        // Aspect ratio check is ideal, but assuming standard header approx 190x30mm
        doc.addImage(headerImage, 'PNG', 10, 10, 190, 35);
        // Add line below image just in case image doesn't have one
        // doc.setLineWidth(0.5);
        // doc.line(20, 46, 190, 46);
    } else {
        // Fallback text header
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('PEMERINTAH KABUPATEN/KOTA ...', 105, 15, { align: 'center' }); 
        doc.text('DINAS PENDIDIKAN', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text((profile?.name || 'NAMA SEKOLAH').toUpperCase(), 105, 26, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(schoolAddress, 105, 32, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(20, 36, 190, 36);
        doc.setLineWidth(0.2);
        doc.line(20, 37, 190, 37);
    }
  };

  const createSuratKuasaDoc = () => {
    const doc = new jsPDF();
    
    // 1. KOP SURAT
    generateHeader(doc);
    const topMargin = headerImage ? 55 : 48;

    // 2. JUDUL SURAT
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT KUASA', 105, topMargin, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(85, topMargin + 1, 125, topMargin + 1); 
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`NOMOR : ${suratNo}`, 105, topMargin + 7, { align: 'center' });

    // 3. BODY - PEMBUKA
    const startY = topMargin + 17;
    doc.text("Yang bertanda tangan di bawah ini :", 20, startY);

    // PIHAK 1 (Kepala Sekolah)
    const p1Y = startY + 8;
    const labelX = 20;
    const colonX = 50;
    const valueX = 53;
    const lineHeight = 6;

    doc.text("1.  Nama", labelX, p1Y);
    doc.text(":", colonX, p1Y);
    doc.setFont('helvetica', 'bold');
    doc.text(ksName, valueX, p1Y);
    
    doc.setFont('helvetica', 'normal');
    doc.text("Jabatan", labelX + 8, p1Y + lineHeight);
    doc.text(":", colonX, p1Y + lineHeight);
    doc.text("Kepala Sekolah", valueX, p1Y + lineHeight);

    doc.text("Alamat", labelX + 8, p1Y + (lineHeight * 2));
    doc.text(":", colonX, p1Y + (lineHeight * 2));
    const ksAddrLines = doc.splitTextToSize(ksAddress, 130);
    doc.text(ksAddrLines, valueX, p1Y + (lineHeight * 2));

    const afterP1Y = p1Y + (lineHeight * 2) + (ksAddrLines.length * 5) + 4;

    // PIHAK 2 (Bendahara)
    doc.text("2.  Nama", labelX, afterP1Y);
    doc.text(":", colonX, afterP1Y);
    doc.setFont('helvetica', 'bold');
    doc.text(trName, valueX, afterP1Y);

    doc.setFont('helvetica', 'normal');
    doc.text("Jabatan", labelX + 8, afterP1Y + lineHeight);
    doc.text(":", colonX, afterP1Y + lineHeight);
    doc.text("Bendahara BOS", valueX, afterP1Y + lineHeight);

    doc.text("Alamat", labelX + 8, afterP1Y + (lineHeight * 2));
    doc.text(":", colonX, afterP1Y + (lineHeight * 2));
    const trAddrLines = doc.splitTextToSize(trAddress, 130);
    doc.text(trAddrLines, valueX, afterP1Y + (lineHeight * 2));

    const afterP2Y = afterP1Y + (lineHeight * 2) + (trAddrLines.length * 5) + 8;

    // 4. ISI KUASA
    const textKuasa = `Bertindak untuk dan atas nama ${profile?.name || 'Sekolah'} Kota Kediri. Dengan ini memberikan kuasa penuh yang tidak dapat dicabut kembali dengan substitusi kepada :`;
    const splitKuasa = doc.splitTextToSize(textKuasa, 170);
    doc.text(splitKuasa, 20, afterP2Y);

    const bankY = afterP2Y + (splitKuasa.length * 6) + 5;
    doc.setFont('helvetica', 'bold');
    doc.text(bankName, 105, bankY, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Berkedudukan di ${bankBranch}`, 105, bankY + 5, { align: 'center' });

    // KHUSUS
    const khususY = bankY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("KHUSUS", 105, khususY, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(90, khususY + 1, 120, khususY + 1);

    const contentY = khususY + 10;
    doc.setFont('helvetica', 'normal');
    
    const nominalText = `${formatRupiah(totalSelectedAmount)} (${getTerbilang(totalSelectedAmount)} Rupiah)`;
    
    const mainContent = `Untuk memindahbukuan dari rekening Giro/Tabungan kami yang ada di ${bankName} ${bankBranch} dengan nomor rekening ${accountNo} atas nama ${profile?.name} untuk dilimpahkan kepada rekening terlampir yang tidak terpisahkan dari surat kuasa ini dengan total nominal ${nominalText}, Dengan data sesuai Lampiran.`;
    
    const splitMain = doc.splitTextToSize(mainContent, 170);
    doc.text(splitMain, 20, contentY);

    // 5. PENUTUP
    const closingY = contentY + (splitMain.length * 6) + 5;
    const closingText = "Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya. Segala akibat yang timbul atas pemberian kuasa ini menjadi tanggung jawab pemberi kuasa sepenuhnya.";
    const splitClosing = doc.splitTextToSize(closingText, 170);
    doc.text(splitClosing, 20, closingY);

    // 6. TANDA TANGAN
    const ttdY = closingY + (splitClosing.length * 6) + 15;
    const dateStr = new Date(withdrawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    doc.text(`Kediri, ${dateStr}`, 130, ttdY);

    const signLabelY = ttdY + 8;
    doc.setFont('helvetica', 'bold');
    doc.text("Yang Diberi Kuasa", 40, signLabelY, { align: 'center' });
    doc.text("Pemberi Kuasa", 150, signLabelY, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text("Bendahara BOS", 40, signLabelY + 5, { align: 'center' });
    doc.text("Kepala Sekolah", 150, signLabelY + 5, { align: 'center' });
    
    const nameY = signLabelY + 35;
    doc.setFontSize(11);
    doc.text(trName, 40, nameY, { align: 'center' });
    doc.text(ksName, 150, nameY, { align: 'center' });
    
    doc.setLineWidth(0.2);
    doc.line(20, nameY + 1, 60, nameY + 1); 
    doc.line(130, nameY + 1, 170, nameY + 1);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`NIP. ${trNip}`, 40, nameY + 6, { align: 'center' });
    doc.text(`NIP. ${ksNip}`, 150, nameY + 6, { align: 'center' });

    return doc;
  };

  const createPemindahbukuanDoc = () => {
    const doc = new jsPDF();
    generateHeader(doc);
    const topMargin = headerImage ? 55 : 45;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT PERINTAH PEMINDAHBUKUAN', 105, topMargin, { align: 'center' });
    
    const dateStr = new Date(withdrawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Kepada Yth.`, 20, topMargin + 15);
    doc.text(`Pimpinan ${bankName}`, 20, topMargin + 20);
    doc.text(bankBranch ? `Cabang ${bankBranch}` : 'di Tempat', 20, topMargin + 25);

    doc.text("Dengan hormat,", 20, topMargin + 40);
    const content = `Mohon dipindahbukukan dana dari Rekening Giro kami Nomor: ${accountNo} atas nama ${profile?.name} sebesar ${formatRupiah(totalSelectedAmount)} (${getTerbilang(totalSelectedAmount)} Rupiah).`;
    const splitContent = doc.splitTextToSize(content, 170);
    doc.text(splitContent, 20, topMargin + 50);

    doc.text(`Cek / Bilyet Giro Nomor: ${chequeNo || '..................'}`, 20, topMargin + 70);

    // Signatures
    const dateY = topMargin + 95;
    doc.text(`.................., ${dateStr}`, 140, dateY);
    doc.text("Kepala Sekolah", 140, dateY + 10);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`(${profile?.headmaster || 'Kepala Sekolah'})`, 140, dateY + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${profile?.headmasterNip || '...'}`, 140, dateY + 45);
    
    return doc;
  };

  const generateRincian = () => {
    const doc = new jsPDF();
    generateHeader(doc);
    const topMargin = headerImage ? 55 : 45;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DAFTAR RINCIAN RENCANA PENGGUNAAN DANA', 105, topMargin, { align: 'center' });
    doc.text(`Bulan: ${new Date(withdrawDate).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`, 105, topMargin + 7, { align: 'center' });

    const tableBody = availableExpenses
        .filter(d => selectedBudgetIds.includes(d.id))
        .map((item, idx) => [
            idx + 1,
            item.description,
            item.account_code || '-',
            formatRupiah(item.amount)
        ]);

    tableBody.push(['', '', 'TOTAL PENCAIRAN', formatRupiah(totalSelectedAmount)]);

    autoTable(doc, {
      startY: topMargin + 15,
      head: [['No', 'Uraian Kegiatan', 'Kode Rekening', 'Jumlah (Rp)']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
        3: { cellWidth: 40, halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const dateStr = new Date(withdrawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    doc.setFontSize(10);
    doc.text(`.................., ${dateStr}`, 140, finalY);
    doc.text("Bendahara Sekolah", 140, finalY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`(${profile?.treasurer || '...'})`, 140, finalY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${profile?.treasurerNip || '...'}`, 140, finalY + 30);

    doc.save('Daftar_Rincian_Pencairan.pdf');
  };

  // --- PREVIEW HANDLER ---
  
  const updatePreview = useCallback(() => {
    let doc: jsPDF | null = null;
    if (activeTab === 'surat_kuasa') {
        doc = createSuratKuasaDoc();
    } else if (activeTab === 'pemindahbukuan') {
        doc = createPemindahbukuanDoc();
    }

    if (doc) {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
    }
  }, [activeTab, suratNo, ksName, ksNip, ksAddress, trName, trNip, trAddress, bankName, bankBranch, accountNo, chequeNo, withdrawDate, totalSelectedAmount, headerImage, profile, schoolAddress]);

  // Update preview when relevant state changes
  useEffect(() => {
    if (activeTab === 'surat_kuasa' || activeTab === 'pemindahbukuan') {
        // Debounce slightly to prevent flicker on every keystroke
        const timer = setTimeout(() => {
            updatePreview();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [updatePreview]);


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
                  <ImageIcon size={18} /> Kop Surat
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
                             <p className="text-xs text-gray-500"><span className="font-semibold">Upload Gambar Kop</span></p>
                             <p className="text-[10px] text-gray-400">JPG/PNG (Disarankan 800px lebar)</p>
                         </div>
                         <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                   )}
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
               <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <CreditCard size={18} /> Data Rekening
               </h3>
               <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nama Bank</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: Bank Jatim" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Cabang/Unit</label>
                    <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: Cabang Utama" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Rekening</label>
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
                           <p className="text-sm text-gray-600">Pilih item anggaran yang akan dicairkan:</p>
                           <button onClick={generateRincian} disabled={totalSelectedAmount === 0} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition disabled:opacity-50">
                              <Printer size={14} /> Cetak Daftar
                           </button>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 font-bold text-gray-700">
                                 <tr>
                                    <th className="px-4 py-3 w-10 text-center">#</th>
                                    <th className="px-4 py-3">Uraian Kegiatan</th>
                                    <th className="px-4 py-3 text-right">Jumlah</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {availableExpenses.length === 0 ? (
                                     <tr><td colSpan={3} className="text-center py-4 text-gray-400">Tidak ada anggaran disetujui.</td></tr>
                                 ) : (
                                     availableExpenses.map(item => (
                                       <tr key={item.id} className={`cursor-pointer hover:bg-gray-50 ${selectedBudgetIds.includes(item.id) ? 'bg-blue-50' : ''}`} onClick={() => toggleSelection(item.id)}>
                                          <td className="px-4 py-3 text-center text-blue-600">
                                             {selectedBudgetIds.includes(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                          </td>
                                          <td className="px-4 py-3">
                                             <div className="font-medium text-gray-800">{item.description}</div>
                                             <div className="text-xs text-gray-400">{item.account_code || '-'}</div>
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono">
                                             {formatRupiah(item.amount)}
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

                            {activeTab === 'surat_kuasa' && (
                                <div className="space-y-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Nomor Surat</label>
                                        <input type="text" value={suratNo} onChange={e => setSuratNo(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="422 / ... / ..." />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Pihak I (Kepala Sekolah)</p>
                                        <input type="text" value={ksName} onChange={e => setKsName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama" />
                                        <input type="text" value={ksNip} onChange={e => setKsNip(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="NIP" />
                                        <input type="text" value={ksAddress} onChange={e => setKsAddress(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Alamat" />
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Pihak II (Bendahara)</p>
                                        <input type="text" value={trName} onChange={e => setTrName(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama" />
                                        <input type="text" value={trNip} onChange={e => setTrNip(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="NIP" />
                                        <input type="text" value={trAddress} onChange={e => setTrAddress(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" placeholder="Alamat" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pemindahbukuan' && (
                                <div className="space-y-4">
                                   <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                       <p className="text-xs text-gray-500 mb-2">Pastikan data Bank dan Rekening di panel kiri sudah benar.</p>
                                       <p className="text-xs text-gray-500">Nominal: <span className="font-bold">{formatRupiah(totalSelectedAmount)}</span></p>
                                   </div>
                                </div>
                            )}
                            
                            <button 
                                onClick={() => activeTab === 'surat_kuasa' ? createSuratKuasaDoc().save('Surat_Kuasa.pdf') : createPemindahbukuanDoc().save('Pemindahbukuan.pdf')} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition"
                            >
                                <Printer size={18} /> Download PDF
                            </button>
                        </div>

                        {/* RIGHT COLUMN: PREVIEW */}
                        <div className="flex-1 xl:flex-[1.5] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden flex flex-col h-[600px]">
                            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                    <Eye size={14} /> Preview Dokumen
                                </span>
                                <button onClick={updatePreview} className="text-gray-500 hover:text-blue-600 transition" title="Refresh Preview">
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                            <div className="flex-1 bg-gray-500 overflow-hidden flex items-center justify-center relative">
                                {pdfPreviewUrl ? (
                                    <iframe 
                                        src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="w-full h-full"
                                        title="PDF Preview"
                                    />
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
    </div>
  );
};

export default BankWithdrawal;