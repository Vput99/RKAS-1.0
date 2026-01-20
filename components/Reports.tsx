import React, { useMemo, useState, useEffect } from 'react';
import { Budget, TransactionType, AccountCodes, BankStatement } from '../types';
import { FileDown, Printer, FileText, TrendingUp, Table2, List, Calendar, FilterX, Upload, Plus, Trash2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBankStatements, saveBankStatement, deleteBankStatement } from '../lib/db';

interface ReportsProps {
  data: Budget[];
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const Reports: React.FC<ReportsProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'realization' | 'recap' | 'statement'>('realization');
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Bank Statement State
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [bsMonth, setBsMonth] = useState(new Date().getMonth() + 1);
  const [bsBalance, setBsBalance] = useState('');
  const [bsFile, setBsFile] = useState('');
  const [isStatementLoading, setIsStatementLoading] = useState(false);

  useEffect(() => {
    loadBankStatements();
  }, []);

  const loadBankStatements = async () => {
    const stmts = await getBankStatements();
    setBankStatements(stmts);
  };

  // --- 1. DATA LAPORAN RINCIAN (EXISTING) ---
  const realizationData = useMemo(() => {
    const expenses = data.filter(d => d.type === TransactionType.EXPENSE);
    
    return expenses.map(item => {
      const realized = item.realizations?.reduce((acc, r) => acc + r.amount, 0) || 0;
      const balance = item.amount - realized;
      const percentage = item.amount > 0 ? (realized / item.amount) * 100 : 0;
      
      return {
        ...item,
        realized,
        balance,
        percentage
      };
    }).sort((a, b) => (a.account_code || '').localeCompare(b.account_code || ''));
  }, [data]);

  const realizationTotals = useMemo(() => {
    const totalBudget = realizationData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRealized = realizationData.reduce((acc, curr) => acc + curr.realized, 0);
    const totalBalance = totalBudget - totalRealized;
    const totalPercent = totalBudget > 0 ? (totalRealized / totalBudget) * 100 : 0;
    
    return { totalBudget, totalRealized, totalBalance, totalPercent };
  }, [realizationData]);

  // --- 2. DATA LAPORAN REKAPITULASI BULANAN (FILTERED BY REALIZATION > 0) ---
  const monthlyRecapData = useMemo(() => {
    // Structure: Code -> { budget, past, current }
    const grouped: Record<string, { description: string, budget: number, past: number, current: number }> = {};

    data.forEach(item => {
      if (item.type !== TransactionType.EXPENSE) return;
      
      const code = item.account_code || 'Tanpa Kode';
      
      if (!grouped[code]) {
        // @ts-ignore
        const name = AccountCodes[code] || 'Belanja Lainnya / Belum Terkategori';
        grouped[code] = { description: name, budget: 0, past: 0, current: 0 };
      }

      // 1. Sum Budget (Pagu) - Tetap dihitung untuk konteks, meski nanti di filter
      grouped[code].budget += item.amount;

      // 2. Sum Realizations based on selected month
      if (item.realizations) {
        item.realizations.forEach(r => {
          if (r.month < reportMonth) {
            grouped[code].past += r.amount;
          } else if (r.month === reportMonth) {
            grouped[code].current += r.amount;
          }
        });
      }
    });

    // Convert to Array
    const rows = Object.entries(grouped).map(([code, val]) => {
      const totalToDate = val.past + val.current;
      const balance = val.budget - totalToDate;
      const percentage = val.budget > 0 ? (totalToDate / val.budget) * 100 : 0;
      
      return { 
        code, 
        name: val.description, 
        budget: val.budget,
        past: val.past,
        current: val.current,
        totalToDate,
        balance,
        percentage
      };
    });

    // FILTER: Hanya tampilkan yang "Bulan Ini" > 0 (Sudah ter-SPJ-kan bulan ini)
    return rows
        .filter(row => row.current > 0)
        .sort((a, b) => a.code.localeCompare(b.code));

  }, [data, reportMonth]);

  const monthlyRecapTotals = useMemo(() => {
    return monthlyRecapData.reduce((acc, curr) => ({
      budget: acc.budget + curr.budget,
      past: acc.past + curr.past,
      current: acc.current + curr.current,
      totalToDate: acc.totalToDate + curr.totalToDate,
      balance: acc.balance + curr.balance
    }), { budget: 0, past: 0, current: 0, totalToDate: 0, balance: 0 });
  }, [monthlyRecapData]);

  // --- 3. REKONSILIASI BANK (LOGIC) ---
  const bankReconciliation = useMemo(() => {
      // 1. Hitung Saldo Sistem s.d. Bulan Terpilih (bsMonth)
      
      // Pendapatan s.d. Bulan Ini
      const totalIncome = data
        .filter(d => d.type === TransactionType.INCOME && new Date(d.date).getMonth() + 1 <= bsMonth)
        .reduce((sum, item) => sum + item.amount, 0);

      // Belanja (SPJ) s.d. Bulan Ini
      const totalExpense = data
        .filter(d => d.type === TransactionType.EXPENSE)
        .reduce((sum, item) => {
            const realizedTillNow = item.realizations
                ?.filter(r => r.month <= bsMonth)
                .reduce((rSum, r) => rSum + r.amount, 0) || 0;
            return sum + realizedTillNow;
        }, 0);

      const systemBalance = totalIncome - totalExpense;

      // 2. Ambil Data Rekening Koran Bulan Ini
      const statement = bankStatements.find(s => s.month === bsMonth);
      const bankBalance = statement?.closing_balance || 0;
      const hasStatement = !!statement;

      // 3. Hitung Selisih
      const difference = systemBalance - bankBalance;

      return { systemBalance, bankBalance, difference, hasStatement };
  }, [data, bankStatements, bsMonth]);

  const handleSaveStatement = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsStatementLoading(true);
      
      const newStatement: BankStatement = {
          id: crypto.randomUUID(),
          month: bsMonth,
          year: 2026,
          closing_balance: Number(bsBalance),
          file_name: bsFile || 'rekening_koran_upload.pdf',
          updated_at: new Date().toISOString()
      };

      await saveBankStatement(newStatement);
      await loadBankStatements();
      
      setBsBalance('');
      setBsFile('');
      setIsStatementLoading(false);
  };

  const handleDeleteStatement = async (id: string) => {
      if(confirm("Hapus data rekening koran ini?")) {
          await deleteBankStatement(id);
          await loadBankStatements();
      }
  };


  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const formatCompact = (num: number) => {
    if (num === 0) return '-';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
  };

  // --- PDF GENERATORS ---

  const generateRealizationPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN RINCIAN REALISASI ANGGARAN (PER KEGIATAN)', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('TAHUN ANGGARAN 2026', 105, 28, { align: 'center' });
    
    // Summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Pagu: ${formatRupiah(realizationTotals.totalBudget)}`, 14, 40);
    doc.text(`Total Realisasi: ${formatRupiah(realizationTotals.totalRealized)}`, 14, 45);

    const tableBody = realizationData.map((item, index) => [
      index + 1,
      item.account_code || '-',
      item.description,
      formatRupiah(item.amount),
      formatRupiah(item.realized),
      formatRupiah(item.balance),
      `${item.percentage.toFixed(0)}%`
    ]);

    // Total Row
    tableBody.push([
      '', '', 'TOTAL', 
      formatRupiah(realizationTotals.totalBudget),
      formatRupiah(realizationTotals.totalRealized),
      formatRupiah(realizationTotals.totalBalance),
      ''
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['No', 'Kode Rekening', 'Uraian Kegiatan', 'Pagu', 'Realisasi', 'Sisa', '%']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 10, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save('Laporan_Rincian_Realisasi.pdf');
  };

  const generateRecapPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`REKAPITULASI REALISASI SPJ (TEREALISASI)`, 148, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`BULAN: ${MONTHS[reportMonth-1].toUpperCase()} 2026`, 148, 22, { align: 'center' });

    const tableHead = [
      ['Kode Rekening', 'Uraian Belanja', 'Anggaran (1 Thn)', 's.d. Bulan Lalu', 'Bulan Ini', 's.d. Bulan Ini', 'Sisa Anggaran']
    ];

    const tableBody = monthlyRecapData.map(row => [
      row.code,
      row.name,
      formatCompact(row.budget),
      formatCompact(row.past),
      formatCompact(row.current),
      formatCompact(row.totalToDate),
      formatCompact(row.balance)
    ]);

    // Total Row
    const totalRow = [
        'TOTAL',
        '',
        formatCompact(monthlyRecapTotals.budget),
        formatCompact(monthlyRecapTotals.past),
        formatCompact(monthlyRecapTotals.current),
        formatCompact(monthlyRecapTotals.totalToDate),
        formatCompact(monthlyRecapTotals.balance)
    ];
    tableBody.push(totalRow);

    autoTable(doc, {
      startY: 30,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], fontSize: 9, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 30 }, 
        1: { halign: 'left', cellWidth: 'auto' }, 
        2: { fontStyle: 'bold' },
        4: { fillColor: [240, 253, 244], fontStyle: 'bold' }, // Highlight 'Current' column
        6: { fontStyle: 'bold', textColor: [200, 0, 0] }
      },
      didParseCell: (data) => {
        // Bold the Total Row
        if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`Rekap_SPJ_${MONTHS[reportMonth-1]}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Laporan & Cetak</h2>
          <p className="text-sm text-gray-500">Pilih jenis laporan yang ingin ditampilkan dan dicetak.</p>
        </div>
        
        {/* Toggle Buttons */}
        <div className="bg-gray-100 p-1 rounded-lg flex overflow-x-auto">
            <button
               onClick={() => setActiveTab('realization')}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                   activeTab === 'realization' 
                   ? 'bg-white text-blue-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-800'
               }`}
            >
               <List size={16} /> Rincian Kegiatan
            </button>
            <button
               onClick={() => setActiveTab('recap')}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                   activeTab === 'recap' 
                   ? 'bg-white text-green-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-800'
               }`}
            >
               <Table2 size={16} /> Rekapitulasi SPJ
            </button>
            <button
               onClick={() => setActiveTab('statement')}
               className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                   activeTab === 'statement' 
                   ? 'bg-white text-indigo-600 shadow-sm' 
                   : 'text-gray-600 hover:text-gray-800'
               }`}
            >
               <Upload size={16} /> Rekening Koran
            </button>
        </div>
      </div>

      {/* Summary Cards (Dynamic based on Tab) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {activeTab === 'realization' && (
            <>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md">
                   <div className="flex items-center gap-3 mb-2 opacity-90">
                     <FileText size={20} />
                     <span className="text-sm font-medium">Total Pagu Anggaran</span>
                   </div>
                   <p className="text-2xl font-bold">{formatRupiah(realizationTotals.totalBudget)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                   <div className="flex items-center gap-3 mb-2 text-green-600">
                     <Printer size={20} />
                     <span className="text-sm font-medium">Total Realisasi (SPJ)</span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800">{formatRupiah(realizationTotals.totalRealized)}</p>
                   <p className="text-xs text-gray-400 mt-1">
                     {realizationTotals.totalPercent.toFixed(1)}% Terserap
                   </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                   <div className="flex items-center gap-3 mb-2 text-orange-600">
                     <TrendingUp size={20} />
                     <span className="text-sm font-medium">Sisa Anggaran</span>
                   </div>
                   <p className="text-2xl font-bold text-gray-800">{formatRupiah(realizationTotals.totalBalance)}</p>
                </div>
            </>
        )}
        
        {activeTab === 'recap' && (
            <>
                <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl p-5 text-white shadow-md">
                   <div className="flex items-center gap-3 mb-2 opacity-90">
                     <TrendingUp size={20} />
                     <span className="text-sm font-medium">SPJ Bulan {MONTHS[reportMonth-1]}</span>
                   </div>
                   <p className="text-3xl font-bold">{formatRupiah(monthlyRecapTotals.current)}</p>
                   <p className="text-xs text-green-100 mt-1">Total yang dibelanjakan bulan ini.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs uppercase font-bold">
                       Jumlah Kode Rekening
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{monthlyRecapData.length}</p>
                    <p className="text-xs text-gray-400 mt-1">Akun belanja aktif bulan ini.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs uppercase font-bold">
                       Akumulasi s.d. Bulan Ini
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{formatRupiah(monthlyRecapTotals.totalToDate)}</p>
                </div>
            </>
        )}

        {/* REKENING KORAN STATS */}
        {activeTab === 'statement' && (
             <>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                   <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs uppercase font-bold">
                       Sisa Kas (Pembukuan)
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatRupiah(bankReconciliation.systemBalance)}</p>
                    <p className="text-[10px] text-gray-400 mt-1">Pendapatan - SPJ (s.d. {MONTHS[bsMonth-1]})</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                   <div className="flex items-center gap-2 mb-1 text-gray-500 text-xs uppercase font-bold">
                       Sisa Kas (Bank/Riil)
                    </div>
                    {bankReconciliation.hasStatement ? (
                        <p className="text-2xl font-bold text-indigo-600">{formatRupiah(bankReconciliation.bankBalance)}</p>
                    ) : (
                        <p className="text-sm text-gray-400 italic mt-1">Belum upload Rekening Koran</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">Sesuai Rekening Koran {MONTHS[bsMonth-1]}</p>
                </div>

                <div className={`rounded-xl p-5 shadow-sm border ${
                    Math.abs(bankReconciliation.difference) < 100 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                }`}>
                   <div className="flex items-center gap-2 mb-1 opacity-80 text-xs uppercase font-bold">
                       {Math.abs(bankReconciliation.difference) < 100 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                       Status Rekonsiliasi
                    </div>
                    <p className={`text-2xl font-bold ${Math.abs(bankReconciliation.difference) < 100 ? 'text-green-700' : 'text-red-700'}`}>
                        {Math.abs(bankReconciliation.difference) < 100 ? 'SEIMBANG' : formatRupiah(bankReconciliation.difference)}
                    </p>
                    <p className="text-[10px] opacity-70 mt-1">
                        {Math.abs(bankReconciliation.difference) < 100 ? 'Data sudah valid.' : 'Terdapat selisih antara Buku dan Bank.'}
                    </p>
                </div>
             </>
        )}
      </div>

      {/* --- TAB CONTENT: REALIZATION (EXISTING) --- */}
      {activeTab === 'realization' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <List size={18} className="text-blue-600" />
                 <h3 className="text-sm font-bold text-gray-700">Rincian Per Kegiatan</h3>
               </div>
               <button 
                  onClick={generateRealizationPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition"
               >
                  <FileDown size={14} /> PDF Rincian
               </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-bold w-12 text-center">No</th>
                    <th className="px-4 py-3 font-bold">Kode Rekening</th>
                    <th className="px-4 py-3 font-bold">Uraian Kegiatan</th>
                    <th className="px-4 py-3 font-bold text-right">Pagu</th>
                    <th className="px-4 py-3 font-bold text-right">Realisasi</th>
                    <th className="px-4 py-3 font-bold text-right">Sisa</th>
                    <th className="px-4 py-3 font-bold text-center">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {realizationData.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data.</td>
                    </tr>
                  ) : (
                    <>
                      {realizationData.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-xs">{item.account_code || '-'}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3 text-right">{formatRupiah(item.amount)}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">{formatRupiah(item.realized)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{formatRupiah(item.balance)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              item.percentage === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {item.percentage.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* --- TAB CONTENT: RECAPITULATION (MONTHLY FILTERED) --- */}
      {activeTab === 'recap' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
               <div className="flex items-center gap-2">
                 <Table2 size={18} className="text-green-600" />
                 <div>
                    <h3 className="text-sm font-bold text-gray-700">Rekapitulasi SPJ (Terealisasi)</h3>
                    <p className="text-[10px] text-gray-400">Menampilkan akun belanja yang memiliki transaksi pada bulan terpilih.</p>
                 </div>
               </div>
               
               <div className="flex items-center gap-2">
                   {/* Month Selector */}
                   <div className="relative">
                      <Calendar size={16} className="absolute left-2.5 top-2.5 text-gray-400" />
                      <select
                        value={reportMonth}
                        onChange={(e) => setReportMonth(Number(e.target.value))}
                        className="pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white font-medium"
                      >
                         {MONTHS.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                         ))}
                      </select>
                   </div>

                   <button 
                      onClick={generateRecapPDF}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition"
                   >
                      <FileDown size={14} /> Download PDF
                   </button>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-green-50 border-b border-green-100 text-green-800">
                  <tr>
                    <th className="px-4 py-3 font-bold w-32">Kode Rekening</th>
                    <th className="px-4 py-3 font-bold">Uraian Akun Belanja</th>
                    <th className="px-4 py-3 font-bold text-right bg-green-50/50">Anggaran (1 Thn)</th>
                    <th className="px-4 py-3 font-bold text-right">s.d. Bulan Lalu</th>
                    <th className="px-4 py-3 font-bold text-right bg-yellow-50 text-yellow-800 border-l border-r border-yellow-100">Bulan Ini</th>
                    <th className="px-4 py-3 font-bold text-right">s.d. Bulan Ini</th>
                    <th className="px-4 py-3 font-bold text-right text-orange-700">Sisa Anggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyRecapData.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="text-center py-12 text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                             <FilterX size={24} className="opacity-30" />
                             <span>Tidak ada transaksi SPJ pada bulan {MONTHS[reportMonth-1]}.</span>
                          </div>
                       </td>
                    </tr>
                  ) : (
                    <>
                      {monthlyRecapData.map((row) => (
                        <tr key={row.code} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-medium">{row.code}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                          <td className="px-4 py-3 text-right bg-gray-50/50">{formatCompact(row.budget)}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{formatCompact(row.past)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-700 bg-yellow-50 border-l border-r border-yellow-100">
                              {formatCompact(row.current)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatCompact(row.totalToDate)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{formatCompact(row.balance)}</td>
                        </tr>
                      ))}
                      {/* Grand Total Row */}
                      <tr className="bg-green-50 font-bold border-t-2 border-green-200 text-green-900">
                          <td className="px-4 py-3 text-center" colSpan={2}>TOTAL SPJ BULAN INI</td>
                          <td className="px-4 py-3 text-right">{formatCompact(monthlyRecapTotals.budget)}</td>
                          <td className="px-4 py-3 text-right">{formatCompact(monthlyRecapTotals.past)}</td>
                          <td className="px-4 py-3 text-right bg-yellow-100 border-l border-r border-yellow-200">{formatCompact(monthlyRecapTotals.current)}</td>
                          <td className="px-4 py-3 text-right">{formatCompact(monthlyRecapTotals.totalToDate)}</td>
                          <td className="px-4 py-3 text-right text-orange-700">{formatCompact(monthlyRecapTotals.balance)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* --- TAB CONTENT: BANK STATEMENTS (NEW) --- */}
      {activeTab === 'statement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Form */}
            <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Upload size={18} className="text-indigo-600" /> Upload Rekening Koran
                </h3>
                
                <form onSubmit={handleSaveStatement} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Pilih Bulan</label>
                        <select 
                            value={bsMonth}
                            onChange={(e) => setBsMonth(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i} value={i+1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Saldo Akhir (Sesuai Bank)</label>
                        <div className="relative">
                           <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                           <input 
                              required
                              type="number"
                              min="0"
                              value={bsBalance}
                              onChange={(e) => setBsBalance(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="0"
                           />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Masukkan nominal saldo akhir yang tertera di rekening koran fisik.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Upload File (PDF/Scan)</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:bg-gray-50 transition cursor-pointer">
                           <Upload className="mx-auto text-gray-300 mb-2" size={24} />
                           <p className="text-xs text-gray-500">
                               {bsFile ? bsFile : "Klik untuk pilih file"}
                           </p>
                           <input 
                              type="file" 
                              className="hidden" 
                              // Fake file upload for now, just storing name
                              onChange={(e) => setBsFile(e.target.files?.[0]?.name || '')}
                           />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isStatementLoading || !bsBalance}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {isStatementLoading ? 'Menyimpan...' : 'Simpan Data'}
                    </button>
                </form>
            </div>

            {/* Right Column: History List */}
            <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-700">Riwayat Upload Rekening Koran</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3">Bulan</th>
                                <th className="px-4 py-3 text-right">Saldo Akhir Bank</th>
                                <th className="px-4 py-3 text-right">File</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bankStatements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-400">Belum ada data rekening koran.</td>
                                </tr>
                            ) : (
                                bankStatements.map((stmt) => (
                                    <tr key={stmt.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-gray-800">{MONTHS[stmt.month - 1]}</span> {stmt.year}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-medium text-indigo-700">
                                            {formatRupiah(stmt.closing_balance)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 flex items-center gap-1 justify-end truncate max-w-[150px] ml-auto">
                                                <FileText size={12} /> {stmt.file_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => handleDeleteStatement(stmt.id)}
                                                className="text-gray-400 hover:text-red-500 transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
      )}

    </div>
  );
};

export default Reports;