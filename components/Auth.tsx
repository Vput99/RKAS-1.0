import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, UserPlus, LogIn, School, Building2 } from 'lucide-react';
import { saveSchoolProfile } from '../lib/db';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthProps {
   onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
   const [isLogin, setIsLogin] = useState(true);
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [schoolName, setSchoolName] = useState('');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');

   const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      if (!supabase) {
         setTimeout(() => {
            onLoginSuccess();
            setLoading(false);
         }, 1000);
         return;
      }

      try {
         if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.reload();
         } else {
            if (!schoolName.trim()) throw new Error("Nama Sekolah wajib diisi.");
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
            if (authError) throw authError;

            if (authData.user) {
               const initialProfile = {
                  name: schoolName,
                  npsn: '',
                  address: '',
                  headmaster: '',
                  headmasterNip: '',
                  treasurer: '',
                  treasurerNip: '',
                  fiscalYear: '2026',
                  studentCount: 0,
                  budgetCeiling: 0
               };
               const { data: sessionData } = await supabase.auth.getSession();
               if (sessionData.session) await saveSchoolProfile(initialProfile);
            }
            alert('Registrasi Sekolah Berhasil! Anda akan otomatis login.');
            window.location.reload();
         }
      } catch (err: any) {
         setError(err.message || 'Terjadi kesalahan');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 selection:bg-blue-200">

         {/* Left Side: Dynamic Brand Area */}
         <div className="hidden lg:flex relative bg-[#0f172a] overflow-hidden items-center justify-center p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-indigo-900/40 to-slate-900/90 z-10 backdrop-blur-3xl"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

            {/* Animated Orbs */}
            <motion.div
               animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 50, 0] }}
               transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[120px]"
            />
            <motion.div
               animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2], y: [0, -50, 0] }}
               transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
               className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]"
            />

            <div className="relative z-20 max-w-lg text-center">
               <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="w-28 h-28 bg-white/10 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center text-white mb-8 mx-auto border border-white/20 shadow-2xl relative overflow-hidden group"
               >
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <School size={56} className="text-blue-300 drop-shadow-lg" />
               </motion.div>

               <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl font-black text-white mb-6 tracking-tight leading-tight drop-shadow-xl"
               >
                  Digitalisasi <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 drop-shadow-sm">RKAS Pintar</span>
               </motion.h2>

               <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-300 text-lg leading-relaxed mb-10 font-medium"
               >
                  Sistem manajemen anggaran sekolah yang modern, transparan, dan terintegrasi untuk masa depan pendidikan yang lebih baik.
               </motion.p>

               <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="grid grid-cols-3 gap-6 pt-10 border-t border-white/10"
               >
                  <div className="text-center group">
                     <p className="text-white font-black text-2xl group-hover:scale-110 transition-transform">100%</p>
                     <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mt-2">Aman</p>
                  </div>
                  <div className="text-center group">
                     <p className="text-white font-black text-2xl group-hover:scale-110 transition-transform">Cloud</p>
                     <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-2">Sync</p>
                  </div>
                  <div className="text-center group">
                     <p className="text-white font-black text-2xl group-hover:scale-110 transition-transform">Realtime</p>
                     <p className="text-purple-300 text-[10px] font-black uppercase tracking-widest mt-2">Data</p>
                  </div>
               </motion.div>
            </div>
         </div>

         {/* Right Side: Form Area */}
         <div className="flex items-center justify-center p-6 md:p-12 lg:p-20 relative overflow-hidden">
            {/* Abstract shapes for right side */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 to-transparent rounded-full blur-3xl opacity-50 -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-100 to-transparent rounded-full blur-3xl opacity-50 -z-10 transform -translate-x-1/2 translate-y-1/2"></div>

            <motion.div
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ type: "spring", stiffness: 300, damping: 30 }}
               className="w-full max-w-md relative z-10"
            >

               {/* Mobile Header */}
               <div className="lg:hidden text-center mb-10">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-blue-900/20 border border-white/20">
                     <School size={40} />
                  </div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">RKAS Pintar SD</h1>
               </div>

               <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-900/5 border border-white">
                  <div className="mb-10 text-center">
                     <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
                        {isLogin ? 'Selamat Datang' : 'Mulai Sekarang'}
                     </h2>
                     <p className="text-slate-500 font-medium">
                        {isLogin ? 'Masuk untuk kelola anggaran sekolah.' : 'Daftarkan sekolah Anda, 100% gratis.'}
                     </p>
                  </div>

                  <AnimatePresence mode="popLayout">
                     {error && (
                        <motion.div
                           initial={{ opacity: 0, y: -10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           className="bg-rose-50/80 backdrop-blur-sm text-rose-600 text-sm font-bold p-4 rounded-2xl mb-6 flex items-center gap-3 border border-rose-200 shadow-sm"
                        >
                           <AlertCircle size={20} className="shrink-0" /> <span className="flex-1">{error}</span>
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <form onSubmit={handleAuth} className="space-y-5">
                     <AnimatePresence mode="popLayout">
                        {!isLogin && (
                           <motion.div
                              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                           >
                              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Nama Sekolah</label>
                              <div className="relative group">
                                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Building2 size={20} />
                                 </div>
                                 <input
                                    type="text"
                                    required={!isLogin}
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                                    placeholder="Contoh: SD NEGERI 1 MAWAR"
                                 />
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>

                     <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Email Sekolah</label>
                        <div className="relative group">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                              <Mail size={20} />
                           </div>
                           <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                              placeholder="sekolah@dikbud.id"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Password</label>
                        <div className="relative group">
                           <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                              <Lock size={20} />
                           </div>
                           <input
                              type="password"
                              required
                              minLength={6}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                              placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
                           />
                        </div>
                     </div>

                     <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 flex items-center justify-center gap-3 mt-8 border border-white/20 disabled:opacity-70 disabled:pointer-events-none group"
                     >
                        {loading ? (
                           <><Loader2 className="animate-spin" size={20} /> Memproses...</>
                        ) : (
                           <>
                              <span className="text-lg">{isLogin ? 'Masuk ke Dashboard' : 'Buat Akun Sekolah'}</span>
                              <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                                 {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                              </div>
                           </>
                        )}
                     </motion.button>
                  </form>

                  <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center">
                     <p className="text-slate-500 font-medium text-sm">
                        {isLogin ? 'Sekolah belum terdaftar?' : 'Sudah punya akun sekolah?'}
                     </p>
                     <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="mt-2 text-blue-600 font-black hover:text-indigo-600 transition-colors px-4 py-2 bg-blue-50/50 rounded-xl hover:bg-blue-100/50"
                     >
                        {isLogin ? 'Registrasi Sekarang' : 'Masuk di Sini'}
                     </button>
                  </div>
               </div>

               <p className="mt-12 text-center text-[10px] text-slate-400 font-black uppercase tracking-widest leading-loose opacity-70">
                  RKAS Pintar v1.2 &bull; Smart Finance<br />
                  Made Vicky Setya
               </p>
            </motion.div>
         </div>
      </div>
   );
};

// Helper component for error display
const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
   <svg className={className} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);

export default Auth;