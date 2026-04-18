import { Printer } from 'lucide-react';
import { formatRupiah } from './WithdrawalUtils';

interface SuratKuasaTabProps {
    totalAmount: number;
    selectedCount: number;
    suratNo: string;
    setSuratNo: (s: string) => void;
    ksName: string;
    setKsName: (s: string) => void;
    ksNip: string;
    setKsNip: (s: string) => void;
    trName: string;
    setTrName: (s: string) => void;
    trNip: string;
    setTrNip: (s: string) => void;
    onDownload: () => void;
}

const SuratKuasaTab = ({
    totalAmount, selectedCount, suratNo, setSuratNo,
    ksName, setKsName, ksNip, setKsNip,
    trName, setTrName, trNip, setTrNip,
    onDownload
}: SuratKuasaTabProps) => {
    return (
        <div className="space-y-6">
            <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center border border-amber-100">
                <div>
                    <p className="text-[10px] font-black tracking-widest text-amber-600 uppercase">Akan Dicairkan</p>
                    <p className="font-mono font-bold text-amber-900">{formatRupiah(totalAmount)} ({selectedCount} item)</p>
                </div>
            </div>
            <div className="space-y-4">
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm bg-white" placeholder="Nomor Surat" value={suratNo} onChange={e => setSuratNo(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pihak 1 (KS)</p>
                        <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={ksName} onChange={e => setKsName(e.target.value)} />
                        <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={ksNip} onChange={e => setKsNip(e.target.value)} />
                    </div>
                    <div className="space-y-2 p-4 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pihak 2 (Bendahara)</p>
                        <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={trName} onChange={e => setTrName(e.target.value)} />
                        <input type="text" className="w-full px-3 py-2 text-xs rounded border border-slate-200" value={trNip} onChange={e => setTrNip(e.target.value)} />
                    </div>
                </div>
            </div>
            <button onClick={onDownload} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg">
                <Printer size={18} /> Download Surat Kuasa PDF
            </button>
        </div>
    );
};

export default SuratKuasaTab;
