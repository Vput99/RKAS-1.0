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
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-900/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50"></div>
        
        <div className="relative z-10 flex-1">
           <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                <BookOpen size={24} />
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-blue-100 shadow-sm">Audit-Ready</span>
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
             Manajemen Bukti <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Digital</span>
           </h2>
           <p className="text-sm font-semibold text-slate-500">
             Automasi dokumen pendukung dan arsip bukti fisik SIPLah.
           </p>
        </div>

        <div className="relative z-10 flex bg-white/40 backdrop-blur-2xl p-1.5 rounded-[1.5rem] border border-white/60 shadow-xl shadow-blue-900/5">
          {[
            { id: 'templates', label: 'Template', icon: FileText },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'album', label: 'Album', icon: ImageIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EvidenceTab)}
              className={`relative px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-xl shadow-blue-900/10' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-xl blur-md" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvidenceHeader;
