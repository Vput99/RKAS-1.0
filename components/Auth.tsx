import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, ArrowRight, UserPlus, LogIn, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!supabase) {
        // Mock login for offline/demo mode
        setTimeout(() => {
            onLoginSuccess();
            setLoading(false);
        }, 1000);
        return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Registrasi berhasil! Silakan cek email Anda untuk verifikasi (jika diaktifkan) atau langsung login.');
        setIsLogin(true); // Switch to login after signup
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-4 shadow-lg">
                <ShieldCheck size={32} />
             </div>
             <h1 className="text-2xl font-bold">RKAS Pintar SD</h1>
             <p className="text-blue-100 text-sm mt-1">Sistem Manajemen Anggaran Sekolah</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
           <div className="flex justify-center mb-6 bg-gray-100 p-1 rounded-lg">
              <button 
                 onClick={() => { setIsLogin(true); setError(''); }}
                 className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                 Masuk
              </button>
              <button 
                 onClick={() => { setIsLogin(false); setError(''); }}
                 className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                 Daftar
              </button>
           </div>

           <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">
             {isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
           </h2>
           <p className="text-center text-gray-500 text-sm mb-6">
             {isLogin ? 'Masukkan kredensial Anda untuk mengakses dashboard.' : 'Daftarkan email sekolah untuk mulai menggunakan aplikasi.'}
           </p>

           {error && (
             <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
             </div>
           )}

           <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Email</label>
                <div className="relative">
                   <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                   <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="sekolah@pendidikan.id"
                   />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Password</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                   <input 
                      type="password" 
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="••••••••"
                   />
                </div>
              </div>

              <button 
                 type="submit" 
                 disabled={loading}
                 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                 {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                 ) : (
                    <>
                       {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                       {isLogin ? 'Masuk ke Aplikasi' : 'Daftar Sekarang'}
                    </>
                 )}
              </button>
           </form>

           <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                 {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'} 
                 <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-600 font-bold ml-1 hover:underline"
                 >
                    {isLogin ? 'Daftar disini' : 'Login disini'}
                 </button>
              </p>
           </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
           <p className="text-[10px] text-gray-400">
              Aplikasi RKAS Pintar v1.0 &copy; 2026<br/>
              Mendukung Install PWA & Offline Mode
           </p>
        </div>
      </div>
    </div>
  );
};

// Helper component for error display inside Auth (redundant due to lucide import but good for safety)
const AlertCircle = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default Auth;