import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  generateKuitansi, generateDaftarHadir, generateSK, generateSPK, 
  generateMOU, generateAbsensiTukang, generateUpahTukang, 
  generateSuratTugas, generateSPPD, generateDaftarTransport, generateLaporanSPPD 
} from '../lib/pdfGenerators';
import { FileSignature, Handshake, ClipboardList, Receipt, HardHat, Hammer, Bus, FileCheck, DollarSign } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { getSchoolProfile, uploadEvidenceFile, getWithdrawalHistory, updateWithdrawalHistory, getGeneralFiles, saveGeneralFile, deleteGeneralFile } from '../lib/db';
import { SchoolProfile, EvidenceFile, WithdrawalHistory } from '../types';
import { suggestEvidenceList, isAiConfigured } from '../lib/gemini';
import { getEvidenceList, getTerbilang } from '../lib/evidenceRules';

// Modular Imports
import { EvidenceTemplatesProps, EvidenceTab, AlbumViewState, FormDataState } from './evidence/EvidenceTypes';
import { getGroupedRealizations, getAllEvidenceFiles, getGroupedAlbum } from './evidence/EvidenceUtils';
import EvidenceHeader from './evidence/EvidenceHeader';
import TemplateView from './evidence/TemplateView';
import UploadView from './evidence/UploadView';
import AlbumView from './evidence/AlbumView';
import DocumentFormModal from './evidence/DocumentFormModal';

const EvidenceTemplates = ({ budgets: allBudgets, onUpdate }: EvidenceTemplatesProps) => {
  const [activeTab, setActiveTab] = useState<EvidenceTab>('templates');
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'realization' | 'history'>('history');
  const [history, setHistory] = useState<WithdrawalHistory[]>([]);
  
  // Upload State
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [suggestedEvidence, setSuggestedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [albumView, setAlbumView] = useState<AlbumViewState>({ month: null, transactionKey: null });

  const [generalFiles, setGeneralFiles] = useState<any[]>([]);

  useEffect(() => {
    const fetchGeneral = async () => {
      try {
        const data = await getGeneralFiles();
        if (Array.isArray(data)) setGeneralFiles(data);
      } catch (e) {
        console.error("Failed to sync general files on mount:", e);
      }
    };
    fetchGeneral();
  }, []);

  const groupedRealizations = useMemo(() => 
    getGroupedRealizations(allBudgets, dataSource, history), 
  [allBudgets, dataSource, history]);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState<string>('');
  const [formData, setFormData] = useState<FormDataState>({} as FormDataState);

  useEffect(() => {
      setIsLoading(true);
      Promise.all([
        getSchoolProfile(),
        getWithdrawalHistory()
      ]).then(([profile, hist]) => {
          setSchoolProfile(profile);
          setHistory(hist);
          setIsLoading(false);
      });
  }, []);

  const [aiCache, setAiCache] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('rkas_ai_evidence_cache');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('rkas_ai_evidence_cache', JSON.stringify(aiCache));
  }, [aiCache]);

  const handleProcessAi = async (group: any, forceRefresh: boolean = false) => {
    const combinedDescription = group.items.map((i: any) => i.budgetDescription).join(', ');
    const combinedAccountCodes = group.items.map((i: any) => i.accountCode || '').join(', ');

    const textDesc = combinedDescription.toLowerCase();
    const isVendorSiplah = group.vendor.toLowerCase().includes('siplah') || textDesc.includes('siplah');
    const isBospSiplah = combinedAccountCodes.includes('5.2.02') || combinedAccountCodes.includes('5.1.02.01') || combinedAccountCodes.includes('5.1.02.03') || combinedAccountCodes.includes('5.2.2') || combinedAccountCodes.includes('5.2.3') || textDesc.includes('atk') || textDesc.includes('bahan') || textDesc.includes('alat') || textDesc.includes('kertas') || textDesc.includes('fotocopy') || textDesc.includes('penggandaan') || textDesc.includes('cat') || textDesc.includes('pintu') || textDesc.includes('kusen') || textDesc.includes('hvs') || textDesc.includes('lampu') || textDesc.includes('besi') || textDesc.includes('kayu') || textDesc.includes('semen') || textDesc.includes('modal') || textDesc.includes('cetak');
    const isSiplah = isVendorSiplah || isBospSiplah;
    
    const siplahItems = ["Dokumen Cetak Pesanan (PO) Digital dari SIPLah", "Invoice / Faktur Penjualan Definitif (Dari SIPLah)", "Berita Acara Serah Terima (BAST) Digital SIPLah", "Foto Dokumentasi Barang yang diterima (Fisik di Sekolah)"];

    if (!forceRefresh && aiCache[combinedDescription] && aiCache[combinedDescription].length > 0) {
      let list = aiCache[combinedDescription];
      if (isSiplah) list = Array.from(new Set([...siplahItems, ...list]));
      setSuggestedEvidence(list);
      return;
    }

    setIsAiLoading(true);
    try {
      let list: string[] = [];
      if (isAiConfigured() && combinedDescription.trim() !== '' && forceRefresh) {
        try { list = await suggestEvidenceList(combinedDescription, combinedAccountCodes); } catch (aiErr) { console.error("AI Service Error:", aiErr); }
      }
      if (!list || list.length === 0) list = getEvidenceList(combinedDescription, combinedAccountCodes);
      if (!list || list.length === 0) list = ["Nota / Kuitansi Sah", "Bukti Pembayaran / Transfer", "Foto Dokumentasi Kegiatan/Barang"];
      if (isSiplah) list = Array.from(new Set([...siplahItems, ...list]));

      setSuggestedEvidence(list);
      setAiCache(prev => ({ ...prev, [combinedDescription]: list }));
    } catch (error) {
      console.error("Critical AI Analysis Error:", error);
      let fallback = getEvidenceList(combinedDescription, combinedAccountCodes);
      if (isSiplah) fallback = Array.from(new Set([...siplahItems, ...fallback]));
      setSuggestedEvidence(fallback);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSelectGroup = (group: any) => {
    setSelectedGroup(group);
    handleProcessAi(group);
  };

  const handleFileUpload = async (evidenceType: string, filesToUpload: File[]) => {
    if (!selectedGroup) return;
    setUploadProgress(prev => ({ ...prev, [evidenceType]: true }));
    
    try {
      const budgetId = selectedGroup.isHistory ? 'history' : selectedGroup.items[0].budgetId;
      const uploadedEvidences: EvidenceFile[] = [];
      for (const file of filesToUpload) {
        const result = await uploadEvidenceFile(file, budgetId);
        if (result.url && result.path) {
          uploadedEvidences.push({ type: evidenceType, url: result.url, path: result.path, name: file.name });
        }
      }
      
      if (uploadedEvidences.length > 0) {
        if (selectedGroup.isHistory) {
          const record = history.find(h => h.id === selectedGroup.historyId);
          if (record) {
            let snapshot: any = record.snapshot_data;
            if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
            const recipients = snapshot.groupedRecipients ? [...snapshot.groupedRecipients] : (Array.isArray(snapshot) ? [...snapshot] : []);
            const recipientIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
            if (recipientIdx !== -1) {
              recipients[recipientIdx] = { ...recipients[recipientIdx], evidence_files: [...(recipients[recipientIdx].evidence_files || []), ...uploadedEvidences] };
              const updatedSnapshot = snapshot.groupedRecipients ? { ...snapshot, groupedRecipients: recipients } : recipients;
              await updateWithdrawalHistory(record.id, { snapshot_data: updatedSnapshot });
              setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: updatedSnapshot } : h));
            }
          }
        } else {
          for (const item of selectedGroup.items) {
            const budget = allBudgets.find(b => b.id === item.budgetId);
            if (!budget?.realizations) continue;
            const upReals = [...budget.realizations];
            upReals[item.realizationIndex] = { ...upReals[item.realizationIndex], evidence_files: [...(upReals[item.realizationIndex].evidence_files || []), ...uploadedEvidences] };
            onUpdate(budget.id, { realizations: upReals });
          }
        }
        setSelectedGroup((prev: any) => ({ ...prev, evidence_files: [...(prev.evidence_files || []), ...uploadedEvidences] }));
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Gagal mengunggah file.");
    } finally {
      setUploadProgress(prev => ({ ...prev, [evidenceType]: false }));
    }
  };

  const handleDeleteFile = async (_evidenceType: string, filePath: string) => {
    if (!selectedGroup || !confirm('Apakah Anda yakin ingin menghapus file ini?')) return;
    try {
      if (selectedGroup.isHistory) {
        const record = history.find(h => h.id === selectedGroup.historyId);
        if (record) {
          let snapshot: any = record.snapshot_data;
          if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
          const recipients = snapshot.groupedRecipients ? [...snapshot.groupedRecipients] : (Array.isArray(snapshot) ? [...snapshot] : []);
          const rIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
          if (rIdx !== -1) {
            recipients[rIdx] = { ...recipients[rIdx], evidence_files: (recipients[rIdx].evidence_files || []).filter((f: any) => f.path !== filePath) };
            const upSnap = snapshot.groupedRecipients ? { ...snapshot, groupedRecipients: recipients } : recipients;
            await updateWithdrawalHistory(record.id, { snapshot_data: upSnap });
            setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: upSnap } : h));
          }
        }
      } else {
        for (const item of selectedGroup.items) {
          const budget = allBudgets.find(b => b.id === item.budgetId);
          if (!budget?.realizations) continue;
          const upReals = [...budget.realizations];
          upReals[item.realizationIndex] = { ...upReals[item.realizationIndex], evidence_files: (upReals[item.realizationIndex].evidence_files || []).filter((f: any) => f.path !== filePath) };
          onUpdate(budget.id, { realizations: upReals });
        }
      }
      setSelectedGroup((prev: any) => ({ ...prev, evidence_files: (prev.evidence_files || []).filter((f: any) => f.path !== filePath) }));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus file.");
    }
  };

  const handleGeneralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArr = Array.from(e.target.files || []);
      if (filesArr.length === 0) return;
      setIsLoading(true);
      try {
        for (const file of filesArr) {
          const isOnline = !!supabase;
          if (isOnline) {
            const result = await uploadEvidenceFile(file, 'general');
            if (result.url && result.path) {
                const newFile = { name: file.name, url: result.url, type: file.type.includes('image') ? 'Gambar / Scan' : 'Dokumen PDF', size: file.size, path: result.path, vendor: 'Dokumen Sekolah', description: 'Arsip Dokumen Pendukung Umum', amount: 0, date: new Date().toISOString(), isGeneral: true };
                const savedFile = await saveGeneralFile(newFile);
                if (savedFile) setGeneralFiles(prev => [savedFile, ...prev.filter(f => f?.path !== savedFile.path)]);
            } else alert(`Gagal mengunggah ${file.name}.`);
          } else {
            if (file.size > 2 * 1024 * 1024) { alert(`File ${file.name} terlalu besar (>2MB).`); continue; }
            const reader = new FileReader();
            reader.onload = async (event) => {
              const newFile = { name: file.name, url: event.target?.result as string, type: file.type.includes('image') ? 'Gambar / Scan' : 'Dokumen PDF', size: file.size, path: `general/${Date.now()}_${file.name}`, vendor: 'Dokumen Sekolah', description: 'Arsip Dokumen Pendukung Umum', amount: 0, date: new Date().toISOString(), isGeneral: true };
              const savedFile = await saveGeneralFile(newFile);
              if (savedFile) setGeneralFiles(prev => [savedFile, ...prev.filter(f => f?.path !== savedFile.path)]);
            };
            reader.readAsDataURL(file);
          }
        }
      } catch (error) { console.error("General upload failed:", error); } 
      finally { setIsLoading(false); }
  };

  const handleDeleteGeneralFile = async (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();
      if (!confirm('Apakah Anda yakin?')) return;
      if (await deleteGeneralFile(filePath)) setGeneralFiles(prev => prev.filter(f => f.path !== filePath));
      else alert("Gagal menghapus file.");
  };

  const openPrintModal = (type: string, group?: any) => {
      setCurrentTemplateType(type);
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const year = schoolProfile?.fiscalYear || new Date().getFullYear().toString();
      setFormData({
          date: today, city: schoolProfile?.city?.replace('KOTA ', '').replace('KABUPATEN ', '') || 'Tempat',
          ksName: schoolProfile?.headmaster || '', ksNip: schoolProfile?.headmasterNip || '',
          trName: schoolProfile?.treasurer || '', trNip: schoolProfile?.treasurerNip || '',
          schoolName: schoolProfile?.name || '', year: year, amount: group ? group.totalAmount.toString() : '',
          terbilang: group ? getTerbilang(group.totalAmount) : '', receiver: group ? (group.vendor === 'Tanpa Toko/Vendor' ? '' : group.vendor) : '',
          receiverNip: '', description: group ? group.items.map((i: any) => i.budgetDescription).join(', ') : '',
          activityName: group ? group.items[0].budgetDescription : '', projectLocation: schoolProfile?.name || '',
          contractorName: '', contractorAddress: '', contractorRole: 'Tukang / Pelaksana',
          spkNumber: `027 / ... / ... / ${year}`, skNumber: `800 / ... / ... / ${year}`, mouNumber: `421.2 / ... / ... / ${year}`,
          suratTugasNumber: `800 / ... / ... / ${year}`, sppdNumber: `090 / ... / ... / ${year}`,
          transportMode: 'Kendaraan Umum / Pribadi', destination: '', departureDate: today, returnDate: today,
          reportResult: 'Kegiatan berjalan dengan lancar...',
          officials: [{ name: '', nip: '', rank: '-', role: 'Guru / Pendamping' }],
          skConsiderations: 'a. Bahwa...', skAppointees: [{ name: '', role: 'Ketua' }],
          workers: [{ name: '', role: 'Tukang' }]
      } as FormDataState);
      setIsPrintModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === 'amount') {
          const valNum = parseInt(value) || 0;
          setFormData((prev: any) => ({ ...prev, [name]: value, terbilang: valNum > 0 ? getTerbilang(valNum) : '' }));
      } else setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleListChange = (index: number, field: string, value: string, listKey: 'workers' | 'skAppointees' | 'officials') => {
      const newList = [...formData[listKey]];
      newList[index] = { ...newList[index], [field]: value };
      setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
  };

  const addListItem = (listKey: 'workers' | 'skAppointees' | 'officials') => {
      const defaultItem = listKey === 'officials' ? { name: '', nip: '', rank: '-', role: 'Guru' } : { name: '', role: 'Anggota' };
      setFormData((prev: any) => ({ ...prev, [listKey]: [...prev[listKey], defaultItem] }));
  };

  const removeListItem = (index: number, listKey: 'workers' | 'skAppointees' | 'officials') => {
      if (formData[listKey].length > 1) {
          const newList = [...formData[listKey]];
          newList.splice(index, 1);
          setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
      }
  };

  const handlePrint = (e: React.FormEvent) => {
      e.preventDefault();
      switch (currentTemplateType) {
          case 'kuitansi': generateKuitansi(formData); break;
          case 'daftar_hadir': generateDaftarHadir(formData); break;
          case 'sk': generateSK(formData); break;
          case 'spk_fisik': generateSPK(formData); break;
          case 'absensi_tukang': generateAbsensiTukang(formData); break;
          case 'upah_tukang': generateUpahTukang(formData); break;
          case 'mou': generateMOU(formData); break;
          case 'surat_tugas': generateSuratTugas(formData); break;
          case 'sppd': generateSPPD(formData); break;
          case 'daftar_transport': generateDaftarTransport(formData); break;
          case 'laporan_sppd': generateLaporanSPPD(formData); break;
      }
      setIsPrintModalOpen(false);
  };

  const renderTemplateButtons = () => {
      if (!activeCategory) return <div className="text-center text-gray-400 py-4 text-xs italic">Pilih kategori.</div>;
      const btns = {
          honor: [ { t: 'sk', l: 'SK Penetapan', i: FileSignature, c: 'text-blue-500' }, { t: 'mou', l: 'MOU Tenaga Ekstra', i: Handshake, c: 'text-teal-500' }, { t: 'daftar_hadir', l: 'Daftar Hadir', i: ClipboardList, c: 'text-green-500' }, { t: 'kuitansi', l: 'Kuitansi Honor', i: Receipt, c: 'text-purple-500' } ],
          jasa: [ { t: 'spk_fisik', l: 'SPK Konstruksi', i: HardHat, c: 'text-purple-500' }, { t: 'absensi_tukang', l: 'Absensi Tukang', i: ClipboardList, c: 'text-orange-500' }, { t: 'upah_tukang', l: 'Daftar Upah', i: Hammer, c: 'text-blue-500' }, { t: 'kuitansi', l: 'Kuitansi Pembayaran', i: Receipt, c: 'text-red-500' } ],
          peradin: [ { t: 'surat_tugas', l: 'Surat Tugas', i: FileSignature, c: 'text-blue-500' }, { t: 'sppd', l: 'SPPD', i: Bus, c: 'text-green-500' }, { t: 'daftar_transport', l: 'Daftar Transport', i: DollarSign, c: 'text-teal-600' }, { t: 'laporan_sppd', l: 'Laporan Perjalanan', i: FileCheck, c: 'text-orange-500' }, { t: 'kuitansi', l: 'Kuitansi Transport', i: Receipt, c: 'text-purple-500' } ],
          default: [ { t: 'kuitansi', l: 'Kuitansi Umum', i: Receipt, c: 'text-blue-500' }, { t: 'daftar_hadir', l: 'Daftar Hadir', i: ClipboardList, c: 'text-green-500' }, { t: 'sk', l: 'SK / Surat Tugas', i: FileSignature, c: 'text-orange-500' } ]
      };
      const activeBtns = (btns as any)[activeCategory] || btns.default;
      return activeBtns.map((b: any, idx: number) => (
          <button key={idx} onClick={() => openPrintModal(b.t)} className="w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center gap-2 text-gray-600 transition-all font-semibold">
              <b.i size={14} className={b.c}/> {b.l}
          </button>
      ));
  };

  const allEvidenceFiles = useMemo(() => getAllEvidenceFiles(allBudgets, history), [allBudgets, history]);
  const groupedAlbum = useMemo(() => getGroupedAlbum(allEvidenceFiles), [allEvidenceFiles]);

  const handleDeleteFromAlbum = async (e: React.MouseEvent, file: any) => {
    e.stopPropagation();
    if (!confirm('Hapus arsip fisik ini?')) return;
    try {
      if (file.sourceType === 'Riwayat Pencairan') {
        const record = history.find(h => h.id === file.historyId);
        if (record) {
          let snapshot: any = record.snapshot_data;
          if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
          let recs = snapshot.groupedRecipients ? [...snapshot.groupedRecipients] : (Array.isArray(snapshot) ? [...snapshot] : []);
          if (recs[file.historyIdx]) {
             recs[file.historyIdx] = { ...recs[file.historyIdx], evidence_files: (recs[file.historyIdx].evidence_files || []).filter((f: any) => f.path !== file.path) };
             const upSnap = snapshot.groupedRecipients ? { ...snapshot, groupedRecipients: recs } : recs;
             await updateWithdrawalHistory(record.id, { snapshot_data: upSnap });
             setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: upSnap } : h));
          }
        }
      } else {
        const budget = allBudgets.find(b => b.id === file.budgetId);
        if (budget?.realizations) {
          const upReals = [...budget.realizations];
          if (upReals[file.realizationIndex]) {
             upReals[file.realizationIndex] = { ...upReals[file.realizationIndex], evidence_files: (upReals[file.realizationIndex].evidence_files || []).filter((f: any) => f.path !== file.path) };
             onUpdate(file.budgetId, { realizations: upReals });
          }
        }
      }
    } catch (e) { console.error(e); }
  };

  const filteredGroups = groupedRealizations.filter(g => g.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || g.items.some((i: any) => i.budgetDescription.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      <EvidenceHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'templates' ? (
        <TemplateView 
            activeCategory={activeCategory} 
            setActiveCategory={setActiveCategory} 
            renderTemplateButtons={renderTemplateButtons} 
        />
      ) : activeTab === 'album' ? (
        <AlbumView 
            albumView={albumView} setAlbumView={setAlbumView} groupedAlbum={groupedAlbum} 
            generalFiles={generalFiles} isLoading={isLoading} handleGeneralUpload={handleGeneralUpload} 
            handleDeleteGeneralFile={handleDeleteGeneralFile} handleDeleteFromAlbum={handleDeleteFromAlbum} 
            selectedFile={selectedFile} setSelectedFile={setSelectedFile} 
        />
      ) : (
        <UploadView 
            dataSource={dataSource} setDataSource={setDataSource} searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} isLoading={isLoading} filteredGroups={filteredGroups} 
            selectedGroup={selectedGroup} handleSelectGroup={handleSelectGroup} 
            handleProcessAi={handleProcessAi} isAiLoading={isAiLoading} isAiConfigured={isAiConfigured} 
            openPrintModal={openPrintModal} suggestedEvidence={suggestedEvidence} 
            uploadProgress={uploadProgress} handleFileUpload={handleFileUpload} 
            handleDeleteFile={handleDeleteFile} 
        />
      )}

      {typeof document !== 'undefined' && createPortal(
          <DocumentFormModal 
            isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} 
            currentTemplateType={currentTemplateType} formData={formData} 
            handleInputChange={handleInputChange} handleListChange={handleListChange} 
            addListItem={addListItem} removeListItem={removeListItem} handlePrint={handlePrint} 
          />, 
          document.body
      )}

      <style>{`
        .btn-template { @apply w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center gap-2 text-gray-600 transition-all font-semibold; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 rounded-full hover:bg-slate-300; }
      `}</style>
    </div>
  );
};

export default EvidenceTemplates;
