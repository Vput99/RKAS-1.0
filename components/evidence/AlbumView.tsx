import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Folder, FileCheck, FileText, Download, Printer, ShoppingCart, Eye, BookOpen, Trash2, X, AlertCircle, Upload } from 'lucide-react';
import { MONTHS } from '../../lib/evidenceRules';
import { AlbumViewState } from './EvidenceTypes';

interface AlbumViewProps {
  albumView: AlbumViewState;
  setAlbumView: (v: AlbumViewState) => void;
  groupedAlbum: Record<number, Record<string, any>>;
  generalFiles: any[];
  isLoading: boolean;
  handleGeneralUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteGeneralFile: (e: React.MouseEvent, path: string) => void;
  handleDeleteFromAlbum: (e: React.MouseEvent, file: any) => void;
  selectedFile: any;
  setSelectedFile: (file: any) => void;
}

const AlbumView: React.FC<AlbumViewProps> = ({
  albumView, setAlbumView, groupedAlbum, generalFiles, isLoading,
  handleGeneralUpload, handleDeleteGeneralFile, handleDeleteFromAlbum,
  selectedFile, setSelectedFile
}) => {
  const { month, transactionKey } = albumView;

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-2 mb-8 bg-slate-100/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 shadow-inner w-fit">
        <button 
            onClick={() => setAlbumView({ month: null, transactionKey: null })}
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 ${month === null ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5' : 'text-slate-500 hover:text-slate-800'}`}
        >
            Arsip Pusat
        </button>
        {month !== null && (
            <>
                <ChevronRight size={14} className="text-slate-300" />
                <button 
                     onClick={() => setAlbumView({ month, transactionKey: null })}
                     className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 ${month !== null && !transactionKey ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    {month === -1 ? 'Dokumen Pendukung' : MONTHS[month - 1]}
                </button>
            </>
        )}
        {transactionKey && (
            <>
                <ChevronRight size={14} className="text-slate-300" />
                <div className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-600 text-white shadow-lg shadow-blue-500/30 rounded-xl border border-blue-500">
                    {groupedAlbum[month!]?.[transactionKey]?.vendor || 'Detail Transaksi'}
                </div>
            </>
        )}
    </div>
  );

  if (month === null) {
    const availableMonths = Object.keys(groupedAlbum).map(m => parseInt(m)).sort((a, b) => a - b);
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderBreadcrumbs()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAlbumView({ month: -1, transactionKey: null })}
                    className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-900/5 hover:shadow-2xl hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                        <FileCheck size={120} className="text-indigo-600 -rotate-12" />
                    </div>
                    <div className="w-16 h-16 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:rotate-6 group-hover:shadow-indigo-500/30">
                        <Folder size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Dokumen Pendukung</h3>
                    <div className="flex items-center gap-2 mb-6">
                        <span className="px-2 py-1 bg-white/60 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                            {generalFiles.length} Berkas
                        </span>
                    </div>
                    <div className="pt-6 border-t border-indigo-100/50 flex items-center justify-between text-indigo-600 text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-700">
                        <span>Buka Folder</span>
                        <div className="p-1.5 bg-white/60 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <ChevronRight size={14} />
                        </div>
                    </div>
                </motion.div>

                {availableMonths.map(m => (
                    <motion.div
                        key={m}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAlbumView({ month: m, transactionKey: null })}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                            <Folder size={120} className="text-blue-600 -rotate-12" />
                        </div>
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:rotate-6 group-hover:shadow-blue-500/30">
                            <Folder size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Bukti {MONTHS[m - 1]}</h3>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                                {Object.keys(groupedAlbum[m]).length} Transaksi
                            </span>
                        </div>
                        <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-blue-600 text-[10px] font-black uppercase tracking-widest group-hover:text-blue-700">
                            <span>Buka Folder</span>
                            <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                              <ChevronRight size={14} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
  }

  if (month === -1) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderBreadcrumbs()}
          <div className="mb-8 p-8 bg-blue-50/50 backdrop-blur-sm rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10">
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Arsip Dokumen Pendukung</h3>
                 <p className="text-sm font-semibold text-slate-500 max-w-lg leading-relaxed">Penyimpanan terpusat untuk SK BOSP, SK Bendahara, dan dokumen pendukung standar lainnya.</p>
              </div>
              <div className="relative z-10 shrink-0">
                  <input type="file" id="generalUpload" multiple accept="image/*,.pdf" className="hidden" onChange={handleGeneralUpload}/>
                  <label htmlFor="generalUpload" className={`px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer group hover:scale-105 active:scale-95 ${isLoading ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'}`}>
                      {isLoading ? <AlertCircle size={18} className="animate-spin" /> : <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />} 
                      {isLoading ? 'Memproses...' : 'Tambah Dokumen'}
                  </label>
              </div>
          </div>
          {generalFiles.length === 0 ? (
              <div className="bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
                      <Folder size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Folder Masih Kosong</h3>
                  <p className="text-xs font-semibold text-slate-400 max-w-xs">Silakan tambah dokumen menggunakan tombol di atas.</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {generalFiles.filter(Boolean).map((file, idx) => {
                      const isImage = file.name && file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                      const animationKey = file.path || `gen-${idx}`;
                      return (
                          <motion.div 
                              layoutId={`card-gen-${animationKey}`}
                              key={animationKey}
                              onClick={() => setSelectedFile({ ...file, isImage, idx })}
                              initial={{ opacity: 0, scale: 0.9, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.4, delay: idx * 0.05 }}
                              className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden group cursor-pointer flex flex-col relative"
                              whileHover={{ y: -8 }}
                          >
                              <motion.div layoutId={`image-container-gen-${animationKey}`} className="relative h-56 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-50">
                                  {isImage ? (
                                      <motion.img layoutId={`image-gen-${animationKey}`} src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                  ) : (
                                      <motion.div layoutId={`image-gen-${animationKey}`} className="text-blue-400 flex flex-col items-center group-hover:scale-110 transition-transform duration-1000">
                                          <div className="p-4 bg-white rounded-2xl shadow-lg shadow-blue-900/5">
                                            <FileText size={48} />
                                          </div>
                                          <span className="text-[10px] mt-4 font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[80%] text-center px-4">{file.name}</span>
                                      </motion.div>
                                  )}
                                  <div className="absolute top-4 left-4 z-10">
                                      <span className="text-[9px] font-black text-white bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">
                                          {file.type}
                                      </span>
                                  </div>
                              </motion.div>
                              <motion.div layoutId={`info-gen-${animationKey}`} className="p-8 bg-white flex-1 flex flex-col">
                                  <h4 className="text-base font-black text-slate-800 mb-2 tracking-tight line-clamp-1" title={file.name}>{file.name}</h4>
                                  <p className="text-xs font-semibold text-slate-400 line-clamp-2 mb-6 leading-relaxed flex-1 opacity-80">{file.description}</p>
                                  <div className="flex justify-between items-center pt-6 border-t border-slate-50 mt-auto">
                                      <div className="flex flex-col">
                                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ukuran</span>
                                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                              {(file.size / 1024 / 1024).toFixed(2)} MB
                                          </span>
                                      </div>
                                      <div className="flex gap-2">
                                          <div onClick={(e) => handleDeleteGeneralFile(e, file.path)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={18} /></div>
                                          <div onClick={(e) => { e.stopPropagation(); const link = document.createElement('a'); link.href = file.url; link.download = file.name || 'document'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"><Download size={18} /></div>
                                      </div>
                                  </div>
                              </motion.div>
                          </motion.div>
                      );
                  })}
              </div>
          )}
      </div>
    );
  }

  if (month && month > 0 && !transactionKey) {
    const transactions = Object.values(groupedAlbum[month] || {}).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderBreadcrumbs()}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {transactions.map((t: any) => (
                    <motion.div
                        key={t.key}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAlbumView({ month: month, transactionKey: t.key })}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:rotate-6">
                                <ShoppingCart size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <h3 className="text-base font-black text-slate-800 truncate leading-none">{t.vendor}</h3>
                            </div>
                        </div>
                        <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Nominal SPJ</span>
                                <span className="text-indigo-600 text-xs">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(t.totalAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Arsip Bukti</span>
                                <span className="bg-white text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 shadow-sm">{t.files.length} Berkas</span>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center justify-between text-indigo-600 text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-700">
                            <span>Periksa Arsip</span>
                            <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <ChevronRight size={14} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
  }

  const filesInTransaction = groupedAlbum[month!]?.[transactionKey!]?.files || [];
  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      {renderBreadcrumbs()}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filesInTransaction.map((file: any, idx: number) => {
              const isImage = file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
              return (
                  <motion.div 
                      layoutId={`card-${file.url}-${idx}`}
                      key={idx}
                      onClick={() => setSelectedFile({ ...file, isImage, idx })}
                      className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden group cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col relative"
                  >
                      <motion.div layoutId={`image-container-${file.url}-${idx}`} className="relative h-56 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-50">
                          {isImage ? (
                              <motion.img layoutId={`image-${file.url}-${idx}`} src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          ) : (
                              <motion.div layoutId={`image-${file.url}-${idx}`} className="text-blue-400 flex flex-col items-center group-hover:scale-110 transition-transform duration-1000">
                                  <div className="p-4 bg-white rounded-2xl shadow-lg shadow-blue-900/5">
                                    <FileText size={48} />
                                  </div>
                                  <span className="text-[10px] mt-4 font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[80%] text-center px-4">{file.name}</span>
                              </motion.div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8 p-6">
                              <span className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                                  <Eye size={16} className="text-blue-600" /> Buka Berkas
                              </span>
                          </div>
                          <div className="absolute top-4 left-4 z-10">
                            <span className="text-[9px] font-black text-white bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">
                                {file.type}
                            </span>
                          </div>
                      </motion.div>
                      <motion.div layoutId={`info-${file.url}-${idx}`} className="p-8 bg-white flex-1 flex flex-col">
                          <h4 className="text-base font-black text-slate-800 mb-2 tracking-tight line-clamp-1" title={file.vendor}>{file.vendor}</h4>
                          <p className="text-xs font-semibold text-slate-400 line-clamp-2 mb-6 leading-relaxed flex-1 opacity-80" title={file.description}>{file.description}</p>
                          <div className="flex justify-between items-center pt-6 border-t border-slate-50 mt-auto">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Nominal Bukti</span>
                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(file.amount)}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <div onClick={(e) => handleDeleteFromAlbum(e, file)} className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-red-50 group-hover:text-red-500 transition-colors cursor-pointer"><Trash2 size={18} /></div>
                                <div onClick={async (e) => { e.stopPropagation(); const response = await fetch(file.url); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = file.name || 'document'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors cursor-pointer"><Download size={18} /></div>
                              </div>
                          </div>
                      </motion.div>
                  </motion.div>
              );
          })}
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 bg-slate-900/80 backdrop-blur-lg"
            onClick={() => setSelectedFile(null)}
          >
            <button onClick={() => setSelectedFile(null)} className="absolute top-8 right-8 z-[110] p-4 bg-white/10 text-white hover:bg-white/20 hover:scale-110 rounded-2xl transition-all backdrop-blur-md shadow-2xl border border-white/10"><X size={24}/></button>
            <motion.div
              layoutId={`card-${selectedFile.url}-${selectedFile.idx}`}
              className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
               <motion.div layoutId={`image-container-${selectedFile.url}-${selectedFile.idx}`} className="flex-1 bg-slate-50 relative flex items-center justify-center min-h-[40vh] md:min-h-0 border-r border-slate-100">
                  {selectedFile.isImage ? (
                      <motion.img layoutId={`image-${selectedFile.url}-${selectedFile.idx}`} src={selectedFile.url} className="w-full h-full object-contain p-8" />
                  ) : (
                      <motion.iframe layoutId={`image-${selectedFile.url}-${selectedFile.idx}`} src={selectedFile.url} className="absolute inset-0 w-full h-full border-0 bg-white" title="PDF Document" />
                  )}
                  <div className="absolute bottom-8 right-8 flex gap-4 z-10">
                      <button onClick={() => window.open(selectedFile.url, '_blank')} className="p-4 bg-white/90 hover:bg-white text-slate-800 backdrop-blur-xl rounded-2xl transition-all shadow-2xl hover:scale-110 border border-slate-200 group/btn flex items-center gap-3 pr-6">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors"><Download size={20} /></div>
                          <span className="text-xs font-black uppercase tracking-widest">Unduh</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); const win = window.open(selectedFile.url, '_blank'); if (win) win.onload = () => win.print(); }} className="p-4 bg-slate-900 text-white backdrop-blur-xl rounded-2xl transition-all shadow-2xl hover:scale-110 border border-slate-800 group/btn flex items-center gap-3 pr-6">
                          <div className="p-2 bg-slate-800 text-blue-400 rounded-xl group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors"><Printer size={20} /></div>
                          <span className="text-xs font-black uppercase tracking-widest">Cetak</span>
                      </button>
                  </div>
               </motion.div>

               <motion.div layoutId={`info-${selectedFile.url}-${selectedFile.idx}`} className="w-full md:w-[400px] lg:w-[450px] bg-white p-10 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                  <div className="mb-8">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="inline-block text-[10px] font-black text-white bg-blue-600 px-4 py-1.5 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">{selectedFile.type}</span>
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 mb-4 leading-tight tracking-tight">{selectedFile.vendor}</h2>
                      <div className="flex items-center gap-2 mb-10">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><BookOpen size={16}/></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber: <span className="text-blue-600">{selectedFile.sourceType}</span></span>
                      </div>
                      <div className="space-y-6">
                          <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500"><ClipboardList size={14}/></div>
                                Detail Transaksi
                              </h4>
                              <div className="space-y-5">
                                <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</span>
                                    <span className="text-xs font-black text-slate-800">{new Date(selectedFile.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</span>
                                    <span className="text-sm font-black text-emerald-600 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-emerald-50">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedFile.amount)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Uraian SPJ</span>
                                    <div className="text-sm font-semibold text-slate-600 leading-relaxed bg-white p-6 rounded-2xl shadow-inner border border-slate-50 italic">"{selectedFile.description}"</div>
                                </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="mt-auto pt-8 flex flex-col gap-4">
                      <button onClick={async () => { const response = await fetch(selectedFile.url); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = selectedFile.name || 'document'; document.body.appendChild(link); link.click(); document.body.removeChild(link); }} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 group/main">
                          <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Unduh Arsip Digital
                      </button>
                      <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60">Dokumen tersimpan aman di Cloud RKAS Pintar</p>
                  </div>
               </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ClipboardList = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
);

export default AlbumView;
