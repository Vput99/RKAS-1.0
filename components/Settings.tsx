import React, { useState, useEffect } from 'react';
import { SchoolProfile } from '../types';
import { Save, School, Users, Wallet, Calendar, AlertCircle, Database, Wifi, WifiOff, CheckCircle2, FileText, Activity } from 'lucide-react';
import { getSchoolProfile, saveSchoolProfile, checkDatabaseConnection } from '../lib/db';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  onProfileUpdate: (profile: SchoolProfile) => void;
}

const Settings: React.FC<SettingsProps> = ({ onProfileUpdate }) => {
  const [profile, setProfile] = useState<SchoolProfile>({
    name: '',
    npsn: '',
    address: '',
    headmaster: '',
    headmasterNip: '',
    treasurer: '',
    treasurerNip: '',
    fiscalYear: '2026',
    studentCount: 0,
    budgetCeiling: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [envStatus, setEnvStatus] = useState({ url: false, key: false });

  useEffect(() => {
    loadProfile();
    checkConnection();
    checkEnvVars();
  }, []);

  const checkEnvVars = () => {
    // Check if variables are loaded (without exposing values)
    const isUrlSet = !!supabase; 
    // If supabase client exists, it means URL and Key were provided in lib/supabase.ts
    setEnvStatus({
      url: isUrlSet,
      key: isUrlSet
    });
  };

  const loadProfile = async () => {
    const data = await getSchoolProfile();
    setProfile(data);
    setLoading(false);
  };

  const checkConnection = async () => {
    const status = await checkDatabaseConnection();
    setIsConnected(status);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'studentCount' || name === 'budgetCeiling' ? Number(value) : value
    }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSchoolProfile(profile);
    onProfileUpdate(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Pengaturan Sekolah</h2>
           <p className="text-sm text-gray-500">Kelola data identitas sekolah dan pagu anggaran.</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`rounded-xl shadow-sm border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isConnected ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
         <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isConnected ? 'bg-green-200 text-green-700' : 'bg-orange-200 text-orange-700'}`}>
               <Database size={24} />
            </div>
            <div>
               <h3 className={`font-bold ${isConnected ? 'text-green-800' : 'text-orange-800'}`}>
                  {isConnected ? 'Terhubung ke Database Cloud' : 'Mode Penyimpanan Lokal'}
               </h3>
               <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-orange-700'}`}>
                  {isConnected 
                     ? 'Data tersimpan aman di Supabase. Anda bisa mengaksesnya dari perangkat lain.' 
                     : 'Data hanya tersimpan di browser ini. Data akan hilang jika cache dibersihkan.'}
               </p>
            </div>
         </div>
         <div className="hidden sm:block">
            {isConnected ? <Wifi className="text-green-500" size={24} /> : <WifiOff className="text-orange-400" size={24} />}
         </div>
      </div>

      {/* Diagnostic Panel (Only visible if offline) */}
      {!isConnected && (
        <div className="bg-gray-800 text-gray-300 p-5 rounded-xl text-sm font-mono space-y-3 border border-gray-700 shadow-xl">
           <div className="flex items-center gap-2 text-white font-bold border-b border-gray-700 pb-2 mb-2">
              <Activity size={16} className="text-red-400" /> DIAGNOSA MASALAH KONEKSI
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900/50 p-3 rounded">
                 <span className="block text-gray-500 text-xs mb-1">Status Variabel Environment:</span>
                 {envStatus.url ? (
                    <span className="text-green-400 font-bold">✅ Ditemukan</span>
                 ) : (
                    <span className="text-red-400 font-bold">❌ Tidak Ditemukan (URL/Key Kosong)</span>
                 )}
              </div>
              <div className="bg-gray-900/50 p-3 rounded">
                 <span className="block text-gray-500 text-xs mb-1">Tes Koneksi Server:</span>
                 <span className="text-red-400 font-bold">❌ Gagal (Tidak ada respon)</span>
              </div>
           </div>

           <div className="mt-4 pt-4 border-t border-gray-600">
              <p className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> SOLUSI PERBAIKAN DI VERCEL:
              </p>
              <div className="bg-gray-900 p-4 rounded text-gray-300 space-y-3">
                <p>Aplikasi Vite memerlukan prefix <code>VITE_</code> agar variabel bisa dibaca oleh browser.</p>
                <ol className="list-decimal pl-5 space-y-2">
                   <li>
                     Buka Dashboard Vercel &gt; Settings &gt; Environment Variables.
                   </li>
                   <li>
                     Ganti nama (Edit) variabel Anda menjadi:
                     <ul className="list-disc pl-5 mt-1 text-white font-bold">
                       <li>Key 1: <span className="text-green-400">VITE_SUPABASE_URL</span></li>
                       <li>Key 2: <span className="text-green-400">VITE_SUPABASE_ANON_KEY</span></li>
                     </ul>
                     <span className="text-xs text-gray-500 block mt-1">(Jangan gunakan hanya SUPABASE_URL tanpa awalan VITE_)</span>
                   </li>
                   <li>
                     <strong>PENTING:</strong> Setelah mengubah nama variabel, buka tab <strong>Deployments</strong>, klik titik tiga pada deployment paling atas, lalu pilih <strong>Redeploy</strong>.
                   </li>
                   <li>
                     Tanpa Redeploy, perubahan nama variabel tidak akan diterapkan.
                   </li>
                </ol>
              </div>
           </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Identitas Sekolah */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
             <School className="text-blue-600" size={18} /> Identitas Satuan Pendidikan
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
                <input
                  required
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: SD Negeri 1 Nusantara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NPSN</label>
                <input
                  required
                  type="text"
                  name="npsn"
                  value={profile.npsn}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
                <div className="relative">
                   <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400" />
                   <input
                    required
                    type="text"
                    name="fiscalYear"
                    value={profile.fiscalYear}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
           </div>
        </div>

        {/* Data Anggaran & Siswa */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
             <Wallet className="text-green-600" size={18} /> Pagu & Kesiswaan
           </h3>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                 <div className="flex items-center gap-2 mb-2 text-blue-800 font-medium">
                    <Users size={18} /> Jumlah Peserta Didik (Cut Off)
                 </div>
                 <input
                    required
                    type="number"
                    min="0"
                    name="studentCount"
                    value={profile.studentCount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold text-gray-800"
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    Jumlah siswa per cut-off data Dapodik (Biasanya 31 Agustus tahun sebelumnya).
                  </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                 <div className="flex items-center gap-2 mb-2 text-green-800 font-medium">
                    <Wallet size={18} /> Total Pagu Anggaran (1 Tahun)
                 </div>
                 <input
                    required
                    type="number"
                    min="0"
                    name="budgetCeiling"
                    value={profile.budgetCeiling}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold text-gray-800"
                  />
                  <div className="flex justify-between items-center mt-2 text-xs">
                     <span className="text-green-600">Estimasi per Siswa:</span>
                     <span className="font-mono font-bold text-green-700">
                        {profile.studentCount > 0 
                           ? formatRupiah(profile.budgetCeiling / profile.studentCount) 
                           : 'Rp 0'}
                     </span>
                  </div>
              </div>
           </div>
        </div>

        {/* Penandatangan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
             <FileText size={18} className="text-gray-600" /> Data Penandatangan Dokumen
           </h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmaster"
                  value={profile.headmaster}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmasterNip"
                  value={profile.headmasterNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bendahara</label>
                <input
                  type="text"
                  name="treasurer"
                  value={profile.treasurer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIP Bendahara</label>
                <input
                  type="text"
                  name="treasurerNip"
                  value={profile.treasurerNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
            {saved && (
                <div className="flex items-center text-green-600 gap-2 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Pengaturan berhasil disimpan!</span>
                </div>
            )}
            <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-lg font-medium"
            >
                <Save size={18} />
                Simpan Perubahan
            </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;