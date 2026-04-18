import React, { Fragment } from 'react';
import { motion } from 'framer-motion';
import { InventoryItem } from '../../lib/gemini';

interface PersediaanViewProps {
  combinedItems: InventoryItem[];
  getItemStats: (item: InventoryItem) => any;
  schoolProfile: any;
  handleOverride: (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number) => void;
  groupedItems: Record<string, InventoryItem[]>;
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

const PersediaanView = React.memo(({ combinedItems, getItemStats, schoolProfile, handleOverride, groupedItems }: PersediaanViewProps) => {

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

            {Object.entries(groupedItems).map(([catName, items]: [string, any]) => {
              const groupCode = items[0]?.codification?.split('.').slice(0, 5).join('.') || '1.1.7.xx.xx';
              const displayName = catName.includes(' - ') ? catName.split(' - ')[1] : catName;

              return (
                <Fragment key={catName}>
                  <tr className="font-bold text-gray-700 bg-gray-50/40">
                    <td className="border border-gray-400 p-1.5 text-center"></td>
                    <td className="border border-gray-400 p-1.5 text-center font-mono text-blue-700">{groupCode}</td>
                    <td colSpan={11} className="border border-gray-400 p-1.5 uppercase text-blue-900">{displayName}</td>
                  </tr>
                  {items.map((item: any) => {
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
            );
          })}

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

PersediaanView.displayName = 'PersediaanView';
export default PersediaanView;
