import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SchoolProfile, AccountCodes } from '../types';
import { Save, School, Users, Wallet, Calendar, Database, Wifi, WifiOff, CheckCircle2, CreditCard, Image as ImageIcon, Upload, Edit3, Plus, Trash2, List, FileSpreadsheet, RefreshCcw, UserCircle, LogOut, FileText, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { getSchoolProfile, saveSchoolProfile, checkDatabaseConnection, getStoredAccounts, saveCustomAccount, deleteCustomAccount, bulkSaveCustomAccounts, resetAllData } from '../lib/db';
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
    budgetCeiling: 0,
    city: '',
    district: '',
    postalCode: '',
    bankName: '',
    bankBranch: '',
    bankAddress: '',
    accountNo: '',
    headerImage: ''
  });

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  // Custom Accounts State
  const [customAccounts, setCustomAccounts] = useState<Record<string, string>>({});
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<{ code: string, name: string }[]>([]);
  const [importMode, setImportMode] = useState<'input' | 'preview'>('input');

  useEffect(() => {
    loadProfile();
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

  const loadProfile = async () => {
    const data = await getSchoolProfile();
    setProfile(prev => ({ ...prev, ...data }));
    setLoading(false);
  };

  const loadAccounts = async () => {
    setIsAccountLoading(true);
    const accounts = await getStoredAccounts();
    setCustomAccounts(accounts);
    setIsAccountLoading(false);
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
    await saveSchoolProfile(profile);
    onProfileUpdate(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.reload();
  };

  // --- CUSTOM ACCOUNTS LOGIC ---

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    setIsAccountLoading(true);
    const updated = await saveCustomAccount(newCode, newName);
    setCustomAccounts(updated);
    setNewCode('');
    setNewName('');
    setIsAccountLoading(false);
  };

  const handleDeleteAccount = async (code: string) => {
    if (confirm(`Hapus rekening ${code}?`)) {
      setIsAccountLoading(true);
      const updated = await deleteCustomAccount(code);
      setCustomAccounts(updated);
      setIsAccountLoading(false);
    }
  };

  const handleParseBulk = () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    const parsed: { code: string, name: string }[] = [];

    lines.forEach(line => {
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(';')) {
        parts = line.split(';');
      } else if (line.includes(' - ')) {
        parts = line.split(' - ');
      }

      if (parts.length >= 2) {
        const code = parts[0].trim();
        const name = parts.slice(1).join(' ').trim();
        if (code.length > 3 && name.length > 2) {
          parsed.push({ code, name });
        }
      }
    });

    if (parsed.length === 0) {
      alert("Tidak ada data valid yang ditemukan. Pastikan format: KODE [Tab] NAMA");
      return;
    }

    setPreviewData(parsed);
    setImportMode('preview');
  };

  const handleConfirmImport = async () => {
    const newMap: Record<string, string> = {};
    previewData.forEach(item => {
      newMap[item.code] = item.name;
    });

    setIsAccountLoading(true);
    const updated = await bulkSaveCustomAccounts(newMap);
    setCustomAccounts(updated);

    setBulkText('');
    setPreviewData([]);
    setImportMode('input');
    setIsAccountLoading(false);
    alert(`Berhasil menambahkan ${previewData.length} rekening baru.`);
  };

  const handleResetData = async () => {
    if (confirm("PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data Transaksi, Rapor, dan Riwayat? \n\nData Profil Sekolah dan Akun Belanja Custom TIDAK akan dihapus.\n\nTindakan ini tidak dapat dibatalkan!")) {
      setLoading(true);
      const success = await resetAllData();
      setLoading(false);
      if (success) {
        alert("Data berhasil di-reset. Aplikasi akan dimuat ulang.");
        window.location.reload();
      } else {
        alert("Gagal melakukan reset data.");
      }
    }
  }

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-slate-400">
      <RefreshCcw className="animate-spin mb-4 text-blue-500" size={32} />
      <p className="font-medium animate-pulse">Memuat pengaturan...</p>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto pb-10">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-slate-200/50 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 flex items-center gap-1"><SettingsIcon size={12}/> Sistem</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pengaturan Sekolah</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Kelola identitas, akun, pengguna, dan parameter aplikasi.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-slate-200/50 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </motion.div>

      {/* Account & Connection Status Area */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Info Card (SaaS Feature) */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl shadow-lg shadow-slate-200/40 border border-white p-5 flex items-center justify-between group hover:shadow-xl transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-2xl text-blue-600 shadow-inner">
              <UserCircle size={28} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Akun Sekolah Login</p>
              <p className="text-lg font-black text-slate-800 tracking-tight">{userEmail}</p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1 bg-emerald-50 w-max px-2 py-0.5 rounded-md border border-emerald-100">
                <CheckCircle2 size={10} /> Aktif & Terproteksi
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>

        {/* Connection Status Card */}
        <div className={`rounded-3xl shadow-lg border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all group hover:shadow-xl backdrop-blur-md ${isConnected ? 'bg-emerald-50/60 border-emerald-100/50 shadow-emerald-100/30' : 'bg-orange-50/60 border-orange-100/50 shadow-orange-100/30'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-inner ${isConnected ? 'bg-emerald-200/50 text-emerald-700' : 'bg-orange-200/50 text-orange-700'}`}>
              <Database size={28} className={isConnected ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className={`font-black tracking-tight ${isConnected ? 'text-emerald-800' : 'text-orange-800'}`}>
                {isConnected ? 'Terhubung ke Database Cloud' : 'Mode Penyimpanan Lokal'}
              </h3>
              <p className={`text-[11px] font-medium leading-tight mt-1 ${isConnected ? 'text-emerald-600/80' : 'text-orange-700/80'}`}>
                {isConnected
                  ? 'Data tersimpan aman di Supabase. Anda bisa mengaksesnya dari perangkat lain.'
                  : 'Data hanya tersimpan di browser ini. Data akan hilang jika cache dibersihkan.'}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex bg-white/50 p-2.5 rounded-xl shadow-sm border border-black/5">
            {isConnected ? <Wifi className="text-emerald-500" size={20} /> : <WifiOff className="text-orange-500" size={20} />}
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Identitas Sekolah */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl"><School size={20} /></div>
            Identitas Satuan Pendidikan
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
              <input
                type="text"
                name="city"
                value={profile.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="KOTA KEDIRI"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  name="district"
                  value={profile.district}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
                <input
                  type="text"
                  name="postalCode"
                  value={profile.postalCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Rekening Bank */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6 relative overflow-hidden">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><CreditCard size={20} /></div>
              Data Rekening Bank Sekolah
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
              <input
                type="text"
                name="bankName"
                value={profile.bankName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="PT. BPD JAWA TIMUR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
              <input
                type="text"
                name="bankBranch"
                value={profile.bankBranch}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="KEDIRI"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Bank</label>
              <input
                type="text"
                name="bankAddress"
                value={profile.bankAddress}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
              <input
                type="text"
                name="accountNo"
                value={profile.accountNo}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg"
              />
            </div>
          </motion.div>

          {/* Kop Surat */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6 relative overflow-hidden">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-purple-100 text-purple-600 p-2 rounded-xl"><ImageIcon size={20} /></div>
              Kop Surat & Logo
            </h3>
            <div className="flex flex-col gap-6 items-start h-full">
              <div className="flex-1 w-full relative group">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Logo (Kiri Atas)</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500"><span className="font-semibold">Klik untuk upload</span></p>
                  <p className="text-xs text-gray-400">PNG, JPG (Transparan disarankan)</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            {profile.headerImage && (
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview Logo</label>
                <div className="relative border border-gray-200 rounded-lg overflow-hidden h-32 flex items-center justify-center bg-gray-50 p-2">
                  <img src={profile.headerImage} alt="Kop Surat" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setProfile(prev => ({ ...prev, headerImage: '' }))}
                    className="absolute top-2 right-2 bg-white text-rose-500 rounded-xl p-2 shadow-lg hover:bg-rose-50 border border-rose-100 transform hover:scale-105 active:scale-95 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </div>

        {/* MANAJEMEN REKENING BARU */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100/50">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl"><List size={20} /></div>
              Manajemen Kode Rekening (Akun Belanja)
            </h3>
            <button onClick={loadAccounts} className="text-gray-400 hover:text-blue-600" title="Refresh Akun">
              <RefreshCcw size={16} className={isAccountLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Manual List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Daftar Rekening (Database)</h4>

              {/* Manual Add Form */}
              <form onSubmit={handleAddAccount} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-1">Kode</label>
                  <input required type="text" value={newCode} onChange={e => setNewCode(e.target.value)} className="w-full px-2 py-1.5 border rounded text-xs" placeholder="5.1.02..." />
                </div>
                <div className="flex-[2]">
                  <label className="block text-[10px] text-gray-400 mb-1">Nama Rekening</label>
                  <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-2 py-1.5 border rounded text-xs" placeholder="Belanja..." />
                </div>
                <button type="submit" disabled={isAccountLoading} className="bg-blue-600 text-white p-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
                  <Plus size={18} />
                </button>
              </form>

              <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Kode</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.entries(customAccounts).length === 0 ? (
                      <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">Belum ada data rekening.</td></tr>
                    ) : (
                      Object.entries(customAccounts).map(([code, name]) => {
                        // @ts-ignore
                        const isStatic = !!AccountCodes[code];

                        return (
                          <tr key={code} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{code}</td>
                            <td className="px-3 py-2 text-xs">{name}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleDeleteAccount(code)}
                                className="text-gray-300 hover:text-red-500"
                                title={isStatic ? "Akun standar sistem (hati-hati menghapus)" : "Hapus akun"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Bulk Import (Copy Paste) */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                <FileSpreadsheet size={14} /> Import dari Excel (Copy-Paste)
              </h4>

              {importMode === 'input' ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800">
                    <strong>Cara Cepat:</strong>
                    <ol className="list-decimal ml-4 mt-1 space-y-1">
                      <li>Buka file Excel RKAS Anda.</li>
                      <li>Blok kolom <b>Kode Rekening</b> dan <b>Uraian</b> (sebelah-sebelahan).</li>
                      <li>Copy (Ctrl+C).</li>
                      <li>Paste (Ctrl+V) di kotak di bawah ini.</li>
                    </ol>
                  </div>
                  <textarea
                    className="w-full h-40 p-3 border rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none whitespace-pre"
                    placeholder={`Paste data Excel di sini...\n\nContoh Format:\n5.1.02.01.01.0024   Belanja Alat Tulis Kantor\n5.1.02.01.01.0026   Belanja Bahan Cetak`}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleParseBulk}
                    disabled={!bulkText}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Preview Data
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-100 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-green-800">{previewData.length} Data Terdeteksi</p>
                      <p className="text-xs text-green-600">Silakan cek sebelum disimpan.</p>
                    </div>
                    <button onClick={() => setImportMode('input')} className="text-xs text-gray-500 underline">Batal</button>
                  </div>

                  <div className="h-40 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                    <table className="w-full text-xs">
                      <tbody className="divide-y divide-gray-200">
                        {previewData.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-2 py-1 font-mono text-gray-600">{item.code}</td>
                            <td className="px-2 py-1 font-medium">{item.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportMode('input')}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={isAccountLoading}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> {isAccountLoading ? 'Menyimpan...' : 'Simpan Semua'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Anggaran & Siswa */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-cyan-100 text-cyan-600 p-2 rounded-xl"><Wallet size={20} /></div>
              Pagu & Kesiswaan
            </h3>

            <div className="space-y-6">
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 shadow-inner">
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

              <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-emerald-800 font-bold">
                  <Wallet size={18} className="text-emerald-500" /> Total Pagu Anggaran (1 Tahun)
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
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-emerald-200/30 text-xs">
                  <span className="text-emerald-600 font-bold">Estimasi per Siswa:</span>
                  <span className="font-mono font-black text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-md">
                  {profile.studentCount > 0
                    ? formatRupiah(profile.budgetCeiling / profile.studentCount)
                    : 'Rp 0'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Penandatangan */}
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-6">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3 pb-4 border-b border-slate-100/50">
              <div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><FileText size={20} /></div>
              Data Penandatangan Dokumen
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmaster"
                  value={profile.headmaster}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="headmasterNip"
                  value={profile.headmasterNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Bendahara</label>
                <input
                  type="text"
                  name="treasurer"
                  value={profile.treasurer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NIP Bendahara</label>
                <input
                  type="text"
                  name="treasurerNip"
                  value={profile.treasurerNip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* DANGER ZONE */}
        <motion.div variants={itemVariants} className="bg-rose-50/80 backdrop-blur-md rounded-[2rem] shadow-xl shadow-rose-200/40 border border-rose-200/60 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-rose-100/50 rotate-12 pointer-events-none">
             <AlertTriangle size={150} />
          </div>
          <div className="relative z-10 w-full md:w-2/3">
              <h3 className="text-xl font-black text-rose-800 mb-3 flex items-center gap-3">
                <div className="bg-rose-100 text-rose-600 p-2 rounded-xl"><AlertTriangle size={24} /></div>
                Zona Bahaya (Reset Data)
              </h3>
              <p className="text-sm text-rose-600/90 mb-6 font-medium leading-relaxed">
            Jika Anda ingin memulai dari awal (misalnya tahun anggaran baru), Anda dapat menghapus semua data transaksi, rapor, dan riwayat pencairan. Data Profil Sekolah tidak akan dihapus.
          </p>
              <button
                type="button"
                onClick={handleResetData}
                className="bg-white/80 backdrop-blur-md border border-rose-200 text-rose-600 hover:bg-rose-600 hover:border-rose-600 hover:text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-lg hover:shadow-rose-600/30 flex items-center gap-2 active:scale-95"
              >
                <Trash2 size={18} /> Hapus Semua Data Transaksi
              </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end gap-4 pb-8">
          {saved && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center text-emerald-600 gap-2 font-bold px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Pengaturan disimpan!</span>
            </motion.div>
          )}
          <motion.button
            type="submit"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/30 font-black text-lg border border-white/20"
          >
            <Save size={24} />
            Simpan Perubahan
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default Settings;
