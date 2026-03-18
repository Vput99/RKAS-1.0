import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, UserPlus, LogIn, School, Building2 } from 'lucide-react';
import { saveSchoolProfile } from '../lib/db';

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
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white selection:bg-blue-100">
      
      {/* Left Side: Dynamic Brand Area */}
      <div className="hidden lg:flex relative bg-[#0f172a] overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-transparent to-indigo-900/40 z-10"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px]"></div>

        <div className="relative z-20 max-w-lg text-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center text-white mb-8 mx-auto border border-white/20 shadow-2xl transform hover:scale-105 transition-transform duration-500">
            <School size={48} className="text-blue-400" />
          </div>
          <h2 className="text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            Digitalisasi <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">RKAS Pintar</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            Sistem manajemen anggaran sekolah yang modern, transparan, dan terintegrasi untuk masa depan pendidikan yang lebih baik.
          </p>
          
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/10">
             <div className="text-center">
                <p className="text-white font-bold text-xl">100%</p>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Aman</p>
             </div>
             <div className="text-center">
                <p className="text-white font-bold text-xl">Cloud</p>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Sync</p>
             </div>
             <div className="text-center">
                <p className="text-white font-bold text-xl">Realtime</p>
                <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Data</p>
             </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form Area */}
      <div className="flex items-center justify-center p-6 md:p-12 lg:p-20 bg-gray-50/50">
        <div className="w-full max-w-md">
          
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-10">
             <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl">
                <School size={32} />
             </div>
             <h1 className="text-2xl font-black text-gray-900">RKAS Pintar SD</h1>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100">
            <div className="mb-8">
               <h2 className="text-3xl font-bold text-gray-900 mb-2">
                 {isLogin ? 'Masuk' : 'Daftar'}
               </h2>
               <p className="text-gray-500">
                 {isLogin ? 'Kelola anggaran sekolah Anda sekarang.' : 'Mulai digitalisasi RKAS sekolah Anda.'}
               </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6 flex items-center gap-3 border border-red-100 animate-fade-in">
                 <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
               {!isLogin && (
                   <div className="animate-fade-in-up">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Sekolah</label>
                     <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                           <Building2 size={20} />
                        </div>
                        <input 
                           type="text" 
                           required={!isLogin}
                           value={schoolName}
                           onChange={(e) => setSchoolName(e.target.value)}
                           className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                           placeholder="Contoh: SD NEGERI 1 MAWAR"
                        />
                     </div>
                   </div>
               )}

               <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                       <Mail size={20} />
                    </div>
                    <input 
                       type="email" 
                       required
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                       placeholder="sekolah@dikbud.id"
                    />
                 </div>
               </div>
               
               <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                 <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                       <Lock size={20} />
                    </div>
                    <input 
                       type="password" 
                       required
                       minLength={6}
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                       placeholder="Masukkan password..."
                    />
                 </div>
               </div>

               <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-3 mt-4 active:scale-[0.98]"
               >
                  {loading ? (
                     <Loader2 className="animate-spin" size={20} />
                  ) : (
                     <>
                        <span className="text-lg">{isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang'}</span>
                        {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                     </>
                  )}
               </button>
            </form>

            <div className="mt-8 text-center pt-8 border-t border-gray-100">
               <p className="text-gray-500">
                  {isLogin ? 'Belum bergabung?' : 'Sudah terdaftar?'} 
                  <button 
                     onClick={() => { setIsLogin(!isLogin); setError(''); }}
                     className="text-blue-600 font-bold ml-2 hover:text-blue-700 transition-colors"
                  >
                     {isLogin ? 'Buat Akun Baru' : 'Masuk ke Akun'}
                  </button>
               </p>
            </div>
          </div>
          
          <p className="mt-10 text-center text-xs text-gray-400 uppercase tracking-widest leading-loose">
             RKAS Pintar v1.2 &bull; Smart & Transparent Financial Management<br/>
             Made for SD Schools in Indonesia
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper component for error display
const AlertCircle = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default Auth;