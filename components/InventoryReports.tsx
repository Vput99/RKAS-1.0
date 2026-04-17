// Build Trigger: 2026-04-17 09:55
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, FileText, ClipboardList, RefreshCw, Calendar, ArrowRightLeft, Package, Download, Printer, Sparkles, Loader2, Plus, Trash2, X, ArrowRight, Database, Edit3, CheckCircle, Layers } from 'lucide-react';
import { Budget } from '../types';
import { analyzeInventoryItems, InventoryItem } from '../lib/gemini';
import { generatePDFHeader, generateSignatures, formatCurrency, defaultTableStyles } from '../lib/pdfUtils';
import { getInventoryItems, saveInventoryItem, deleteInventoryItem, getWithdrawalTransactions, saveWithdrawalTransaction, deleteWithdrawalTransaction, getInventoryOverrides, saveInventoryOverride, getMutationOverrides, saveMutationOverride, migrateLocalStorageToSupabase, getSubKegiatanDB, saveSubKegiatanItem, deleteSubKegiatanItem, updateSubKegiatanItem } from '../lib/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * KOMPONEN MANAJEMEN INVENTARIS (InventoryReports)
 * Mekanisme Kerja:
 * 1. Data In: Diperoleh dari Analisis AI terhadap Budget/SPJ atau Input Manual.
 * 2. Data Out: Dicatat melalui 'WithdrawalTransactions' (Pengeluaran Barang).
 * 3. Laporan: Dihasilkan secara real-time berdasarkan rumus (Stok Akhir = Awal + Masuk - Keluar).
 * 4. KIB B: Khusus memfilter barang belanja modal (Kode Akun 5.2.x).
 */

// ─── Sub Kegiatan Database Types ──────────────────────────────────────────────
export interface SubKegiatanEntry {
  id: string;
  kode: string;
  nama: string;
  createdAt?: string;
}
// ──────────────────────────────────────────────────────────────────────────────

interface InventoryReportsProps {
  budgets: Budget[];
  schoolProfile: any; // Added based on the diff
}

/**
 * Struktur Data Transaksi Pengeluaran
 * Digunakan untuk mencatat setiap kali barang diambil dari gudang/persediaan.
 */
interface WithdrawalTransaction {
  id: string;
  inventoryItemId: string; // ID barang yang dikurangi
  date: string;
  docNumber: string;
  quantity: number; // Jumlah yang dikeluarkan
  notes?: string;
}

// Helper functions moved outside for performance
const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '-';
    return d.toLocaleDateString('id-ID');
  } catch (e) {
    return dateStr || '-';
  }
};

// --- Sub-components to optimize rendering ---

const ReportHeader = React.memo(({ title, icon: Icon, onExport, onDownload }: any) => (
  <div className="px-8 py-6 border-b border-slate-100 bg-white/60 backdrop-blur-xl flex flex-col md:flex-row md:justify-between md:items-center gap-6 relative z-10">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-blue-600/10 text-blue-600 rounded-2xl shadow-inner-sm">
        <Icon size={22} className="drop-shadow-sm" />
      </div>
      <div>
        <h3 className="font-black text-slate-800 tracking-tight text-lg">Pratinjau Laporan</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-5 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-white hover:shadow-lg transition-all shadow-sm backdrop-blur-md active:scale-95"
      >
        <Printer size={16} /> CETAK
      </button>
      <button
        onClick={onDownload}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl text-xs font-black hover:shadow-xl hover:shadow-slate-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95"
      >
        <Download size={16} /> EXCEL / PDF
      </button>
    </div>
  </div>
));

const PengadaanView = React.memo(({
  inventoryItems,
  combinedItems,
  groupedItems,
  isAnalyzing,
  isSaving,
  onManualAdd,
  onEditManual,
  onAnalyze,
  onSaveAllAI,
  onDeleteManual,
  onDeleteAll,
  schoolProfile
}: any) => (
  <motion.div key="pengadaan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-slate-50/30 relative z-0">
    <div className="p-8 border-b border-slate-100 flex flex-wrap gap-6 justify-between items-center bg-white/40 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl shadow-inner">
          <Sparkles size={24} className="animate-pulse" />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-800 text-md tracking-tight">Data Inventaris Masuk</h4>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-70">Kelola item dari pengadaan SPJ</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onDeleteAll}
          className="flex items-center gap-2 px-5 py-3 bg-red-50 border border-red-200 hover:border-red-400 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black transition-all shadow-sm hover:shadow-red-500/10 active:scale-95"
          title="Hapus semua catatan stok opname"
        >
          <Trash2 size={15} /> HAPUS SEMUA
        </button>
        <button
          onClick={onManualAdd}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 rounded-2xl text-xs font-black transition-all shadow-sm hover:shadow-emerald-500/10 active:scale-95"
        >
          <Plus size={16} /> TAMBAH MANUAL
        </button>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:scale-95"
        >
          {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {isAnalyzing ? 'MENGANALISIS...' : 'ANALISA AI'}
        </button>
        {inventoryItems.length > 0 && (
          <button
            onClick={onSaveAllAI}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transform hover:-translate-y-0.5 active:scale-95"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            SIMPAN KE DATABASE
          </button>
        )}
      </div>
    </div>

    {isAnalyzing ? (
      <div className="p-12 text-center animate-pulse">
        <RefreshCw size={40} className="mx-auto text-blue-400 animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-600">AI sedang memproses transaksi SPJ Anda...</p>
        <p className="text-[10px] text-gray-400 mt-1">Mengidentifikasi barang, spesifikasi, dan kategori bahan habis pakai.</p>
      </div>
    ) : (
      <div className="overflow-x-auto p-4">
        <div className="text-center mb-6 space-y-1">
          <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN</h3>
          <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SD NEGERI CONTOH'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">TAHUN ANGGARAN {schoolProfile?.fiscalYear || '2026'}</p>
        </div>

        <table className="w-full text-[10px] border-collapse border border-gray-300 shadow-sm">
          <thead className="bg-gray-100 text-gray-800 text-center font-bold">
            <tr>
              <th rowSpan={3} className="border border-gray-300 p-2 w-8">No.</th>
              <th rowSpan={3} className="border border-gray-300 p-2 w-32">Nama Barang</th>
              <th rowSpan={3} className="border border-gray-300 p-2 w-48">Spesifikasi Nama Barang</th>
              <th rowSpan={3} className="border border-gray-300 p-2 w-16">Jumlah Barang</th>
              <th rowSpan={3} className="border border-gray-300 p-2 w-16">Satuan Barang</th>
              <th rowSpan={2} className="border border-gray-300 p-2 w-24">Harga Satuan</th>
              <th rowSpan={2} className="border border-gray-300 p-2 w-24">Total Nilai Barang</th>
              <th colSpan={3} className="border border-gray-300 p-1">Sub Kegiatan dan Rekening Anggaran Belanja Daerah Atas Pengadaan Barang</th>
              <th rowSpan={3} className="border border-gray-300 p-2 w-20">Tgl Perolehan</th>
              <th colSpan={3} className="border border-gray-300 p-1">Dokumen Sumber Perolehan</th>
              <th rowSpan={3} className="border border-gray-300 p-1 w-16">Aksi</th>
            </tr>
            <tr>
              <th colSpan={2} className="border border-gray-300 p-1 text-[8px]">Sub Kegiatan</th>
              <th rowSpan={2} className="border border-gray-300 p-1 w-20 text-[8px]">Rekening Anggaran Belanja Daerah Kode</th>
              <th rowSpan={2} className="border border-gray-300 p-1 w-16 text-[8px]">Bentuk Kontrak</th>
              <th rowSpan={2} className="border border-gray-300 p-1 w-20 text-[8px]">Nama Penyedia</th>
              <th rowSpan={2} className="border border-gray-300 p-1 w-24 text-[8px]">Nomor</th>
            </tr>
            <tr>
              <th className="border border-gray-300 p-1 text-[8px]">Rp.</th>
              <th className="border border-gray-300 p-1 text-[8px]">Rp.</th>
              <th className="border border-gray-300 p-1 w-20 text-[8px]">Kode</th>
              <th className="border border-gray-300 p-1 text-[8px]">Nama</th>
            </tr>
            <tr className="bg-gray-200/50 text-[8px] text-gray-400 font-bold">
              {[1, 2, 3, 5, 6, 7, '8=(5x7)', 12, 13, 14, 16, 17, 18, 19, '-'].map((n, i) => (
                <td key={i} className="border border-gray-300 p-1">{n}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {combinedItems.length === 0 ? (
              // Tampilkan 10 baris kosong saat belum ada data (mengikuti gaya Excel)
              Array.from({ length: 10 }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="hover:bg-blue-50/30 transition-colors h-8">
                  <td className="border border-gray-300 p-2 text-center text-gray-300">{idx + 1}</td>
                  <td className="border border-gray-300 p-2">
                    {idx === 0 && (
                      <span className="text-[9px] text-blue-400 italic font-medium">Klik "+ TAMBAH MANUAL" untuk mengisi data pengadaan...</span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-gray-200">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-right">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-right">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 italic">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                  <td className="border border-gray-300 p-2 text-gray-200 text-center">—</td>
                </tr>
              ))
            ) : (
              (Object.entries(groupedItems) as [string, InventoryItem[]][]).map(([category, items]) => {
                if (items.length === 0) return null;
                const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);

                return (
                  <Fragment key={category}>
                    <tr className="bg-slate-100/80 font-black">
                      <td colSpan={6} className="border border-gray-300 p-2.5 text-slate-800 uppercase text-[9px] tracking-widest">
                        {category}
                      </td>
                      <td className="border border-gray-300 p-2.5 text-right text-slate-900 text-[10px]">{formatRupiah(categoryTotal)}</td>
                      <td colSpan={8} className="border border-gray-300 p-2.5 bg-gray-50/20"></td>
                    </tr>

                    {items.map((item: InventoryItem, idx) => (
                      <tr key={`${category}-${idx}`} className="hover:bg-blue-50/40 group transition-colors">
                        <td className="border border-gray-300 p-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                        <td className="border border-gray-300 p-2 font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {item.id.includes('-') ? (
                              <Database size={10} className="text-emerald-500 opacity-70" />
                            ) : (
                              <Sparkles size={10} className="text-blue-400 animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 p-2 text-gray-500 italic leading-tight">{item.spec}</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">{item.quantity}</td>
                        <td className="border border-gray-300 p-2 text-center text-gray-600">{item.unit}</td>
                        <td className="border border-gray-300 p-2 text-right">{formatRupiah(item.price)}</td>
                        <td className="border border-gray-300 p-2 text-right font-black text-blue-700">{formatRupiah(item.total)}</td>
                        <td className="border border-gray-300 p-2 text-[8px] text-center font-mono font-bold text-indigo-600 bg-indigo-50/30">{item.subActivityCode || '0.00.01'}</td>
                        <td className="border border-gray-300 p-2 text-[8px] font-medium leading-tight text-slate-600">{item.subActivityName || 'Administrasi Sekolah'}</td>
                        <td className="border border-gray-300 p-2 text-[8px] text-center font-mono font-black text-orange-600 bg-orange-50/30">{item.accountCode}</td>
                        <td className="border border-gray-300 p-2 text-center text-[8px] font-bold text-slate-500">{formatDate(item.date)}</td>
                        <td className="border border-gray-300 p-2 text-center text-[8px] font-medium">{item.contractType || 'Kuitansi'}</td>
                        <td className="border border-gray-300 p-2 text-[8px] italic text-slate-500">{item.vendor}</td>
                        <td className="border border-gray-300 p-2 text-center text-[8px] font-mono font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                          {item.docNumber}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {(item.id.startsWith('manual-') || !item.id.includes('-')) && (
                              <>
                                <button
                                  onClick={() => (onEditManual as any)(item)}
                                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all active:scale-90"
                                  title="Edit Data"
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  onClick={() => onDeleteManual(item.id)}
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all active:scale-90"
                                  title="Hapus Data"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    )}
  </motion.div>
));

const PengeluaranView = React.memo(({
  withdrawalTransactions,
  combinedItems,
  schoolProfile,
  onRecordWithdrawal,
  onDeleteWithdrawal,
  onAddPreviousYear
}: any) => {
  const totalExpenditure = useMemo(() => {
    return withdrawalTransactions.reduce((sum: number, tx: any) => {
      const item = combinedItems.find((i: any) => i.id === tx.inventoryItemId);
      return sum + (item ? tx.quantity * item.price : 0);
    }, 0);
  }, [withdrawalTransactions, combinedItems]);

  return (
    <motion.div key="pengeluaran" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-white/40 relative z-0">
      <div className="p-6 border-b border-slate-100 bg-orange-50/30 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <ClipboardList size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Buku Pengeluaran Persediaan</h4>
            <p className="text-[10px] text-gray-500 italic">Data pengeluaran barang yang telah terealisasi melalui SPJ.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddPreviousYear}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition shadow-sm border border-slate-200"
          >
            <Layers size={14} /> Sisa Tahun Sebelumnya
          </button>
          <button
            onClick={onRecordWithdrawal}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition shadow-md shadow-orange-200"
          >
            <Plus size={14} /> Catat Pengeluaran
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-8 bg-white">
        <div className="flex justify-end mb-1">
          <p className="text-[9px] font-bold text-gray-500">FORMAT I.B.04</p>
        </div>
        
        <div className="text-center mb-8 space-y-0.5">
          <h3 className="text-base font-black text-gray-800 uppercase">BUKU PENGELUARAN PERSEDIAAN</h3>
          <p className="text-sm font-bold text-gray-700 uppercase">PEMERINTAH KOTA KEDIRI</p>
          <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SDN RAJAWALI'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">TAHUN {schoolProfile?.fiscalYear || '2025'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">SUMBERDANA KESELURUHAN</p>
        </div>

        <div className="flex flex-col gap-0.5 mb-6 text-[10px] font-bold text-gray-800">
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Kuasa Pengguna Barang</span>
            <span>:</span>
            <span>{schoolProfile?.department || 'Dinas Pendidikan'}</span>
          </div>
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Pengguna Barang</span>
            <span>:</span>
            <span>{schoolProfile?.name || 'SDN RAJAWALI'}</span>
          </div>
        </div>

        <table className="w-full text-[10px] border-collapse border border-gray-400">
          <thead className="bg-white text-gray-800 font-bold">
            <tr>
              <th rowSpan={2} className="border border-gray-400 p-2 w-10 text-center">No</th>
              <th colSpan={2} className="border border-gray-400 p-2 text-center">Dokumen</th>
              <th rowSpan={2} className="border border-gray-400 p-2 text-center">Nama Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 text-center">Spesifikasi Nama Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Jumlah</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-20 text-center">Satuan Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-24 text-center">Harga Satuan (Rp)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-28 text-center">Nilai Total (Rp)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-24 text-center">Keterangan</th>
            </tr>
            <tr>
              <th className="border border-gray-400 p-1 w-24 text-center">Tanggal</th>
              <th className="border border-gray-400 p-1 w-28 text-center">Nomor</th>
            </tr>
            <tr className="bg-gray-50/50 text-[9px] italic text-gray-500 font-normal">
              <td className="border border-gray-400 p-0.5 text-center">1</td>
              <td className="border border-gray-400 p-0.5 text-center">2</td>
              <td className="border border-gray-400 p-0.5 text-center">3</td>
              <td className="border border-gray-400 p-0.5 text-center font-bold">6</td>
              <td className="border border-gray-400 p-0.5 text-center font-bold">8</td>
              <td className="border border-gray-400 p-0.5 text-center">9</td>
              <td className="border border-gray-400 p-0.5 text-center">10</td>
              <td className="border border-gray-400 p-0.5 text-center">11</td>
              <td className="border border-gray-400 p-0.5 text-center font-bold">12 = (9x11)</td>
              <td className="border border-gray-400 p-0.5 text-center">13</td>
            </tr>
          </thead>
          <tbody>
            {withdrawalTransactions.length === 0 ? (
              Array.from({ length: 15 }).map((_, idx) => (
                <tr key={`empty-tx-${idx}`} className="h-7">
                  <td className="border border-gray-400 p-1 text-center text-transparent">{idx + 1}</td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                  <td className="border border-gray-400 p-1"></td>
                </tr>
              ))
            ) : (
              Object.entries(
                withdrawalTransactions.reduce((groups: any, tx: any) => {
                  if (!groups[tx.docNumber]) groups[tx.docNumber] = [];
                  groups[tx.docNumber].push(tx);
                  return groups;
                }, {})
              ).map(([docKey, txs]: [string, any], docIdx) => (
                <Fragment key={docKey}>
                  {txs.map((tx: any, txIdx: number) => {
                    const item = combinedItems.find((i: any) => i.id === tx.inventoryItemId);
                    if (!item) return null;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 group group-hover:bg-gray-50/80 transition-colors">
                        <td className="border border-gray-400 p-1.5 text-center">{txIdx === 0 ? docIdx + 1 : ''}</td>
                        <td className="border border-gray-400 p-1.5 text-center">{txIdx === 0 ? formatDate(tx.date) : ''}</td>
                        <td className="border border-gray-400 p-1.5 text-center font-mono">{txIdx === 0 ? tx.docNumber : ''}</td>
                        <td className="border border-gray-400 p-1.5 font-bold">{item.name}</td>
                        <td className="border border-gray-400 p-1.5 text-gray-500 italic">{item.spec}</td>
                        <td className="border border-gray-400 p-1.5 text-center font-bold">{tx.quantity}</td>
                        <td className="border border-gray-400 p-1.5 text-center">{item.unit}</td>
                        <td className="border border-gray-400 p-1.5 text-right">{formatRupiah(item.price)}</td>
                        <td className="border border-gray-400 p-1.5 text-right font-black text-emerald-700">{formatRupiah(tx.quantity * item.price)}</td>
                        <td className="border border-gray-400 p-1.5 text-[8px] leading-tight relative">
                          {tx.notes || '-'}
                          <button 
                            onClick={() => onDeleteWithdrawal(tx.id)} 
                            className="absolute right-1 top-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity print:hidden"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/50 font-black">
              <td colSpan={8} className="border border-gray-400 p-2.5 text-right italic uppercase tracking-wider">Jumlah</td>
              <td className="border border-gray-400 p-2.5 text-right bg-yellow-400/20">{formatRupiah(totalExpenditure)}</td>
              <td className="border border-gray-400 p-2.5"></td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Section */}
        <div className="mt-12 flex justify-end">
          <div className="text-center min-w-[250px] text-[10px] space-y-1">
            <p className="mb-4">Kediri, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-20"></div>
            <p className="font-black underline uppercase text-[11px]">{schoolProfile?.headmaster || '................................'}</p>
            <p className="font-medium tracking-tight">NIP. {schoolProfile?.headmasterNip || '................................'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const PersediaanView = React.memo(({ combinedItems, getItemStats, schoolProfile, handleOverride, itemOverrides }: any) => {
  // Group items by category for hierarchical display
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};
    combinedItems.forEach((item: any) => {
      const [mainCat] = item.category.split(' - ');
      if (!groups[mainCat]) groups[mainCat] = [];
      groups[mainCat].push(item);
    });
    return groups;
  }, [combinedItems]);

  return (
    <motion.div key="persediaan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-white relative z-0">
      <div className="overflow-x-auto p-8">
        <div className="flex justify-end mb-1">
          <p className="text-[9px] font-bold text-gray-500">FORMAT IV.I.10</p>
        </div>

        <div className="text-center mb-8 space-y-0.5">
          <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PERSEDIAAN</h3>
          <p className="text-sm font-bold text-gray-700 uppercase">PEMERINTAH KOTA KEDIRI</p>
          <p className="text-sm font-bold text-gray-700 uppercase">{schoolProfile?.name || 'SDN RAJAWALI'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">TAHUN {schoolProfile?.fiscalYear || '2025'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">SUMBERDANA KESELURUHAN</p>
        </div>

        <div className="flex flex-col gap-0.5 mb-6 text-[10px] font-bold text-gray-800">
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Kuasa Pengguna Barang</span>
            <span>:</span>
            <span>{schoolProfile?.department || 'Dinas Pendidikan'}</span>
          </div>
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Pengguna Barang</span>
            <span>:</span>
            <span>{schoolProfile?.name || 'SDN RAJAWALI'}</span>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-gray-400">
          <thead className="bg-white text-gray-800 font-bold text-[10px]">
            <tr>
              <th rowSpan={2} className="border border-gray-400 p-2 w-10 text-center">No</th>
              <th colSpan={2} className="border border-gray-400 p-2 text-center">Penggolongan dan Kodefikasi Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">NUSP</th>
              <th rowSpan={2} className="border border-gray-400 p-2 text-center">Spesifikasi Nama Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Sisa Tahun lalu</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Persediaan masuk</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Persediaan Keluar</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Sisa Persediaan</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-16 text-center">Satuan Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-24 text-center">Harga Satuan (Rp.)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-28 text-center">Total Nilai Barang (Rp.)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-24 text-center">Keterangan</th>
            </tr>
            <tr>
              <th className="border border-gray-400 p-1 w-32 text-center">Kode Barang</th>
              <th className="border border-gray-400 p-1 text-center">Nama Barang</th>
            </tr>
            <tr className="bg-gray-50/50 text-[9px] italic text-gray-500 font-normal">
              <td className="border border-gray-400 p-0.5 text-center">1</td>
              <td colSpan={2} className="border border-gray-400 p-0.5 text-center">2</td>
              <td className="border border-gray-400 p-0.5 text-center px-4">—</td>
              <td className="border border-gray-400 p-0.5 text-center">3</td>
              <td className="border border-gray-400 p-0.5 text-center">4</td>
              <td className="border border-gray-400 p-0.5 text-center">5</td>
              <td className="border border-gray-400 p-0.5 text-center">6</td>
              <td className="border border-gray-400 p-0.5 text-center font-bold">7 = (4+5-6)</td>
              <td className="border border-gray-400 p-0.5 text-center">8</td>
              <td className="border border-gray-400 p-0.5 text-center">9</td>
              <td className="border border-gray-400 p-0.5 text-center font-bold">10 = (7x9)</td>
              <td className="border border-gray-400 p-0.5 text-center">11</td>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {/* Header Hirarkis (Statik sesuai Gambar) */}
            <tr className="font-black bg-gray-100/50">
              <td className="border border-gray-400 p-1.5 text-center">1</td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1</td>
              <td colSpan={11} className="border border-gray-400 p-1.5 uppercase">ASET LANCAR</td>
            </tr>
            <tr className="font-bold">
              <td className="border border-gray-400 p-1.5 text-center"></td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1.1</td>
              <td colSpan={11} className="border border-gray-400 p-1.5 uppercase">PERSEDIAAN</td>
            </tr>
            <tr className="font-bold">
              <td className="border border-gray-400 p-1.5 text-center"></td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1.1.7</td>
              <td colSpan={11} className="border border-gray-400 p-1.5 uppercase">BARANG PAKAI HABIS</td>
            </tr>

            {Object.entries(groupedByCategory).map(([mainCat, items], catIdx) => (
              <Fragment key={mainCat}>
                <tr className="font-bold text-gray-700 bg-gray-50/30">
                  <td className="border border-gray-400 p-1.5 text-center"></td>
                  <td className="border border-gray-400 p-1.5 text-center font-mono">1.1.7.xx</td>
                  <td colSpan={11} className="border border-gray-400 p-1.5 uppercase">{mainCat}</td>
                </tr>
                {items.map((item: any, i: number) => {
                  const stats = getItemStats(item);
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20 group transition-colors">
                      <td className="border border-gray-400 p-1 text-center text-gray-400 italic"></td>
                      <td className="border border-gray-400 p-1 font-mono text-[9px] text-center text-gray-500">{item.codification || '1.1.7.01.01.000'}</td>
                      <td className="border border-gray-400 p-1 font-medium">{item.name}</td>
                      <td className="border border-gray-400 p-1 text-center text-gray-300">-</td>
                      <td className="border border-gray-400 p-1 text-gray-500 italic">{item.spec}</td>
                      <td className="border border-gray-400 p-1 text-center relative group/cell">
                        <input
                          type="number"
                          className="w-full bg-transparent text-center border-none focus:ring-1 focus:ring-blue-300 rounded outline-none p-0"
                          value={stats.lastYearBalance}
                          onChange={(e) => handleOverride(item.id, 'lastYearBalance', Number(e.target.value))}
                        />
                      </td>
                      <td className="border border-gray-400 p-1 text-center bg-emerald-50/30">{stats.totalIn}</td>
                      <td className="border border-gray-400 p-1 text-center relative group/cell">
                        <input
                          type="number"
                          className="w-full bg-transparent text-center border-none focus:ring-1 focus:ring-orange-300 rounded outline-none p-0 font-bold"
                          value={stats.totalOut}
                          onChange={(e) => handleOverride(item.id, 'usedQuantity', Number(e.target.value))}
                        />
                      </td>
                      <td className={`border border-gray-400 p-1 text-center font-black ${stats.remaining < 0 ? 'text-red-600 bg-red-50' : 'bg-blue-50/30'}`}>{stats.remaining}</td>
                      <td className="border border-gray-400 p-1 text-center">{item.unit}</td>
                      <td className="border border-gray-400 p-1 text-right">{formatRupiah(item.price)}</td>
                      <td className="border border-gray-400 p-1 text-right font-black text-blue-700">{formatRupiah(stats.remaining * item.price)}</td>
                      <td className="border border-gray-400 p-1 text-[8px] italic text-gray-400">Tersistem</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}

            {combinedItems.length === 0 && Array.from({ length: 10 }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="h-6">
                <td className="border border-gray-400 p-1 text-transparent">{idx + 1}</td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1 text-transparent">0</td>
                <td className="border border-gray-400 p-1 text-transparent">0</td>
                <td className="border border-gray-400 p-1 text-transparent">0</td>
                <td className="border border-gray-400 p-1 text-transparent">0</td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
                <td className="border border-gray-400 p-1"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-black">
              <td colSpan={11} className="border border-gray-400 p-2 text-right uppercase italic tracking-widest">Total Nilai Persediaan Keseluruhan</td>
              <td className="border border-gray-400 p-2 text-right text-blue-800 bg-blue-100/50">
                {formatRupiah(combinedItems.reduce((sum: number, item: any) => sum + (getItemStats(item).remaining * item.price), 0))}
              </td>
              <td className="border border-gray-400 p-2"></td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Section (Match Pengeluaran) */}
        <div className="mt-12 flex justify-end">
          <div className="text-center min-w-[250px] text-[10px] space-y-1">
            <p className="mb-4">Kediri, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold text-gray-700">Kepala Sekolah</p>
            <div className="h-24"></div>
            <p className="font-black underline uppercase text-[11px]">{schoolProfile?.headmaster || '................................'}</p>
            <p className="font-medium tracking-tight text-gray-500">NIP. {schoolProfile?.headmasterNip || '................................'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const MutasiView = React.memo(({ mutationData, schoolProfile, handleMutationOverride, mutationOverrides }: any) => {
  const totalAwal = Object.entries(mutationData).reduce((sum, [cat, vals]: any) => sum + (mutationOverrides[cat]?.awal ?? vals.awal), 0);
  const totalTambah = Object.entries(mutationData).reduce((sum, [cat, vals]: any) => sum + (mutationOverrides[cat]?.tambah ?? vals.tambah), 0);
  const totalKurang = Object.entries(mutationData).reduce((sum, [cat, vals]: any) => sum + (mutationOverrides[cat]?.kurang ?? vals.kurang), 0);
  const totalAkhir = totalAwal + totalTambah - totalKurang;

  return (
    <motion.div key="mutasi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col h-full bg-white relative z-0">
      <div className="overflow-x-auto p-8">
        <div className="flex justify-end mb-1">
          <p className="text-[9px] font-bold text-gray-500">FORMAT IV.I.11</p>
        </div>

        <div className="text-center mb-8 space-y-0.5">
          <h3 className="text-base font-black text-gray-800 uppercase">LAPORAN PERSEDIAAN MUTASI TAMBAH DAN KURANG</h3>
          <p className="text-sm font-bold text-gray-700 uppercase">MENURUT OBJEK SUMBERDANA KESELURUHAN</p>
          <p className="text-sm font-bold text-gray-700 uppercase">1.01.0.00.0.00.01.00 - DINAS PENDIDIKAN</p>
          <p className="text-sm font-black text-gray-800 uppercase">{schoolProfile?.name || 'SDN RAJAWALI'}</p>
          <p className="text-xs font-bold text-gray-600 uppercase">AKHIR TAHUN</p>
          <p className="text-xs font-bold text-gray-600 uppercase">TAHUN {schoolProfile?.fiscalYear || '2026'}</p>
        </div>

        <div className="flex flex-col gap-0.5 mb-6 text-[10px] font-bold text-gray-800">
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Kode Lokasi</span>
            <span>:</span>
            <span>01.00.00 - {schoolProfile?.department || 'Dinas Pendidikan'}</span>
          </div>
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Provinsi</span>
            <span>:</span>
            <span>PROVINSI JAWA TIMUR</span>
          </div>
          <div className="grid grid-cols-[150px_10px_1fr]">
            <span>Kabupaten/Kota</span>
            <span>:</span>
            <span>KOTA KEDIRI</span>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-gray-400">
          <thead className="bg-white text-gray-800 font-bold text-[10px]">
            <tr>
              <th colSpan={3} className="border border-gray-400 p-2 text-center">Penggolongan dan Kodefikasi Barang</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-28 text-center">Saldo Awal (Rp.)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-28 text-center">Mutasi Tambah (Rp.)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-28 text-center">Mutasi Kurang (Rp.)</th>
              <th rowSpan={2} className="border border-gray-400 p-2 w-32 text-center">Saldo Akhir (Rp.)</th>
            </tr>
            <tr>
              <th className="border border-gray-400 p-1 w-10 text-center">No</th>
              <th className="border border-gray-400 p-1 w-32 text-center">Kode Barang</th>
              <th className="border border-gray-400 p-1 text-center">Nama Barang</th>
            </tr>
            <tr className="bg-gray-50/50 text-[9px] italic text-gray-500 font-normal">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <td key={n} colSpan={n === 3 ? 1 : 1} className="border border-gray-400 p-0.5 text-center">{n}</td>
              ))}
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {/* Header Hirarkis Sesuai Gambar */}
            <tr className="font-black bg-gray-100/50">
              <td className="border border-gray-400 p-1.5 text-center">1</td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1</td>
              <td colSpan={5} className="border border-gray-400 p-1.5 uppercase">ASET LANCAR</td>
            </tr>
            <tr className="font-bold">
              <td className="border border-gray-400 p-1.5 text-center"></td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1.1</td>
              <td colSpan={5} className="border border-gray-400 p-1.5 uppercase">PERSEDIAAN</td>
            </tr>
            <tr className="font-bold">
              <td className="border border-gray-400 p-1.5 text-center"></td>
              <td className="border border-gray-400 p-1.5 text-center font-mono">1.1.7</td>
              <td colSpan={5} className="border border-gray-400 p-1.5 uppercase">BARANG PAKAI HABIS</td>
            </tr>

            {Object.entries(mutationData).map(([cat, vals]: [string, any], i) => {
              const overrides = mutationOverrides[cat] || {};
              const awal = overrides.awal ?? vals.awal;
              const tambah = overrides.tambah ?? vals.tambah;
              const kurang = overrides.kurang ?? vals.kurang;
              const akhir = awal + tambah - kurang;

              return (
                <tr key={cat} className="hover:bg-slate-50 transition-colors group">
                  <td className="border border-gray-400 p-1.5 text-center text-gray-400 italic"></td>
                  <td className="border border-gray-400 p-1.5 text-center font-mono text-gray-500">1.1.7.xx</td>
                  <td className="border border-gray-400 p-1.5 font-bold text-slate-700 uppercase">{cat}</td>
                  <td className="border border-gray-400 p-1.5 text-right relative group/cell">
                    <input
                      type="number"
                      className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-purple-300 rounded outline-none p-0"
                      value={awal}
                      onChange={(e) => handleMutationOverride(cat, 'awal', Number(e.target.value))}
                    />
                  </td>
                  <td className="border border-gray-400 p-1.5 text-right relative group/cell bg-emerald-50/20">
                    <input
                      type="number"
                      className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-emerald-300 rounded outline-none p-0"
                      value={tambah}
                      onChange={(e) => handleMutationOverride(cat, 'tambah', Number(e.target.value))}
                    />
                  </td>
                  <td className="border border-gray-400 p-1.5 text-right relative group/cell bg-yellow-50/20">
                    <input
                      type="number"
                      className="w-full bg-transparent text-right border-none focus:ring-1 focus:ring-yellow-300 rounded outline-none p-0"
                      value={kurang}
                      onChange={(e) => handleMutationOverride(cat, 'kurang', Number(e.target.value))}
                    />
                  </td>
                  <td className="border border-gray-400 p-1.5 text-right font-black text-slate-900 bg-red-50/10">
                    {formatRupiah(akhir)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <td colSpan={3} className="border border-gray-400 p-2 text-right uppercase italic">Jumlah Total</td>
              <td className="border border-gray-400 p-2 text-right">{formatRupiah(totalAwal)}</td>
              <td className="border border-gray-400 p-2 text-right text-emerald-700">{formatRupiah(totalTambah)}</td>
              <td className="border border-gray-400 p-2 text-right text-yellow-700">{formatRupiah(totalKurang)}</td>
              <td className="border border-gray-400 p-2 text-right bg-blue-50 text-blue-900 font-black">{formatRupiah(totalAkhir)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature Section */}
        <div className="mt-12 flex justify-end">
          <div className="text-center min-w-[250px] text-[10px] space-y-1">
            <p className="mb-4">Kediri, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold text-gray-700">Kepala Sekolah</p>
            <div className="h-24"></div>
            <p className="font-black underline uppercase text-[11px]">{schoolProfile?.headmaster || '................................'}</p>
            <p className="font-medium tracking-tight text-gray-500">NIP. {schoolProfile?.headmasterNip || '................................'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});


// ─── KIB B View Component ──────────────────────────────────────────────────────
// Editable cell: shows input on hover/focus, plain text otherwise
const KibBCell = ({ value, onChange, className = '', placeholder = '-', type = 'text' }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; type?: string;
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <td className={`border border-gray-400 p-0 group relative ${className}`}>
      <input
        type={type}
        value={value}
        placeholder={focused ? placeholder : ''}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full h-full px-1 py-1 text-[9px] text-center bg-transparent outline-none transition-all
          ${value ? 'text-gray-800' : 'text-gray-300'}
          ${focused ? 'bg-amber-50 ring-1 ring-inset ring-amber-400 text-gray-800 placeholder-amber-300' : 'hover:bg-blue-50/60 cursor-text'}
        `}
        style={{ minHeight: '22px' }}
      />
      {!value && !focused && (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-300 pointer-events-none group-hover:text-amber-400 transition-colors">✎</span>
      )}
    </td>
  );
};

const KibBView = ({ kibBItems, schoolProfile }: any) => {
  const STORAGE_KEY = 'rkas_kibb_overrides_v1';
  const [overrides, setOverrides] = React.useState<Record<string, Record<string, string>>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });

  const setField = React.useCallback((itemId: string, field: string, value: string) => {
    setOverrides(prev => {
      const next = { ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const get = (itemId: string, field: string, fallback = '') =>
    overrides[itemId]?.[field] !== undefined ? overrides[itemId][field] : fallback;

  // th shorthand
  const TH = ({ children, className = '', ...props }: any) => (
    <th className={`border border-gray-400 p-0.5 text-center text-[8px] font-bold leading-tight ${className}`} {...props}>{children}</th>
  );
  const AM = 'bg-amber-50 text-amber-800';

  return (
    <motion.div key="kib_b" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4">
      {/* Document Title */}
      <div className="text-center mb-3 space-y-0.5">
        <h3 className="text-sm font-black text-gray-800 uppercase">KARTU INVENTARIS BARANG KIB B (PERALATAN DAN MESIN)</h3>
        <p className="text-xs font-bold text-gray-700 uppercase">PFR {schoolProfile?.name || 'NAMA_BULAN'} TAHUN {schoolProfile?.fiscalYear || '2026'}</p>
      </div>
      <div className="mb-2 inline-flex items-center gap-1.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        <span>✎</span><span>Sel kuning = dapat diisi manual, klik untuk mengetik, tersimpan otomatis</span>
      </div>

      {kibBItems.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold">Belum ada data Belanja Modal.</p>
          <p className="text-xs mt-1">Tambah SPJ kode rekening <span className="font-mono font-bold text-blue-500">5.2.xx.xx</span></p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse border border-gray-400 text-[8px]" style={{ minWidth: '2400px', width: '100%' }}>
            <thead>
              {/* ROW 1: MAIN LABELS */}
              <tr className="bg-gray-200 text-gray-800 text-center">
                <TH rowSpan={3} className="w-5">Ni</TH>
                <TH rowSpan={3} className="w-16">Kode<br/>Rekening</TH>
                <TH rowSpan={3} className="w-28">Nama Barang/<br/>Jenis Barang</TH>
                <TH rowSpan={3} className={`w-14 ${AM}`}>Merk</TH>
                <TH rowSpan={3} className={`w-28 ${AM}`}>Tipe</TH>
                <TH rowSpan={3} className={`w-14 ${AM}`}>Ukuran<br/>CC</TH>
                <TH rowSpan={3} className={`w-14 ${AM}`}>Bahan</TH>
                <TH rowSpan={3} className="w-12">Tahun<br/>Pembel-<br/>ian</TH>
                <TH colSpan={4}>Asal Dari</TH>
                <TH rowSpan={3} className={`w-10 ${AM}`}>Status</TH>
                <TH rowSpan={3} className="w-20">Harga<br/>Satuan</TH>
                <TH rowSpan={3} className="w-20">Jumlah</TH>
                <TH rowSpan={3} className={`w-10 ${AM}`}>Kode<br/>Program</TH>
                <TH rowSpan={3} className={`w-28 ${AM}`}>Nama<br/>Program</TH>
                <TH rowSpan={3} className={`w-10 ${AM}`}>Kode<br/>Kegiatan</TH>
                <TH rowSpan={3} className={`w-32 ${AM}`}>Nama Kegiatan</TH>
                <TH rowSpan={3} className={`w-10 ${AM}`}>Kode<br/>Sub<br/>Kegiatan</TH>
                <TH rowSpan={3} className={`w-32 ${AM}`}>Nama Sub<br/>Kegiatan</TH>
                <TH rowSpan={3} className={`w-20 ${AM}`}>No Dokumen<br/>Pembuatan<br/>B</TH>
                <TH rowSpan={3} className="w-16">Tanggal<br/>Perolehan<br/>B</TH>
                <TH rowSpan={3} className={`w-28 ${AM}`}>Alunan<br/>Sekolah</TH>
                <TH rowSpan={3} className={`w-8 ${AM}`}>CV</TH>
                <TH rowSpan={3} className={`w-14 ${AM}`}>GAMB-<br/>AR/Alt</TH>
              </tr>
              {/* ROW 2: ASAL SUB-LABELS */}
              <tr className="bg-gray-100 text-gray-700 text-center">
                <TH className={`w-8 ${AM}`}>Jml<br/>Pembel-<br/>ian</TH>
                <TH className={`w-12 ${AM}`}>Cara<br/>Pembel-<br/>ian</TH>
                <TH className={`w-16 ${AM}`}>Harga<br/>Perolehan</TH>
                <TH className={`w-12 ${AM}`}>Dari</TH>
              </tr>
              {/* ROW 3: COLUMN NUMBERS */}
              <tr className="bg-gray-50 text-gray-400 text-center">
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26].map(n => (
                  <TH key={n} className="font-normal text-gray-400 py-0">{n}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {kibBItems.map((item: any, idx: number) => {
                const id = item.id || String(idx);
                return (
                  <tr key={id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="border border-gray-400 p-0.5 text-center">{idx + 1}</td>
                    <td className="border border-gray-400 p-0.5 text-center font-mono text-[7px]" style={{fontSize:'7px'}}>{item.accountCode}</td>
                    <td className="border border-gray-400 p-0.5 font-semibold">{item.name}</td>
                    <KibBCell value={get(id,'merk',item.merk||'')} onChange={v=>setField(id,'merk',v)} placeholder="Merk..." />
                    <KibBCell value={get(id,'tipe',item.spec||'')} onChange={v=>setField(id,'tipe',v)} placeholder="Tipe/Spek..." className="text-left" />
                    <KibBCell value={get(id,'ukuran','')} onChange={v=>setField(id,'ukuran',v)} placeholder="Ukuran..." />
                    <KibBCell value={get(id,'bahan','')} onChange={v=>setField(id,'bahan',v)} placeholder="Bahan..." />
                    <td className="border border-gray-400 p-0.5 text-center">{item.year||(item.date?new Date(item.date).getFullYear():'-')}</td>
                    <KibBCell value={get(id,'asal_jml',String(item.quantity||''))} onChange={v=>setField(id,'asal_jml',v)} placeholder="Jml..." />
                    <KibBCell value={get(id,'asal_cara',item.contractType||'')} onChange={v=>setField(id,'asal_cara',v)} placeholder="Kuitansi..." />
                    <KibBCell value={get(id,'asal_harga',item.price?formatRupiah(item.price):'')} onChange={v=>setField(id,'asal_harga',v)} placeholder="Harga..." />
                    <KibBCell value={get(id,'asal_dari',item.vendor||'')} onChange={v=>setField(id,'asal_dari',v)} placeholder="BOS/APBD..." />
                    <KibBCell value={get(id,'status','')} onChange={v=>setField(id,'status',v)} placeholder="Baik..." />
                    <td className="border border-gray-400 p-0.5 text-right">{formatRupiah(item.price)}</td>
                    <td className="border border-gray-400 p-0.5 text-right font-semibold">{formatRupiah(item.price * item.quantity)}</td>
                    <KibBCell value={get(id,'programCode',item.programCode||'')} onChange={v=>setField(id,'programCode',v)} placeholder="Kode..." />
                    <KibBCell value={get(id,'programName',item.programName||'')} onChange={v=>setField(id,'programName',v)} placeholder="Nama program..." className="text-left" />
                    <KibBCell value={get(id,'kegiatanCode',item.kegiatanCode||'')} onChange={v=>setField(id,'kegiatanCode',v)} placeholder="Kode..." />
                    <KibBCell value={get(id,'kegiatanName',item.kegiatanName||'')} onChange={v=>setField(id,'kegiatanName',v)} placeholder="Nama kegiatan..." className="text-left" />
                    <KibBCell value={get(id,'subCode',item.subActivityCode||'')} onChange={v=>setField(id,'subCode',v)} placeholder="Kode..." />
                    <KibBCell value={get(id,'subName',item.subActivityName||'')} onChange={v=>setField(id,'subName',v)} placeholder="Nama sub..." className="text-left" />
                    <KibBCell value={get(id,'docNumber',item.docNumber||'')} onChange={v=>setField(id,'docNumber',v)} placeholder="No. dok..." />
                    <td className="border border-gray-400 p-0.5 text-center">{item.date?new Date(item.date).toLocaleDateString('id-ID'):'-'}</td>
                    <KibBCell value={get(id,'alamat',schoolProfile?.address||'')} onChange={v=>setField(id,'alamat',v)} placeholder="Alamat..." className="text-left" />
                    <KibBCell value={get(id,'cv','')} onChange={v=>setField(id,'cv',v)} placeholder="CV..." />
                    <KibBCell value={get(id,'gambar','')} onChange={v=>setField(id,'gambar',v)} placeholder="Gambar..." />
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold text-[8px]">
                <td colSpan={14} className="border border-gray-400 p-1 text-right">
                  ⭐ {formatRupiah(kibBItems.reduce((s:number,i:any)=>s+i.price*i.quantity,0))}
                </td>
                <td colSpan={12} className="border border-gray-400 p-1"></td>
              </tr>
            </tfoot>
          </table>
          <div className="mt-6 flex justify-end pr-4">
            <div className="text-center text-[10px] space-y-0.5 min-w-[180px]">
              <p>Mengetahui,</p>
              <p>Kepala SDN .....</p>
              <div className="h-14"></div>
              <p className="font-bold underline">{schoolProfile?.headmaster||'Nama Kepala Sekolah'}</p>
              <p>NP</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────


/**
 * KOMPONEN UTAMA: InventoryReports
 * Mengelola state global untuk semua jenis laporan inventaris.
 */
const InventoryReports: React.FC<InventoryReportsProps> = ({ budgets, schoolProfile }) => {
  // --- STATE MANAGEMENT ---
  const [activeReport, setActiveReport] = useState<string>('pengadaan'); // Laporan yang sedang aktif dilihat
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // Barang hasil analisa AI
  const [manualInventoryItems, setManualInventoryItems] = useState<InventoryItem[]>([]); // Barang input manual pengguna
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Status loading saat AI sedang bekerja
  const [withdrawalTransactions, setWithdrawalTransactions] = useState<WithdrawalTransaction[]>([]); // Data pengeluaran barang
  
  // Overrides: Digunakan untuk menyimpan koreksi manual pengguna pada saldo awal atau jumlah keluar
  const [itemOverrides, setItemOverrides] = useState<Record<string, { usedQuantity?: number; lastYearBalance?: number }>>(() => {
    const saved = localStorage.getItem('rkas_inventory_overrides_v1');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [mutationOverrides, setMutationOverrides] = useState<Record<string, { awal?: number; tambah?: number; kurang?: number }>>(() => {
    const saved = localStorage.getItem('rkas_mutation_overrides_v1');
    return saved ? JSON.parse(saved) : {};
  });

  // --- MODAL & FORM STATE ---
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [manualForm, setManualForm] = useState<Partial<InventoryItem> & { nomor?: string }>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [currentSubCategory, setCurrentSubCategory] = useState<string>('');

  // --- SUB KEGIATAN DATABASE STATE ---
  const [subKegiatanDB, setSubKegiatanDB] = useState<SubKegiatanEntry[]>([]);
  const [isSkDBLoading, setIsSkDBLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [isSkDBModalOpen, setIsSkDBModalOpen] = useState(false);
  const [skForm, setSkForm] = useState({ kode: '', nama: '' });
  const [skEditId, setSkEditId] = useState<string | null>(null);
  const [selectedSkId, setSelectedSkId] = useState<string>('');

  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    docNumber: '',
    quantity: 0,
    notes: ''
  });

  // Hapus Semua state
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const CATEGORY_SUB_MAP: Record<string, string[]> = {
    'Bahan': [
      'Bahan Bangunan dan Konstruksi',
      'Bahan Kimia',
      'Bahan Peldak',
      'Bahan Bakar dan Pelumas',
      'Bahan Baku : Kawat, Kayu',
      'Bahan kimia nuklir',
      'Barang dalam proses',
      'Bahan/bibit tanaman',
      'Isi tabung pemadam kebakaran',
      'Isi tabung gas: isi tabung gas LPG',
      'Bahan/bibit ternak/bibit ikan',
      'Bahan lainnya'

    ],
    'Suku Cadang': [
      'Suku cadang alat angkutan',
      'Suku cadang alat besar',
      'Suku cadang alat kedokteran',
      'Suku cadang alat laboratorium',
      'Suku cadang alat pemancar',
      'Suku cadang alat studio dan komunikasi',
      'Suku cadang alat pertanian',
      'Suku cadang alat bengkel',
      'Suku cadang alat persenjataan',
      'Persediaan dari belanja bantuan sosial',
      'Suku cadang lainnya'
    ],
    'Alat Atau Bahan Untuk Kegiatan Kantor': [
      'Alat tulis kantor',
      'Kertas dan cover',
      'Bahan cetak',
      'Benda pos',
      'Persediaan dokumen/administrasi tender',
      'Bahan komputer',
      'Perabot kantor',
      'Alat listrik',
      'Perlengkapan dinas',
      'Kaporlap dan perlengkapan satwa',
      'Perlengkapan pendukung olah raga',
      'Suvenir/cindera mata',
      'Alat/bahan untuk kegiatan kantor lainnya'
    ],
    'Obat Obatan': [
      'Obat',
      'Obat Lainnya'
    ],
    'Persediaan Untuk dijual atau diserahkan': [
      'Persediaan untuk dijual/diserahkan kepada masyarakat',
      'Persediaan untuk dijual/diserahkan lainnya'
    ],
    'Natura dan Pakan': [
      'Natura: makanan/ sembako, minuman',
      'Pakan',
      'Natura dan Pakan Lainnya'
    ],
    'Persediaan Penelitian': [
      'Persediaan Penelitian Biologi',
      'Persediaan Penelitian Biologi Lainnya',
      'Persediaan Penelitian Teknologi',
      'Persediaan Penelitian Lainnya'
    ]
  };

  useEffect(() => {
    const loadDataFromDB = async () => {
      try {
        // Migrasi data localStorage → Supabase (hanya berjalan jika Supabase kosong)
        await migrateLocalStorageToSupabase();

        const [dbItems, dbWithdrawals, dbOverrides, dbMutationOv] = await Promise.all([
          getInventoryItems(),
          getWithdrawalTransactions(),
          getInventoryOverrides(),
          getMutationOverrides()
        ]);
        if (dbItems.length > 0) {
          setManualInventoryItems(dbItems.map(d => ({
            id: d.id,
            name: d.name,
            spec: d.spec,
            quantity: d.quantity,
            unit: d.unit,
            price: d.price,
            total: d.total,
            subActivityCode: d.sub_activity_code,
            subActivityName: d.sub_activity_name,
            accountCode: d.account_code,
            date: d.date,
            contractType: d.contract_type,
            vendor: d.vendor || '',
            docNumber: d.doc_number,
            category: d.category,
            codification: d.codification,
            usedQuantity: d.used_quantity,
            lastYearBalance: d.last_year_balance || 0
          })));
        } else {
          const localManual = localStorage.getItem('rkas_manual_inventory_v1');
          if (localManual) setManualInventoryItems(JSON.parse(localManual));
        }
        if (dbWithdrawals.length > 0) {
          setWithdrawalTransactions(dbWithdrawals.map(d => ({
            id: d.id,
            inventoryItemId: d.inventory_item_id,
            date: d.date,
            docNumber: d.doc_number,
            quantity: d.quantity,
            notes: d.notes
          })));
        } else {
          const localWithdrawals = localStorage.getItem('rkas_withdrawal_transactions_v1');
          if (localWithdrawals) setWithdrawalTransactions(JSON.parse(localWithdrawals));
        }
        if (Object.keys(dbOverrides).length > 0) {
          setItemOverrides(dbOverrides);
        }
        if (Object.keys(dbMutationOv).length > 0) {
          setMutationOverrides(dbMutationOv);
        }

        // Muat sub kegiatan dari Supabase
        const dbSkData = await getSubKegiatanDB();
        setSubKegiatanDB(dbSkData);

      } catch (e) {
        console.error('Failed to load inventory from DB, using localStorage fallback', e);
        const localManual = localStorage.getItem('rkas_manual_inventory_v1');
        if (localManual) setManualInventoryItems(JSON.parse(localManual));
        const localWithdrawals = localStorage.getItem('rkas_withdrawal_transactions_v1');
        if (localWithdrawals) setWithdrawalTransactions(JSON.parse(localWithdrawals));
        // Fallback sub kegiatan dari localStorage
        const localSk = localStorage.getItem('rkas_sub_kegiatan_db_v1');
        if (localSk) setSubKegiatanDB(JSON.parse(localSk));
      }
    };
    loadDataFromDB();
  }, []);

  const saveManualItems = (items: InventoryItem[]) => {
    setManualInventoryItems(items);
    localStorage.setItem('rkas_manual_inventory_v1', JSON.stringify(items));
  };

  const saveManualItemToDB = async (item: InventoryItem) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await saveInventoryItem({
        id: item.id,
        name: item.name,
        spec: item.spec,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        total: item.total,
        sub_activity_code: item.subActivityCode,
        sub_activity_name: item.subActivityName,
        account_code: item.accountCode,
        date: item.date,
        contract_type: item.contractType,
        vendor: item.vendor,
        doc_number: item.docNumber,
        category: item.category,
        codification: item.codification,
        used_quantity: item.usedQuantity,
        last_year_balance: item.lastYearBalance
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveWithdrawals = (txs: WithdrawalTransaction[]) => {
    setWithdrawalTransactions(txs);
    localStorage.setItem('rkas_withdrawal_transactions_v1', JSON.stringify(txs));
  };

  const saveWithdrawalToDB = async (tx: WithdrawalTransaction) => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await saveWithdrawalTransaction({
        id: tx.id,
        inventory_item_id: tx.inventoryItemId,
        date: tx.date,
        doc_number: tx.docNumber,
        quantity: tx.quantity,
        notes: tx.notes
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveOverrides = (newOverrides: typeof itemOverrides) => {
    setItemOverrides(newOverrides);
    localStorage.setItem('rkas_inventory_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleOverride = (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number) => {
    const updated = {
      ...itemOverrides,
      [itemId]: {
        ...(itemOverrides[itemId] || {}),
        [field]: value
      }
    };
    saveOverrides(updated);
    saveInventoryOverride(itemId, field, value);
  };

  const saveMutationOverridesLocal = (newOverrides: typeof mutationOverrides) => {
    setMutationOverrides(newOverrides);
    localStorage.setItem('rkas_mutation_overrides_v1', JSON.stringify(newOverrides));
  };

  const handleMutationOverride = (category: string, field: 'awal' | 'tambah' | 'kurang', value: number) => {
    const updated = {
      ...mutationOverrides,
      [category]: {
        ...(mutationOverrides[category] || {}),
        [field]: value
      }
    };
    saveMutationOverridesLocal(updated);
    saveMutationOverride(category, field, value);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeInventoryItems(budgets);
      setInventoryItems(results);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Gagal menganalisis data. Cek koneksi Anda.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * MEMINDAHKAN HASIL ANALISA AI KE DATABASE
   * Berguna agar hasil analisa tidak hilang saat refresh dan tersimpan permanen.
   */
  const handleSaveAllAIResults = async () => {
    if (inventoryItems.length === 0) return;
    if (!confirm(`Simpan ${inventoryItems.length} hasil analisa AI ke database utama?`)) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const resultsToSave = inventoryItems.map(item => ({
        ...item,
        id: item.id.includes('-') ? item.id : `ai-saved-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }));

      // Update local state
      const updatedManual = [...resultsToSave, ...manualInventoryItems];
      saveManualItems(updatedManual);
      
      // Clear current AI results state to avoid double counting in combinedItems
      setInventoryItems([]);

      // Save each to DB
      for (const item of resultsToSave) {
        await saveInventoryItem({
          id: item.id,
          name: item.name,
          spec: item.spec,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          total: item.total,
          sub_activity_code: item.subActivityCode,
          sub_activity_name: item.subActivityName,
          account_code: item.accountCode,
          date: item.date,
          contract_type: item.contractType,
          vendor: item.vendor,
          doc_number: item.docNumber,
          category: item.category,
          codification: item.codification,
          used_quantity: item.usedQuantity,
          last_year_balance: item.lastYearBalance
        });
      }
      
      setSaveStatus('success');
      alert('Berhasil menyimpan semua hasil analisa ke database!');
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      alert('Gagal menyimpan beberapa item. Cek koneksi Anda.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  // Sub Kegiatan DB helpers (Supabase + localStorage)
  const handleAddOrUpdateSk = async () => {
    if (!skForm.kode.trim() || !skForm.nama.trim()) return;
    setIsSkDBLoading(true);
    try {
      if (skEditId) {
        await updateSubKegiatanItem(skEditId, skForm.kode.trim(), skForm.nama.trim());
        setSubKegiatanDB(prev => prev.map(s => s.id === skEditId
          ? { ...s, kode: skForm.kode.trim(), nama: skForm.nama.trim() }
          : s
        ));
        setSkEditId(null);
      } else {
        const entry: SubKegiatanEntry = {
          id: `sk-${Date.now()}`,
          kode: skForm.kode.trim(),
          nama: skForm.nama.trim(),
          createdAt: new Date().toISOString()
        };
        await saveSubKegiatanItem(entry);
        setSubKegiatanDB(prev => [...prev, entry]);
      }
      setSkForm({ kode: '', nama: '' });
    } finally {
      setIsSkDBLoading(false);
    }
  };

  const handleDeleteSk = async (id: string) => {
    if (!confirm('Hapus data kode sub kegiatan ini?')) return;
    setIsSkDBLoading(true);
    try {
      await deleteSubKegiatanItem(id);
      setSubKegiatanDB(prev => prev.filter(s => s.id !== id));
      if (selectedSkId === id) {
        setSelectedSkId('');
        setManualForm(prev => ({ ...prev, subActivityCode: '', subActivityName: '' }));
      }
    } finally {
      setIsSkDBLoading(false);
    }
  };

  const handleSelectSk = (sk: SubKegiatanEntry) => {
    setSelectedSkId(sk.id);
    setManualForm(prev => ({ ...prev, subActivityCode: sk.kode, subActivityName: sk.nama }));
  };

  const handleManualAdd = (budgetItem: any) => {
    const isManualBalance = !budgetItem;
    const budget = budgetItem || {
      id: 'manual-inventory',
      description: 'Saldo Awal / Input Manual Persediaan',
      account_code: '0.00',
      bosp_component: '0.00 Saldo Awal'
    };

    setSelectedBudget(budget);
    setIsManualModalOpen(true);

    const firstRealization = budgetItem?.realizations?.[0];
    const subCode = typeof budget?.bosp_component === 'string' ? budget.bosp_component.split(/[.\s]/)[0] : '';
    const subName = typeof budget?.bosp_component === 'string' ? budget.bosp_component.replace(/^\d+[.\s]*/, '') : budget?.bosp_component;

    // Auto-fill harga satuan, jumlah dan satuan dari penganggaran (prioritas) atau realisasi
    const totalRealizedQty = budget.realizations?.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0) || 0;
    const autoQty = totalRealizedQty > 0 ? totalRealizedQty : (budget.quantity || 1);
    const unit = budget.unit || 'Pcs';
    const budgetedUnitPrice = budget.unit_price || (budget.quantity ? Math.round(budget.amount / budget.quantity) : 0);
    const realizationUnitPrice = firstRealization ? Math.round(firstRealization.amount / (firstRealization.quantity || 1)) : 0;
    const unitPrice = budgetedUnitPrice || realizationUnitPrice || 0;

    setManualForm({
      name: isManualBalance ? '' : budget.description,
      spec: isManualBalance ? '' : (budget.notes || firstRealization?.notes || ''),
      quantity: isManualBalance ? 0 : autoQty,
      unit: unit,
      price: isManualBalance ? 0 : unitPrice,
      category: 'Alat Atau Bahan Untuk Kegiatan Kantor',
      date: firstRealization?.date || new Date().toISOString().split('T')[0],
      subActivityCode: subCode || '',
      subActivityName: subName || '',
      accountCode: budget.account_code || '',
      vendor: firstRealization?.vendor || '',
      docNumber: firstRealization?.notes || '',
      nomor: '',
      lastYearBalance: 0
    });
    const defaultSub = CATEGORY_SUB_MAP[budget.category || 'Alat Atau Bahan Untuk Kegiatan Kantor']?.[0] || '';
    setCurrentSubCategory(defaultSub);
    // Auto-select sub kegiatan jika kode cocok di DB
    const match = subKegiatanDB.find(s => s.kode === subCode);
    setSelectedSkId(match?.id || '');
  };

  const handleEditManual = (item: InventoryItem) => {
    setEditingItemId(item.id);

    // Temukan budget yang sesuai jika ada (opsional, tapi bagus untuk context)
    const budget = budgets.find(b => b.account_code === item.accountCode && b.description === item.name);
    setSelectedBudget(budget || { description: item.name, account_code: item.accountCode, amount: item.total, realizations: [] } as any);

    // Parse category and subcategory
    const [baseCat, subCat] = item.category.includes(' - ') ? item.category.split(' - ') : [item.category, ''];

    setManualForm({
      name: item.name,
      spec: item.spec,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      category: baseCat as any,
      date: item.date,
      vendor: item.vendor,
      docSerialNumber: item.docNumber,
      accountCode: item.accountCode,
      subActivityCode: item.subActivityCode,
      subActivityName: item.subActivityName,
      nomor: item.docNumber,
      lastYearBalance: item.lastYearBalance || 0
    } as any);

    if (subCat) {
      setCurrentSubCategory(subCat);
    } else if (CATEGORY_SUB_MAP[baseCat]) {
      setCurrentSubCategory(CATEGORY_SUB_MAP[baseCat][0]);
    }

    setIsManualModalOpen(true);
  };

  const submitManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !selectedBudget) return;

    const newItem: InventoryItem = {
      id: `manual-${Date.now()}`,
      name: manualForm.name!,
      spec: manualForm.spec || '',
      quantity: Number(manualForm.quantity),
      unit: manualForm.unit || 'Unit',
      price: Number(manualForm.price),
      total: Number(manualForm.quantity) * Number(manualForm.price),
      subActivityCode: manualForm.subActivityCode,
      subActivityName: manualForm.subActivityName,
      accountCode: manualForm.accountCode || '',
      date: manualForm.date!,
      contractType: manualForm.contractType || 'Kuitansi',
      vendor: manualForm.vendor || '',
      docNumber: (manualForm as any).nomor || manualForm.docNumber || '',
      category: manualForm.category && CATEGORY_SUB_MAP[manualForm.category]
        ? `${manualForm.category} - ${currentSubCategory}`
        : (manualForm.category || 'Lainnya'),
      usedQuantity: Number(manualForm.quantity),
      lastYearBalance: Number(manualForm.lastYearBalance || 0)
    };

    if (editingItemId) {
      // Update existing
      const updated = manualInventoryItems.map(item =>
        item.id === editingItemId ? { ...newItem, id: editingItemId } : item
      );
      saveManualItems(updated);
      saveManualItemToDB({ ...newItem, id: editingItemId });
    } else {
      // Add new
      const updated = [newItem, ...manualInventoryItems];
      saveManualItems(updated);
      saveManualItemToDB(newItem);
    }

    setIsManualModalOpen(false);
    setSelectedBudget(null);
    setEditingItemId(null);
  };

  const submitWithdrawalForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryItem || !withdrawalForm.quantity) return;

    const newTx = {
      id: `wd-${Date.now()}`,
      inventoryItemId: selectedInventoryItem.id,
      date: withdrawalForm.date,
      docNumber: withdrawalForm.docNumber,
      quantity: Number(withdrawalForm.quantity),
      notes: withdrawalForm.notes
    };

    saveWithdrawals([...withdrawalTransactions, newTx]);
    saveWithdrawalToDB(newTx);
    setIsWithdrawalModalOpen(false);
    setSelectedInventoryItem(null);
    setWithdrawalForm({
      date: new Date().toISOString().split('T')[0],
      docNumber: '',
      quantity: 0,
      notes: ''
    });
  };

  const deleteWithdrawal = (id: string) => {
    saveWithdrawals(withdrawalTransactions.filter(tx => tx.id !== id));
    deleteWithdrawalTransaction(id);
  };

  const deleteManualItem = (id: string) => {
    const updated = manualInventoryItems.filter(item => item.id !== id);
    saveManualItems(updated);
    deleteInventoryItem(id);
  };

  const handleDeleteAllInventory = async () => {
    setIsDeletingAll(true);
    try {
      // Hapus satu per satu dari Supabase
      await Promise.all(manualInventoryItems.map(item => deleteInventoryItem(item.id)));
      // Bersihkan state & localStorage
      setManualInventoryItems([]);
      localStorage.removeItem('rkas_manual_inventory_v1');
    } catch (e) {
      console.error('Gagal menghapus semua inventaris:', e);
      alert('Terjadi kesalahan saat menghapus. Cek koneksi internet Anda.');
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllOpen(false);
    }
  };

  const getItemStats = (item: InventoryItem) => {
    const overrides = itemOverrides[item.id] || {};
    const lastYearBalance = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
    const totalIn = item.quantity;
    const transactionsQuantity = withdrawalTransactions
      .filter(tx => tx.inventoryItemId === item.id)
      .reduce((sum, tx) => sum + tx.quantity, 0);
    const totalOut = overrides.usedQuantity ?? (transactionsQuantity || item.usedQuantity || 0);
    const remaining = (lastYearBalance + totalIn) - totalOut;

    return { lastYearBalance, totalIn, totalOut, remaining };
  };

  /**
   * PDF EXPORT MECHANISM
   * Mengkonversi data tabel ke file PDF menggunakan jsPDF.
   * Format disesuaikan dengan laporan BMD (Barang Milik Daerah).
   */
  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    let title = '';
    let headers: any[][] = [];
    let body: any[][] = [];

    if (activeReport === 'pengadaan') {
      title = 'LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN';
      headers = [
        [
          { content: 'No', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Nama Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Spesifikasi Nama Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Jumlah Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Satuan Barang', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Harga Satuan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Total Nilai Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Sub Kegiatan dan Rekening Anggaran Belanja Daerah Atas Pengadaan Barang', colSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Tgl Perolehan', rowSpan: 3, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Dokumen Sumber Perolehan', colSpan: 3, styles: { halign: 'center' } }
        ],
        [
          { content: 'Sub Kegiatan', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Rekening Anggaran Belanja Daerah', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Bentuk Kontrak', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Nama Penyedia', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'Nomor', rowSpan: 2, styles: { halign: 'center' } }
        ],
        [
          { content: '(Rp.)', styles: { halign: 'center' } },
          { content: '(Rp.)', styles: { halign: 'center' } },
          { content: 'Kode', styles: { halign: 'center' } },
          { content: 'Nama', styles: { halign: 'center' } }
        ],
        ['1', '2', '3', '5', '6', '7', '8=(5x7)', '12', '13', '14', '16', '17', '18', '19'].map(n => ({ content: n, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }))
      ];

      combinedItems.forEach((item, i) => {
        body.push([
          i + 1,
          item.name,
          item.spec,
          item.quantity,
          item.unit,
          formatCurrency(item.price),
          formatCurrency(item.total),
          item.subActivityCode || '-',
          item.subActivityName || '-',
          item.accountCode || '-',
          formatDate(item.date),
          item.contractType || '-',
          item.vendor || '-',
          item.docNumber || '-'
        ]);
      });
    } else if (activeReport === 'pengeluaran') {
      title = 'BUKU PENGELUARAN PERSEDIAAN';
      headers = [
        [
          { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Dokumen', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Nama Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Spesifikasi Nama Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Jumlah', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Satuan Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Harga Satuan (Rp)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Nilai Total (Rp)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Keterangan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Tanggal', styles: { halign: 'center' } },
          { content: 'Nomor', styles: { halign: 'center' } }
        ],
        ['1', '2', '3', '6', '8', '9', '10', '11', '12=(9x11)', '13'].map(n => ({ 
          content: n, 
          styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } 
        }))
      ];

      let totalVal = 0;
      withdrawalTransactions.forEach((tx, i) => {
        const item = combinedItems.find(it => it.id === tx.inventoryItemId);
        if (!item) return;
        const total = tx.quantity * item.price;
        totalVal += total;
        body.push([
          i + 1,
          formatDate(tx.date),
          tx.docNumber,
          item.name,
          item.spec,
          tx.quantity,
          item.unit,
          formatCurrency(item.price),
          formatCurrency(total),
          tx.notes || ''
        ]);
      });

      // Footer row for PDF
      body.push([
        { content: 'Jumlah', colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatCurrency(totalVal), styles: { halign: 'right', fontStyle: 'bold' } },
        ''
      ]);

    } else if (activeReport === 'persediaan') {

      title = 'Laporan Persediaan Barang';
      headers = [['No', 'Kodefikasi', 'Nama Barang', 'Sisa Lalu', 'Masuk', 'Keluar', 'Sisa', 'Satuan', 'Harga', 'Total']];

      combinedItems.forEach((item, i) => {
        const stats = getItemStats(item);
        body.push([
          i + 1,
          item.codification || '-',
          item.name,
          stats.lastYearBalance,
          stats.totalIn,
          stats.totalOut,
          stats.remaining,
          item.unit,
          formatCurrency(item.price),
          formatCurrency(stats.remaining * item.price)
        ]);
      });
    } else if (activeReport === 'mutasi') {
      title = 'Laporan Mutasi Persediaan';
      headers = [['No', 'Kategori / Nama Barang', 'Saldo Awal', 'Pengadaan', 'Pengeluaran', 'Saldo Akhir', 'Satuan', 'Keterangan']];

      const categories = ['Bahan', 'Suku Cadang', 'Alat/Bahan Kantor', 'Obat-obatan', 'Lainnya'];
      categories.forEach(cat => {
        const items = combinedItems.filter(i => {
          if (cat === 'Alat/Bahan Kantor') return i.category === 'Alat Atau Bahan Untuk Kegiatan Kantor';
          if (cat === 'Lainnya') return !['Bahan', 'Suku Cadang', 'Alat Atau Bahan Untuk Kegiatan Kantor', 'Obat Obatan'].includes(i.category);
          return i.category === cat;
        });

        if (items.length > 0) {
          body.push([{ content: cat, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
          items.forEach((item, i) => {
            const stats = getItemStats(item);
            body.push([
              i + 1,
              item.name,
              stats.lastYearBalance,
              stats.totalIn,
              stats.totalOut,
              stats.remaining,
              item.unit,
              ''
            ]);
          });
        }
      });
    } else if (activeReport === 'kib_b') {
      title = 'KIB B - Kartu Inventaris Barang Peralatan Dan Mesin';
      headers = [[
        'No', 'Kode Rekening', 'Nama Barang', 'Merk', 'Tipe/Spek', 'Ukuran', 'Bahan',
        'Th. Pembelian', 'Jml', 'Cara Beli', 'Dari',
        'Status', 'Harga Satuan', 'Jumlah',
        'Kode Prog', 'Nama Program', 'Kode Keg', 'Nama Kegiatan',
        'Kode Sub', 'Nama Sub Kegiatan', 'No. Dokumen', 'Tgl Perolehan', 'Alamat', 'CV'
      ]];
      kibBItems.forEach((item: any, i: number) => {
        body.push([
          i + 1,
          item.accountCode,
          item.name,
          item.merk || '-',
          item.spec || '-',
          item.ukuran || '-',
          item.bahan || '-',
          item.year || '-',
          item.quantity,
          item.contractType || 'Kuitansi',
          item.vendor || '-',
          item.unit || 'Unit',
          formatCurrency(item.price),
          item.quantity,
          item.programCode || '-',
          item.programName || '-',
          item.kegiatanCode || '-',
          item.kegiatanName || '-',
          item.subActivityCode || '-',
          item.subActivityName || '-',
          item.docNumber || '-',
          item.date ? new Date(item.date).toLocaleDateString('id-ID') : '-',
          schoolProfile?.address || '-',
          item.cv || '-'
        ]);
      });
    }

    const startY = generatePDFHeader(doc, schoolProfile, title);
    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: headers,
      body: body,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [51, 65, 85] }
    });

    generateSignatures(doc, schoolProfile, (doc as any).lastAutoTable.finalY + 15);
    doc.save(`${title.replace(/ /g, '_')}_${schoolProfile?.fiscalYear || '2026'}.pdf`);
  };

  /**
   * EXCEL EXPORT MECHANISM
   * Mengkonversi data tabel ke file Excel (.xlsx).
   */
  const handleExportExcel = () => {
    let title = '';
    let sheetData: any[][] = [];
    const fileName = `${schoolProfile?.name || 'SD'}_${activeReport}_${schoolProfile?.fiscalYear || '2026'}.xlsx`;

    if (activeReport === 'pengadaan') {
      title = 'LAPORAN PENGADAAN BMD BERUPA ASET LANCAR PERSEDIAAN';
      sheetData = [
        [title],
        [schoolProfile?.name || ''],
        [`TAHUN ANGGARAN ${schoolProfile?.fiscalYear || ''}`],
        [],
        ['No', 'Nama Barang', 'Spesifikasi', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Nilai', 'Sub Kegiatan Kode', 'Sub Kegiatan Nama', 'Rekening Kode', 'Tgl Perolehan', 'Bentuk Kontrak', 'Penyedia', 'Nomor']
      ];
      combinedItems.forEach((item, i) => {
        sheetData.push([
          i + 1,
          item.name,
          item.spec,
          item.quantity,
          item.unit,
          item.price,
          item.total,
          item.subActivityCode,
          item.subActivityName,
          item.accountCode,
          item.date,
          item.contractType,
          item.vendor,
          item.docNumber
        ]);
      });
    } else if (activeReport === 'pengeluaran') {
      title = 'BUKU PENGELUARAN PERSEDIAAN';
      sheetData = [
        [title],
        [schoolProfile?.name || ''],
        ['No', 'Tanggal', 'Nomor Dokumen', 'Nama Barang', 'Spesifikasi', 'Jumlah', 'Satuan', 'Harga Satuan', 'Total Nilai', 'Keterangan']
      ];
      withdrawalTransactions.forEach((tx, i) => {
        const item = combinedItems.find(it => it.id === tx.inventoryItemId);
        if (!item) return;
        sheetData.push([
          i + 1,
          tx.date,
          tx.docNumber,
          item.name,
          item.spec,
          tx.quantity,
          item.unit,
          item.price,
          tx.quantity * item.price,
          tx.notes || ''
        ]);
      });
    } else if (activeReport === 'persediaan') {
      title = 'LAPORAN PERSEDIAAN BARANG';
      sheetData = [
        [title],
        ['No', 'Kodefikasi', 'Nama Barang', 'Saldo Awal', 'Masuk', 'Keluar', 'Sisa', 'Satuan', 'Harga', 'Total']
      ];
      combinedItems.forEach((item, i) => {
        const stats = getItemStats(item);
        sheetData.push([
          i + 1,
          item.codification || '-',
          item.name,
          stats.lastYearBalance,
          stats.totalIn,
          stats.totalOut,
          stats.remaining,
          item.unit,
          item.price,
          stats.remaining * item.price
        ]);
      });
    } else if (activeReport === 'kib_b') {
      title = 'KIB B - Peralatan dan Mesin';
      sheetData = [
        [title],
        ['No', 'Kode Rekening', 'Nama Barang', 'Merk', 'Tipe', 'Ukuran', 'Bahan', 'Tahun', 'Jumlah', 'Cara Beli', 'Harga', 'Total', 'Program', 'Kegiatan', 'Sub Kegiatan', 'No. Dokumen', 'Tgl Perolehan']
      ];
      kibBItems.forEach((item: any, i: number) => {
        sheetData.push([
          i + 1,
          item.accountCode,
          item.name,
          item.merk || '',
          item.spec || '',
          item.ukuran || '',
          item.bahan || '',
          item.year || '',
          item.quantity,
          item.contractType || '',
          item.price,
          item.price * item.quantity,
          item.programName || '',
          item.kegiatanName || '',
          item.subActivityName || '',
          item.docNumber || '',
          item.date || ''
        ]);
      });
    } else {
      // Default fallback
      sheetData = [['No Data For This Report Types']];
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, fileName);
  };

  // Menggabungkan item hasil analisa AI dan item input manual
  const combinedItems = useMemo(() => {
    return [...inventoryItems, ...manualInventoryItems];
  }, [inventoryItems, manualInventoryItems]);

  /**
   * LOGIKA FILTER KIB B (Peralatan & Mesin)
   * Menyaring hanya belanja modal yang berkode rekening '5.2.x'.
   * Item ini biasanya berupa aset tetap sekolah seperti laptop, printer, meja, dll.
   */
  const kibBItems = useMemo(() => {
    const isModalCode = (code?: string) => code && code.startsWith('5.2');

    // From manual inventory items with modal codes
    const manualModal = manualInventoryItems.filter(item => isModalCode(item.accountCode));

    // From budgets (SPJ) with modal account codes
    const spjModal: any[] = [];
    budgets.forEach(b => {
      if (!isModalCode(b.account_code)) return;
      if (!b.realizations || b.realizations.length === 0) return;
      b.realizations.forEach(r => {
        const qty = r.quantity || b.quantity || 1;
        const unitPrice = r.amount > 0 && qty > 0 ? Math.round(r.amount / qty) : (b.unit_price || 0);
        // Ambil kode program dan kegiatan dari bosp_component / account_code
        const bospParts = (typeof b.bosp_component === 'string' ? b.bosp_component : '').split('.');
        const acParts = (b.account_code || '').split('.');
        spjModal.push({
          id: `spj-kib-${b.id}-${r.month}`,
          accountCode: b.account_code || '-',
          name: b.description,
          spec: r.notes || b.notes || '',
          merk: '',
          ukuran: '',
          bahan: '',
          year: r.date ? new Date(r.date).getFullYear() : new Date(b.date).getFullYear(),
          quantity: qty,
          unit: b.unit || 'Unit',
          price: unitPrice,
          total: r.amount,
          contractType: 'Kuitansi',
          vendor: r.vendor || '',
          docNumber: r.notes || '',
          date: r.date || b.date,
          subActivityCode: bospParts[0] || '',
          subActivityName: typeof b.bosp_component === 'string' ? b.bosp_component.replace(/^\d+[.\s]*/, '') : String(b.bosp_component),
          programCode: acParts[0] || '',
          programName: b.category || '',
          kegiatanCode: acParts.slice(0, 2).join('.') || '',
          kegiatanName: '',
          address: schoolProfile?.address || '',
          cv: '',
          imageUrl: '',
        });
      });
    });

    // Merge, manual items take priority (they're already in the list via manualModal)
    const manualIds = new Set(manualModal.map(m => m.accountCode + '|' + m.name));
    const filteredSpj = spjModal.filter(s => !manualIds.has(s.accountCode + '|' + s.name));

    return [
      ...manualModal.map(item => ({
        ...item,
        programCode: (item.accountCode || '').split('.')[0] || '',
        programName: '',
        kegiatanCode: (item.accountCode || '').split('.').slice(0, 2).join('.') || '',
        kegiatanName: '',
        address: schoolProfile?.address || '',
        cv: '',
        imageUrl: '',
        merk: '',
        ukuran: '',
        bahan: '',
        year: item.date ? new Date(item.date).getFullYear() : '',
      })),
      ...filteredSpj
    ];
  }, [manualInventoryItems, budgets, schoolProfile]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    combinedItems.forEach((item: InventoryItem) => {
      if (!item) return;
      const cat = item.category || '99 LAINNYA';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    return groups;
  }, [combinedItems]);


  const mutationData = useMemo(() => {
    const data: Record<string, { awal: number; tambah: number; kurang: number }> = {};

    combinedItems.forEach(item => {
      const cat = item.category || '99 LAINNYA';
      if (!data[cat]) data[cat] = { awal: 0, tambah: 0, kurang: 0 };

      const overrides = itemOverrides[item.id] || {};
      const sisaLalu = overrides.lastYearBalance ?? (item.lastYearBalance || 0);
      const masuk = item.quantity;

      const transactionsQuantity = withdrawalTransactions
        .filter(tx => tx.inventoryItemId === item.id)
        .reduce((sum, tx) => sum + tx.quantity, 0);
      const keluar = overrides.usedQuantity ?? (transactionsQuantity || item.usedQuantity || 0);

      data[cat].awal += sisaLalu * item.price;
      data[cat].tambah += masuk * item.price;
      data[cat].kurang += keluar * item.price;
    });

    return data;
  }, [combinedItems, itemOverrides, withdrawalTransactions]);

  const reportMenu = [
    {
      id: 'pengadaan',
      title: 'Laporan Pengadaan BMD',
      subtitle: 'Aset Lancar Persediaan',
      description: 'Laporan daftar pengadaan barang milik daerah dalam bentuk aset lancar persediaan.',
      icon: Package,
      color: 'blue'
    },
    {
      id: 'pengeluaran',
      title: 'Buku Pengeluaran Persediaan',
      subtitle: 'Catatan Keluar Barang',
      description: 'Buku catatan kronologis pengeluaran barang persediaan dari gudang/penyimpanan.',
      icon: ClipboardList,
      color: 'orange'
    },
    {
      id: 'semester',
      title: 'Laporan Persediaan Semester',
      subtitle: 'Per 6 Bulan',
      description: 'Rekapitulasi posisi stok barang persediaan setiap periode semester.',
      icon: Calendar,
      color: 'green'
    },
    {
      id: 'persediaan',
      title: 'Laporan Persediaan',
      subtitle: 'Stok & Saldo Akhir',
      description: 'Rekapitulasi persediaan barang dengan penggolongan dan kodefikasi manual.',
      icon: ClipboardList,
      color: 'indigo'
    },
    {
      id: 'mutasi',
      title: 'Laporan Mutasi Persediaan',
      subtitle: 'Tambah & Kurang',
      description: 'Laporan rincian mutasi tambah dan kurang menurut objek sumber dana keseluruhan.',
      icon: ArrowRightLeft,
      color: 'purple'
    },
    {
      id: 'kib_b',
      title: 'KIB B - Peralatan & Mesin',
      subtitle: 'Kartu Inventaris Barang',
      description: 'Kartu inventaris barang berupa peralatan dan mesin yang diperoleh dari belanja modal (kode rekening 5.2.xx).',
      icon: Layers,
      color: 'teal'
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 pb-10">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100 flex items-center gap-1"><Package size={12} /> Inventaris</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Stok Opname & Persediaan</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manajemen dan pelaporan aset lancar serta barang persediaan.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      {/* Grid Menu Laporan */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportMenu.map((report) => (
          <motion.button
            key={report.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveReport(report.id)}
            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group ${activeReport === report.id
              ? `bg-gradient-to-br from-white to-${report.color}-50/50 border-${report.color}-200 shadow-xl shadow-${report.color}-500/10`
              : 'bg-white/60 backdrop-blur-md border-white hover:border-blue-100 hover:shadow-lg shadow-sm'
              }`}
          >
            {activeReport === report.id && (
              <motion.div layoutId="active-report-bg" className={`absolute inset-0 bg-${report.color}-500/5 z-0`} />
            )}
            {(() => {
              const Icon = report.icon;
              return (
                <div className={`p-3 rounded-xl bg-${report.color}-100 text-${report.color}-600 relative z-10 shadow-inner`}>
                  <Icon size={24} className={activeReport === report.id ? 'animate-pulse' : ''} />
                </div>
              );
            })()}
            <div className="flex-1 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 tracking-tight text-sm">{report.title}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-${report.color}-600 mb-2`}>{report.subtitle}</p>
                </div>
                <div className={`text-${report.color}-500 opacity-30 transform group-hover:scale-110 group-hover:opacity-100 transition-all`}>
                  <ArrowRight size={16} />
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{report.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Report View Area */}
      <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] border border-white/60 shadow-xl overflow-hidden relative min-h-[500px]">
        <ReportHeader
          title={reportMenu.find(r => r.id === activeReport)?.title}
          subtitle={reportMenu.find(r => r.id === activeReport)?.subtitle}
          icon={reportMenu.find(r => r.id === activeReport)?.icon || FileText}
          onExport={handleExportPDF}
          onDownload={handleExportExcel}
        />

        <AnimatePresence mode="wait">
          {activeReport === 'pengadaan' && (
            <PengadaanView
              inventoryItems={inventoryItems}
              combinedItems={combinedItems}
              groupedItems={groupedItems}
              isAnalyzing={isAnalyzing}
              isSaving={isSaving}
              onManualAdd={() => { setEditingItemId(null); setIsManualModalOpen(true); }}
              onEditManual={handleEditManual}
              onAnalyze={handleAnalyze}
              onSaveAllAI={handleSaveAllAIResults}
              onDeleteManual={deleteManualItem}
              onDeleteAll={() => setIsDeleteAllOpen(true)}
              schoolProfile={schoolProfile}
            />
          )}

          {activeReport === 'pengeluaran' && (
            <PengeluaranView
              withdrawalTransactions={withdrawalTransactions}
              combinedItems={combinedItems}
              schoolProfile={schoolProfile}
              onRecordWithdrawal={() => setIsWithdrawalModalOpen(true)}
              onDeleteWithdrawal={deleteWithdrawal}
              onAddPreviousYear={() => handleManualAdd(null)}
            />
          )}

          {activeReport === 'persediaan' && (
            <PersediaanView
              combinedItems={combinedItems}
              getItemStats={getItemStats}
              schoolProfile={schoolProfile}
              handleOverride={handleOverride}
              itemOverrides={itemOverrides}
            />
          )}

          {activeReport === 'mutasi' && (
            <MutasiView
              mutationData={mutationData}
              schoolProfile={schoolProfile}
              handleMutationOverride={handleMutationOverride}
              mutationOverrides={mutationOverrides}
            />
          )}

          {activeReport === 'kib_b' && (
            <KibBView
              kibBItems={kibBItems}
              schoolProfile={schoolProfile}
            />
          )}

          {/* Catch-all for other reports pending implementation */}
          {activeReport !== 'pengadaan' && activeReport !== 'pengeluaran' && activeReport !== 'persediaan' && activeReport !== 'mutasi' && activeReport !== 'kib_b' && activeReport !== 'semester' && (
            <motion.div key="other" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center text-slate-400">
              <p className="text-sm font-medium">Modul laporan ini sedang dalam pengembangan.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Manual Inventory Modal - Relocated to Root for Stability */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${editingItemId ? 'bg-amber-500' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-lg ${editingItemId ? 'shadow-amber-500/20' : 'shadow-blue-500/20'}`}>
                    {editingItemId ? <Edit3 size={24} /> : <Plus size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                      {editingItemId ? 'Edit Data Inventaris' : selectedBudget?.id === 'manual-inventory' ? 'Sisa Tahun Sebelumnya' : 'Input Manual Inventaris'}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      {selectedBudget?.id === 'manual-inventory' ? 'Input Manual Saldo Awal' : 'Data Anggaran SPJ Terealisasi'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsManualModalOpen(false); setSelectedBudget(null); }}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                {!selectedBudget ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Pilih Anggaran Belanja
                      </p>
                      <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full font-bold">
                        {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length} Item
                      </span>
                    </div>

                    <div className="space-y-2">
                      {budgets
                        .filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0)
                        .map(b => (
                          <button
                            key={b.id}
                            onClick={() => handleManualAdd(b)}
                            className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all group flex justify-between items-center"
                          >
                            <div className="flex-1 pr-4">
                              <p className="font-bold text-slate-800 text-sm mb-1">{b.description}</p>
                              <div className="flex gap-3 items-center text-[10px]">
                                <span className="text-slate-500 font-mono">{b.account_code}</span>
                                <span className="text-blue-600 font-black">{formatRupiah(b.amount)}</span>
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                                  {b.realizations?.length} SPJ
                                </span>
                              </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      {budgets.filter(b => b.type === 'belanja' && b.realizations && b.realizations.length > 0).length === 0 && (
                        <div className="py-20 text-center">
                          <p className="text-slate-400 font-bold italic text-sm">Belum ada data SPJ yang dapat dipilih.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitManualForm} className="space-y-6">
                    {/* Anggaran Info Banner */}
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Detail Anggaran</span>
                        <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded">{selectedBudget.account_code}</span>
                      </div>
                      <h4 className="text-base font-bold leading-tight">{selectedBudget.description}</h4>
                      <p className="text-sm font-black text-blue-200">{formatRupiah(selectedBudget.amount)}</p>
                      {selectedBudget.unit_price && (
                        <p className="text-[10px] text-emerald-400 font-bold">✓ Harga satuan SPJ: {formatRupiah(selectedBudget.unit_price)} / {selectedBudget.unit || 'unit'}</p>
                      )}
                    </div>

                    {/* ── KODE & SUB KEGIATAN ─────────────────────────── */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">Kode & Sub Kegiatan</p>
                          <p className="text-[10px] text-indigo-500 mt-0.5">Pilih dari database atau kelola daftar sub kegiatan</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSkDBModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                        >
                          <Database size={12} /> Kelola DB
                        </button>
                      </div>

                      {subKegiatanDB.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {subKegiatanDB.map(sk => (
                            <button
                              type="button"
                              key={sk.id}
                              onClick={() => handleSelectSk(sk)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all border text-xs ${selectedSkId === sk.id
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                  : 'bg-white border-indigo-100 hover:border-indigo-400 text-slate-700'
                                }`}
                            >
                              {selectedSkId === sk.id && <CheckCircle size={12} className="shrink-0" />}
                              <span className="font-mono font-black text-[10px] shrink-0">{sk.kode}</span>
                              <span className="font-medium truncate">{sk.nama}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-indigo-400 text-xs">
                          Belum ada data. Klik <strong>Kelola DB</strong> untuk menambahkan kode sub kegiatan.
                        </div>
                      )}

                      {/* Manual override kode dan nama */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-indigo-600 uppercase ml-1">Kode (manual)</label>
                          <input
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:border-indigo-500 outline-none"
                            placeholder="e.g. 1.01.01"
                            value={manualForm.subActivityCode || ''}
                            onChange={e => { setSelectedSkId(''); setManualForm({ ...manualForm, subActivityCode: e.target.value }); }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-indigo-600 uppercase ml-1">Nama Sub Kegiatan (manual)</label>
                          <input
                            className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none"
                            placeholder="Nama sub kegiatan"
                            value={manualForm.subActivityName || ''}
                            onChange={e => { setSelectedSkId(''); setManualForm({ ...manualForm, subActivityName: e.target.value }); }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── FIELD UTAMA ─────────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nama Barang</label>
                        <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all" value={manualForm.name || ''} onChange={e => setManualForm({ ...manualForm, name: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Spesifikasi</label>
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all" value={manualForm.spec || ''} onChange={e => setManualForm({ ...manualForm, spec: e.target.value })} placeholder="Merk, Ukuran, dll" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Kategori Persediaan</label>
                        <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer" value={manualForm.category || 'Lainnya'} onChange={e => {
                          const newCat = e.target.value;
                          setManualForm({ ...manualForm, category: newCat as any });
                          if (CATEGORY_SUB_MAP[newCat]) setCurrentSubCategory(CATEGORY_SUB_MAP[newCat][0]);
                          else setCurrentSubCategory('');
                        }}>
                          <option value="Bahan">Bahan</option>
                          <option value="Suku Cadang">Suku Cadang</option>
                          <option value="Alat Atau Bahan Untuk Kegiatan Kantor">Kegiatan Kantor</option>
                          <option value="Obat Obatan">Obat Obatan</option>
                          <option value="Natura dan Pakan">Natura & Pakan</option>
                          <option value="Lainnya">Lainnya (Umum)</option>
                        </select>
                      </div>

                      {manualForm.category && CATEGORY_SUB_MAP[manualForm.category] && (
                        <div className="md:col-span-2 space-y-1">
                          <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Sub Jenis : {manualForm.category}</label>
                          <select className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none transition-all cursor-pointer" value={currentSubCategory} onChange={e => setCurrentSubCategory(e.target.value)}>
                            {CATEGORY_SUB_MAP[manualForm.category].map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Jumlah & Satuan</label>
                        <div className="flex gap-2">
                          <input required type="number" className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={manualForm.quantity || ''} onChange={e => setManualForm({ ...manualForm, quantity: Number(e.target.value) })} />
                          <input required className="w-1/2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={manualForm.unit || ''} onChange={e => setManualForm({ ...manualForm, unit: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-emerald-600 uppercase ml-1 flex items-center gap-1">
                          <CheckCircle size={10} /> Harga Satuan (SPJ)
                        </label>
                        <input
                          required
                          type="number"
                          className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-sm font-black text-emerald-700 focus:border-emerald-500 outline-none transition-all"
                          value={manualForm.price || ''}
                          onChange={e => setManualForm({ ...manualForm, price: Number(e.target.value) })}
                        />
                        {manualForm.price && manualForm.price > 0 && (
                          <p className="text-[9px] text-emerald-600 ml-1 font-bold">{formatRupiah(manualForm.price as number)} / {manualForm.unit || 'unit'}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tanggal Perolehan</label>
                        <input type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" value={(manualForm.date || '').split('T')[0]} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} />
                      </div>

                      {/* ── NOMOR (BARU) ─────────────────────────── */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-amber-600 uppercase ml-1">No (Kuitansi/Faktur)</label>
                        <input className="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 text-sm font-bold font-mono focus:border-amber-500 outline-none transition-all" placeholder="Nomor dokumen" value={(manualForm as any).nomor || manualForm.docNumber || ''} onChange={e => setManualForm({ ...manualForm, nomor: e.target.value } as any)} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Rekening Belanja</label>
                        <input
                          readOnly={selectedBudget.id !== 'manual-inventory'}
                          className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold transition-all ${selectedBudget.id === 'manual-inventory' ? 'bg-white focus:border-blue-500 outline-none' : 'bg-slate-100 text-slate-500 cursor-not-allowed'}`}
                          value={manualForm.accountCode || ''}
                          onChange={e => setManualForm({ ...manualForm, accountCode: e.target.value })}
                        />
                      </div>
                      
                      {selectedBudget.id === 'manual-inventory' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Saldo Awal (Tahun Lalu)</label>
                          <input 
                            type="number" 
                            className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm font-black text-blue-700 focus:border-blue-500 outline-none transition-all" 
                            placeholder="0"
                            value={manualForm.lastYearBalance || ''} 
                            onChange={e => setManualForm({ ...manualForm, lastYearBalance: Number(e.target.value) })} 
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nama Penyedia</label>
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none" placeholder="Nama toko/vendor" value={manualForm.vendor || ''} onChange={e => setManualForm({ ...manualForm, vendor: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Bentuk Dokumen</label>
                        <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-blue-500 outline-none appearance-none" value={manualForm.contractType || 'Kuitansi'} onChange={e => setManualForm({ ...manualForm, contractType: e.target.value })}>
                          <option>Kuitansi</option>
                          <option>Faktur/Invoice</option>
                          <option>BAST</option>
                          <option>Nota</option>
                          <option>Kontrak</option>
                        </select>
                      </div>
                    </div>

                    {/* Preview Total */}
                    {(manualForm.quantity || 0) > 0 && (manualForm.price || 0) > 0 && (
                      <div className="bg-blue-600 text-white rounded-xl px-5 py-3 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest">Total Nilai Barang</span>
                        <span className="text-lg font-black">{formatRupiah(Number(manualForm.quantity) * Number(manualForm.price))}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedBudget(null)}
                        className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className={`flex-[2] py-3 px-6 rounded-xl ${saveStatus === 'success' ? 'bg-emerald-600' : 'bg-blue-600'} text-white font-black hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50`}
                      >
                        {isSaving ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : saveStatus === 'success' ? (
                          <CheckCircle size={18} />
                        ) : editingItemId ? (
                          <Edit3 size={18} />
                        ) : (
                          <ShoppingBag size={18} />
                        )}
                        {isSaving ? 'Menyimpan...' : saveStatus === 'success' ? 'Berhasil Simpan!' : editingItemId ? 'Simpan Perubahan' : 'Simpan Inventaris'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal - Relocated to Root for Stability */}
      <AnimatePresence>
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Catat Pengeluaran Barang</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Manajemen Stok Keluar
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsWithdrawalModalOpen(false); setSelectedInventoryItem(null); }}
                  className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                {!selectedInventoryItem ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Pilih Barang yang Keluar
                      </p>
                      <span className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded-full font-bold">
                        {combinedItems.length} Item
                      </span>
                    </div>
                    <div className="space-y-2">
                      {combinedItems.length === 0 ? (
                        <div className="py-20 text-center">
                          <p className="text-slate-400 font-bold italic text-sm">Belum ada barang masuk untuk dikeluarkan.</p>
                        </div>
                      ) : (
                        combinedItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setSelectedInventoryItem(item);
                              setWithdrawalForm({ ...withdrawalForm, quantity: item.quantity, docNumber: item.docNumber });
                            }}
                            className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-orange-500 hover:shadow-lg transition-all group flex justify-between items-center"
                          >
                            <div className="flex-1 pr-4">
                              <p className="font-bold text-slate-800 text-sm mb-1">{item.name}</p>
                              <div className="flex gap-3 items-center text-[10px]">
                                <span className="text-orange-600 font-black">STOK : {item.quantity} {item.unit}</span>
                                <span className="text-slate-400 italic truncate max-w-[200px]">{item.spec}</span>
                              </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submitWithdrawalForm} className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Detail Barang</span>
                        <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded uppercase tracking-tighter">{selectedInventoryItem.category}</span>
                      </div>
                      <h4 className="text-lg font-bold leading-tight">{selectedInventoryItem.name}</h4>
                      <p className="text-sm text-slate-300 italic">Spec: {selectedInventoryItem.spec}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Tanggal Keluar</label>
                        <input required type="date" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all" value={withdrawalForm.date} onChange={e => setWithdrawalForm({ ...withdrawalForm, date: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nomor Dokumen</label>
                        <input required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all font-mono" placeholder="No. BAST/Kuitansi" value={withdrawalForm.docNumber} onChange={e => setWithdrawalForm({ ...withdrawalForm, docNumber: e.target.value })} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Jumlah Keluar (STOK : {selectedInventoryItem.quantity} {selectedInventoryItem.unit})</label>
                        <input required type="number" max={selectedInventoryItem.quantity} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black text-orange-600 focus:border-orange-500 outline-none transition-all" value={withdrawalForm.quantity || ''} onChange={e => setWithdrawalForm({ ...withdrawalForm, quantity: Number(e.target.value) })} />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Keterangan / Peruntukan</label>
                        <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-orange-500 outline-none transition-all" placeholder="Misal: Untuk Kelas 6" value={withdrawalForm.notes} onChange={e => setWithdrawalForm({ ...withdrawalForm, notes: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedInventoryItem(null)}
                        className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className={`flex-[2] py-3 px-6 rounded-xl ${saveStatus === 'success' ? 'bg-emerald-600' : 'bg-orange-600'} text-white font-black hover:opacity-90 shadow-lg shadow-orange-500/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-50`}
                      >
                        {isSaving ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : saveStatus === 'success' ? (
                          <CheckCircle size={18} />
                        ) : (
                          <ArrowRightLeft size={18} />
                        )}
                        {isSaving ? 'Menyimpan...' : saveStatus === 'success' ? 'Berhasil Catat!' : 'Catat Pengeluaran'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Sub Kegiatan DB Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isSkDBModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Header */}
              <div className="px-7 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Database Kode Sub Kegiatan</h3>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Kelola daftar kode & nama sub kegiatan</p>
                  </div>
                </div>
                <button onClick={() => { setIsSkDBModalOpen(false); setSkEditId(null); setSkForm({ kode: '', nama: '' }); }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Form Tambah / Edit */}
              <div className="px-7 py-5 border-b border-slate-100 bg-indigo-50/50 shrink-0">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">
                  {skEditId ? '✏️ Edit Data' : '➕ Tambah Kode Baru'}
                </p>
                <div className="flex gap-3">
                  <div className="w-36 shrink-0">
                    <input
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold focus:border-indigo-500 outline-none"
                      placeholder="Kode (1.01.01)"
                      value={skForm.kode}
                      onChange={e => setSkForm({ ...skForm, kode: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-indigo-500 outline-none"
                      placeholder="Nama sub kegiatan..."
                      value={skForm.nama}
                      onChange={e => setSkForm({ ...skForm, nama: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdateSk())}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddOrUpdateSk}
                      disabled={!skForm.kode.trim() || !skForm.nama.trim() || isSkDBLoading}
                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap flex items-center gap-1.5"
                    >
                      {isSkDBLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                      {skEditId ? 'Update' : 'Simpan ke Supabase'}
                    </button>
                    {skEditId && (
                      <button
                        type="button"
                        onClick={() => { setSkEditId(null); setSkForm({ kode: '', nama: '' }); }}
                        className="px-4 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-300 transition-all"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Daftar */}
              <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
                {subKegiatanDB.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Database size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold">Belum ada data kode sub kegiatan.</p>
                    <p className="text-xs mt-1">Isi form di atas lalu klik Tambah.</p>
                  </div>
                ) : (
                  subKegiatanDB.map((sk, idx) => (
                    <motion.div
                      key={sk.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl border group transition-all ${skEditId === sk.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm'
                        }`}
                    >
                      <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 shrink-0 min-w-[70px] text-center">
                        {sk.kode}
                      </span>
                      <span className="flex-1 text-sm font-bold text-slate-700">{sk.nama}</span>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => { setSkEditId(sk.id); setSkForm({ kode: sk.kode, nama: sk.nama }); }}
                          className="p-1.5 hover:bg-indigo-100 text-indigo-500 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSk(sk.id)}
                          className="p-1.5 hover:bg-red-100 text-red-400 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                  {isSkDBLoading && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                  {subKegiatanDB.length} data tersimpan di Supabase
                </span>
                <button
                  type="button"
                  onClick={() => { setIsSkDBModalOpen(false); setSkEditId(null); setSkForm({ kode: '', nama: '' }); }}
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal Konfirmasi Hapus Semua ──────────────────────────────────── */}
      <AnimatePresence>
        {isDeleteAllOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isDeletingAll && setIsDeleteAllOpen(false)}
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Red danger header */}
              <div className="bg-gradient-to-br from-red-500 to-red-700 px-8 pt-8 pb-10 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
                <div className="relative">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                    <Trash2 size={28} className="text-white" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Hapus Semua Catatan?</h3>
                  <p className="text-red-100 text-sm mt-1 font-medium">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              {/* Pulled up card */}
              <div className="px-8 pb-8 -mt-4 relative">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-red-800 font-semibold text-center leading-relaxed">
                    Semua <span className="font-black">{manualInventoryItems.length} catatan stok opname</span> akan dihapus secara permanen dari Supabase dan perangkat ini.
                  </p>
                </div>

                <ul className="text-xs text-slate-500 space-y-2 mb-6 pl-1">
                  {[
                    'Semua item inventaris manual akan terhapus',
                    'Data yang sudah dihapus tidak bisa dikembalikan',
                    'Data pengeluaran barang tidak ikut terhapus',
                  ].map((txt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-[9px] font-black">!</span>
                      {txt}
                    </li>
                  ))}
                </ul>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteAllOpen(false)}
                    disabled={isDeletingAll}
                    className="flex-1 py-3 px-5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-40"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAllInventory}
                    disabled={isDeletingAll || manualInventoryItems.length === 0}
                    className="flex-[2] py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-lg shadow-red-500/30 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isDeletingAll ? (
                      <><Loader2 size={16} className="animate-spin" /> Menghapus...</>
                    ) : (
                      <><Trash2 size={16} /> Ya, Hapus Semua</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default InventoryReports;
