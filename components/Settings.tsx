import React, { useState, useEffect } from 'react';
import { SchoolProfile } from '../types';
import { Save, School, Users, Wallet, Calendar, AlertCircle, Database, Wifi, WifiOff, CheckCircle2, FileText } from 'lucide-react';
import { getSchoolProfile, saveSchoolProfile, checkDatabaseConnection } from '../lib/db';

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

  useEffect(() => {
    loadProfile();
    checkConnection();
  }, []);

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Pengaturan Sekolah</h2>
           <p className="text-sm text-gray-500">Kelola data identitas sekolah dan pagu anggaran.</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className={`rounded-xl shadow-sm border p-4 flex items-center justify-between ${isConnected ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
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
                     ? 'Data tersimpan aman di Supabase (Cloud). Data tidak akan hilang saat browser ditutup.' 
                     : 'Data tersimpan di Browser (Local Storage). Hubungkan ke Supabase di Vercel agar data permanen.'}
               </p>
            </div>
         </div>
         <div className="hidden sm:block">
            {isConnected ? <Wifi className="text-green-500" size={24} /> : <WifiOff className="text-orange-400" size={24} />}
         </div>
      </div>

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