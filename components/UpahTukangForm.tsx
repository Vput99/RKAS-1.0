import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Printer, ArrowLeft, HardHat, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolProfile, UpahTukangRow, UpahTukangDaftar } from '../types';
import { getTerbilang } from '../lib/evidenceRules';

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Memformat angka menjadi format ribuan dengan titik (contoh: 1.000.000)
 */
const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n);

/**
 * Memformat angka menjadi format mata uang Rupiah
 */
const fmtRp  = (n: number) => `Rp  ${fmtNum(n)}`;

/**
 * Membuat data baris (row) kosong secara default dengan nomor urut
 * @param no Nomor urut tabel
 */
const emptyRow = (no: number): UpahTukangRow => ({
  no, nama: '', kedudukan: '', gol: '',
  hari: 0, tarif: 0, honorarium: 0, potongan_pph: 0, penerimaan: 0,
});

// ─── PDF Generator ─────────────────────────────────────────────────────────────
/**
 * Mengekspor data form (Daftar Penerimaan Upah Tukang) ke dalam format PDF menggunakan jsPDF & autotable.
 * Mencetak layout tabel, header dinamis, kolom kalkulasi, serta area tanda tangan di bagian paling bawah.
 * @param d Data form yang menyimpan kegiatan, alamat, nama sekolah, dan list penerima bayaran (rows)
 */
const generateUpahTukangPDF = (d: UpahTukangDaftar) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pw  = doc.internal.pageSize.getWidth();
  const lm  = 15;
  const rm  = 15;
  let y = 12;

  // ── Kode rekening & No Bukti (kanan atas) ──
  const colR = pw - rm - 80;
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text('Kode rekening', colR, y);
  doc.text(':', colR + 30, y);
  doc.text(d.kode_rekening || '..............................', colR + 33, y);
  y += 5;
  doc.text('No Bukti', colR, y);
  doc.text(':', colR + 30, y);
  doc.text(d.no_bukti || '..............................', colR + 33, y);
  y += 12;

  // ── Judul (3 baris, center) ──
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('DAFTAR PENERIMAAN UPAH TUKANG', pw / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10.5);
  doc.text('BELANJA JASA TENAGA KASAR / TUKANG / KULI', pw / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10.5);
  doc.text(`KEGIATAN PEMELIHARAAN  ${d.kegiatan_name || '.........................................'}`, pw / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(10.5);
  doc.text(`TAHUN ${d.tahun || '........'}`, pw / 2, y, { align: 'center' });
  y += 9;

  // ── Tabel ──
  const dataRows = d.rows.filter(r => r.nama.trim());
  const totH = dataRows.reduce((s, r) => s + (r.honorarium   || 0), 0);
  const totP = dataRows.reduce((s, r) => s + (r.potongan_pph || 0), 0);
  const totT = dataRows.reduce((s, r) => s + (r.penerimaan   || 0), 0);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body: any[][] = dataRows.map((r, i) => {
    // Format kolom Honorarium: "7 hari  ×  Rp 100.000  =  Rp 700.000"
    const honorCell = r.hari && r.tarif
      ? `${r.hari} hari  ×  ${fmtNum(r.tarif)}  =  ${fmtNum(r.honorarium)}`
      : '-';
    return [
      i + 1,
      r.nama       || '',
      r.kedudukan  || '',
      r.gol        || '-',
      honorCell,
      r.potongan_pph ? fmtNum(r.potongan_pph) : '-',
      r.penerimaan   ? fmtNum(r.penerimaan)   : '-',
      String(i + 1), // nomor kolom tanda tangan
    ];
  });

  // Baris JUMLAH
  body.push([
    { content: 'JUMLAH', colSpan: 4, styles: { fontStyle: 'bold', halign: 'center' as const } },
    { content: fmtRp(totH), styles: { fontStyle: 'bold', halign: 'right' as const } },
    { content: fmtRp(totP), styles: { fontStyle: 'bold', halign: 'right' as const } },
    { content: fmtRp(totT), styles: { fontStyle: 'bold', halign: 'right' as const } },
    '',
  ]);

  // Baris TERBILANG
  const terbilangStr = getTerbilang(totT);
  body.push([
    { content: `Terbilang : # ${terbilangStr} #`, colSpan: 8, styles: { halign: 'center' as const, fontStyle: 'italic', cellPadding: 3 } }
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'No',
      'N a m a',
      'Kedudukan',
      'Gol.',
      'Honorarium\n(Hari × Tarif = Jumlah)',
      'Potongan PPh.\nPasal 21',
      'Penerimaan',
      'Tanda Tangan',
    ]],
    body,
    margin: { left: lm, right: rm },
    styles: {
      font: 'times',
      fontSize: 9.5,
      cellPadding: 3.5,
      lineColor: [0, 0, 0] as [number, number, number],
      lineWidth: 0.3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: [0, 0, 0] as [number, number, number],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10  },
      1: {                   cellWidth: 42  },
      2: {                   cellWidth: 30  },
      3: { halign: 'center', cellWidth: 12  },
      4: { halign: 'center', cellWidth: 68  },  // kolom honorarium lebar
      5: { halign: 'right',  cellWidth: 30  },
      6: { halign: 'right',  cellWidth: 30  },
      7: {                   cellWidth: 35  },
    },
    theme: 'grid',
  });

  const fy = (doc as any).lastAutoTable.finalY + 5;

  // ── Tanda Tangan ──
  const kiri  = lm + 10;
  const kanan = pw - rm - 75;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Mengetahui & Menyetujui ;', kiri, fy + 5);
  doc.text(`${d.city || 'Kediri'}, ${d.tanggal_ttd || '...................'} ${d.tahun || ''}`, kanan, fy + 5);

  doc.text('Kepala Sekolah', kiri, fy + 11);
  doc.text('Bendahara BOS,', kanan, fy + 11);

  doc.setFont('times', 'bold');
  doc.text(d.kepala_sekolah || '..................................', kiri,  fy + 42);
  doc.text(d.bendahara      || '..................................', kanan, fy + 42);
  doc.setFont('times', 'normal');
  doc.text(`NIP. ${d.kepala_sekolah_nip || '............................'}`, kiri,  fy + 47);
  doc.text(`NIP. ${d.bendahara_nip      || '............................'}`, kanan, fy + 47);

  doc.save(`Daftar_Upah_Tukang_${(d.kegiatan_name || 'Pemeliharaan').replace(/\s+/g, '_')}_${d.tahun}.pdf`);
};

// ─── Style helpers ────────────────────────────────────────────────────────────
/** Tailwind CSS untuk class input umum dan border cell di tabel agar seragam */
const cls = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all';
const cellCls = 'w-full px-1.5 py-1 text-xs rounded focus:outline-none focus:ring-1 focus:ring-amber-400 bg-transparent';

/** Komponen input sederhana yang sudah digabungkan dengan class tailwind standar */
const Inp = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input className={cls} {...p} />;

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { profile?: SchoolProfile | null; onBack: () => void; }

/**
 * Form interaktif Daftar Upah Tukang dengan auto-kalkulasi (Honor, Potongan, Penerimaan Bersih)
 * Menerima properti User/Profile Sekolah untuk melakukan auto-fill bagian input tertentu.
 */
const UpahTukangForm: React.FC<Props> = ({ profile, onBack }) => {
  const year = new Date().getFullYear().toString();

  const [form, setForm] = useState<UpahTukangDaftar>({
    id: crypto.randomUUID(),
    kode_rekening: '',
    no_bukti: '',
    kegiatan_name: '',
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

  /** Utility setter agar tidak mengulang state spread untuk data dasar/non-tabel form */
  const setF = <K extends keyof UpahTukangDaftar>(key: K, val: UpahTukangDaftar[K]) =>
    setForm(p => ({ ...p, [key]: val }));

  /**
   * Menangani pengisian nilai pada satu sel baris sekaligus melakukan Auto-kalkulasi 
   * terhadap komponen Honorarium & Nilai Penerimaan dengan logika otomatis.
   */
  const setRow = (idx: number, key: keyof UpahTukangRow, val: string | number) =>
    setForm(p => {
      const rows = [...p.rows];
      rows[idx] = { ...rows[idx], [key]: val };

      // Auto-hitung honorarium = hari × tarif
      if (key === 'hari' || key === 'tarif') {
        const hari  = key === 'hari'  ? Number(val) : rows[idx].hari;
        const tarif = key === 'tarif' ? Number(val) : rows[idx].tarif;
        rows[idx].honorarium = hari * tarif;
        rows[idx].penerimaan = Math.max(0, rows[idx].honorarium - rows[idx].potongan_pph);
      }
      // Auto-hitung penerimaan = honorarium − potongan
      if (key === 'potongan_pph') {
        rows[idx].penerimaan = Math.max(0, rows[idx].honorarium - Number(val));
      }
      return { ...p, rows };
    });

  /** Tambahkan 1 baris input tabel kosong di baris paling bawah */
  const addRow = () =>
    setForm(p => ({ ...p, rows: [...p.rows, emptyRow(p.rows.length + 1)] }));

  /** Hapus baris dari tabel dan perbaiki nomor urutan baris setelahnya */
  const removeRow = (idx: number) =>
    setForm(p => ({
      ...p,
      rows: p.rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })),
    }));

  // Variabel untuk mencetak total ringkasan auto-kalkulasi dari seluruh baris penerimaan.
  const totH = form.rows.reduce((s, r) => s + (r.honorarium   || 0), 0);
  const totP = form.rows.reduce((s, r) => s + (r.potongan_pph || 0), 0);
  const totT = form.rows.reduce((s, r) => s + (r.penerimaan   || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <HardHat size={20} />
        </div>
        <div>
          <h2 className="font-black text-slate-800">Daftar Penerimaan Upah Tukang</h2>
          <p className="text-xs text-slate-400">Format persis sesuai contoh — Cetak PDF landscape A4</p>
        </div>
      </div>

      {/* ── Header Dokumen ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Header Dokumen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Kode Rekening', 'kode_rekening', '5.2.02.xx.xx'],
            ['No. Bukti',     'no_bukti',      '001/BOS/2026'],
            ['Tahun',         'tahun',          '2026'],
          ] as const).map(([label, key, ph]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
              <Inp value={form[key] as string} onChange={e => setF(key, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Kegiatan Pemeliharaan</label>
          <Inp
            value={form.kegiatan_name}
            onChange={e => setF('kegiatan_name', e.target.value)}
            placeholder="Rehab Ruang Kelas / Perbaikan Atap / Pengecatan Gedung ..."
            className={cls + ' max-w-lg'}
          />
        </div>
      </div>

      {/* ── Data TTD ── */}
      <div className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">Data Tanda Tangan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ['Kota (untuk TTD)',     'city',               'Kediri'],
            ['Tanggal TTD',         'tanggal_ttd',         '10 April 2026'],
            ['Kepala Sekolah',      'kepala_sekolah',      ''],
            ['NIP Kepala Sekolah',  'kepala_sekolah_nip',  ''],
            ['Bendahara BOS',       'bendahara',           'Nama bendahara'],
            ['NIP Bendahara',       'bendahara_nip',       ''],
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
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Daftar Penerima Upah</h3>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus size={13} /> Tambah Baris
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-8">No</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-44">N a m a</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-32">Kedudukan</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-14">Gol.</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 whitespace-nowrap" colSpan={3}>
                  Honorarium
                </th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-28 whitespace-nowrap">Potongan PPh<br />Psl 21 (Rp)</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-28">Penerimaan (Rp)</th>
                <th className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-600 w-8">TTD</th>
                <th className="border border-slate-300 px-1 py-2 w-6"></th>
              </tr>
              <tr className="bg-slate-50/70">
                <th className="border border-slate-200" colSpan={4}></th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-500 text-[11px] w-16">Hari</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-500 text-[11px] w-28">Tarif / Hari (Rp)</th>
                <th className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-500 text-[11px] w-28">Jumlah (Rp)</th>
                <th className="border border-slate-200" colSpan={4}></th>
              </tr>
            </thead>
            <tbody>
              {form.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-amber-50/20">
                  <td className="border border-slate-200 px-1 py-1 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input className={cellCls} value={row.nama} onChange={e => setRow(idx, 'nama', e.target.value)} placeholder="Nama lengkap" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input className={cellCls} value={row.kedudukan} onChange={e => setRow(idx, 'kedudukan', e.target.value)} placeholder="Tukang / Mandor / Kuli" />
                  </td>
                  <td className="border border-slate-200 px-1 py-1">
                    <input className={cellCls + ' text-center'} value={row.gol} onChange={e => setRow(idx, 'gol', e.target.value)} placeholder="-" />
                  </td>

                  {/* Hari */}
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      type="number"
                      className={cellCls + ' text-center'}
                      value={row.hari || ''}
                      onChange={e => setRow(idx, 'hari', Number(e.target.value))}
                      placeholder="0"
                    />
                  </td>

                  {/* Tarif */}
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      type="number"
                      className={cellCls + ' text-right'}
                      value={row.tarif || ''}
                      onChange={e => setRow(idx, 'tarif', Number(e.target.value))}
                      placeholder="0"
                    />
                  </td>

                  {/* Honorarium (auto) */}
                  <td className="border border-slate-200 px-2 py-1 bg-amber-50/40">
                    <div className="text-right font-medium text-amber-800 text-[11px]">
                      {row.honorarium ? fmtNum(row.honorarium) : '-'}
                    </div>
                    {row.hari > 0 && row.tarif > 0 && (
                      <div className="text-[9px] text-slate-400 text-center mt-0.5">
                        {row.hari}hr × {fmtNum(row.tarif)}
                      </div>
                    )}
                  </td>

                  {/* Potongan PPh */}
                  <td className="border border-slate-200 px-1 py-1">
                    <input
                      type="number"
                      className={cellCls + ' text-right'}
                      value={row.potongan_pph || ''}
                      onChange={e => setRow(idx, 'potongan_pph', Number(e.target.value))}
                      placeholder="0"
                    />
                  </td>

                  {/* Penerimaan (auto) */}
                  <td className="border border-slate-200 px-2 py-1 bg-emerald-50/40">
                    <div className="text-right font-semibold text-emerald-700 text-[11px]">
                      {row.penerimaan ? fmtNum(row.penerimaan) : '-'}
                    </div>
                  </td>

                  {/* Nomor TTD */}
                  <td className="border border-slate-200 px-1 py-1 text-center text-slate-400 text-[11px]">{idx + 1}</td>

                  {/* Hapus */}
                  <td className="border border-slate-200 px-1 py-1 text-center">
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
                <td className="border border-slate-300 px-2 py-2 text-right text-amber-800 text-xs">
                  <span className="text-slate-400 font-normal text-[10px] mr-1">Rp.</span>{totH ? fmtNum(totH) : ' -'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-slate-800 text-xs">
                  <span className="text-slate-400 font-normal text-[10px] mr-1">Rp</span>{totP ? fmtNum(totP) : ' -'}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-emerald-700 text-xs">
                  <span className="text-slate-400 font-normal text-[10px] mr-1">Rp</span>{totT ? fmtNum(totT) : ' -'}
                </td>
                <td className="border border-slate-300" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Info kalkulasi */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
          <p className="text-[11px] font-bold text-amber-700">📊 Kalkulasi Otomatis</p>
          <p className="text-[10px] text-amber-600">
            • <strong>Honorarium</strong> = Hari × Tarif/Hari — terisi otomatis saat Anda isi Hari dan Tarif<br />
            • <strong>Penerimaan</strong> = Honorarium − Potongan PPh 21 — terisi otomatis<br />
            • Format PDF: <em>7 hari × Rp 100.000 = Rp 700.000</em> (sesuai format asli)
          </p>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="flex gap-3 justify-end flex-wrap">
        <button onClick={onBack} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm">
          Kembali
        </button>
        <button
          onClick={() => generateUpahTukangPDF(form)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all text-sm"
        >
          <Printer size={16} />
          Cetak PDF Daftar Upah Tukang
        </button>
      </div>

    </motion.div>
  );
};

export default UpahTukangForm;
