import React from 'react';
import { motion } from 'framer-motion';
import { InventoryItem } from '../../lib/gemini';

interface MutasiViewProps {
  mutationData: Record<string, { awal: number; tambah: number; kurang: number }>;
  schoolProfile: any;
  handleMutationOverride: (category: string, field: 'awal' | 'tambah' | 'kurang', value: number) => void;
  mutationOverrides: Record<string, { awal?: number; tambah?: number; kurang?: number }>;
  combinedItems: InventoryItem[];
}

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

const MutasiView = React.memo(({ mutationData, schoolProfile, handleMutationOverride, mutationOverrides, combinedItems }: MutasiViewProps) => {
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

            {Object.entries(mutationData).map(([cat, vals]: [string, any]) => {
              const overrides = mutationOverrides[cat] || {};
              const awal = overrides.awal ?? vals.awal;
              const tambah = overrides.tambah ?? vals.tambah;
              const kurang = overrides.kurang ?? vals.kurang;
              const akhir = awal + tambah - kurang;

              return (
                <tr key={cat} className="hover:bg-slate-50 transition-colors group">
                  <td className="border border-gray-400 p-1.5 text-center text-gray-400 italic"></td>
                  <td className="border border-gray-400 p-1.5 text-center font-mono text-gray-500">
                    {(combinedItems as any[]).find((i: any) => (i.category || '99 LAINNYA') === cat)?.codification?.split('.').slice(0, 4).join('.') || '1.1.7.xx'}
                  </td>
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

MutasiView.displayName = 'MutasiView';
export default MutasiView;
