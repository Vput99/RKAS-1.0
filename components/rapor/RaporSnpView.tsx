import React, { useState, useEffect } from 'react';
import { BrainCircuit, Loader2, FileSpreadsheet, AlertTriangle, Target, CalendarRange, Wallet, ChevronDown, ChevronRight, Plus, Check, TrendingUp, TrendingDown, Minus, Printer, Download } from 'lucide-react';
import { RaporIndicator, SnpAnalysisData, SnpRaporRow, TransactionType, SchoolProfile } from '../../types';
import { analyzeRaporSnp, isAiConfigured } from '../../lib/gemini';
import { getSnpAnalysis, saveSnpAnalysis } from '../../lib/db/rapor';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generatePDFHeader, generateSignatures, defaultTableStyles } from '../../lib/pdfUtils';

interface RaporSnpViewProps {
  indicators: RaporIndicator[];
  targetYear: string;
  onAddBudget: (item: any) => Promise<void>;
  profile: SchoolProfile | null;
}

type SnpTab = 'rapor' | 'prioritas' | 'rkt' | 'rkas';

const formatRupiah = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

const RaporSnpView: React.FC<RaporSnpViewProps> = ({ indicators, targetYear, onAddBudget, profile }) => {
  const [snpData, setSnpData] = useState<SnpAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SnpTab>('rapor');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [addedRkas, setAddedRkas] = useState<Set<number>>(new Set());
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [debugRawText, setDebugRawText] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<{ step: number; total: number; label: string }>({ step: 0, total: 3, label: '' });

  const handleExportPDF = () => {
    if (!snpData) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    let title = '', headers: any[][] = [], body: any[][] = [], columnStyles: any = {};

    if (activeTab === 'rapor') {
      title = `Analisis Rapor Pendidikan Tahun ${parseInt(targetYear) - 1}`;
      headers = [[
        { content: 'No', styles: { halign: 'center' } },
        { content: 'Indikator', styles: { halign: 'left' } },
        { content: `Skor ${parseInt(targetYear) - 1}`, styles: { halign: 'center' } },
        { content: `Skor ${parseInt(targetYear) - 2}`, styles: { halign: 'center' } },
        { content: 'Delta', styles: { halign: 'center' } },
        { content: 'Pencapaian Skor', styles: { halign: 'left' } },
        { content: 'Definisi Capaian', styles: { halign: 'left' } },
        { content: 'Keterangan', styles: { halign: 'center' } }
      ]];
      
      const flattenRapor = (rows: SnpRaporRow[], list: any[], isChild = false) => {
        rows.forEach(row => {
          list.push([
            row.no,
            isChild ? `  ${row.indikator}` : row.indikator,
            row.skorTahunIni.toFixed(2),
            row.skorTahunLalu.toFixed(2),
            (row.delta > 0 ? '+' : '') + row.delta.toFixed(2),
            row.pencapaianSkor,
            row.definisiCapaian,
            row.keterangan || '-'
          ]);
          if (row.children && row.children.length > 0) {
            flattenRapor(row.children, list, true);
          }
        });
      };
      
      const flatList: any[] = [];
      flattenRapor(snpData.rapor, flatList);
      body = flatList;
      
    } else if (activeTab === 'prioritas') {
      title = `Identifikasi Prioritas Masalah Tahun ${targetYear}`;
      headers = [
        [
          { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'SNP', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Indikator', colSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Analisa Skala Prioritas', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Alasan Pemilihan & Pembobotan', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } }
        ],
        [
          { content: 'Identifikasi (Level 1)', styles: { halign: 'left' } },
          { content: 'Akar Masalah (Level 2)', styles: { halign: 'left' } },
          { content: 'Tingkat Prioritas', styles: { halign: 'center' } },
          { content: 'Tingkat Urgensi', styles: { halign: 'center' } },
          { content: 'Jumlah', styles: { halign: 'center' } }
        ]
      ];
      body = snpData.prioritas.map(row => [
        row.no,
        row.snp,
        `[${row.indikatorId}] ${row.indikatorLabel}`,
        `[${row.akarMasalahId}] ${row.akarMasalahLabel}`,
        row.tingkatPrioritas.toString(),
        row.tingkatUrgensi.toString(),
        row.jumlah.toString(),
        row.alasan
      ]);
      
      columnStyles = {
        0: { cellWidth: 10, halign: 'center' }, // No
        1: { cellWidth: 25 }, // SNP
        2: { cellWidth: 40 }, // Identifikasi
        3: { cellWidth: 40 }, // Akar Masalah
        4: { cellWidth: 20, halign: 'center' }, // Prioritas
        5: { cellWidth: 20, halign: 'center' }, // Urgensi
        6: { cellWidth: 15, halign: 'center' }, // Jumlah
        7: { cellWidth: 'auto' } // Alasan
      };
      
    } else if (activeTab === 'rkt') {
      title = `Rencana Kerja Tahunan (RKT) Tahun ${targetYear}`;
      headers = [[
        'No', 'Nama SNP', 'Identifikasi', 'Akar Masalah', 'Kegiatan Benahi', 
        'Penjelasan Implementasi', 'Butuh Biaya?', 'Kode ARKAS', 'Kegiatan ARKAS/Non ARKAS', 'Estimasi Biaya'
      ]];
      body = snpData.rkt.map(row => [
        row.no,
        row.snp,
        `[${row.indikatorId}] ${row.indikatorLabel}`,
        `[${row.akarMasalahId}] ${row.akarMasalahLabel}`,
        row.kegiatanBenahi,
        row.penjelasanImplementasi,
        row.butuhBiaya ? 'Ya' : 'Tidak',
        row.kodeArkas || '-',
        row.kegiatanArkas || row.kegiatanBenahi,
        formatRupiah(row.estimasiBiaya)
      ]);
      const totalRkt = snpData.rkt.reduce((sum, r) => sum + r.estimasiBiaya, 0);
      body.push([
        { content: 'TOTAL ESTIMASI BIAYA', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatRupiah(totalRkt), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);
      
      columnStyles = {
        0: { cellWidth: 8, halign: 'center' },  // No
        1: { cellWidth: 22 }, // Nama SNP
        2: { cellWidth: 30 }, // Identifikasi
        3: { cellWidth: 30 }, // Akar Masalah
        4: { cellWidth: 35 }, // Kegiatan Benahi
        5: { cellWidth: 'auto' }, // Penjelasan Implementasi
        6: { cellWidth: 12, halign: 'center' }, // Butuh Biaya?
        7: { cellWidth: 18, halign: 'center' }, // Kode ARKAS
        8: { cellWidth: 35 }, // Kegiatan ARKAS/Non ARKAS
        9: { cellWidth: 22, halign: 'right' } // Estimasi Biaya
      };
      
    } else if (activeTab === 'rkas') {
      title = `Rancangan ARKAS (RKAS) Tahun ${targetYear}`;
      headers = [[
        'No', 'Nama SNP', 'Kegiatan Benahi', 'Penjelasan Implementasi', 'Kode ARKAS', 
        'Kegiatan ARKAS', 'Bulan', 'Uraian Kegiatan', 'Vol', 'Satuan', 'Harga Satuan', 'Total', 'Sumber'
      ]];
      
      const rkasRows: any[] = [];
      snpData.rkas.forEach(r => {
        r.items.forEach((item, idx) => {
          rkasRows.push([
            idx === 0 ? r.no : '',
            idx === 0 ? r.snp : '',
            idx === 0 ? r.kegiatanBenahi : '',
            idx === 0 ? r.penjelasanImplementasi : '',
            idx === 0 ? r.kodeArkas : '',
            idx === 0 ? r.kegiatanArkas : '',
            item.bulan,
            item.uraian,
            item.volume,
            item.satuan,
            formatRupiah(item.hargaSatuan),
            formatRupiah(item.jumlah),
            item.sumberAnggaran
          ]);
        });
      });
      body = rkasRows;
      
      const totalRkas = snpData.rkas.reduce((sum, r) => sum + r.totalBiaya, 0);
      body.push([
        { content: 'GRAND TOTAL ANGGARAN RKAS', colSpan: 11, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: formatRupiah(totalRkas), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);
      
      columnStyles = {
        0: { cellWidth: 8, halign: 'center' },  // No
        1: { cellWidth: 20 }, // Nama SNP
        2: { cellWidth: 25 }, // Kegiatan Benahi
        3: { cellWidth: 'auto' }, // Penjelasan Implementasi
        4: { cellWidth: 16, halign: 'center' }, // Kode ARKAS
        5: { cellWidth: 35 }, // Kegiatan ARKAS
        6: { cellWidth: 14 }, // Bulan
        7: { cellWidth: 30 }, // Uraian Kegiatan
        8: { cellWidth: 8, halign: 'center' }, // Vol
        9: { cellWidth: 12, halign: 'center' }, // Satuan
        10: { cellWidth: 20, halign: 'right' }, // Harga Satuan
        11: { cellWidth: 22, halign: 'right' }, // Total
        12: { cellWidth: 12, halign: 'center' } // Sumber
      };
    }

    const startY = generatePDFHeader(doc, profile, title);
    autoTable(doc, { 
      ...defaultTableStyles, 
      startY, 
      head: headers, 
      body: body, 
      columnStyles: columnStyles,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, 
      headStyles: { fillColor: [79, 70, 229], halign: 'center', valign: 'middle' }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
    generateSignatures(doc, profile, finalY + 15);
    doc.save(`${title.replace(/ /g, '_')}.pdf`);
  };

  const handleExportExcel = () => {
    if (!snpData) return;
    let title = '', sheetData: any[][] = [];
    const fileName = `${profile?.name || 'SD'}_Analisa_SNP_${activeTab}_${targetYear}.xlsx`;

    if (activeTab === 'rapor') {
      title = `Analisis Rapor Pendidikan Tahun ${parseInt(targetYear) - 1}`;
      sheetData = [
        [title],
        [profile?.name || ''],
        [`Tahun Anggaran ${targetYear}`],
        [],
        ['No', 'Indikator', `Skor ${parseInt(targetYear) - 1}`, `Skor ${parseInt(targetYear) - 2}`, 'Delta', 'Pencapaian Skor', 'Definisi Capaian', 'Keterangan']
      ];
      
      const flattenRapor = (rows: SnpRaporRow[], list: any[], isChild = false) => {
        rows.forEach(row => {
          list.push([
            row.no,
            isChild ? `  ${row.indikator}` : row.indikator,
            row.skorTahunIni,
            row.skorTahunLalu,
            row.delta,
            row.pencapaianSkor,
            row.definisiCapaian,
            row.keterangan || ''
          ]);
          if (row.children && row.children.length > 0) {
            flattenRapor(row.children, list, true);
          }
        });
      };
      
      const flatList: any[] = [];
      flattenRapor(snpData.rapor, flatList);
      sheetData.push(...flatList);
      
    } else if (activeTab === 'prioritas') {
      title = `Identifikasi Prioritas Masalah Tahun ${targetYear}`;
      sheetData = [
        [title],
        [profile?.name || ''],
        [],
        ['No', 'SNP', 'Identifikasi (Level 1) Kode', 'Identifikasi (Level 1) Label', 'Akar Masalah (Level 2) Kode', 'Akar Masalah (Level 2) Label', 'Tingkat Prioritas', 'Tingkat Urgensi', 'Jumlah', 'Alasan Pemilihan & Pembobotan']
      ];
      snpData.prioritas.forEach(row => {
        sheetData.push([
          row.no,
          row.snp,
          row.indikatorId,
          row.indikatorLabel,
          row.akarMasalahId,
          row.akarMasalahLabel,
          row.tingkatPrioritas,
          row.tingkatUrgensi,
          row.jumlah,
          row.alasan
        ]);
      });
      
    } else if (activeTab === 'rkt') {
      title = `Rencana Kerja Tahunan (RKT) Tahun ${targetYear}`;
      sheetData = [
        [title],
        [profile?.name || ''],
        [],
        ['No', 'Nama SNP', 'Identifikasi Kode', 'Identifikasi Label', 'Akar Masalah Kode', 'Akar Masalah Label', 'Kegiatan Benahi', 'Penjelasan Implementasi', 'Butuh Biaya?', 'Kode ARKAS', 'Kegiatan ARKAS/Non ARKAS', 'Estimasi Biaya']
      ];
      snpData.rkt.forEach(row => {
        sheetData.push([
          row.no,
          row.snp,
          row.indikatorId,
          row.indikatorLabel,
          row.akarMasalahId,
          row.akarMasalahLabel,
          row.kegiatanBenahi,
          row.penjelasanImplementasi,
          row.butuhBiaya ? 'Ya' : 'Tidak',
          row.kodeArkas || '',
          row.kegiatanArkas || row.kegiatanBenahi,
          row.estimasiBiaya
        ]);
      });
      const totalRkt = snpData.rkt.reduce((sum, r) => sum + r.estimasiBiaya, 0);
      sheetData.push(['Total Estimasi Biaya', '', '', '', '', '', '', '', '', '', '', totalRkt]);
      
    } else if (activeTab === 'rkas') {
      title = `Rancangan ARKAS (RKAS) Tahun ${targetYear}`;
      sheetData = [
        [title],
        [profile?.name || ''],
        [],
        ['No', 'Nama SNP', 'Kegiatan Benahi', 'Penjelasan Implementasi', 'Kode ARKAS', 'Kegiatan ARKAS', 'Bulan', 'Uraian Kegiatan ARKAS', 'Vol', 'Satuan', 'Harga Satuan', 'Total', 'Sumber']
      ];
      snpData.rkas.forEach(r => {
        r.items.forEach((item, idx) => {
          sheetData.push([
            idx === 0 ? r.no : '',
            idx === 0 ? r.snp : '',
            idx === 0 ? r.kegiatanBenahi : '',
            idx === 0 ? r.penjelasanImplementasi : '',
            idx === 0 ? r.kodeArkas : '',
            idx === 0 ? r.kegiatanArkas : '',
            item.bulan,
            item.uraian,
            item.volume,
            item.satuan,
            item.hargaSatuan,
            item.jumlah,
            item.sumberAnggaran
          ]);
        });
      });
      const totalRkas = snpData.rkas.reduce((sum, r) => sum + r.totalBiaya, 0);
      sheetData.push(['Grand Total Anggaran', '', '', '', '', '', '', '', '', '', '', totalRkas, '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab.toUpperCase());
    XLSX.writeFile(wb, fileName);
  };

  // Load saved data on mount
  useEffect(() => {
    const saved = getSnpAnalysis(targetYear);
    if (saved) setSnpData(saved);
  }, [targetYear]);

  const handleAnalyze = async () => {
    if (!isAiConfigured()) {
      alert('API Key AI belum dikonfigurasi. Silakan cek Pengaturan.');
      return;
    }
    if (indicators.every(i => i.score === 0)) {
      alert('Mohon isi data rapor pendidikan terlebih dahulu melalui menu Identifikasi.');
      return;
    }
    setLoading(true);
    setDebugRawText('');
    setAnalysisProgress({ step: 0, total: 3, label: 'Mempersiapkan analisis...' });
    try {
      const result = await analyzeRaporSnp(indicators, targetYear, (step, total, label) => {
        setAnalysisProgress({ step, total, label });
      });
      if (result.success && result.data) {
        setSnpData(result.data);
        saveSnpAnalysis(result.data, targetYear);
        setActiveTab('rapor');
      } else {
        alert(`Gagal menganalisis SNP: ${result.error}`);
        if (result.rawText) {
          setDebugRawText(result.rawText);
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setAnalysisProgress({ step: 0, total: 3, label: '' });
    }
  };

  const toggleRow = (no: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  };

  const handleAddRkasItem = async (rkasIndex: number) => {
    if (!snpData) return;
    const rkas = snpData.rkas[rkasIndex];
    try {
      const kegiatanName = rkas.kegiatanArkas || rkas.kegiatanBenahi;
      for (const item of rkas.items) {
        await onAddBudget({
          type: TransactionType.EXPENSE,
          description: `[SNP ${targetYear}] ${item.uraian} (${kegiatanName})`,
          amount: item.jumlah,
          quantity: item.volume,
          unit: item.satuan,
          unit_price: item.hargaSatuan,
          bosp_component: item.sumberAnggaran || 'BOSP',
          category: rkas.snp,
          account_code: item.kodeRekening,
          status: 'draft',
          date: new Date().toISOString(),
          realization_months: [Math.min(12, new Date().getMonth() + 2)],
          notes: `Analisa SNP - ${kegiatanName}`
        });
      }
      setAddedRkas(prev => new Set(prev).add(rkasIndex));
    } catch (error) {
      alert('Gagal menambahkan item ke RKAS. Silakan coba lagi.');
    }
  };

  const handleAddAllRkas = async () => {
    if (!snpData) return;
    const unbudgeted = snpData.rkas.map((_, i) => i).filter(i => !addedRkas.has(i));
    if (unbudgeted.length === 0) {
      alert('Semua kegiatan sudah ditambahkan ke RKAS.');
      return;
    }
    if (!confirm(`Tambahkan ${unbudgeted.length} paket kegiatan ke Draft RKAS?`)) return;
    setIsAddingAll(true);
    for (const idx of unbudgeted) {
      await handleAddRkasItem(idx);
    }
    setIsAddingAll(false);
    alert(`Berhasil menambahkan ${unbudgeted.length} kegiatan ke Draft RKAS.`);
  };

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-emerald-600';
    if (delta < 0) return 'text-rose-600';
    return 'text-slate-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-100 text-emerald-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  const tabs: { id: SnpTab; label: string; icon: React.ReactNode }[] = [
    { id: 'rapor', label: 'Analisis Rapor', icon: <FileSpreadsheet size={14} /> },
    { id: 'prioritas', label: 'Prioritas Masalah', icon: <AlertTriangle size={14} /> },
    { id: 'rkt', label: 'RKT', icon: <Target size={14} /> },
    { id: 'rkas', label: 'RKAS', icon: <Wallet size={14} /> },
  ];

  // ─── Render Rapor Table Row ────────────────────────────────────
  const renderRaporRow = (row: SnpRaporRow, isChild = false) => {
    const hasChildren = row.children && row.children.length > 0;
    const isExpanded = expandedRows.has(row.no);

    return (
      <React.Fragment key={row.no}>
        <tr className={`border-b border-slate-100 transition-colors ${isChild ? 'bg-slate-50/30' : 'bg-white hover:bg-blue-50/30'}`}>
          <td className={`px-3 py-2.5 text-xs font-mono font-bold ${isChild ? 'pl-8 text-slate-400' : 'text-blue-600'}`}>
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button onClick={() => toggleRow(row.no)} className="p-0.5 hover:bg-slate-200 rounded transition-colors">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
              {row.no}
            </div>
          </td>
          <td className={`px-3 py-2.5 text-xs ${isChild ? 'text-slate-500' : 'font-semibold text-slate-700'}`}>{row.indikator}</td>
          <td className="px-3 py-2.5 text-center">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${getScoreColor(row.skorTahunIni)}`}>
              {row.skorTahunIni.toFixed(2)}
            </span>
          </td>
          <td className="px-3 py-2.5 text-center text-xs text-slate-500">{row.skorTahunLalu.toFixed(2)}</td>
          <td className={`px-3 py-2.5 text-center text-xs font-bold ${getDeltaColor(row.delta)}`}>
            <div className="flex items-center justify-center gap-0.5">
              {row.delta > 0 ? <TrendingUp size={10} /> : row.delta < 0 ? <TrendingDown size={10} /> : <Minus size={10} />}
              {row.delta > 0 ? '+' : ''}{row.delta.toFixed(2)}
            </div>
          </td>
          <td className="px-3 py-2.5 text-[10px] text-slate-600 max-w-[200px]">{row.pencapaianSkor}</td>
          <td className="px-3 py-2.5 text-[10px] text-slate-500 italic max-w-[180px]">{row.definisiCapaian}</td>
          <td className="px-3 py-2.5">
            {row.keterangan && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${row.delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {row.keterangan}
              </span>
            )}
          </td>
        </tr>
        {hasChildren && isExpanded && row.children!.map(child => renderRaporRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + Generate Button */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet size={20} />
              <h3 className="text-xl font-black tracking-tight">Analisa SNP (Standar Nasional Pendidikan)</h3>
            </div>
            <p className="text-indigo-100 text-sm max-w-lg">
              Analisis komprehensif berbasis AI mencakup Analisis Rapor, Prioritas Masalah, Rencana Kerja Tahunan (RKT), dan RKAS untuk tahun anggaran {targetYear}.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95 min-w-[200px] disabled:opacity-60"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
            {loading ? 'Menganalisis...' : (snpData ? 'Analisa Ulang' : 'Mulai Analisa SNP')}
          </button>
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full -ml-6 -mb-6 blur-2xl"></div>
      </div>

      {/* Debug Raw Text */}
      {debugRawText && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-2">
          <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest">DEBUG: Respon Mentah AI</h4>
          <p className="text-xs text-rose-500">Berikut adalah respon mentah dari Gemini yang gagal diparse sebagai JSON:</p>
          <textarea
            readOnly
            value={debugRawText}
            className="w-full h-80 p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-rose-200 outline-none"
          />
        </div>
      )}

      {/* Ringkasan */}
      {snpData && snpData.ringkasan && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Ringkasan Analisis Mutu Sekolah</h4>
          <p className="text-sm text-indigo-800 leading-relaxed">{snpData.ringkasan}</p>
          <p className="text-[10px] text-indigo-400 mt-3 italic">
            Dianalisis pada: {new Date(snpData.generatedAt).toLocaleString('id-ID')}
          </p>
        </div>
      )}

      {/* Sub-Tabs + Action Buttons */}
      {snpData && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-white/80 w-fit shadow-sm">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/80'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-white hover:shadow-lg transition-all shadow-sm backdrop-blur-md active:scale-95 animate-fade-in"
            >
              <Printer size={14} /> CETAK PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-black hover:shadow-lg hover:shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 animate-fade-in"
            >
              <Download size={14} /> EXCEL
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {snpData && activeTab === 'rapor' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-100">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-blue-600" />
              Analisis Rapor Pendidikan Tahun {parseInt(targetYear) - 1}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Format tabel berdasarkan Standar Nasional Pendidikan (SNP)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider w-[70px]">No</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[200px]">Indikator</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[90px]">Skor {parseInt(targetYear) - 1}</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[90px]">Skor {parseInt(targetYear) - 2}</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[80px]">Delta</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Pencapaian Skor</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider">Definisi Capaian</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider w-[100px]">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {snpData.rapor.map(row => renderRaporRow(row))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {snpData && activeTab === 'prioritas' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-rose-50 px-6 py-4 border-b border-slate-100">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-600" />
              Identifikasi Prioritas Masalah
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Menilai tingkat prioritas dan urgensi permasalahan (bobot 1-3, angka 3 paling mendesak) beserta analisis alasannya.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-800 text-white">
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[50px] border-r border-rose-700">No</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[120px] border-r border-rose-700">SNP</th>
                  <th colSpan={2} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-center border-b border-r border-rose-700">Indikator</th>
                  <th colSpan={3} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-center border-b border-r border-rose-700">Analisa Skala Prioritas</th>
                  <th rowSpan={2} className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[200px]">Alasan Pemilihan & Pembobotan</th>
                </tr>
                <tr className="bg-rose-800 text-white">
                  <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border-r border-rose-700">Identifikasi (Level 1)</th>
                  <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider border-r border-rose-700">Akar Masalah (Level 2)</th>
                  <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center border-r border-rose-700">Tingkat Prioritas</th>
                  <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center border-r border-rose-700">Tingkat Urgensi</th>
                  <th className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center border-r border-rose-700">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {snpData.prioritas.map((row) => (
                  <tr key={row.no} className="border-b border-slate-100 hover:bg-rose-50/30 transition-colors">
                    <td className="px-3 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-100">{row.no}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-700 border-r border-slate-100">{row.snp}</td>
                    <td className="px-3 py-3 border-r border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">{row.indikatorId}</span>
                        <span className="text-xs font-medium text-slate-800 leading-tight">{row.indikatorLabel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">{row.akarMasalahId}</span>
                        <span className="text-xs text-slate-600 font-medium leading-tight">{row.akarMasalahLabel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-slate-700 border-r border-slate-100">
                      <span className={`inline-block w-6 h-6 leading-6 rounded-full text-center font-black ${
                        row.tingkatPrioritas === 3 ? 'bg-rose-100 text-rose-700' :
                        row.tingkatPrioritas === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {row.tingkatPrioritas}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-bold text-slate-700 border-r border-slate-100">
                      <span className={`inline-block w-6 h-6 leading-6 rounded-full text-center font-black ${
                        row.tingkatUrgensi === 3 ? 'bg-rose-100 text-rose-700' :
                        row.tingkatUrgensi === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {row.tingkatUrgensi}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-black border-r border-slate-100">
                      <span className={`px-2 py-1 rounded-lg text-xs ${
                        row.jumlah >= 5 ? 'bg-rose-600 text-white shadow-sm' :
                        row.jumlah >= 3 ? 'bg-amber-500 text-white' :
                        'bg-slate-400 text-white'
                      }`}>
                        {row.jumlah}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 leading-relaxed font-medium">{row.alasan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {snpData && activeTab === 'rkt' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-teal-50 px-6 py-4 border-b border-slate-100">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <CalendarRange size={18} className="text-teal-600" />
              Rencana Kerja Tahunan (RKT) {targetYear}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Rencana kerja tindak lanjut (Benahi) dan analisis kebutuhan anggaran berdasarkan prioritas masalah.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-teal-800 text-white text-xs">
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[50px] border-r border-teal-700">No</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[120px] border-r border-teal-700">Nama SNP</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[140px] border-r border-teal-700">Identifikasi</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[140px] border-r border-teal-700">Akar Masalah</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[180px] border-r border-teal-700">Kegiatan Benahi (Rapor Pendidikan)</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[200px] border-r border-teal-700">Penjelasan Implementasi Kegiatan</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center min-w-[100px] border-r border-teal-700">Butuh Biaya?</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-center w-[90px] border-r border-teal-700">Kode ARKAS</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider min-w-[160px]">Kegiatan ARKAS/Non ARKAS</th>
                </tr>
              </thead>
              <tbody>
                {snpData.rkt.map((row) => (
                  <tr key={row.no} className="border-b border-slate-100 hover:bg-teal-50/30 transition-colors">
                    <td className="px-3 py-3 text-xs font-bold text-slate-500 text-center border-r border-slate-100">{row.no}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-slate-700 border-r border-slate-100">{row.snp}</td>
                    <td className="px-3 py-3 border-r border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">{row.indikatorId}</span>
                        <span className="text-xs font-medium text-slate-800 leading-tight">{row.indikatorLabel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">{row.akarMasalahId}</span>
                        <span className="text-xs text-slate-600 font-medium leading-tight">{row.akarMasalahLabel}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700 font-medium border-r border-slate-100 leading-relaxed">{row.kegiatanBenahi}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 border-r border-slate-100 leading-relaxed">{row.penjelasanImplementasi}</td>
                    <td className="px-3 py-3 text-center border-r border-slate-100">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        row.butuhBiaya 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {row.butuhBiaya ? 'Ya' : 'Tidak'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-mono font-bold text-slate-600 border-r border-slate-100">
                      {row.kodeArkas || '-'}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-700 font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{row.kegiatanArkas || row.kegiatanBenahi}</span>
                        {row.butuhBiaya && row.estimasiBiaya > 0 && (
                          <span className="text-[10px] text-teal-600 font-bold">Est: {formatRupiah(row.estimasiBiaya)}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-teal-50 font-bold">
                  <td colSpan={8} className="px-3 py-3.5 text-xs text-teal-800 text-right uppercase tracking-wider border-r border-teal-100">Total Estimasi Kegiatan Berbiaya</td>
                  <td className="px-3 py-3.5 text-sm text-teal-800 font-black">
                    {formatRupiah(snpData.rkt.reduce((s, r) => s + r.estimasiBiaya, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {snpData && activeTab === 'rkas' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <Wallet size={18} className="text-blue-600" />
                  Rancangan ARKAS (RKAS) {targetYear}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Rancangan lembar kerja anggaran sekolah berbiaya terintegrasi dengan ARKAS</p>
              </div>
              <button
                onClick={handleAddAllRkas}
                disabled={isAddingAll}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {isAddingAll ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Terapkan Semua ke RKAS
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-800 text-white font-black uppercase tracking-wider text-[10px]">
                    <th className="px-2 py-3 text-center w-[50px] border-r border-blue-700">No</th>
                    <th className="px-2 py-3 min-w-[120px] border-r border-blue-700">Nama SNP</th>
                    <th className="px-2 py-3 min-w-[150px] border-r border-blue-700">Kegiatan Benahi</th>
                    <th className="px-2 py-3 min-w-[150px] border-r border-blue-700">Penjelasan Implementasi</th>
                    <th className="px-2 py-3 text-center w-[90px] border-r border-blue-700">Kode ARKAS</th>
                    <th className="px-2 py-3 min-w-[140px] border-r border-blue-700">Kegiatan ARKAS</th>
                    <th className="px-2 py-3 text-center w-[90px] border-r border-blue-700">Bulan</th>
                    <th className="px-2 py-3 min-w-[150px] border-r border-blue-700">Uraian Kegiatan ARKAS</th>
                    <th className="px-2 py-3 text-center w-[60px] border-r border-blue-700">Vol</th>
                    <th className="px-2 py-3 w-[60px] border-r border-blue-700">Satuan</th>
                    <th className="px-2 py-3 text-right w-[100px] border-r border-blue-700">Harga Satuan</th>
                    <th className="px-2 py-3 text-right w-[110px] border-r border-blue-700">Total</th>
                    <th className="px-2 py-3 w-[80px] border-r border-blue-700">Sumber</th>
                    <th className="px-2 py-3 text-center w-[100px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {snpData.rkas.map((rkas, rkasIdx) => {
                    const isBudgeted = addedRkas.has(rkasIdx);
                    const rowCount = rkas.items.length || 1;

                    return rkas.items.map((item, itemIdx) => {
                      const isFirst = itemIdx === 0;
                      return (
                        <tr key={`${rkasIdx}-${itemIdx}`} className={`border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${isBudgeted ? 'bg-emerald-50/10' : ''}`}>
                          {isFirst && (
                            <>
                              <td rowSpan={rowCount} className="px-2 py-3 text-center font-bold border-r border-slate-200 align-top">{rkas.no}</td>
                              <td rowSpan={rowCount} className="px-2 py-3 font-semibold text-slate-700 border-r border-slate-200 align-top">{rkas.snp}</td>
                              <td rowSpan={rowCount} className="px-2 py-3 text-slate-600 border-r border-slate-200 align-top leading-relaxed">{rkas.kegiatanBenahi}</td>
                              <td rowSpan={rowCount} className="px-2 py-3 text-slate-500 border-r border-slate-200 align-top leading-relaxed">{rkas.penjelasanImplementasi}</td>
                              <td rowSpan={rowCount} className="px-2 py-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 align-top">{rkas.kodeArkas}</td>
                              <td rowSpan={rowCount} className="px-2 py-3 font-semibold text-slate-700 border-r border-slate-200 align-top">{rkas.kegiatanArkas}</td>
                            </>
                          )}
                          <td className="px-2 py-3 text-center font-medium text-slate-600 border-r border-slate-200">{item.bulan}</td>
                          <td className="px-2 py-3 text-slate-700 font-medium border-r border-slate-200">{item.uraian}</td>
                          <td className="px-2 py-3 text-center text-slate-600 border-r border-slate-200">{item.volume}</td>
                          <td className="px-2 py-3 text-slate-500 border-r border-slate-200">{item.satuan}</td>
                          <td className="px-2 py-3 text-right text-slate-600 border-r border-slate-200">{formatRupiah(item.hargaSatuan)}</td>
                          <td className="px-2 py-3 text-right font-bold text-slate-700 border-r border-slate-200">{formatRupiah(item.jumlah)}</td>
                          <td className="px-2 py-3 border-r border-slate-200">
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">{item.sumberAnggaran}</span>
                          </td>
                          {isFirst && (
                            <td rowSpan={rowCount} className="px-2 py-3 text-center align-middle">
                              <button
                                onClick={() => handleAddRkasItem(rkasIdx)}
                                disabled={isBudgeted}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mx-auto transition ${
                                  isBudgeted
                                    ? 'bg-emerald-100 text-emerald-600 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                }`}
                              >
                                {isBudgeted ? <Check size={10} /> : <Plus size={10} />}
                                {isBudgeted ? 'Tersimpan' : 'Masukkan'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })}
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={11} className="px-3 py-3.5 text-xs text-blue-800 text-right uppercase tracking-wider border-r border-blue-100">Grand Total Anggaran RKAS</td>
                    <td colSpan={3} className="px-3 py-3.5 text-sm text-blue-800 font-black">
                      {formatRupiah(snpData.rkas.reduce((s, r) => s + r.totalBiaya, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!snpData && !loading && (
        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white p-12 shadow-xl text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileSpreadsheet size={40} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Data Analisa SNP</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Pastikan Anda sudah mengisi data rapor pendidikan di menu <strong>Identifikasi</strong>, lalu klik tombol <strong>"Mulai Analisa SNP"</strong> di atas untuk memulai analisis berbasis AI.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-200 flex items-center gap-2 mx-auto transition transform hover:scale-105"
          >
            <BrainCircuit size={20} />
            Mulai Analisa SNP (AI)
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white p-16 shadow-xl text-center">
          <Loader2 size={48} className="text-indigo-600 animate-spin mx-auto mb-6" />
          <h3 className="text-lg font-black text-slate-800 mb-2">Sedang Menganalisis SNP...</h3>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Tahap {analysisProgress.step}/{analysisProgress.total}</span>
              <span>{Math.round((analysisProgress.step / analysisProgress.total) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(analysisProgress.step / analysisProgress.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Label */}
          <p className="text-sm text-indigo-600 font-bold mb-1">{analysisProgress.label}</p>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {[
              { step: 1, label: 'Prioritas' },
              { step: 2, label: 'RKT' },
              { step: 3, label: 'RKAS' }
            ].map(({ step, label }) => (
              <div key={step} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                  analysisProgress.step > step
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : analysisProgress.step === step
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 animate-pulse'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {analysisProgress.step > step ? '✓' : step}
                </div>
                <span className={`text-xs font-bold ${
                  analysisProgress.step >= step ? 'text-slate-700' : 'text-slate-300'
                }`}>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 mt-4">Setiap tahap diproses secara terpisah untuk hasil yang lebih akurat.</p>
        </div>
      )}
    </div>
  );
};

export default RaporSnpView;
