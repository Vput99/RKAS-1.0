import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Printer, ArrowLeft, CalendarCheck, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolProfile, RoolstaatRow, RoolstaatDaftar } from '../types';
import { getTerbilang } from '../lib/evidenceRules';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const emptyRow = (no: number): RoolstaatRow => ({
  no, nama: '', pekerjaan: '',
  kehadiran: Array(31).fill(false),
  hari_kerja: 0, upah_per_hari: 0, upah_total: 0, keterangan: '',
});

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── PDF Generator ─────────────────────────────────────────────────────────────
const generateRoolstaatPDF = (d: RoolstaatDaftar) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pw  = doc.internal.pageSize.getWidth();
  const lm  = 10;
  const rm  = 10;
  let y = 15;

  // ── Kop Surat ──
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text('KOP SURAT / SEKOLAH', pw / 2, y, { align: 'center' });
  doc.text(d.school_name || '..............................', pw / 2, y + 5, { align: 'center' });
  y += 15;

  // ── Judul ──
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text('ROOLSTAAT', pw / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Nama Kegiatan: ${d.kegiatan_name || '.............................................'}`, lm, y);
  y += 5;

  // ── Data tabel ──
  const dataRows = d.rows.filter(r => r.nama.trim());
  const totH = dataRows.reduce((s, r) => s + (r.upah_total || 0), 0);

  // Generate day headers 1-31
  const dayHeaders = Array.from({ length: 31 }, (_, i) => String(i + 1));

  // Build header structure
  const head = [
    [
      { content: 'No', rowSpan: 2 },
      { content: 'nama', rowSpan: 2 },
      { content: 'Pekerjaan', rowSpan: 2 },
      { content: `Bulan : ${d.bulan} ${d.tahun}`, colSpan: 31 },
      { content: 'Hari\nKerja', rowSpan: 2 },
      { content: 'upah /\nHari', rowSpan: 2 },
      { content: 'Upah Total', rowSpan: 2 },
      { content: 'Keterangan', rowSpan: 2 },
    ],
    dayHeaders // sub-headers for days
  ];

  const body: any[][] = dataRows.map((r, i) => {
    const daysContent = r.kehadiran.map(val => val ? 'x' : '');
    return [
      i + 1,
      r.nama || '',
      r.pekerjaan || '',
      ...daysContent,
      r.hari_kerja || '',
      r.upah_per_hari ? fmtNum(r.upah_per_hari) : '-',
      r.upah_total ? fmtNum(r.upah_total) : '-',
      r.keterangan || ''
    ];
  });

  // Baris total
  body.push([
    { content: 'Jumlah Total', colSpan: 34, styles: { fontStyle: 'bold', halign: 'center' as const } },
    { content: fmtNum(totH), styles: { fontStyle: 'bold', halign: 'right' as const } },
    ''
  ]);

  // Terbilang — dihitung otomatis dari total upah menggunakan getTerbilang()
  const terbilangText = getTerbilang(totH);
  body.push([
    { content: `Terbilang : ${terbilangText}`, colSpan: 36, styles: { fontStyle: 'italic', halign: 'left' as const } },
  ]);


  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: lm, right: rm },
    styles: {
      font: 'times', fontSize: 8, cellPadding: 1.5,
      lineColor: [0, 0, 0] as [number, number, number],
      lineWidth: 0.3, valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold', halign: 'center', lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8  },
      1: {                   cellWidth: 35  },
      2: {                   cellWidth: 20  },
      // columns 3 to 33 (31 days)
      ...Object.fromEntries(Array.from({length: 31}).map((_, i) => [i + 3, { halign: 'center', cellWidth: 4.5 }])),
      34: { halign: 'center', cellWidth: 9  }, // Hari kerja
      35: { halign: 'right',  cellWidth: 15  }, // Upah/Hari
      36: { halign: 'right',  cellWidth: 20  }, // Upah Total
      37: {                   cellWidth: 30  }, // Keterangan
    },
    theme: 'grid',
    didParseCell: (hookData) => {
        if(hookData.row.index === body.length - 1 && hookData.section === 'body') {
            hookData.cell.styles.cellPadding = 3;
        }
    }
  });

  const fy = (doc as any).lastAutoTable.finalY;

  // ── Keterangan Tambahan & Tanda tangan ──
  const leftCol = lm + 5;
  const rightCol = pw - rm - 60;
  let py = fy + 5;

  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.text('- Yang bertanda tangan di bawah ini menerangkan bahwa', leftCol, py);
  doc.text('upah-upah tersebut telah dibayarkan kepada masing-', leftCol+2, py+4);
  doc.text('masing orang yang berhak menerimanya.', leftCol+2, py+8);

  doc.text('- Dibayarkan di hadapan kami', leftCol, py+14);
  doc.text('Noot : Cap Jempol dibaliknya', leftCol, py+20);

  doc.text(`${d.city || 'Kediri'}, ........................`, rightCol, py);
  doc.text('Kepala Sekolah', rightCol, py + 5);

  doc.setFont('times', 'bold');
  doc.text(d.kepala_sekolah || '..........................................', rightCol, py + 25);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${d.kepala_sekolah_nip || '....................................'}`, rightCol, py + 29);

  doc.save(`Roolstaat_${(d.kegiatan_name || 'Tukang').replace(/\s+/g, '_')}_${d.bulan}_${d.tahun}.pdf`);
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const cls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/30 focus:border-sky-400 transition-all';
const cellCls = 'w-full px-1.5 py-1 text-[11px] rounded focus:outline-none focus:ring-1 focus:ring-sky-400 bg-transparent';
const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className={cls} {...p} />;

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { profile?: SchoolProfile | null; onBack: () => void; }

const RoolstaatForm: React.FC<Props> = ({ profile, onBack }) => {
  const year = new Date().getFullYear().toString();

  const [form, setForm] = useState<RoolstaatDaftar>({
    id: crypto.randomUUID(),
    kegiatan_name: '',
    bulan: BULAN_LIST[new Date().getMonth()],
    tahun: profile?.fiscalYear || year,
    school_name: profile?.name || '',
    school_address: profile?.address || '',
    city: (profile?.address || '').split(',')[0].trim() || 'Kediri',
    tanggal_ttd: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    kepala_sekolah: profile?.headmaster || '',
    kepala_sekolah_nip: profile?.headmasterNip || '',
    rows: [emptyRow(1), emptyRow(2), emptyRow(3)],
  });

  const setF = <K extends keyof RoolstaatDaftar>(key: K, val: RoolstaatDaftar[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const setRow = (idx: number, key: keyof RoolstaatRow, val: any) =>
    setForm(p => {
      const rows = [...p.rows];
      rows[idx] = { ...rows[idx], [key]: val };

      // Kalkulasi otomatis
      if (key === 'upah_per_hari') {
        rows[idx].upah_total = rows[idx].hari_kerja * Number(val);
      }
      return { ...p, rows };
    });

  const toggleKehadiran = (rowIdx: number, dayIdx: number) => {
    setForm(p => {
       const rows = [...p.rows];
       const row = {...rows[rowIdx]};
       const newKehadiran = [...row.kehadiran];
       newKehadiran[dayIdx] = !newKehadiran[dayIdx];
       row.kehadiran = newKehadiran;

       // hitung ulang hari kerja dan upah total
       row.hari_kerja = newKehadiran.filter(x => x).length;
       row.upah_total = row.hari_kerja * row.upah_per_hari;

       rows[rowIdx] = row;
       return { ...p, rows };
    });
  };

  const addRow = () =>
    setForm(p => ({ ...p, rows: [...p.rows, emptyRow(p.rows.length + 1)] }));

  const removeRow = (idx: number) =>
    setForm(p => ({
      ...p,
      rows: p.rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })),
    }));

  const totH = form.rows.reduce((s, r) => s + (r.upah_total || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 flex flex-col h-full h-screen-offset">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
          <CalendarCheck size={20} />
        </div>
        <div>
          <h2 className="font-black text-slate-800">Daftar Kehadiran (Roolstaat)</h2>
          <p className="text-xs text-slate-400">Absensi kegiatan pemeliharaan tukang & kuli</p>
        </div>
      </div>

      {/* ── Form Data ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 sm:col-span-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kegiatan</label>
            <Inp value={form.kegiatan_name} onChange={e => setF('kegiatan_name', e.target.value)} placeholder="Contoh: Pekerjaan memb..." />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bulan</label>
            <select className={cls} value={form.bulan} onChange={e => setF('bulan', e.target.value)}>
              {BULAN_LIST.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahun</label>
            <Inp value={form.tahun} onChange={e => setF('tahun', e.target.value)} placeholder="2026" />
          </div>
          {/* TTD Inputs */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kota TTD</label>
            <Inp value={form.city} onChange={e => setF('city', e.target.value)} placeholder="Kediri" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kepala Sekolah</label>
            <Inp value={form.kepala_sekolah} onChange={e => setF('kepala_sekolah', e.target.value)} placeholder="Nama KS" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">NIP Kepala Sekolah</label>
            <Inp value={form.kepala_sekolah_nip} onChange={e => setF('kepala_sekolah_nip', e.target.value)} placeholder="NIP" />
          </div>
        </div>
      </div>

      {/* ── Tabel Presensi ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Tabel Roolstaat</h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} /> Tambah Pekerja
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50">
                <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-600 w-6">No</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600 w-32">Nama</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600 w-24">Pekerjaan</th>
                <th colSpan={31} className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-600">Bulan: {form.bulan} {form.tahun}</th>
                <th rowSpan={2} className="border border-slate-300 px-1 py-1 text-center font-bold text-slate-600 w-12 text-[10px]">Hari<br />Kerja</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600 w-24 text-[10px]">Upah/Hari<br/>(Rp)</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600 w-24 text-[10px]">Upah Total<br/>(Rp)</th>
                <th rowSpan={2} className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-600 w-32">Keterangan</th>
                <th rowSpan={2} className="border border-slate-300 px-1 py-1 w-6"></th>
              </tr>
              <tr className="bg-slate-50/70">
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="border border-slate-300 px-0.5 py-1 text-center font-semibold text-slate-500 text-[9px] w-5">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-sky-50/20">
                  <td className="border border-slate-200 px-1 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                  <td className="border border-slate-200 p-0.5">
                    <input className={cellCls} value={row.nama} onChange={e => setRow(idx, 'nama', e.target.value)} placeholder="Nama lengkap" />
                  </td>
                  <td className="border border-slate-200 p-0.5">
                    <input className={cellCls} value={row.pekerjaan} onChange={e => setRow(idx, 'pekerjaan', e.target.value)} placeholder="Tukang / Kuli" />
                  </td>
                  {row.kehadiran.map((hadir, dayIdx) => (
                    <td key={dayIdx} className="border border-slate-200 p-0 text-center cursor-pointer hover:bg-slate-100" onClick={() => toggleKehadiran(idx, dayIdx)}>
                         <div className={`w-full h-full text-[10px] font-bold ${hadir ? 'text-sky-600' : 'text-transparent'}`}>x</div>
                    </td>
                  ))}
                  <td className="border border-slate-200 text-center font-bold text-slate-600 text-[10px]">
                      {row.hari_kerja || 0}
                  </td>
                  <td className="border border-slate-200 p-0.5">
                    <input
                      type="number"
                      className={cellCls + ' text-right'}
                      value={row.upah_per_hari || ''}
                      onChange={e => setRow(idx, 'upah_per_hari', Number(e.target.value))}
                      placeholder="0"
                    />
                  </td>
                  <td className="border border-slate-200 px-1 text-right font-medium text-sky-700 text-[10px] bg-sky-50/30">
                    {row.upah_total ? fmtNum(row.upah_total) : '-'}
                  </td>
                  <td className="border border-slate-200 p-0.5">
                     <input className={cellCls} value={row.keterangan || ''} onChange={e => setRow(idx, 'keterangan', e.target.value)} placeholder="Ket..." />
                  </td>
                  <td className="border border-slate-200 px-1 text-center">
                    {form.rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="text-rose-400 hover:text-rose-600">
                        <X size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={36} className="border border-slate-300 px-3 py-1.5 text-center text-slate-700 text-[11px]">Jumlah Total</td>
                <td className="border border-slate-300 px-1 py-1.5 text-right text-sky-700 text-[11px]">{totH ? fmtNum(totH) : '-'}</td>
                <td colSpan={2} className="border border-slate-300"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="flex gap-3 justify-end flex-wrap pt-2">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm">
          Kembali
        </button>
        <button
          onClick={() => generateRoolstaatPDF(form)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 transition-all text-sm"
        >
          <Printer size={16} />
          Cetak PDF Roolstaat
        </button>
      </div>

    </motion.div>
  );
};

export default RoolstaatForm;
