import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, Upload, Image as ImageIcon } from 'lucide-react';
import { EvidenceTab } from './EvidenceTypes';

interface EvidenceHeaderProps {
  activeTab: EvidenceTab;
  setActiveTab: (tab: EvidenceTab) => void;
}

const EvidenceHeader: React.FC<EvidenceHeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="relative">
      <div className="relative flex flex-col lg:flex-row justify-between items-center gap-8 glass-card p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-white/80 shadow-2xl shadow-teal-900/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/20 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50"></div>
        
        <div className="relative z-10 flex-1 text-center lg:text-left">
           <div className="flex flex-col lg:flex-row items-center gap-3 mb-4 lg:mb-3">
              <div className="p-3 btn-primary-glass border-none rounded-2xl text-white shadow-lg shadow-teal-500/30">
                <BookOpen size={24} />
              </div>
              <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-teal-100 shadow-sm font-sans">Audit-Ready</span>
           </div>
           <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight leading-none mb-3">
             Manajemen Bukti <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-400">Digital</span>
           </h2>
           <p className="text-sm font-semibold text-slate-400 italic max-w-md mx-auto lg:mx-0 leading-relaxed">
             Automasi dokumen pendukung dan arsip bukti fisik SIPLah.
           </p>
        </div>

        <div className="relative z-10 flex w-full lg:w-auto overflow-x-auto no-scrollbar glass-panel p-1.5 rounded-[1.5rem] lg:rounded-[2rem] border border-white/60 shadow-xl shadow-teal-900/5 gap-1 lg:gap-2">
          {[
            { id: 'templates', label: 'Template', icon: FileText },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'album', label: 'Album', icon: ImageIcon }
          ].map((tab) => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as EvidenceTab)}
               className={`relative flex-1 lg:flex-none whitespace-nowrap px-5 lg:px-8 py-3 text-[10px] lg:text-xs font-black uppercase tracking-widest rounded-xl lg:rounded-2xl transition-all duration-500 flex items-center justify-center gap-2.5 ${
                 activeTab === tab.id 
                   ? 'bg-white text-teal-600 shadow-xl shadow-teal-900/10 scale-105' 
                   : 'text-slate-400 hover:text-slate-800 hover:bg-white/40'
               }`}
            >
               <tab.icon size={18} className={activeTab === tab.id ? 'text-teal-500' : 'text-slate-300'} />
               {tab.label}
               {activeTab === tab.id && (
                 <motion.div layoutId="activeTabGlow" className="absolute inset-0 bg-teal-500/5 rounded-xl lg:rounded-2xl blur-md" />
               )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvidenceHeader;
