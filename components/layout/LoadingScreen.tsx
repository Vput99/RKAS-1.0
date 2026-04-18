import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
       <div className="absolute inset-0 z-0">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-300/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
         <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-300/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
       </div>
       <motion.div 
         initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
         className="z-10 bg-white/60 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 flex flex-col items-center gap-4"
       >
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-indigo-900 font-bold text-lg animate-pulse">Memuat Aplikasi...</p>
       </motion.div>
    </div>
  );
};

export default LoadingScreen;
