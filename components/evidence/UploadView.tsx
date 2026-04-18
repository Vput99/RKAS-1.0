import React from 'react';
import { Search, Loader2, FileText, ShoppingCart, Sparkles, Receipt, CheckCircle2, Upload, AlertCircle, Trash2, Users } from 'lucide-react';
import { MONTHS } from '../../lib/evidenceRules';
import { formatCurrency } from '../../lib/pdfUtils';

interface UploadViewProps {
  dataSource: 'realization' | 'history';
  setDataSource: (v: 'realization' | 'history') => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  isLoading: boolean;
  filteredGroups: any[];
  selectedGroup: any;
  handleSelectGroup: (group: any) => void;
  handleProcessAi: (group: any, forceRefresh?: boolean) => void;
  isAiLoading: boolean;
  isAiConfigured: () => boolean;
  openPrintModal: (type: string, group?: any) => void;
  suggestedEvidence: string[];
  uploadProgress: Record<string, boolean>;
  handleFileUpload: (evidenceType: string, filesToUpload: File[]) => void;
  handleDeleteFile: (evidenceType: string, filePath: string) => void;
}

const UploadView: React.FC<UploadViewProps> = ({
  dataSource, setDataSource, searchTerm, setSearchTerm, isLoading, filteredGroups,
  selectedGroup, handleSelectGroup, handleProcessAi, isAiLoading, isAiConfigured,
  openPrintModal, suggestedEvidence, uploadProgress, handleFileUpload, handleDeleteFile
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Left Column: Transaction List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-900/5">
          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl mb-6 shadow-inner">
            <button
              onClick={() => setDataSource('history')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                dataSource === 'history' 
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              RIWAYAT SPJ (HISTORY)
            </button>
          </div>

          <div className="relative mb-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Cari transaksi..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                <p className="text-xs font-bold text-slate-400">Tidak ada transaksi ditemukan.</p>
              </div>
            ) : (
              Object.entries(
                filteredGroups.reduce((acc: any, group: any) => {
                  const monthName = MONTHS[group.month - 1] || `Bulan ${group.month}`;
                  if (!acc[monthName]) acc[monthName] = [];
                  acc[monthName].push(group);
                  return acc;
                }, {} as Record<string, any[]>)
              ).map(([monthName, groups]: any) => (
                <div key={monthName} className="mb-4 last:mb-0">
                  <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md px-4 py-2 border border-slate-100/50 mb-3 rounded-xl flex items-center justify-between shadow-sm">
                    <span className="text-xs font-black text-slate-700 tracking-wider uppercase">{monthName}</span>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{groups.length} Transaksi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {groups.map((group: any) => (
                      <button
                        key={group.key}
                        onClick={() => handleSelectGroup(group)}
                        className={`w-full text-left p-4 rounded-[1.5rem] border transition-all duration-300 group ${
                          selectedGroup?.key === group.key
                            ? 'border-blue-200 bg-white shadow-xl shadow-blue-900/10 scale-[1.02]'
                            : 'border-transparent hover:bg-white/60 hover:border-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${selectedGroup?.key === group.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  {group.vendor}
                                </span>
                                {(group.vendor.toLowerCase().includes('siplah') || group.items.some((i: any) => i.budgetDescription.toLowerCase().includes('siplah'))) && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-emerald-200">SIPLah</span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(group.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • Bulan {MONTHS[group.month - 1]}
                              </span>
                          </div>
                          {selectedGroup?.key === group.key && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </div>
                        <div className={`text-xs font-black text-slate-800 leading-snug line-clamp-2 ${selectedGroup?.key === group.key ? '' : 'text-slate-600'}`}>
                          {group.items.map((i: any) => i.budgetDescription).join(', ')}
                        </div>
                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/50">
                          <span className="text-[10px] font-black text-indigo-600">
                            {formatCurrency(group.totalAmount)}
                          </span>
                          <div className="flex items-center gap-1.5">
                             <FileText size={10} className="text-slate-300" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{group.items.length} Item</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Evidence Interface */}
      <div className="lg:col-span-8">
        {selectedGroup ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-blue-900/5 overflow-hidden min-h-[600px] animate-in slide-in-from-right-8 duration-700">
            <div className="bg-slate-50/80 backdrop-blur-md px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2.5 bg-white rounded-xl shadow-lg shadow-blue-900/5 text-blue-600">
                      <ShoppingCart size={20} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedGroup.vendor}</h3>
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  Transaksi <span className="text-slate-800 underline decoration-blue-500/30 underline-offset-4">{new Date(selectedGroup.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span> • {selectedGroup.items.length} Item terdeteksi
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleProcessAi(selectedGroup, true)}
                  disabled={isAiLoading}
                  className="group flex items-center gap-3 px-6 py-3 bg-white text-blue-600 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-xl shadow-blue-900/5 disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                  Analisis via AI
                </button>
              </div>
            </div>

            <div className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
                            <Receipt size={14} /> Detail Belanja
                        </h4>
                        <span className="text-xl font-black">
                            {formatCurrency(selectedGroup.totalAmount)}
                        </span>
                    </div>
                    <div className="space-y-3">
                      {selectedGroup.items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] font-bold opacity-90">
                            <span className="truncate max-w-[180px]">{item.budgetDescription}</span>
                            <span className="font-mono whitespace-nowrap bg-white/10 px-2 py-0.5 rounded">{formatCurrency(item.amount).replace('Rp', '')}</span>
                        </div>
                      ))}
                      {selectedGroup.items.length > 3 && (
                        <p className="text-[9px] font-black opacity-60 text-center pt-2 uppercase tracking-widest">+ {selectedGroup.items.length - 3} Item Lainnya</p>
                      )}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mb-16 group-hover:scale-150 transition-transform duration-1000"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                         <Sparkles size={14} className="text-indigo-400" /> Generator Dokumen
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => openPrintModal('kuitansi', selectedGroup)} className="p-4 bg-slate-800/50 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded-2xl transition-all duration-300 group/btn flex flex-col items-center gap-2">
                          <Receipt size={20} className="text-blue-400 group-hover/btn:text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Kuitansi</span>
                       </button>
                       <button onClick={() => openPrintModal('daftar_hadir', selectedGroup)} className="p-4 bg-slate-800/50 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-2xl transition-all duration-300 group/btn flex flex-col items-center gap-2">
                          <Users size={20} className="text-indigo-400 group-hover/btn:text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Absensi</span>
                       </button>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-6 font-bold uppercase tracking-widest text-center">Data SPJ akan diinject otomatis</p>
                </div>
              </div>

              <div className="mb-10 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100/50 relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles size={120} className="text-amber-600" /></div>
                <div className="p-5 bg-white rounded-3xl shadow-xl shadow-amber-900/5 text-amber-500 border border-amber-50"><CheckCircle2 size={32} /></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-black text-amber-900 tracking-tight">Requirement Audit Digital 2026</h4>
                        {!isAiConfigured() && ( <span className="text-[8px] font-black bg-amber-200/50 text-amber-700 px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-200">Local Rules</span> )}
                    </div>
                    <p className="text-[11px] font-bold text-amber-700 opacity-80 leading-relaxed max-w-2xl">
                      {isAiConfigured() ? "AI telah memetakan standar dokumen pendukung berdasarkan Juknis BOSP terbaru..." : "Sistem Smart-Rules telah otomatis menentukan daftar kelengkapan bukti fisik..."}
                    </p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-4">Daftar Berkas Wajib</p>
                {suggestedEvidence.map((evidence, idx) => {
                  const files = (selectedGroup.evidence_files || []).filter((f: any) => f.type === evidence);
                  const isUploading = uploadProgress[evidence];
                  return (
                    <div key={idx} className="group p-6 rounded-[2rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all duration-500">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          <div className={`p-4 rounded-2xl transition-all duration-500 ${files.length > 0 ? 'bg-emerald-50 text-emerald-600 shadow-xl shadow-emerald-900/5 rotate-6' : 'bg-white text-slate-300 border border-slate-50'}`}>
                            {files.length > 0 ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                          </div>
                          <div>
                            <div className="text-base font-black text-slate-800 tracking-tight mb-1">{evidence}</div>
                            <div className="flex items-center gap-3">
                              {files.length > 0 ? ( <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle2 size={12}/> {files.length} Arsip Tersimpan</span> ) : ( <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5"><AlertCircle size={12}/> Belum Ada Berkas</span> )}
                            </div>
                          </div>
                        </div>
                        <label className={`relative overflow-hidden group/btn px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all duration-500 w-full md:w-auto text-center ${isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/30'}`}>
                          {isUploading ? <div className="flex items-center justify-center gap-3"><Loader2 size={16} className="animate-spin" /> Proses...</div> : <div className="flex items-center justify-center gap-3"><Upload size={16} className="group-hover/btn:-translate-y-1 transition-transform" /> Unggah Bukti</div> }
                          <input type="file" className="hidden" accept="image/*,application/pdf" multiple disabled={isUploading} onChange={(e) => { if (e.target.files?.length) handleFileUpload(evidence, Array.from(e.target.files).slice(0, 12)); }} />
                        </label>
                      </div>
                      {files.length > 0 && (
                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-0 md:pl-20">
                          {files.map((file: any, fIdx: number) => (
                            <div key={fIdx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group/file hover:border-blue-200 transition-all shadow-sm">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-slate-50 rounded-lg text-blue-500 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors"><FileText size={16}/></div>
                                <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                <button onClick={() => handleDeleteFile(evidence, file.path)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14}/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center h-full min-h-[600px] group transition-all duration-700 hover:bg-white/60 hover:border-blue-200">
            <div className="relative mb-10">
               <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-10 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/5 group-hover:rotate-12 transition-transform duration-500">
                  <div className="p-6 bg-blue-50 rounded-[2rem] text-blue-500"><Upload size={56}/></div>
               </div>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Mulai Pengarsipan <span className="text-blue-600">Digital</span></h3>
            <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed mb-12">Pilih transaksi SPJ di panel samping untuk memverifikasi dan mengunggah bukti fisik yang dibutuhkan audit.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {[
                { step: 1, title: 'Input Data', desc: 'Pilih realisasi belanja aktif', icon: Search },
                { step: 2, title: 'Verifikasi AI', desc: 'Sistem cek kelengkapan dokumen', icon: Sparkles },
                { step: 3, title: 'Finalisasi', desc: 'Upload berkas digital aman', icon: CheckCircle2 }
              ].map((s, i) => (
                <div key={i} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 group/card">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-500 font-black"><s.icon size={20}/></div>
                  <div className="text-[10px] text-blue-600 uppercase tracking-widest font-black mb-2">Step {s.step}</div>
                  <div className="text-base font-black text-slate-800 mb-2">{s.title}</div>
                  <div className="text-[11px] font-semibold text-slate-400 leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadView;
