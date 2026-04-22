import React from 'react';
import { Search, Loader2, FileText, ShoppingCart, Sparkles, Receipt, CheckCircle2, Upload, Trash2, Users } from 'lucide-react';
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
  selectedGroup, handleSelectGroup, handleProcessAi, isAiLoading,
  openPrintModal, suggestedEvidence, uploadProgress, handleFileUpload, handleDeleteFile
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
      {/* Left Column: Transaction List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="glass-card p-5 lg:p-6 rounded-[2rem] lg:rounded-[2.5rem] border border-white/80 shadow-2xl shadow-teal-900/5">
          <div className="flex bg-slate-100/50 p-1.5 rounded-2xl mb-6 shadow-inner">
            <button
               onClick={() => setDataSource('history')}
               className={`flex-1 py-3 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                 dataSource === 'history' 
                   ? 'bg-white text-teal-600 shadow-lg shadow-teal-500/10' 
                   : 'text-slate-500 hover:text-slate-800'
               }`}
            >
              RIWAYAT SPJ (HISTORY)
            </button>
          </div>

          <div className="relative mb-6 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Cari transaksi..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500/50 outline-none text-[13px] font-bold text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4 max-h-[500px] lg:max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin text-teal-600 mx-auto mb-4" size={24} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30 font-sans">
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
                <div key={monthName} className="mb-8 last:mb-0">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{monthName}</span>
                    <span className="h-px bg-slate-100 flex-1 mx-4"></span>
                    <span className="text-[10px] font-black text-teal-500 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">{groups.length}</span>
                  </div>
                  <div className="space-y-3">
                    {groups.map((group: any) => (
                      <button
                        key={group.key}
                        onClick={() => handleSelectGroup(group)}
                        className={`w-full text-left p-4 lg:p-5 rounded-2xl border-2 transition-all duration-500 group ${
                          selectedGroup?.key === group.key
                            ? 'border-teal-500 bg-white shadow-xl shadow-teal-900/10 scale-[1.02]'
                            : 'border-transparent bg-slate-50/50 hover:bg-white hover:border-slate-100'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                             <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${selectedGroup?.key === group.key ? 'bg-teal-600 text-white' : 'bg-white text-slate-400 shadow-sm border border-slate-100'}`}>
                               {group.vendor}
                             </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 font-sans">
                             {new Date(group.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className={`text-[13px] font-black leading-snug line-clamp-2 ${selectedGroup?.key === group.key ? 'text-slate-900' : 'text-slate-600'}`}>
                          {group.items.map((i: any) => i.budgetDescription).join(', ')}
                        </div>
                        <div className="mt-4 flex items-center justify-between opacity-90 border-t border-slate-100 pt-3 mt-4">
                           <span className="text-[11px] font-black text-teal-600 font-sans tracking-tight">
                             {formatCurrency(group.totalAmount)}
                           </span>
                           <div className="flex items-center gap-2">
                              <FileText size={12} className="text-slate-300" />
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{group.items.length} Item</span>
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
          <div className="glass-card rounded-[2rem] lg:rounded-[3rem] border border-white shadow-2xl shadow-teal-900/5 overflow-hidden min-h-[600px] lg:min-h-[650px] animate-in slide-in-from-right-8 duration-700">
            <div className="bg-teal-50/20 backdrop-blur-md px-6 lg:px-12 py-8 lg:py-12 border-b border-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white rounded-2xl lg:rounded-3xl shadow-xl shadow-teal-900/5 text-teal-600 flex items-center justify-center border border-teal-50/50 shrink-0">
                   <ShoppingCart size={32} />
                </div>
                <div>
                   <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none mb-3">{selectedGroup.vendor}</h3>
                   <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1.5 bg-white/80 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 font-sans">{new Date(selectedGroup.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20">{selectedGroup.items.length} Item Terdeteksi</span>
                   </div>
                </div>
              </div>
              <button 
                onClick={() => handleProcessAi(selectedGroup, true)}
                disabled={isAiLoading}
                className="group w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 btn-primary-glass border-none text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-2xl shadow-teal-500/30 disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />}
                Pindai Kebutuhan Audit
              </button>
            </div>

            <div className="p-6 lg:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="btn-primary-glass p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] text-white shadow-2xl shadow-teal-500/20 relative overflow-hidden group border-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                    <div className="flex justify-between items-start mb-8 border-b border-white/20 pb-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-teal-100 flex items-center gap-2 font-sans">
                            <Receipt size={14} /> Total Transaksi
                        </h4>
                        <span className="text-xl lg:text-3xl font-black font-sans tracking-tight">
                            {formatCurrency(selectedGroup.totalAmount)}
                        </span>
                    </div>
                    <div className="space-y-3.5">
                      {selectedGroup.items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] font-black text-white/90">
                            <span className="truncate max-w-[150px] lg:max-w-[200px]">{item.budgetDescription}</span>
                            <span className="font-mono bg-white/20 px-2.5 py-1 rounded shadow-inner whitespace-nowrap">{formatCurrency(item.amount).replace('Rp', '')}</span>
                        </div>
                      ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mb-16 group-hover:scale-150 transition-transform duration-1000"></div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2 font-sans">
                         <Sparkles size={14} className="text-teal-400" /> Generator SPJ
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => openPrintModal('kuitansi', selectedGroup)} className="p-5 lg:p-7 bg-slate-800/80 hover:bg-teal-600 border border-slate-700 hover:border-teal-500 rounded-22 transition-all duration-500 group/btn flex flex-col items-center gap-2.5">
                          <Receipt size={24} className="text-teal-400 group-hover/btn:text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/btn:text-white">Cetak Kuitansi</span>
                       </button>
                       <button onClick={() => openPrintModal('daftar_hadir', selectedGroup)} className="p-5 lg:p-7 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl transition-all duration-500 group/btn flex flex-col items-center gap-2.5">
                          <Users size={24} className="text-slate-500 group-hover/btn:text-white" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/btn:text-white">Cetak Absensi</span>
                       </button>
                    </div>
                </div>
              </div>

              <div className="space-y-6 lg:space-y-8">
                <div className="flex items-center justify-between mb-8 px-2 overflow-hidden">
                    <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Audit Requirements</p>
                    <div className="h-px bg-slate-100 flex-1 mx-6 hidden sm:block"></div>
                    <Sparkles size={16} className="text-teal-500 animate-pulse shrink-0" />
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {suggestedEvidence.map((evidence, idx) => {
                    const files = (selectedGroup.evidence_files || []).filter((f: any) => f.type === evidence);
                    const isUploading = uploadProgress[evidence];
                    return (
                      <div key={idx} className="group p-6 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 bg-slate-50/20 hover:bg-white hover:shadow-2xl hover:shadow-teal-900/5 hover:border-teal-100 transition-all duration-700">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transition-all duration-700 shrink-0 ${files.length > 0 ? 'bg-emerald-50 text-emerald-600 shadow-inner' : 'bg-white text-slate-200 border border-slate-50 shadow-sm'}`}>
                              {files.length > 0 ? <CheckCircle2 size={32} /> : <FileText size={32} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-base lg:text-lg font-black text-slate-800 tracking-tight mb-1.5 truncate">{evidence}</div>
                              <div className="flex items-center gap-2">
                                {files.length > 0 ? ( 
                                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-3 py-1 rounded-lg border border-emerald-100">{files.length} Berkas Tersimpan</span> 
                                ) : ( 
                                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-50">Belum Ada Bukti</span> 
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <label className={`relative overflow-hidden group/btn px-8 lg:px-12 py-5 lg:py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all duration-700 w-full xl:w-auto text-center ${isUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'btn-primary-glass border-none text-white hover:scale-105 active:scale-95'}`}>
                            {isUploading ? <div className="flex items-center justify-center gap-3"><Loader2 size={18} className="animate-spin" /> Proses...</div> : <div className="flex items-center justify-center gap-3"><Upload size={20} className="group-hover/btn:-translate-y-1 transition-transform" /> Unggah Digital</div> }
                            <input type="file" className="hidden" accept="image/*,application/pdf" multiple disabled={isUploading} onChange={(e) => { if (e.target.files?.length) handleFileUpload(evidence, Array.from(e.target.files).slice(0, 12)); }} />
                          </label>
                        </div>

                        {files.length > 0 && (
                          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:pl-20">
                            {files.map((file: any, fIdx: number) => (
                              <div key={fIdx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group/file hover:border-teal-200 transition-all shadow-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 bg-slate-50 rounded-lg text-teal-500 group-hover/file:bg-teal-600 group-hover/file:text-white transition-colors"><FileText size={16}/></div>
                                  <span className="text-[10px] font-bold text-slate-600 truncate font-sans">{file.name}</span>
                                </div>
                                <button onClick={() => handleDeleteFile(evidence, file.path)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0"><Trash2 size={16}/></button>
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
          </div>
        ) : (
          <div className="glass-card rounded-[3rem] lg:rounded-[4rem] border-2 border-dashed border-teal-200/50 flex flex-col items-center justify-center p-8 lg:p-20 text-center h-full min-h-[500px] lg:min-h-[650px] group transition-all duration-700 hover:bg-white/60 hover:border-teal-300">
            <div className="relative mb-12">
               <div className="absolute inset-0 bg-teal-500 rounded-full blur-3xl opacity-10 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative w-32 h-32 lg:w-40 lg:h-40 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-teal-900/10 group-hover:rotate-12 transition-transform duration-500">
                  <div className="p-8 bg-teal-50 rounded-[2.5rem] text-teal-500"><Upload size={48} /></div>
               </div>
            </div>
            <h3 className="text-2xl lg:text-4xl font-black text-slate-800 mb-4 tracking-tighter leading-none">Mulai Audit <span className="text-teal-600">Digital</span></h3>
            <p className="text-sm lg:text-base font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed mb-12 lg:mb-16 italic">Pilih transaksi SPJ di panel samping untuk melakukan verifikasi AI dan unggah bukti fisik.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full max-w-4xl">
              {[
                { step: 1, title: 'Navigasi', desc: 'Pilih realisasi belanja', icon: Search },
                { step: 2, title: 'Validasi', desc: 'AI cek standar audit', icon: Sparkles },
                { step: 3, title: 'Arsip', desc: 'Upload file terenkripsi', icon: CheckCircle2 }
              ].map((s, i) => (
                <div key={i} className="p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-teal-900/5 hover:-translate-y-3 transition-all duration-700 group/card">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover/card:btn-primary-glass group-hover/card:text-white transition-all duration-700 border border-slate-100"><s.icon size={22}/></div>
                  <div className="text-[10px] text-teal-600 uppercase tracking-widest font-black mb-1.5 font-sans">Tahap {s.step}</div>
                  <div className="text-base lg:text-lg font-black text-slate-800 mb-2 leading-none">{s.title}</div>
                  <div className="text-[11px] font-semibold text-slate-400 opacity-80 leading-snug">{s.desc}</div>
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
