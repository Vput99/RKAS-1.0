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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
       <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Kategori Belanja</p>
            <div className="space-y-3">
              {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                     key={cat.id}
                     onClick={() => setActiveCategory(cat.id)}
                     className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                         activeCategory === cat.id 
                         ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/40 scale-[1.02]' 
                         : 'bg-white border-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-lg'
                     }`}
                  >
                     <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-3 rounded-xl transition-colors duration-300 ${activeCategory === cat.id ? 'bg-white/20 text-white shadow-inner' : `${cat.bg} ${cat.color} group-hover:scale-110`}`}>
                           <cat.icon size={20} />
                        </div>
                        <div className="flex-1">
                           <p className="font-black text-sm tracking-tight">{cat.title}</p>
                           <p className={`text-[10px] font-semibold line-clamp-1 mt-0.5 ${activeCategory === cat.id ? 'text-blue-100' : 'text-slate-400'}`}>
                              {cat.description}
                           </p>
                        </div>
                     </div>
                     <ChevronRight size={18} className={`relative z-10 transition-all duration-300 ${activeCategory === cat.id ? 'text-white translate-x-0' : 'text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1'}`} />
                     {activeCategory === cat.id && (
                       <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                     )}
                  </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors"></div>
              <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2 relative z-10">
                  <div className="p-1.5 bg-slate-800 rounded-lg"><Printer size={16} className="text-blue-400" /></div>
                  Cetak Cepat
              </h4>
              <div className="space-y-2 relative z-10">
                  {renderTemplateButtons()}
              </div>
              <p className="text-[9px] text-slate-500 mt-6 font-bold uppercase tracking-widest text-center opacity-70">Pilih kategori untuk daftar cetak</p>
          </div>
       </div>

       <div className="lg:col-span-8">
          {activeCategory ? (
              (() => {
                  const cat = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory);
                  if (!cat) return null;
                  return (
                      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className={`p-10 border-b border-slate-100 relative overflow-hidden ${cat.bg}`}>
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                              <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`p-4 rounded-2xl bg-white shadow-xl ${cat.color}`}>
                                      <cat.icon size={28} />
                                    </div>
                                    <div>
                                      <span className={`px-3 py-1 bg-white/50 backdrop-blur-sm rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/50 mb-2 inline-block ${cat.color}`}>Kategori Terpilih</span>
                                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{cat.title}</h3>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-2xl">{cat.description}</p>
                              </div>
                          </div>
                          <div className="p-10">
                              <div className="flex items-center justify-between mb-8">
                                <h4 className="font-black text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><CheckCircle2 size={20} /></div>
                                    Checklist Audit BOSP 2026
                                </h4>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-slate-200">Wajib Dilengkapi</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {cat.requirements.map((req, idx) => (
                                      <div key={idx} className="group flex items-start gap-4 p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 rounded-2xl border border-transparent hover:border-blue-100 transition-all duration-300">
                                          <div className="min-w-[32px] h-8 flex items-center justify-center bg-white text-blue-600 shadow-sm rounded-xl text-xs font-black mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">{idx + 1}</div>
                                          <p className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors leading-snug">{req}</p>
                                      </div>
                                  ))}
                              </div>
                              <div className="mt-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4">
                                 <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30"><Sparkles size={20} /></div>
                                 <div className="flex-1">
                                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Tips Kelengkapan</p>
                                    <p className="text-[11px] font-bold text-slate-500">Pastikan semua dokumen di atas memiliki stempel basah dan tanda tangan asli sebelum di-scan.</p>
                                 </div>
                              </div>
                          </div>
                      </div>
                  );
              })()
          ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center p-12 group">
                  <div className="bg-white p-8 rounded-full shadow-xl shadow-slate-200/50 mb-6 group-hover:scale-110 transition-transform duration-500">
                      <FileText size={56} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-3 tracking-tight">Kategori Belum Dipilih</h3>
                  <p className="text-sm font-semibold text-slate-400 max-w-xs leading-relaxed">Silakan pilih jenis belanja di panel kiri untuk melihat detail dokumen pendukung yang dibutuhkan untuk audit.</p>
                  <div className="mt-8 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-0"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-150"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-300"></div>
                  </div>
              </div>
           )}
       </div>
    </div>
  );
};

export default TemplateView;
