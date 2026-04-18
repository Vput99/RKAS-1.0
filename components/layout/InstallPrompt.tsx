import { motion, AnimatePresence } from 'framer-motion';
import { X, School, Share, PlusSquare } from 'lucide-react';

interface InstallPromptProps {
  showIOSPrompt: boolean;
  setShowIOSPrompt: (show: boolean) => void;
}

const InstallPrompt = ({
  showIOSPrompt,
  setShowIOSPrompt
}: InstallPromptProps) => {
  return (
    <AnimatePresence>
      {showIOSPrompt && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        >
           <motion.div 
             initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
             className="bg-white/90 backdrop-blur-xl border border-white rounded-[32px] w-full max-w-sm p-8 relative shadow-2xl"
           >
              <button 
                onClick={() => setShowIOSPrompt(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 hover:rotate-90 transition-transform bg-slate-100 p-2 rounded-full"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 border border-white shadow-inner">
                 <School size={32} />
              </div>
              <h3 className="font-black text-xl text-slate-800 mb-2 tracking-tight">Install di iPhone/iPad</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                iOS tidak mendukung tombol install otomatis. Ikuti langkah manual berikut:
              </p>
              
              <ol className="space-y-4 text-sm text-slate-700 font-medium">
                 <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600">
                       <Share size={20} />
                    </div>
                    <span>1. Tekan tombol <b className="text-slate-900">Share</b> di bawah layar Safari.</span>
                 </li>
                 <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                       <PlusSquare size={20} />
                    </div>
                    <span className="flex-1">2. Geser ke bawah dan pilih <b className="text-slate-900">Add to Home Screen</b>.</span>
                 </li>
                 <li className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                       <span className="font-bold text-xs uppercase tracking-wider">Add</span>
                    </div>
                    <span>3. Tekan <b className="text-slate-900">Add</b> di pojok kanan atas.</span>
                 </li>
              </ol>

              <button 
                 onClick={() => setShowIOSPrompt(false)}
                 className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                 Mengerti, Tutup
              </button>
           </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
