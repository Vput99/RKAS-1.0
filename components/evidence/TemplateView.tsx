import React from 'react';
import { ChevronRight, Printer, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { TEMPLATE_CATEGORIES } from '../../lib/evidenceRules';

interface TemplateViewProps {
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
  renderTemplateButtons: () => React.ReactNode;
}

const TemplateView: React.FC<TemplateViewProps> = ({
  activeCategory, setActiveCategory, renderTemplateButtons
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
       {/* Left: Categories */}
       <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-5 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-white/80 shadow-xl shadow-teal-900/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 ml-2">Kategori Belanja</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                     key={cat.id}
                     onClick={() => setActiveCategory(cat.id)}
                     className={`text-left p-5 rounded-2xl border transition-all duration-500 flex flex-col gap-4 group relative overflow-hidden ${
                         activeCategory === cat.id 
                         ? 'btn-primary-glass text-white shadow-xl shadow-teal-500/40 scale-[1.02]' 
                         : 'bg-white border-slate-100 text-slate-700 hover:border-teal-200 hover:bg-teal-50/50 hover:shadow-lg'
                     }`}
                  >
                     <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeCategory === cat.id ? 'bg-white/20 text-white shadow-inner' : `bg-teal-50 text-teal-600 group-hover:scale-110 shadow-sm border border-teal-100/50`}`}>
                        <cat.icon size={22} />
                     </div>
                     <div>
                        <p className="font-black text-sm tracking-tight">{cat.title}</p>
                        <p className={`text-[10px] font-semibold line-clamp-2 mt-1.5 leading-relaxed ${activeCategory === cat.id ? 'text-teal-100' : 'text-slate-400'}`}>
                           {cat.description}
                        </p>
                     </div>
                     <ChevronRight size={18} className={`absolute top-5 right-5 transition-all duration-300 ${activeCategory === cat.id ? 'text-white translate-x-0' : 'text-slate-200 group-hover:text-teal-400 group-hover:translate-x-1 opacity-0 group-hover:opacity-100'}`} />
                  </button>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-900 text-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-teal-500/20 transition-colors"></div>
              <h4 className="text-[11px] lg:text-sm font-black text-white mb-6 flex items-center gap-3 relative z-10 uppercase tracking-widest">
                  <div className="p-2 bg-slate-800 rounded-xl"><Printer size={18} className="text-teal-400" /></div>
                  Pustaka Dokumen
              </h4>
              <div className="space-y-2.5 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {renderTemplateButtons()}
              </div>
              <p className="text-[9px] text-slate-500 mt-8 font-bold uppercase tracking-widest text-center opacity-50 italic">Pilih kategori untuk memfilter</p>
          </div>
       </div>

       {/* Right: Requirements */}
       <div className="lg:col-span-7">
          {activeCategory ? (
              (() => {
                  const cat = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory);
                  if (!cat) return null;
                  return (
                      <div className="glass-card rounded-[2rem] lg:rounded-[3rem] shadow-2xl shadow-teal-900/5 border border-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className={`p-6 lg:p-12 border-b border-slate-100/50 bg-teal-50/30 relative overflow-hidden`}>
                              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-200/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                 <div className="flex items-center gap-5">
                                    <div className="p-4 rounded-2xl bg-white shadow-xl text-teal-600 border border-teal-50">
                                      <cat.icon size={32} />
                                    </div>
                                    <div>
                                      <span className="px-3 py-1 bg-teal-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest mb-2 inline-block shadow-lg shadow-teal-500/20">Panduan Audit</span>
                                      <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{cat.title}</h3>
                                    </div>
                                 </div>
                              </div>
                          </div>
                          <div className="p-6 lg:p-12">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                <h4 className="font-black text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl shadow-inner"><CheckCircle2 size={20} /></div>
                                    Checklist Standar BOSP
                                </h4>
                                <span className="text-[9px] bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl font-black uppercase tracking-widest border border-emerald-200 w-fit">Wajib Ada</span>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                  {cat.requirements.map((req, idx) => (
                                      <div key={idx} className="group flex items-start gap-4 p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-teal-900/5 rounded-2xl border border-transparent hover:border-teal-100 transition-all duration-300">
                                          <div className="min-w-[32px] h-8 flex items-center justify-center bg-white text-teal-600 shadow-sm rounded-xl text-xs font-black mt-0.5 group-hover:btn-primary-glass group-hover:text-white transition-all duration-500">{idx + 1}</div>
                                          <p className="text-[13px] font-bold text-slate-600 group-hover:text-slate-800 transition-colors leading-relaxed">{req}</p>
                                      </div>
                                  ))}
                              </div>
                              <div className="mt-12 p-6 lg:p-10 bg-slate-900 text-white rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000"><Sparkles size={120} className="text-teal-400" /></div>
                                 <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 text-center sm:text-left">
                                   <div className="p-4 bg-teal-600 text-white rounded-2xl shadow-xl shadow-teal-500/30"><Sparkles size={24} /></div>
                                   <div className="flex-1">
                                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1.5">Tips Kelengkapan Dokumen</p>
                                      <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic opacity-80">"Pastikan setiap berkas hasil scan memiliki resolusi tinggi (&gt;300 DPI) untuk memudahkan proses verifikasi audit Inspektorat."</p>
                                   </div>
                                 </div>
                              </div>
                          </div>
                      </div>
                  );
              })()
          ) : (
              <div className="h-full min-h-[500px] lg:min-h-[600px] flex flex-col items-center justify-center glass-card rounded-[2rem] lg:rounded-[3rem] border-2 border-dashed border-teal-200/50 text-center p-8 lg:p-12 group transition-all duration-700 hover:bg-white/60 hover:border-teal-300">
                  <div className="relative mb-8">
                      <div className="absolute inset-0 bg-teal-500 rounded-full blur-3xl opacity-10 group-hover:scale-150 transition-transform duration-1000"></div>
                      <div className="relative bg-white p-10 rounded-full shadow-2xl shadow-teal-200/50 group-hover:rotate-6 transition-transform duration-500">
                          <FileText size={64} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                      </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-700 mb-3 tracking-tight">Kategori Belum Dipilih</h3>
                  <p className="text-sm font-semibold text-slate-400 max-w-xs leading-relaxed italic">Silakan pilih jenis belanja di panel kiri untuk melihat panduan audit dan berkas wajib yang dibutuhkan.</p>
                  <div className="mt-10 flex gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-200 animate-bounce delay-0 shadow-sm"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-200 animate-bounce delay-150 shadow-sm"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-200 animate-bounce delay-300 shadow-sm"></div>
                  </div>
              </div>
           )}
       </div>
    </div>
  );
};

export default TemplateView;
