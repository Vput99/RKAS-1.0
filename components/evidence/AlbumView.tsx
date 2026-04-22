import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Folder, FileText, Download, Eye, Trash2, BookOpen, Upload, ShoppingCart, FileBarChart, X } from 'lucide-react';
import { MONTHS } from '../../lib/evidenceRules';
import { AlbumViewState } from './EvidenceTypes';
import { formatCurrency } from '../../lib/pdfUtils';

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
  
  if (isLoading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Folder size={48} className="text-teal-500 opacity-20" />
        </motion.div>
        <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sinkronisasi Arsip Digital...</p>
      </div>
    );
  }

  const isRoot = albumView.month === null;
  const isMonthView = albumView.month !== null && albumView.month > 0 && albumView.transactionKey === null;
  const isTransactionView = albumView.month !== null && albumView.month > 0 && albumView.transactionKey !== null;

  const formatVendorName = (name: string) => {
    if (name.startsWith('history-')) {
      const parts = name.split('-');
      if (parts.length >= 6) {
        const idx = parts[parts.length - 1];
        const shortId = parts[1].substring(0, 6).toUpperCase();
        return `Transaksi #${idx} (Ref: ${shortId})`;
      }
    }
    return name;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumbs / Navigation Path */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-4 mb-8 lg:mb-12 overflow-x-auto no-scrollbar pb-2">
         <button 
           onClick={() => setAlbumView({ month: null, transactionKey: null })}
           className={`px-5 lg:px-8 py-3 lg:py-4 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-3 ${
             isRoot ? 'btn-primary-glass text-white shadow-xl shadow-teal-500/30' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
           }`}
         >
           <BookOpen size={16} /> Digital Vault
         </button>

         {!isRoot && (
           <>
             <ChevronRight size={16} className="text-slate-300" />
             <button 
               onClick={() => setAlbumView({ month: albumView.month, transactionKey: null })}
               className={`px-5 lg:px-8 py-3 lg:py-4 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest border flex items-center gap-3 transition-all ${
                 isMonthView || albumView.month === -1 ? 'bg-teal-50 text-teal-600 border-teal-100 shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
               }`}
             >
               <Folder size={16} /> {albumView.month !== null && albumView.month > 0 ? MONTHS[albumView.month - 1] : 'General Documents'}
             </button>
           </>
         )}

         {isTransactionView && (
           <>
             <ChevronRight size={16} className="text-slate-300" />
             <button 
               className="px-5 lg:px-8 py-3 lg:py-4 bg-teal-50 text-teal-600 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest border border-teal-100 shadow-sm flex items-center gap-3"
             >
               <ShoppingCart size={16} /> <span className="truncate max-w-[150px] lg:max-w-none">{formatVendorName(albumView.transactionKey!)}</span>
             </button>
           </>
         )}
      </div>

      <AnimatePresence mode="wait">
        {isRoot ? (
          <motion.div 
            key="root" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
          >
            {/* General Files Folder */}
            <button 
               onClick={() => setAlbumView({ month: -1, transactionKey: null })}
               className="group flex flex-col p-6 lg:p-8 glass-card rounded-[2.5rem] border border-white hover:border-teal-200 transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 relative overflow-hidden text-left"
            >
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-1000 rotate-12"><FileText size={100} /></div>
               <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-2xl shadow-xl shadow-teal-900/5 text-teal-500 flex items-center justify-center mb-10 group-hover:btn-primary-glass group-hover:text-white transition-all duration-700 border border-teal-50">
                  <FileBarChart size={28} />
               </div>
               <h4 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-none mb-3">Dokumen Umum</h4>
               <p className="text-[11px] font-bold text-slate-400 mb-6 italic">Arsip dokumen SK, Surat Tugas, & berkas umum lainnya.</p>
               <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest px-3 py-1 bg-teal-50 rounded-lg">{generalFiles.length} Berkas</span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:btn-primary-glass group-hover:text-white transition-all"><ChevronRight size={16} /></div>
               </div>
            </button>

            {/* Monthly Folders */}
            {Object.entries(groupedAlbum).sort(([a], [b]) => Number(a) - Number(b)).map(([month, transactions]: any) => (
               <button 
                 key={month}
                 onClick={() => setAlbumView({ month: Number(month), transactionKey: null })}
                 className="group flex flex-col p-6 lg:p-8 glass-card rounded-[2.5rem] border border-white hover:border-teal-200 transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 relative overflow-hidden text-left"
               >
                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-1000 -rotate-12"><Folder size={100} /></div>
                 <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-2xl shadow-xl shadow-teal-900/5 text-slate-400 flex items-center justify-center mb-10 group-hover:bg-slate-900 group-hover:text-white transition-all duration-700 border border-slate-50">
                    <Folder size={28} />
                 </div>
                 <h4 className="text-xl lg:text-2xl font-black text-slate-800 tracking-tight leading-none mb-3">{MONTHS[Number(month) - 1]}</h4>
                 <p className="text-[11px] font-bold text-slate-400 mb-6 italic">Arsip digital realisasi bulan {MONTHS[Number(month) - 1]}.</p>
                 <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg group-hover:text-slate-600 transition-colors">{Object.keys(transactions).length} Folder SPJ</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all"><ChevronRight size={16} /></div>
                 </div>
               </button>
            ))}
          </motion.div>
        ) : isMonthView ? (
          <motion.div 
            key="month" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8"
          >
            {albumView.month !== null && Object.entries(groupedAlbum[albumView.month] || {}).map(([vendor, group]: any) => (
              <button 
                key={vendor}
                onClick={() => setAlbumView({ month: albumView.month, transactionKey: vendor })}
                className="group flex flex-col p-6 lg:p-8 glass-card rounded-[2.5rem] border border-white hover:border-teal-200 transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 relative overflow-hidden text-left h-full"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-1000 -rotate-12"><ShoppingCart size={100} /></div>
                <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-2xl shadow-xl shadow-teal-900/5 text-teal-600 flex items-center justify-center mb-10 group-hover:bg-teal-600 group-hover:text-white transition-all duration-700 border border-teal-50 shrink-0">
                   <ShoppingCart size={28} />
                </div>
                <h4 className="text-lg lg:text-xl font-black text-slate-800 tracking-tight leading-none mb-3 break-words line-clamp-3" title={formatVendorName(vendor)}>{formatVendorName(vendor)}</h4>
                <p className="text-[11px] font-bold text-slate-400 mb-6 italic">{group.files.length} dokumen terkait</p>
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg group-hover:text-slate-600 transition-colors">{formatCurrency(group.totalAmount)}</span>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-teal-600 group-hover:text-white transition-all shrink-0"><ChevronRight size={16} /></div>
                </div>
              </button>
            ))}
          </motion.div>
        ) : isTransactionView ? (
          <motion.div 
            key="transaction" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            {(() => {
              const vendor = albumView.transactionKey!;
              const group = groupedAlbum[albumView.month!]?.[vendor];
              if (!group) return null;
              
              return (
              <div key={vendor} className="animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-4">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-xl shadow-teal-900/5 text-teal-600 flex items-center justify-center border border-teal-50 shrink-0">
                         <ShoppingCart size={24} />
                      </div>
                      <div>
                         <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none mb-2 break-all">{formatVendorName(vendor)}</h3>
                         <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-3 py-1 rounded-lg font-sans">Arsip Transaksi Terverifikasi</span>
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-lg border border-teal-100 font-sans">{group.files.length} File Digital</span>
                         </div>
                      </div>
                   </div>
                   <div className="h-px bg-slate-100 flex-1 mx-8 hidden lg:block"></div>
                   <div className="text-right">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 font-sans">Total Belanja</p>
                      <p className="text-xl lg:text-2xl font-black text-slate-800 tracking-tighter leading-none font-sans italic">{formatCurrency(group.totalAmount)}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {group.files.map((file: any, idx: number) => {
                    const isValidDate = file.created_at && !isNaN(new Date(file.created_at).getTime());
                    return (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -8 }}
                      className="group glass-card p-6 lg:p-8 rounded-[2.5rem] border border-white hover:border-teal-200 transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 relative overflow-hidden text-left flex flex-col h-full"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-150 transition-transform duration-1000 -rotate-12 pointer-events-none transition-opacity group-hover:opacity-10"><FileText size={120} /></div>
                      
                      <div className="flex items-start justify-between mb-6 relative z-10 gap-4">
                         <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-700 ${file.name.toLowerCase().includes('pdf') ? 'bg-rose-50 text-rose-500 shadow-rose-200/50' : 'bg-emerald-50 text-emerald-500 shadow-emerald-200/50'}`}>
                            <FileText size={28} />
                         </div>
                         <div className="flex flex-col items-end gap-2 text-right min-w-0">
                            <span className="px-3 py-1 bg-white border border-slate-100 text-[9px] font-black text-slate-400 rounded-lg shadow-sm font-sans italic uppercase tracking-tighter truncate max-w-[140px]" title={file.type || 'Berkas'}>
                              {file.type || 'Berkas'}
                            </span>
                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest font-sans">
                              {isValidDate ? new Date(file.created_at).toLocaleDateString('id-ID') : 'Tanggal Tidak Valid'}
                            </span>
                         </div>
                      </div>

                      <h5 className="text-base lg:text-lg font-black text-slate-800 leading-snug mb-2 line-clamp-2 min-h-[3rem] group-hover:text-teal-600 transition-colors font-sans" title={file.name}>{file.name}</h5>
                      <p className="text-[10px] font-bold text-slate-400 mb-8 italic">Disimpan via SIPLah/Direct Upload</p>

                      <div className="mt-auto flex items-center gap-3 pt-6 border-t border-slate-50 relative z-10">
                        <button onClick={() => setSelectedFile(file)} className="flex-1 btn-primary-glass border-none text-white p-3 lg:p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-lg shadow-teal-500/20">
                          <Eye size={16} /> Lihat
                        </button>
                        <a href={file.url} download target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 shrink-0 bg-white border border-slate-100 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95">
                          <Download size={18} />
                        </a>
                        <button onClick={(e) => handleDeleteFromAlbum(e, file)} className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 shrink-0 bg-white border border-slate-100 rounded-xl text-slate-300 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95 text-rose-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )})}
                </div>
              </div>
              );
            })()}
          </motion.div>
        ) : (
          <motion.div 
            key="general" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="space-y-12"
          >
             <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 glass-card p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border border-white shadow-2xl shadow-teal-900/5 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                 <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white rounded-3xl shadow-xl shadow-teal-900/5 text-teal-600 flex items-center justify-center border border-teal-50/50 shrink-0">
                       <FileBarChart size={32} />
                    </div>
                    <div>
                       <h3 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none mb-3">Dokumen Operasional</h3>
                       <p className="text-xs lg:text-sm font-semibold text-slate-400 italic leading-relaxed">Kelola berkas non-transaksi seperti SK Panitia, Surat Keputusan, & Inventaris.</p>
                    </div>
                 </div>
                 
                 <label className="relative overflow-hidden group/btn px-8 lg:px-12 py-5 lg:py-6 rounded-2xl lg:rounded-[2rem] btn-primary-glass border-none text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] cursor-pointer transition-all duration-700 hover:scale-105 active:scale-95 shadow-2xl shadow-teal-500/30 text-center">
                    <div className="flex items-center justify-center gap-3 relative z-10">
                      <Upload size={20} className="group-hover/btn:-translate-y-1 transition-all duration-500" /> Unggah Berkas Baru
                    </div>
                    <input type="file" className="hidden" multiple onChange={handleGeneralUpload} />
                 </label>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 animate-fade-in-up">
                {generalFiles.length === 0 ? (
                  <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-8 border border-slate-50">
                        <FileText size={32} className="text-slate-200" />
                     </div>
                     <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Belum ada dokumen umum terunggah.</p>
                  </div>
                ) : (
                  generalFiles.map((file: any, idx: number) => (
                    <motion.div 
                      key={idx} whileHover={{ y: -8 }}
                      className="group glass-card p-6 lg:p-8 rounded-[2.5rem] border border-white hover:border-teal-200 transition-all duration-700 hover:shadow-2xl hover:shadow-teal-900/5 relative overflow-hidden text-left"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-150 transition-transform duration-1000 rotate-12"><FileBarChart size={100} /></div>
                      
                      <div className="flex items-start justify-between mb-8">
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-700 ${file.name.toLowerCase().includes('pdf') ? 'bg-sky-50 text-sky-500 shadow-sky-200/50' : 'bg-indigo-50 text-indigo-500 shadow-indigo-200/50'}`}>
                            <FileBarChart size={28} />
                         </div>
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest font-sans italic">{new Date(file.created_at).toLocaleDateString('id-ID')}</span>
                      </div>

                      <h5 className="text-base lg:text-lg font-black text-slate-800 leading-snug mb-10 line-clamp-2 min-h-[3rem] group-hover:text-teal-600 transition-colors font-sans">{file.name}</h5>

                      <div className="flex items-center gap-3 pt-6 border-t border-slate-50 relative z-10">
                        <button onClick={() => setSelectedFile(file)} className="flex-1 btn-primary-glass border-none text-white p-3 lg:p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-500/20">
                          <Eye size={16} /> Lihat
                        </button>
                        <a href={file.url} download target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-white border border-slate-100 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95">
                          <Download size={18} />
                        </a>
                        <button onClick={(e) => handleDeleteGeneralFile(e, file.path)} className="flex items-center justify-center w-12 h-12 lg:w-14 lg:h-14 bg-white border border-slate-100 rounded-xl text-slate-300 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95 text-rose-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Basic File Preview Modal */}
      <AnimatePresence>
        {selectedFile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
              onClick={() => setSelectedFile(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20} /></div>
                    <div>
                       <h4 className="text-sm font-black text-slate-800 leading-none mb-1 font-sans">{selectedFile.name}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">{selectedFile.type}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedFile(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 bg-slate-100 overflow-hidden relative">
                 {selectedFile.url.toLowerCase().endsWith('.pdf') ? (
                    <iframe src={selectedFile.url} className="w-full h-full border-none" title="PDF Preview" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center p-8">
                       <img src={selectedFile.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                    </div>
                 )}
              </div>
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
                 <a href={selectedFile.url} download target="_blank" rel="noopener noreferrer" className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all">
                    <Download size={16} /> Unduh Berkas
                 </a>
                 <button onClick={() => setSelectedFile(null)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                    Tutup Pratinjau
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlbumView;
