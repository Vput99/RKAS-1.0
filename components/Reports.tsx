import React, { useMemo } from 'react';
import { Budget, TransactionType } from '../types';
import { FileDown, Printer, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  data: Budget[];
}

const Reports: React.FC<ReportsProps> = ({ data }) => {
  
  // Calculate Summary Data
  const reportData = useMemo(() => {
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

  const totals = useMemo(() => {
    const totalBudget = reportData.reduce((acc, curr) => acc + curr.amount, 0);
    const totalRealized = reportData.reduce((acc, curr) => acc + curr.realized, 0);
    const totalBalance = totalBudget - totalRealized;
    const totalPercent = totalBudget > 0 ? (totalRealized / totalBudget) * 100 : 0;
    
    return { totalBudget, totalRealized, totalBalance, totalPercent };
  }, [reportData]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // -- Header --
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN REALISASI RENCANA KEGIATAN DAN ANGGARAN SEKOLAH (RKAS)', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('SD NEGERI 1 CONTOH', 105, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Tahun Anggaran 2026', 105, 34, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // -- Summary Box --
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 15, 45);
    doc.text(`Total Pagu Anggaran: ${formatRupiah(totals.totalBudget)}`, 15, 50);
    doc.text(`Total Realisasi (SPJ): ${formatRupiah(totals.totalRealized)}`, 15, 55);

    // -- Table Data Preparation --
    const tableBody = reportData.map((item, index) => [
      index + 1,
      item.account_code || '-',
      item.description,
      formatRupiah(item.amount),
      formatRupiah(item.realized),
      formatRupiah(item.balance),
      `${item.percentage.toFixed(1)}%`
    ]);

    // -- Add Totals Row --
    tableBody.push([
      '', 
      '', 
      'TOTAL KESELURUHAN', 
      formatRupiah(totals.totalBudget), 
      formatRupiah(totals.totalRealized), 
      formatRupiah(totals.totalBalance), 
      `${totals.totalPercent.toFixed(1)}%`
    ]);

    // -- AutoTable Generation --
    autoTable(doc, {
      startY: 60,
      head: [['No', 'Kode Rekening', 'Uraian Kegiatan', 'Pagu Anggaran', 'Realisasi', 'Sisa', '%']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' }, // Uraian takes remaining space
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 15, halign: 'center' }
      },
      didParseCell: function(data) {
        // Bold the Total Row
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    // -- Signatures --
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    if (finalY < 230) {
      doc.setFontSize(10);
      doc.text('Mengetahui,', 140, finalY + 20);
      doc.text('Kepala Sekolah', 140, finalY + 25);
      
      doc.text('Bendahara Sekolah', 20, finalY + 25);

      doc.text('( ..................................... )', 140, finalY + 50);
      doc.text('( ..................................... )', 20, finalY + 50);
      doc.text('NIP.', 140, finalY + 55);
      doc.text('NIP.', 20, finalY + 55);
    } else {
      doc.addPage();
      doc.text('Mengetahui,', 140, 20);
      doc.text('Kepala Sekolah', 140, 25);
      // ... signatures on new page
    }

    doc.save('Laporan_Realisasi_RKAS_2026.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Laporan & Cetak</h2>
          <p className="text-sm text-gray-500">Rekapitulasi penggunaan anggaran dan cetak dokumen.</p>
        </div>
        <button 
          onClick={generatePDF}
          className="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
        >
          <FileDown size={18} />
          Download PDF
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md">
           <div className="flex items-center gap-3 mb-2 opacity-90">
             <FileText size={20} />
             <span className="text-sm font-medium">Total Anggaran (Pagu)</span>
           </div>
           <p className="text-2xl font-bold">{formatRupiah(totals.totalBudget)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-green-600">
             <Printer size={20} />
             <span className="text-sm font-medium">Total Realisasi (SPJ)</span>
           </div>
           <p className="text-2xl font-bold text-gray-800">{formatRupiah(totals.totalRealized)}</p>
           <p className="text-xs text-gray-400 mt-1">
             {totals.totalPercent.toFixed(1)}% Terserap
           </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
           <div className="flex items-center gap-3 mb-2 text-orange-600">
             <TrendingUp size={20} />
             <span className="text-sm font-medium">Sisa Anggaran</span>
           </div>
           <p className="text-2xl font-bold text-gray-800">{formatRupiah(totals.totalBalance)}</p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
           <AlertCircle size={16} className="text-gray-400" />
           <h3 className="text-sm font-bold text-gray-700">Preview Data Laporan</h3>
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
              {reportData.length === 0 ? (
                <tr>
                   <td colSpan={7} className="text-center py-8 text-gray-400">Belum ada data.</td>
                </tr>
              ) : (
                <>
                  {reportData.map((item, idx) => (
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
                  {/* Footer Total */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td colSpan={3} className="px-4 py-3 text-right uppercase">Total Keseluruhan</td>
                    <td className="px-4 py-3 text-right">{formatRupiah(totals.totalBudget)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatRupiah(totals.totalRealized)}</td>
                    <td className="px-4 py-3 text-right text-orange-600">{formatRupiah(totals.totalBalance)}</td>
                    <td className="px-4 py-3 text-center">{totals.totalPercent.toFixed(1)}%</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
