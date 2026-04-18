import { motion, Variants } from 'framer-motion';
import { Calendar, Search, Users, List, Archive, CheckSquare, Square, Calculator, Printer } from 'lucide-react';
import { MONTHS } from './WithdrawalTypes';
import { formatRupiah } from './WithdrawalUtils';

interface RincianTabProps {
    startMonth: number;
    setStartMonth: (m: number) => void;
    endMonth: number;
    setEndMonth: (m: number) => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    accountCodeFilter: string;
    setAccountCodeFilter: (f: string) => void;
    isGroupingEnabled: boolean;
    setIsGroupingEnabled: (e: boolean) => void;
    selectedBudgetIds: string[];
    toggleSelectAll: () => void;
    isAllSelected: boolean;
    filteredRealizations: any[];
    toggleSelection: (id: string) => void;
    recipientDetails: any;
    handleRecipientChange: (id: string, field: string, value: string | number) => void;
    setIsTaxModalOpen: (open: boolean) => void;
    bulkName: string;
    setBulkName: (v: string) => void;
    bulkAccount: string;
    setBulkAccount: (v: string) => void;
    handleArchiveData: () => void;
    setIsPreviewOpen: (open: boolean) => void;
    handlePrintAndArchive: () => void;
    totalSelectedAmount: number;
    isSaving: boolean;
}

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const RincianTab = ({
    startMonth, setStartMonth, endMonth, setEndMonth,
    searchTerm, setSearchTerm, accountCodeFilter, setAccountCodeFilter,
    isGroupingEnabled, setIsGroupingEnabled,
    selectedBudgetIds, toggleSelectAll, isAllSelected,
    filteredRealizations, toggleSelection,
    recipientDetails, handleRecipientChange, setIsTaxModalOpen,
    bulkName, setBulkName, bulkAccount, setBulkAccount,
    handleArchiveData, setIsPreviewOpen, handlePrintAndArchive,
    totalSelectedAmount, isSaving
}: RincianTabProps) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center gap-4 mb-6">
                <button
                    onClick={handleArchiveData}
                    disabled={isSaving}
                    className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center gap-3 shadow-sm active:scale-95"
                >
                    <Archive size={16} /> Simpan Draft
                </button>
                <button
                    onClick={() => setIsPreviewOpen(true)}
                    disabled={selectedBudgetIds.length === 0}
                    className="flex items-center gap-3 px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-30"
                >
                    <Search size={16} />
                    Preview
                </button>
                <button
                    onClick={handlePrintAndArchive}
                    disabled={totalSelectedAmount === 0 || isSaving}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 flex items-center gap-3 hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                >
                    <Printer size={16} /> Cetak & Arsipkan
                </button>
            </div>

            <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex flex-col lg:flex-row items-center gap-6 p-6 mt-6 bg-white/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all">
                    <div className="flex-shrink-0">
                        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/50 border border-slate-200/60 rounded-[1.5rem] shadow-sm">
                            <Calendar size={16} className="text-indigo-500" />
                            <div className="flex items-center gap-2">
                                <select className="bg-transparent outline-none font-bold text-xs text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors appearance-none" value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
                                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                                <span className="text-slate-300 font-medium">→</span>
                                <select className="bg-transparent outline-none font-bold text-xs text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors appearance-none" value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))}>
                                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-1 items-center gap-4 w-full">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-12 pr-6 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-medium"
                                placeholder="Cari Uraian Transaksi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative w-1/4 min-w-[150px]">
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm font-mono font-bold text-slate-700 placeholder:text-slate-400 placeholder:font-sans placeholder:font-medium text-center"
                                placeholder="Kode Rek."
                                value={accountCodeFilter}
                                onChange={(e) => setAccountCodeFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <button
                            onClick={() => setIsGroupingEnabled(!isGroupingEnabled)}
                            className={`group flex items-center gap-3 px-6 py-4 rounded-[1.5rem] text-[10px] uppercase tracking-[0.2em] font-black transition-all duration-300 active:scale-95 ${isGroupingEnabled
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10'
                                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-200'
                                }`}
                        >
                            {isGroupingEnabled ? <Users size={16} /> : <List size={16} />}
                            <span>{isGroupingEnabled ? 'Mode Gabungan' : 'Mode Terpisah'}</span>
                        </button>
                    </div>
                </div>

                {isGroupingEnabled && selectedBudgetIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-sm"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-600 rounded-xl text-white"><Users size={16} /></div>
                            <div>
                                <h4 className="font-bold text-sm text-blue-900">Penerima Gabungan</h4>
                                <p className="text-[10px] text-blue-600">{selectedBudgetIds.length} item dicentang → akan digabung menjadi 1 transaksi</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">Nama Toko / Penerima</label>
                                <input type="text" className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/15 text-sm font-semibold text-slate-800 shadow-sm transition-all focus:border-blue-400 placeholder:text-slate-400 placeholder:font-normal" placeholder="Contoh: Toko Makmur Sejahtera" value={bulkName} onChange={e => setBulkName(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 block">No. Rekening Penerima</label>
                                <input type="text" className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/15 text-sm font-mono font-bold text-slate-800 shadow-sm transition-all focus:border-blue-400 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal" placeholder="Contoh: 1234567890" value={bulkAccount} onChange={e => setBulkAccount(e.target.value)} />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="glass-panel rounded-[2.5rem] border border-white/60 shadow-2xl shadow-slate-200/40 relative max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-600 border-collapse">
                        <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-100 uppercase tracking-[0.2em] text-[10px] text-slate-400 font-black">
                            <tr>
                                <th className="p-5 w-14 text-center">
                                    <button onClick={toggleSelectAll} className="hover:text-indigo-600 transition-all active:scale-90">
                                        {isAllSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-300" />}
                                    </button>
                                </th>
                                <th className="p-5">Uraian Transaksi</th>
                                {!isGroupingEnabled && (
                                    <>
                                        <th className="p-5">Penerima</th>
                                        <th className="p-5">No. Rekening</th>
                                    </>
                                )}
                                <th className="p-5 text-center">Pajak</th>
                                <th className="p-5 text-right">Nominal SPJ</th>
                                <th className="p-5 text-right w-40 bg-indigo-50/30">Total Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60 bg-white/40">
                            {filteredRealizations.length === 0 ? (
                                <tr><td colSpan={isGroupingEnabled ? 5 : 7} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Archive size={48} />
                                        <p className="font-bold tracking-widest uppercase text-xs">Data tidak ditemukan</p>
                                    </div>
                                </td></tr>
                            ) : (
                                filteredRealizations.map((item) => {
                                    const detail = recipientDetails[item.id] || { name: '', account: '', ppn: 0, pph21: 0, pph22: 0, pph23: 0, pajakDaerah: 0 };
                                    const totalPot = detail.ppn + detail.pph21 + detail.pph22 + detail.pph23 + detail.pajakDaerah;
                                    const isSel = selectedBudgetIds.includes(item.id);
                                    return (
                                        <motion.tr
                                            key={item.id}
                                            whileHover={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                                            className={`transition-all duration-200 ${isSel ? 'bg-indigo-50/40' : ''}`}
                                        >
                                            <td className="p-5 text-center cursor-pointer" onClick={() => toggleSelection(item.id)}>
                                                <div className="flex justify-center">
                                                    {isSel ? (
                                                        <div className="w-5 h-5 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                                            <CheckSquare size={14} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 border-2 border-slate-200 rounded-lg group-hover:border-indigo-300 transition-colors" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 cursor-pointer group" onClick={() => toggleSelection(item.id)}>
                                                <div className={`font-bold transition-colors ${isSel ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-600'}`}>{item.description}</div>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono font-bold tracking-tight">{item.account_code}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium italic">{new Date(item.date).toLocaleDateString('id', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            </td>
                                            {!isGroupingEnabled && (
                                                <>
                                                    <td className="p-4">
                                                        {isSel ? (
                                                            <input
                                                                type="text"
                                                                className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-400"
                                                                value={detail.name}
                                                                onChange={(e) => handleRecipientChange(item.id, 'name', e.target.value)}
                                                                placeholder="Nama Toko"
                                                            />
                                                        ) : <span className="text-slate-300 font-medium text-xs">—</span>}
                                                    </td>
                                                    <td className="p-4">
                                                        {isSel ? (
                                                            <input
                                                                type="text"
                                                                className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-2 text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 font-mono font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-400"
                                                                value={detail.account}
                                                                onChange={(e) => handleRecipientChange(item.id, 'account', e.target.value)}
                                                                placeholder="No. Rekening"
                                                            />
                                                        ) : <span className="text-slate-300 font-medium text-xs">—</span>}
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-5 text-center">
                                                {isSel ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsTaxModalOpen(true); }}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight transition-all active:scale-95 flex items-center gap-2 mx-auto ${totalPot > 0
                                                            ? 'bg-amber-100 text-amber-700 shadow-sm hover:bg-amber-200'
                                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <Calculator size={12} />
                                                        {totalPot > 0 ? formatRupiah(totalPot) : 'Atur Pajak'}
                                                    </button>
                                                ) : (
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full mx-auto" />
                                                )}
                                            </td>
                                            <td className="p-5 text-right font-mono font-bold text-slate-500 text-xs">
                                                {formatRupiah(item.amount)}
                                            </td>
                                            <td className={`p-5 text-right font-mono font-black text-xs transition-colors ${isSel ? 'text-indigo-600 bg-indigo-50/20' : 'text-slate-800'}`}>
                                                {formatRupiah(item.amount - totalPot)}
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default RincianTab;
