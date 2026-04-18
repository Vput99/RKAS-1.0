import { Printer } from 'lucide-react';
import { formatRupiah } from './WithdrawalUtils';

interface PemindahbukuanTabProps {
    totalAmount: number;
    selectedCount: number;
    onDownload: () => void;
}

const PemindahbukuanTab = ({ totalAmount, selectedCount, onDownload }: PemindahbukuanTabProps) => {
    return (
        <div className="space-y-6">
            <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center border border-amber-100">
                <div>
                    <p className="text-[10px] font-black tracking-widest text-amber-600 uppercase">Akan Dicairkan</p>
                    <p className="font-mono font-bold text-amber-900">{formatRupiah(totalAmount)} ({selectedCount} item)</p>
                </div>
            </div>
            <p className="text-sm text-slate-500 italic px-2">Dokumen ini akan di-generate otomatis menggunakan data profil sekolah dan nomor surat yang telah diatur.</p>
            <button onClick={onDownload} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg">
                <Printer size={18} /> Download Surat Pemindahbukuan PDF
            </button>
        </div>
    );
};

export default PemindahbukuanTab;
