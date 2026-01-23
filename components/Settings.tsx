import React, { useState, useEffect } from 'react';
import { SchoolProfile, AccountCodes } from '../types';
import { Save, School, Users, Wallet, Calendar, AlertCircle, Database, Wifi, WifiOff, CheckCircle2, FileText, Activity, CreditCard, Image as ImageIcon, Upload, Edit3, Plus, Trash2, List, FileSpreadsheet, ArrowRight, RefreshCcw } from 'lucide-react';
import { getSchoolProfile, saveSchoolProfile, checkDatabaseConnection, getStoredAccounts, saveCustomAccount, deleteCustomAccount, bulkSaveCustomAccounts } from '../lib/db';
import { supabase } from '../lib/supabase';
import { isAiConfigured } from '../lib/gemini';

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
    // Defaults for new fields
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
  
  // Custom Accounts State
  const [customAccounts, setCustomAccounts] = useState<Record<string, string>>({});
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  
  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [previewData, setPreviewData] = useState<{code: string, name: string}[]>([]);
  const [importMode, setImportMode] = useState<'input' | 'preview'>('input');

  useEffect(() => {
    loadProfile();
    checkConnection();
    loadAccounts();
  }, []);

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
      if(confirm(`Hapus rekening ${code}?`)) {
          setIsAccountLoading(true);
          const updated = await deleteCustomAccount(code);
          setCustomAccounts(updated);
          setIsAccountLoading(false);
      }
  };

  const handleParseBulk = () => {
      if (!bulkText.trim()) return;
      
      const lines = bulkText.split('\n');
      const parsed: {code: string, name: string}[] = [];
      
      lines.forEach(line => {
          // Logic: Split by Tab (Excel copy) OR Semicolon OR Dash
          // Priority: Tab -> Semicolon -> Dash
          let parts: string[] = [];
          
          if (line.includes('\t')) {
              parts = line.split('\t');
          } else if (line.includes(';')) {
              parts = line.split(';');
          } else if (line.includes(' - ')) { // Space Dash Space to avoid hyphens in words
              parts = line.split(' - ');
          }

          // Clean up
          if (parts.length >= 2) {
              const code = parts[0].trim();
              const name = parts.slice(1).join(' ').trim(); // Join rest in case name has separators
              
              // Basic validation: Code should look like a code (numbers/dots)
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

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Pengaturan Sekolah</h2>
           <p className="text-sm text-gray-500">Kelola identitas, data bank, dan parameter sistem.</p>
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

      {/* MANAJEMEN REKENING BARU */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
         <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
             <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                 <List className="text-indigo-600" size={18} /> Manajemen Kode Rekening (Akun Belanja)
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
                                     // Check if it's a default static account to prevent deletion if desired
                                     // For now we allow deletion from the custom view context, but real deletion only happens if in DB
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
        </div>

        {/* Data Rekening Bank */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
             <CreditCard className="text-purple-600" size={18} /> Data Rekening Bank Sekolah
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
           </div>
        </div>

        {/* Kop Surat */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
           <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
             <ImageIcon className="text-indigo-600" size={18} /> Kop Surat & Logo
           </h3>
           <div className="flex flex-col md:flex-row gap-6 items-start">
               <div className="flex-1 w-full">
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
                            onClick={() => setProfile(prev => ({...prev, headerImage: ''}))}
                            className="absolute top-2 right-2 bg-white text-red-500 rounded-full p-1 shadow hover:bg-red-50 border border-red-100"
                          >
                             <Edit3 size={14} />
                          </button>
                       </div>
                   </div>
               )}
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