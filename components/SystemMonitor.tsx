import React, { useState, useEffect } from 'react';
import { Database, HardDrive, AlertTriangle, X, ShieldCheck, Zap, Info, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSystemUsage, SystemUsage } from '../lib/db';

const SystemMonitor: React.FC = () => {
    const [usage, setUsage] = useState<SystemUsage | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        const fetchUsage = async () => {
            const data = await getSystemUsage();
            setUsage(data);
            
            // Trigger alert if > 80%
            if (data.databaseBytes / data.databaseLimit > 0.8 || data.storageBytes / data.storageLimit > 0.8) {
                setShowAlert(true);
            }
        };

        fetchUsage();
        // Refresh every 30 seconds for real-time feel
        const interval = setInterval(fetchUsage, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!usage) return null;

    const dbPercent = Math.min((usage.databaseBytes / usage.databaseLimit) * 100, 100);
    const storagePercent = Math.min((usage.storageBytes / usage.storageLimit) * 100, 100);
    const isCritical = dbPercent > 90 || storagePercent > 90;
    const isWarning = dbPercent > 70 || storagePercent > 70;

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed bottom-8 right-32 z-[100] flex flex-col items-end gap-3 pointer-events-none">
            {/* ALERT POPUP */}
            <AnimatePresence>
                {showAlert && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="pointer-events-auto bg-white/80 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white max-w-sm mb-4"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                                <AlertTriangle size={20} />
                            </div>
                            <button onClick={() => setShowAlert(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        <h4 className="text-lg font-black text-slate-800 mb-2">Penyimpanan Hampir Penuh</h4>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-6">
                            Kapasitas database atau storage Anda sudah mencapai threshold aman. Segera lakukan backup atau hapus berkas lama untuk menghindari gangguan layanan.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setIsOpen(true); setShowAlert(false); }}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                            >
                                Lihat Detail
                            </button>
                            <button 
                                onClick={() => setShowAlert(false)}
                                className="px-6 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                            >
                                Nanti
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MINI MONITOR BUTTON */}
            <motion.button 
                layout
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto flex items-center gap-3 p-2 pr-5 rounded-3xl border shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 group ${
                    isOpen 
                        ? 'bg-slate-900 text-white border-slate-800' 
                        : isCritical
                            ? 'bg-red-500 text-white border-red-400 animate-pulse'
                            : isWarning 
                                ? 'bg-amber-500 text-white border-amber-400'
                                : 'bg-white/80 backdrop-blur-3xl text-slate-700 border-white/90 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/10'
                }`}
            >
                <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-white/10' : 'bg-slate-100 shadow-inner'}`}>
                    {isCritical ? <AlertTriangle size={16} /> : <Zap size={16} className={isOpen ? 'text-blue-400' : 'text-blue-600'} />}
                </div>
                {!isOpen && (
                    <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Health Monitor</span>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${dbPercent > 90 ? 'bg-red-500' : dbPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <div className={`w-1.5 h-1.5 rounded-full ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                             </div>
                             <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Status OK</span>
                        </div>
                    </div>
                )}
                {isOpen && (
                    <span className="text-[9px] font-black uppercase tracking-widest ml-1">Tutup Monitor</span>
                )}
            </motion.button>

            {/* DETAIL PANEL */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="pointer-events-auto w-80 bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-white overflow-hidden"
                    >
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Zap size={100} className="text-blue-600" />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 tracking-tight mb-1 relative z-10">System Status</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Heuristic Resource Meter</p>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* DATABASE USAGE */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Database size={14}/></div>
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Database</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400">{formatBytes(usage.databaseBytes)} / {formatBytes(usage.databaseLimit)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dbPercent}%` }}
                                        className={`h-full rounded-full ${dbPercent > 90 ? 'bg-red-500' : dbPercent > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-[9px] font-bold text-slate-400">{dbPercent.toFixed(1)}% Terpakai</span>
                                    <ShieldCheck size={12} className={dbPercent > 90 ? 'text-red-400' : 'text-emerald-400'} />
                                </div>
                            </div>

                            {/* STORAGE USAGE */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><HardDrive size={14}/></div>
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Storage</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400">{usage.fileCount} Berkas ({formatBytes(usage.storageBytes)})</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${storagePercent}%` }}
                                        className={`h-full rounded-full ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 px-1">
                                    <span className="text-[9px] font-bold text-slate-400">{storagePercent.toFixed(1)}% Terpakai</span>
                                    <ArrowUpRight size={12} className={storagePercent > 90 ? 'text-red-400' : 'text-blue-400'} />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-900 text-white rounded-t-[2rem] group cursor-pointer hover:bg-black transition-colors">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-slate-800 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Info size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tips Optimal</p>
                                    <p className="text-xs font-bold leading-tight">Bersihkan berkas redundant secara berkala.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SystemMonitor;
