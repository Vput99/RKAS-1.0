import React from 'react';
import { Printer, Download } from 'lucide-react';

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

ReportHeader.displayName = 'ReportHeader';
export default ReportHeader;
