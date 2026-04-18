import React from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
};

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

  const TH = ({ children, className = '', ...props }: any) => (
    <th className={`border border-gray-400 p-0.5 text-center text-[8px] font-bold leading-tight ${className}`} {...props}>{children}</th>
  );
  const AM = 'bg-amber-50 text-amber-800';

  return (
    <motion.div key="kib_b" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4">
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
              <tr className="bg-gray-100 text-gray-700 text-center">
                <TH className={`w-8 ${AM}`}>Jml<br/>Pembel-<br/>ian</TH>
                <TH className={`w-12 ${AM}`}>Cara<br/>Pembel-<br/>ian</TH>
                <TH className={`w-16 ${AM}`}>Harga<br/>Perolehan</TH>
                <TH className={`w-12 ${AM}`}>Dari</TH>
              </tr>
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

export default KibBView;
