import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SchoolProfile } from '../types';
import { 
  Save, School, Users, Wallet, Calendar, Database, Wifi, WifiOff, 
  CheckCircle2, CreditCard, Image as ImageIcon, Upload, Plus, 
  Trash2, List, FileSpreadsheet, RefreshCcw, UserCircle, LogOut, 
  FileText, AlertTriangle, Settings as SettingsIcon 
} from 'lucide-react';
import { 
  checkDatabaseConnection, getStoredAccounts, saveCustomAccount, 
  deleteCustomAccount, bulkSaveCustomAccounts, resetAllData, 
  initializeUserAccounts 
} from '../lib/db';
import { supabase } from '../lib/supabase';
import { useSchoolProfile, useSaveSchoolProfile } from '../hooks/useRKASQueries';

interface SettingsProps {
  onProfileUpdate?: (profile: SchoolProfile) => void;
}

const Settings: React.FC<SettingsProps> = () => {
  // --- React Query Hooks ---
  const { data: profileData, isLoading: profileLoading } = useSchoolProfile();
  const saveProfileMutation = useSaveSchoolProfile();

  const [profile, setProfile] = useState<SchoolProfile>({
    name: '', npsn: '', address: '', headmaster: '', headmasterNip: '',
    treasurer: '', treasurerNip: '', fiscalYear: '2026', studentCount: 0,
    budgetCeiling: 0, city: '', district: '', postalCode: '',
    bankName: '', bankBranch: '', bankAddress: '', accountNo: '', headerImage: ''
  });

  const [saved, setSaved] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // Custom Accounts State
  const [customAccounts, setCustomAccounts] = useState<Record<string, string>>({});
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<{ code: string, name: string }[]>([]);
  const [importMode, setImportMode] = useState<'input' | 'preview'>('input');

  useEffect(() => { if (profileData) setProfile(profileData); }, [profileData]);

  useEffect(() => {
    checkConnection();
    loadAccounts();
    getUserInfo();
  }, []);

  const getUserInfo = async () => {
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) setUserEmail(data.user.email);
    } else {
      setUserEmail('Mode Tamu (Offline)');
    }
  };

  const loadAccounts = async () => {
    const accounts = await getStoredAccounts();
    setCustomAccounts(accounts);
  };

  const checkConnection = async () => {
    const status = await checkDatabaseConnection();
    setIsConnected(status);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: name === 'studentCount' || name === 'budgetCeiling' ? Number(value) : value
    }));
    setSaved(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, headerImage: reader.result as string }));
        setSaved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfileMutation.mutateAsync(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.reload();
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    const updated = await saveCustomAccount(newCode, newName);
    setCustomAccounts(updated);
    setNewCode(''); setNewName('');
  };

  const handleDeleteAccount = async (code: string) => {
    if (confirm(`Hapus rekening ${code}?`)) {
      const updated = await deleteCustomAccount(code);
      setCustomAccounts(updated);
    }
  };

  const handleParseBulk = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    const parsed: { code: string, name: string }[] = [];
    lines.forEach(line => {
      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(';')) parts = line.split(';');
      else if (line.includes(' - ')) parts = line.split(' - ');
      if (parts.length >= 2) {
        const code = parts[0].trim();
        const name = parts.slice(1).join(' ').trim();
        if (code.length > 3 && name.length > 2) parsed.push({ code, name });
      }
    });
    if (parsed.length === 0) {
      alert("Format tidak valid.");
      return;
    }
    setPreviewData(parsed); setImportMode('preview');
  };

  const handleConfirmImport = async () => {
    const newMap: Record<string, string> = {};
    previewData.forEach(item => { newMap[item.code] = item.name; });
    const updated = await bulkSaveCustomAccounts(newMap);
    setCustomAccounts(updated);
    setBulkText(''); setPreviewData([]); setImportMode('input');
    alert(`Berhasil mengimpor ${previewData.length} rekening.`);
  };

  const handleInitializeFromDefaults = async () => {
    if (confirm("Salin standar BOSP?")) {
      const updated = await initializeUserAccounts();
      setCustomAccounts(updated);
    }
  };

  const handleResetData = async () => {
    if (confirm("Hapus SEMUA data?")) {
      const success = await resetAllData();
      if (success) window.location.reload();
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  if (profileLoading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-slate-400">
      <RefreshCcw className="animate-spin mb-4 text-blue-500" size={32} />
      <p className="font-medium animate-pulse text-xs tracking-widest uppercase">Syncing Cloud...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto pb-10 px-4">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 flex items-center gap-1">
                <SettingsIcon size={12}/> Sistem
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Sekolah</h2>
          </div>
          <button onClick={handleLogout} className="text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-lg border border-white p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><UserCircle size={28} /></div>
          <div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Akun Login</p>
            <p className="text-sm font-black text-slate-800 tracking-tight">{userEmail}</p>
          </div>
        </div>
        <div className={`rounded-3xl shadow-lg border p-5 flex items-center justify-between gap-4 backdrop-blur-md ${isConnected ? 'bg-emerald-50/60 border-emerald-100/50' : 'bg-orange-50/60 border-orange-100/50'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isConnected ? 'bg-emerald-200 text-emerald-700' : 'bg-orange-200 text-orange-700'}`}>
              <Database size={28} />
            </div>
            <h3 className="font-black text-sm">{isConnected ? 'Terhubung Cloud' : 'Mode Offline'}</h3>
          </div>
          {isConnected ? <Wifi className="text-emerald-500" size={20} /> : <WifiOff className="text-orange-500" size={20} />}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Form */}
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white p-6 md:p-8">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><School size={20} /></div>
            Identitas Sekolah
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Sekolah</label>
              <input required type="text" name="name" value={profile.name} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NPSN</label>
              <input required type="text" name="npsn" value={profile.npsn} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:blue-500 outline-none" />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Anggaran</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input required type="text" name="fiscalYear" value={profile.fiscalYear} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:blue-500 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Pagu & Bank */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white p-6">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><Wallet size={20} /></div>
              Pagu Anggaran
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Siswa</label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="number" name="studentCount" value={profile.studentCount} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Pagu Setahun</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input type="number" name="budgetCeiling" value={profile.budgetCeiling} onChange={handleChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold" />
                </div>
                <p className="text-[10px] text-emerald-600 font-bold mt-2 text-right">Rata-rata: {profile.studentCount > 0 ? formatRupiah(profile.budgetCeiling / profile.studentCount) : 'Rp 0'}/siswa</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white p-6">
             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-purple-100 text-purple-600 p-2 rounded-xl"><ImageIcon size={20} /></div>
              Logo & Kop Surat
            </h3>
            <div className="flex flex-col gap-4">
              {!profile.headerImage ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl bg-slate-50 cursor-pointer hover:bg-slate-100">
                  <Upload className="text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-500">Upload Logo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              ) : (
                <div className="relative h-32 bg-slate-50 rounded-2xl p-4 flex items-center justify-center">
                   <img src={profile.headerImage} alt="Logo" className="max-h-full max-w-full object-contain" />
                   <button type="button" onClick={() => setProfile(p => ({...p, headerImage: ''}))} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors">
                     <Trash2 size={14} />
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manajemen Rekening */}
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white p-6 md:p-8">
           <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100/50">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><List size={20} /></div>
              Daftar Rekening Belanja
            </h3>
            <button type="button" onClick={handleInitializeFromDefaults} className="text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Plus size={10} /> Salin Standar BOSP
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
                <div className="flex gap-2">
                  <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Kode" className="w-24 px-3 py-1.5 border rounded-lg text-xs" />
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama Rekening" className="flex-1 px-3 py-1.5 border rounded-lg text-xs" />
                  <button type="button" onClick={handleAddAccount} className="bg-blue-600 text-white p-1.5 rounded-lg"><Plus size={18}/></button>
                </div>
                <div className="h-60 overflow-y-auto border rounded-xl bg-slate-50/50">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr><th className="px-3 py-2">Kode</th><th className="px-3 py-2">Nama</th><th className="px-3 py-2"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(customAccounts).map(([code, name]) => (
                        <tr key={code} className="hover:bg-blue-50/30">
                          <td className="px-3 py-2 font-mono text-slate-500">{code}</td>
                          <td className="px-3 py-2 font-medium">{name}</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" onClick={() => handleDeleteAccount(code)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><FileSpreadsheet size={14}/> Bulk Import (Copy-Paste Excel)</h4>
                {importMode === 'input' ? (
                  <>
                    <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-40 p-3 bg-slate-50 border rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" placeholder="Paste: KODE [TAB] NAMA..." />
                    <button type="button" onClick={handleParseBulk} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200">Preview Data</button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="h-40 overflow-y-auto border rounded-xl bg-emerald-50/30 p-2 text-[10px]">
                      {previewData.map((d, i) => <div key={i} className="flex gap-2 py-1 border-b border-emerald-100"><span className="font-bold">{d.code}</span>{d.name}</div>)}
                    </div>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setImportMode('input')} className="flex-1 py-2 border rounded-xl text-xs font-bold">Batal</button>
                       <button type="button" onClick={handleConfirmImport} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Simpan ({previewData.length})</button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Penandatangan Form */}
        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl border border-white p-6">
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
            <div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><FileText size={20} /></div>
            Penandatangan Dokumen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Kepala Sekolah</label>
              <input type="text" name="headmaster" value={profile.headmaster} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIP Kepala Sekolah</label>
              <input type="text" name="headmasterNip" value={profile.headmasterNip} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Bendahara</label>
              <input type="text" name="treasurer" value={profile.treasurer} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIP Bendahara</label>
              <input type="text" name="treasurerNip" value={profile.treasurerNip} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-rose-800 font-black flex items-center gap-2"><AlertTriangle size={20}/> Zona Bahaya</h3>
            <p className="text-xs text-rose-600 font-medium">Reset semua data transaksi dan laporan (tidak dapat dibatalkan).</p>
          </div>
          <button type="button" onClick={handleResetData} className="px-6 py-3 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold text-xs hover:bg-rose-600 hover:text-white transition-all shadow-sm">
             <Trash2 size={16} className="inline mr-2"/> Reset Seluruh Data
          </button>
        </div>

        {/* Submit */}
        <div className="flex justify-end items-center gap-4 py-6">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={14}/> Perubahan Disimpan!
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" disabled={saveProfileMutation.isPending} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50">
            {saveProfileMutation.isPending ? <RefreshCcw className="animate-spin" /> : <Save className="mr-2 inline" size={20} />} 
            Simpan Perubahan
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Settings;
