import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Printer, ArrowLeft, FileSpreadsheet, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolProfile, HonorRow, HonorariumDaftar } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);

const BULAN_LIST = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const emptyRow = (no: number): HonorRow => ({
  no, nama: '', jabatan: '', gol: '', satuan: 'Jam/Bulan',
  jam: 0, jumlah: 0, potongan_pph: 0, penerimaan: 0,
});

// ─── PDF Generator ─────────────────────────────────────────────────────────────
const generateHonorariumPDF = (d: HonorariumDaftar) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pw  = doc.internal.pageSize.getWidth();
  const lm  = 15;
  const rm  = 15;
  let y = 12;

  // ── Kode rekening & No Bukti (kanan atas) ──
  const colR = pw - rm - 75;
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  [[`Kode rekening`, d.kode_rekening || '..............................'],
   [`No Bukti`,      d.no_bukti      || '..............................']].forEach(([label, val], i) => {
    const yy = y + i * 5;
    doc.text(label, colR, yy);
    doc.text(':', colR + 30, yy);
    doc.text(val, colR + 33, yy);
  });
  y += 14;

  // ── Judul ──
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('DAFTAR PENERIMAAN HONORARIUM NARASUMBER EKSTRA KURIKULER', pw / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(10.5);
  doc.text(`KEGIATAN EKSTRA KURIKULER  ${d.kegiatan_name || '....................................'}`, pw / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Bulan  ${d.bulan || '......................'}  Tahun ${d.tahun || '........'}`, pw / 2, y, { align: 'center' });
  y += 8;

  // ── Data tabel ──
  const dataRows = d.rows.filter(r => r.nama.trim());
  const totJ = dataRows.reduce((s, r) => s + (r.jumlah       || 0), 0);
  const totP = dataRows.reduce((s, r) => s + (r.potongan_pph || 0), 0);
  const totT = dataRows.reduce((s, r) => s + (r.penerimaan   || 0), 0);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body: any[][] = dataRows.map((r, i) => [
    i + 1,
    r.nama     || '',
    r.jabatan  || '',
    r.gol      || '',
    r.satuan   || '',
    r.jam      || '',
    r.jumlah       ? fmtNum(r.jumlah)       : '-',
    r.potongan_pph ? fmtNum(r.potongan_pph) : '-',
    r.penerimaan   ? fmtNum(r.penerimaan)   : '-',
    '',
  ]);

  // Baris total
  body.push([
    { content: 'JUMLAH', colSpan: 6, styles: { fontStyle: 'bold', halign: 'center' as const } },
    { content: `Rp  ${fmtNum(totJ)}`, styles: { fontStyle: 'bold', halign: 'right' as const } },
    { content: `Rp  ${fmtNum(totP)}`, styles: { fontStyle: 'bold', halign: 'right' as const } },
    { content: `Rp  ${fmtNum(totT)}`, styles: { fontStyle: 'bold', halign: 'right' as const } },
    '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'No', 'N a m a', 'Jabatan', 'Gol.', 'Satuan', 'JAM',
      'Jumlah', 'Potongan PPh.\nPasal 21', 'Penerimaan', 'Tanda Tangan',
    ]],
    body,
    margin: { left: lm, right: rm },
    styles: {
      font: 'times', fontSize: 9.5, cellPadding: 3,
      lineColor: [0, 0, 0] as [number, number, number],
      lineWidth: 0.3, valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold', halign: 'center', lineWidth: 0.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10  },
      1: {                   cellWidth: 40  },
      2: {                   cellWidth: 30  },
      3: { halign: 'center', cellWidth: 12  },
      4: { halign: 'center', cellWidth: 22  },
      5: { halign: 'center', cellWidth: 12  },
      6: { halign: 'right',  cellWidth: 28  },
      7: { halign: 'right',  cellWidth: 28  },
      8: { halign: 'right',  cellWidth: 28  },
      9: {                   cellWidth: 35  },
    },
    theme: 'grid',
  });

  const fy = (doc as any).lastAutoTable.finalY + 5;

  // ── Tanda tangan ──
  const kiri  = lm + 10;
  const kanan = pw - rm - 70;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Mengetahui & Menyetujui ;', kiri, fy + 5);
  doc.text(`${d.city || 'Kediri'},  ${d.tanggal_ttd || '..................'}`, kanan, fy + 5);

  doc.text('Kepala Sekolah', kiri, fy + 11);
  doc.text('Bendahara BOS,', kanan, fy + 11);

  doc.setFont('times', 'bold');
  doc.text(d.kepala_sekolah || '..................................', kiri,  fy + 42);
  doc.text(d.bendahara      || '..................................', kanan, fy + 42);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${d.kepala_sekolah_nip || '............................'}`, kiri,  fy + 47);
  doc.text(`NIP. ${d.bendahara_nip      || '............................'}`, kanan, fy + 47);

  doc.save(`Daftar_Honor_${(d.kegiatan_name || 'Ekskul').replace(/\s+/g, '_')}_${d.bulan}_${d.tahun}.pdf`);
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const cls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all';
const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className={cls} {...p} />;

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { profile?: SchoolProfile | null; onBack: () => void; }

const HonorariumForm: React.FC<Props> = ({ profile, onBack }) => {
  const year = new Date().getFullYear().toString();

  const [form, setForm] = useState<HonorariumDaftar>({
    id: crypto.randomUUID(),
    kode_rekening: '',
    no_bukti: '',
    kegiatan_name: '',
    bulan: BULAN_LIST[new Date().getMonth()],
    tahun: profile?.fiscalYear || year,
    school_name: profile?.name || '',
    school_address: profile?.address || '',
    city: (profile?.address || '').split(',')[0].trim(),
    tanggal_ttd: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    kepala_sekolah: profile?.headmaster || '',
    kepala_sekolah_nip: profile?.headmasterNip || '',
    bendahara: '',
    bendahara_nip: '',
    rows: [emptyRow(1), emptyRow(2), emptyRow(3)],
  });

  const setF = <K extends keyof HonorariumDaftar>(key: K, val: HonorariumDaftar[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  const setRow = (idx: number, key: keyof HonorRow, val: string | number) =>
    setForm(p => {
      const rows = [...p.rows];
      rows[idx] = { ...rows[idx], [key]: val };
      // auto hitung penerimaan
      if (key === 'jumlah' || key === 'potongan_pph') {
        const j   = key === 'jumlah'       ? Number(val) : rows[idx].jumlah;
        const pph = key === 'potongan_pph'  ? Number(val) : rows[idx].potongan_pph;
        rows[idx].penerimaan = Math.max(0, j - pph);
      }
      return { ...p, rows };
    });

  const addRow = () =>
    setForm(p => ({ ...p, rows: [...p.rows, emptyRow(p.rows.length + 1)] }));

  const removeRow = (idx: number) =>
    setForm(p => ({
      ...p,
      rows: p.rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })),
    }));

  const totJ = form.rows.reduce((s, r) => s + (r.jumlah       || 0), 0);
  const totP = form.rows.reduce((s, r) => s + (r.potongan_pph || 0), 0);
  const totT = form.rows.reduce((s, r) => s + (r.penerimaan   || 0), 0);

  const cellCls = 'w-full px-1.5 py-1 text-xs rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-transparent';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <h2 className="font-black text-slate-800">Daftar Honorarium Narasumber Ekstra Kurikuler</h2>
          <p className="text-xs text-slate-400">Format persis seperti contoh — Cetak PDF landscape A4</p>
        </div>
      </div>

      {/* ── Header Dokumen ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Header Dokumen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Kode Rekening', 'kode_rekening', '5.1.02.01.xx.xx'],
            ['No. Bukti', 'no_bukti', '001/BOS/2026'],
          ] as const).map(([label, key, ph]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
              <Inp value={form[key] as string} onChange={e => setF(key, e.target.value)} placeholder={ph} />
            </div>
          ))}
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
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kegiatan Ekstra Kurikuler</label>
          <Inp
            value={form.kegiatan_name}
            onChange={e => setF('kegiatan_name', e.target.value)}
            placeholder="Pramuka / Seni Tari / Futsal / Drumband ..."
            className={cls + ' max-w-lg'}
          />
        </div>
      </div>

      {/* ── TTD ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Data Tanda Tangan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ['Kota (untuk TTD)', 'city', 'Kediri'],
            ['Tanggal TTD', 'tanggal_ttd', '10 April 2026'],
            ['Kepala Sekolah', 'kepala_sekolah', ''],
            ['NIP Kepala Sekolah', 'kepala_sekolah_nip', ''],
            ['Bendahara BOS', 'bendahara', 'Nama bendahara'],
            ['NIP Bendahara', 'bendahara_nip', ''],
          ] as const).map(([label, key, ph]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
              <Inp value={form[key] as string} onChange={e => setF(key, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabel Penerima ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Daftar Penerima Honorarium</h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} /> Tambah Baris
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50">
                {['No', 'N a m a', 'Jabatan', 'Gol.', 'Satuan', 'JAM', 'Jumlah (Rp)', 'Potongan PPh Psl 21 (Rp)', 'Penerimaan (Rp)', ''].map(h => (
                  <th key={h} className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="border border-slate-200 px-1 py-1 text-center text-slate-400 w-8 text-[11px]">{idx + 1}</td>

                  <td className="border border-slate-200 px-1 py-1 w-40">
                    <input className={cellCls} value={row.nama} onChange={e => setRow(idx, 'nama', e.target.value)} placeholder="Nama lengkap" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-28">
                    <input className={cellCls} value={row.jabatan} onChange={e => setRow(idx, 'jabatan', e.target.value)} placeholder="Pembina" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-14">
                    <input className={cellCls + ' text-center'} value={row.gol} onChange={e => setRow(idx, 'gol', e.target.value)} placeholder="III/a" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-24">
                    <input className={cellCls + ' text-center'} value={row.satuan} onChange={e => setRow(idx, 'satuan', e.target.value)} />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-14">
                    <input type="number" className={cellCls + ' text-center'} value={row.jam || ''} onChange={e => setRow(idx, 'jam', Number(e.target.value))} placeholder="0" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-28">
                    <input type="number" className={cellCls + ' text-right'} value={row.jumlah || ''} onChange={e => setRow(idx, 'jumlah', Number(e.target.value))} placeholder="0" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-28">
                    <input type="number" className={cellCls + ' text-right'} value={row.potongan_pph || ''} onChange={e => setRow(idx, 'potongan_pph', Number(e.target.value))} placeholder="0" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-28 bg-emerald-50/40">
                    <div className="text-right px-1.5 font-semibold text-emerald-700 text-[11px]">
                      {row.penerimaan ? fmtNum(row.penerimaan) : '-'}
                    </div>
                  </td>
                  <td className="border border-slate-200 px-1 py-1 w-8 text-center">
                    {form.rows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">
                        <X size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* JUMLAH */}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={6} className="border border-slate-300 px-3 py-2 text-center text-slate-700 text-xs">JUMLAH</td>
                <td className="border border-slate-300 px-2 py-2 text-right text-slate-800 text-xs">
                  <span className="text-slate-400 mr-1 font-normal text-[10px]">Rp</span>{totJ ? fmtNum(totJ) : ' -'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-slate-800 text-xs">
                  <span className="text-slate-400 mr-1 font-normal text-[10px]">Rp</span>{totP ? fmtNum(totP) : ' -'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-emerald-700 text-xs">
                  <span className="text-slate-400 mr-1 font-normal text-[10px]">Rp</span>{totT ? fmtNum(totT) : ' -'}
                </td>
                <td className="border border-slate-300"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-slate-400">
          💡 Kolom <strong>Penerimaan</strong> = Jumlah − Potongan PPh, dihitung otomatis. Baris tanda tangan dikosongkan untuk ditandatangani manual setelah cetak.
        </p>
      </div>

      {/* ── ACTIONS ── */}
      <div className="flex gap-3 justify-end flex-wrap">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm">
          Kembali
        </button>
        <button
          onClick={() => generateHonorariumPDF(form)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 transition-all text-sm"
        >
          <Printer size={16} />
          Cetak PDF Daftar Honor
        </button>
      </div>

    </motion.div>
  );
};

export default HonorariumForm;
