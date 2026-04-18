import React, { useMemo, Fragment } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Layers, Plus, Database, Edit3, Trash2 } from 'lucide-react';
import { InventoryItem } from '../../lib/gemini';
import { WithdrawalTransaction } from './InventoryTypes';

interface PengeluaranViewProps {
  withdrawalTransactions: WithdrawalTransaction[];
  combinedItems: InventoryItem[];
  schoolProfile: any;
  onRecordWithdrawal: () => void;
  onDeleteWithdrawal: (id: string) => void;
  onAddPreviousYear: () => void;
  onEditManual: (item: InventoryItem) => void;
  onDeleteManual: (id: string) => void;
  manualInventoryItems: InventoryItem[];
  groupedWithdrawalData: any[];
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

const PengeluaranView = React.memo(({
  withdrawalTransactions,
  combinedItems,
  schoolProfile,
  onRecordWithdrawal,
  onDeleteWithdrawal,
  onAddPreviousYear,
  onEditManual,
  onDeleteManual,
  manualInventoryItems,
  groupedWithdrawalData
}: PengeluaranViewProps) => {
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

      {manualInventoryItems.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 overflow-x-auto print:hidden">
          <div className="flex items-center gap-4 mb-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Database size={12} className="text-blue-500" /> Kelola Saldo Awal & Item Manual
            </p>
            <div className="h-[1px] flex-1 bg-slate-200"></div>
          </div>
          <div className="flex gap-3 pb-2 scrollbar-hide">
            {manualInventoryItems.map((item: any) => (
              <div key={item.id} className="min-w-[220px] max-w-[300px] bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <h5 className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight mb-3 group-hover:text-blue-600 transition-colors h-8">{item.name}</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-500">Jumlah:</span>
                      <span className="font-black text-slate-900">{item.lastYearBalance || 0} {item.unit}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-500">Nominal:</span>
                      <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {formatRupiah((item.lastYearBalance || 0) * (item.price || 0))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => onEditManual(item)} 
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={10} /> EDIT
                  </button>
                  <button 
                    onClick={() => onDeleteManual(item.id)} 
                    className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={10} /> HAPUS
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {groupedWithdrawalData.length === 0 ? (
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
              groupedWithdrawalData.map((group: any, docIdx: number) => (
                <Fragment key={group.docNumber || docIdx}>
                  {group.items.map((tx: any, txIdx: number) => {
                    const item = tx.item;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 group group-hover:bg-gray-50/80 transition-colors">
                        <td className="border border-gray-400 p-1.5 text-center">{txIdx === 0 ? docIdx + 1 : ''}</td>
                        <td className="border border-gray-400 p-1.5 text-center">{txIdx === 0 ? formatDate(group.date) : ''}</td>
                        <td className="border border-gray-400 p-1.5 text-center font-mono">{txIdx === 0 ? group.docNumber : ''}</td>
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

PengeluaranView.displayName = 'PengeluaranView';
export default PengeluaranView;
