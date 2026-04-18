import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Trash2, Plus, RefreshCw, Database, Loader2, Edit3 } from 'lucide-react';
import { InventoryItem } from '../../lib/gemini';

interface PengadaanViewProps {
  inventoryItems: InventoryItem[];
  combinedItems: InventoryItem[];
  groupedItems: Record<string, InventoryItem[]>;
  isAnalyzing: boolean;
  isSaving: boolean;
  onManualAdd: () => void;
  onEditManual: (item: InventoryItem) => void;
  onAnalyze: () => void;
  onSaveAllAI: () => void;
  onDeleteManual: (id: string) => void;
  onDeleteAll: () => void;
  schoolProfile: any;
}

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
}: PengadaanViewProps) => (
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

                const itemsByDoc: Record<string, InventoryItem[]> = {};
                items.forEach(it => {
                  const key = (it.docNumber || 'TANPA NOMOR').trim();
                  if (!itemsByDoc[key]) itemsByDoc[key] = [];
                  itemsByDoc[key].push(it);
                });

                return (
                  <Fragment key={category}>
                    <tr className="bg-slate-100/80 font-black">
                      <td colSpan={6} className="border border-gray-300 p-2.5 text-slate-800 uppercase text-[9px] tracking-widest">
                        {category}
                      </td>
                      <td className="border border-gray-300 p-2.5 text-right text-slate-900 text-[10px]">{formatRupiah(categoryTotal)}</td>
                      <td colSpan={8} className="border border-gray-300 p-2.5 bg-gray-50/20"></td>
                    </tr>

                    {Object.entries(itemsByDoc).map(([docKey, docItems]: [string, InventoryItem[]], docIdx) => (
                      <Fragment key={docKey}>
                        {docItems.map((item: InventoryItem, itemIdx: number) => (
                          <tr key={`${category}-${docKey}-${itemIdx}`} className="hover:bg-blue-50/40 group transition-colors">
                            <td className="border border-gray-300 p-2 text-center text-gray-500 font-medium">
                              {itemIdx === 0 ? docIdx + 1 : ''}
                            </td>
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
                            <td className="border border-gray-300 p-2 text-center text-[8px] font-bold text-slate-500">
                              {itemIdx === 0 ? formatDate(item.date) : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-[8px] font-medium">
                              {itemIdx === 0 ? (item.contractType || 'Kuitansi') : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-[8px] italic text-slate-500">
                              {itemIdx === 0 ? item.vendor : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center text-[8px] font-mono font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                              {itemIdx === 0 ? item.docNumber : ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {(item.id.startsWith('manual-') || !item.id.includes('-')) && (
                                  <>
                                    <button
                                      onClick={() => onEditManual(item)}
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

PengadaanView.displayName = 'PengadaanView';
export default PengadaanView;
