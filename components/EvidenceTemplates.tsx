import React, { useState, useEffect, useMemo } from 'react';
import { 
  generateKuitansi, generateDaftarHadir, generateSK, generateSPK, 
  generateMOU, generateAbsensiTukang, generateUpahTukang, 
  generateSuratTugas, generateSPPD, generateDaftarTransport, generateLaporanSPPD 
} from '../lib/pdfGenerators';
import { FileText, Download, CheckCircle2, ChevronRight, BookOpen, Printer, Users, Bus, FileSignature, Handshake, ClipboardList, Receipt, FileCheck, HardHat, Hammer, X, DollarSign, Plus, Trash2, Search, Sparkles, Loader2, Upload, Eye, AlertCircle, ShoppingCart, Image as ImageIcon, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getSchoolProfile, uploadEvidenceFile, getWithdrawalHistory, updateWithdrawalHistory, getGeneralFiles, saveGeneralFile, deleteGeneralFile } from '../lib/db';
import { SchoolProfile, Budget, EvidenceFile, WithdrawalHistory } from '../types';
import { suggestEvidenceList, isAiConfigured } from '../lib/gemini';

import { MONTHS, getEvidenceList, TEMPLATE_CATEGORIES, getTerbilang } from '../lib/evidenceRules';

interface EvidenceTemplatesProps {
  budgets: Budget[];
  onUpdate: (id: string, updates: Partial<Budget>) => void;
}

const EvidenceTemplates = ({ budgets: allBudgets, onUpdate }: EvidenceTemplatesProps) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'upload' | 'album'>('templates');
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'realization' | 'history'>('history');
  const [history, setHistory] = useState<WithdrawalHistory[]>([]);
  
  // Upload State
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [suggestedEvidence, setSuggestedEvidence] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [albumView, setAlbumView] = useState<{ month: number | null, transactionKey: string | null }>({ month: null, transactionKey: null });

  const [generalFiles, setGeneralFiles] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('rkas_general_evidence_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Corrupted general evidence data in localStorage");
    }
    return [];
  });

  useEffect(() => {
    const fetchGeneral = async () => {
      try {
        const data = await getGeneralFiles();
        if (Array.isArray(data)) {
          setGeneralFiles(data);
        }
      } catch (e) {
        console.error("Failed to sync general files on mount:", e);
      }
    };
    fetchGeneral();
  }, []);

  // Grouped Realizations for the Upload Tab
  const groupedRealizations = useMemo(() => {
    if (dataSource === 'history') {
      const historyGroups: any[] = [];
      history.forEach((record: WithdrawalHistory) => {
        // Each record in history is a "Withdrawal" (one PDF)
        // Its snapshot_data is an object containing selectedIds, recipientDetails, and now groupedRecipients
        let snapshot: any = record.snapshot_data;
        if (typeof snapshot === 'string') {
          try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; }
        }
        
        if (!snapshot) return;

        // If it's the new format with groupedRecipients, use it
        if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
          snapshot.groupedRecipients.forEach((recipient: any, idx: number) => {
            const groupKey = `history-${record.id}-${idx}`;
            historyGroups.push({
              key: groupKey,
              vendor: recipient.name || 'Tanpa Nama',
              date: record.letter_date,
              month: new Date(record.letter_date).getMonth() + 1,
              totalAmount: recipient.amount,
              // Use persisted items if available (New format), otherwise fallback to descriptions (Old format)
              items: recipient.items ? recipient.items.map((it: any) => ({
                budgetDescription: it.budgetDescription,
                amount: it.amount,
                accountCode: it.accountCode
              })) : (recipient.descriptions?.map((desc: string) => ({
                budgetDescription: desc,
                amount: recipient.amount / (recipient.descriptions.length || 1)
              })) || []),
              evidence_files: recipient.evidence_files || [],
              isHistory: true,
              historyId: record.id
            });
          });
        } 
        // Fallback for older snapshots that might be arrays (if any)
        else if (Array.isArray(snapshot)) {
          snapshot.forEach((recipient: any, idx: number) => {
            const groupKey = `history-${record.id}-${idx}`;
            historyGroups.push({
              key: groupKey,
              vendor: recipient.name || 'Tanpa Nama',
              date: record.letter_date,
              month: new Date(record.letter_date).getMonth() + 1,
              totalAmount: recipient.amount,
              items: recipient.descriptions?.map((desc: string) => ({
                budgetDescription: desc,
                amount: recipient.amount / (recipient.descriptions.length || 1)
              })) || [],
              evidence_files: recipient.evidence_files || [],
              isHistory: true,
              historyId: record.id
            });
          });
        }
      });
      return historyGroups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    const groups: any[] = [];
    allBudgets.forEach(budget => {
      budget.realizations?.forEach((real, idx) => {
        // Grouping criteria: Vendor + Date + Month
        const vendorName = real.vendor || 'Tanpa Toko/Vendor';
        const groupKey = `${vendorName}-${real.date.split('T')[0]}-${real.month}`;
        
        let group = groups.find(g => g.key === groupKey);
        if (!group) {
          group = {
            key: groupKey,
            vendor: vendorName,
            date: real.date,
            month: real.month,
            notes: real.notes,
            totalAmount: 0,
            items: [],
            evidence_files: real.evidence_files || []
          };
          groups.push(group);
        }
        
        group.totalAmount += real.amount;
        group.items.push({ 
          budgetId: budget.id, 
          budgetDescription: budget.description, 
          realizationIndex: idx,
          amount: real.amount,
          accountCode: budget.account_code
        });
        
        // Merge evidence files - if one item has files, the whole group shares them
        if (real.evidence_files && real.evidence_files.length > group.evidence_files.length) {
          group.evidence_files = real.evidence_files;
        }
      });
    });
    return groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allBudgets, dataSource, history]);

  // Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (selectedBudget) {
      const updated = allBudgets.find(b => b.id === selectedBudget.id);
      if (updated) {
        setSelectedBudget(updated);
      }
    }
  }, [allBudgets, selectedBudget?.id]);

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
    // Combine descriptions for context
    const combinedDescription = group.items.map((i: any) => i.budgetDescription).join(', ');
    const combinedAccountCodes = group.items.map((i: any) => i.accountCode || '').join(', ');

    const textDesc = combinedDescription.toLowerCase();
    const isVendorSiplah = group.vendor.toLowerCase().includes('siplah') || textDesc.includes('siplah');
    
    // BOSP 2026: Rekening 5.2.02 (Modal), 5.1.02.01 (Barang/ATK), and 5.1.02.03 (Pemeliharaan Material) are mandatory SIPLah
    const isBospSiplah = 
      combinedAccountCodes.includes('5.2.02') || 
      combinedAccountCodes.includes('5.1.02.01') || 
      combinedAccountCodes.includes('5.1.02.03') ||
      combinedAccountCodes.includes('5.2.2') || 
      combinedAccountCodes.includes('5.2.3') || 
      textDesc.includes('atk') || textDesc.includes('bahan') || textDesc.includes('alat') || 
      textDesc.includes('kertas') || textDesc.includes('fotocopy') || textDesc.includes('penggandaan') ||
      textDesc.includes('cat') || textDesc.includes('pintu') || textDesc.includes('kusen') ||
      textDesc.includes('hvs') || textDesc.includes('lampu') || textDesc.includes('besi') || 
      textDesc.includes('kayu') || textDesc.includes('semen') || textDesc.includes('modal') || 
      textDesc.includes('cetak');

    const isSiplah = isVendorSiplah || isBospSiplah;
    
    // SIPLah definitive items mapping BOSP 2026
    const siplahItems = [
      "Dokumen Cetak Pesanan (PO) Digital dari SIPLah",
      "Invoice / Faktur Penjualan Definitif (Dari SIPLah)",
      "Berita Acara Serah Terima (BAST) Digital SIPLah",
      "Foto Dokumentasi Barang yang diterima (Fisik di Sekolah)"
    ];

    // Check cache first
    if (!forceRefresh && aiCache[combinedDescription] && aiCache[combinedDescription].length > 0) {
      let list = aiCache[combinedDescription];
      if (isSiplah) {
        list = Array.from(new Set([...siplahItems, ...list]));
      }
      setSuggestedEvidence(list);
      return;
    }

    setIsAiLoading(true);
    try {
      let list: string[] = [];
      
      // Only call AI if configured AND description is not empty AND it is manually requested
      if (isAiConfigured() && combinedDescription.trim() !== '' && forceRefresh) {
        try {
          list = await suggestEvidenceList(combinedDescription, combinedAccountCodes);
        } catch (aiErr) {
          console.error("AI Service Error:", aiErr);
          list = [];
        }
      }
      
      // Fallback to local logic if AI returns nothing or is unconfigured
      if (!list || list.length === 0) {
        list = getEvidenceList(combinedDescription, combinedAccountCodes);
      }
      
      // Safety check: if list is STILL empty (should not happen with getEvidenceList), use absolute default
      if (!list || list.length === 0) {
        list = [
            "Nota / Kuitansi Sah",
            "Bukti Pembayaran / Transfer",
            "Foto Dokumentasi Kegiatan/Barang"
        ];
      }

      if (isSiplah) {
        list = Array.from(new Set([...siplahItems, ...list]));
      }

      setSuggestedEvidence(list);
      // Update cache
      setAiCache(prev => ({ ...prev, [combinedDescription]: list }));
    } catch (error) {
      console.error("Critical AI Analysis Error:", error);
      // Absolute fallback to local logic on error
      let fallback = getEvidenceList(combinedDescription, combinedAccountCodes);
      if (isSiplah) {
        fallback = Array.from(new Set([...siplahItems, ...fallback]));
      }
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
          uploadedEvidences.push({
            type: evidenceType,
            url: result.url,
            path: result.path,
            name: file.name
          });
        }
      }
      
      if (uploadedEvidences.length > 0) {

        if (selectedGroup.isHistory) {
          const record = history.find(h => h.id === selectedGroup.historyId);
          if (record) {
            let snapshot: any = record.snapshot_data;
            if (typeof snapshot === 'string') {
              try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; }
            }

            if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
              const recipients = [...snapshot.groupedRecipients];
              const recipientIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
              if (recipientIdx !== -1) {
                const recipient = { ...recipients[recipientIdx] };
                const currentFiles = recipient.evidence_files || [];
                recipient.evidence_files = [...currentFiles, ...uploadedEvidences];
                recipients[recipientIdx] = recipient;
                
                const updatedSnapshot = { ...snapshot, groupedRecipients: recipients };
                await updateWithdrawalHistory(record.id, { snapshot_data: updatedSnapshot });
                setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: updatedSnapshot } : h));
              }
            } else if (Array.isArray(snapshot)) {
              const recipients = [...snapshot];
              const recipientIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
              if (recipientIdx !== -1) {
                const recipient = { ...recipients[recipientIdx] };
                const currentFiles = recipient.evidence_files || [];
                recipient.evidence_files = [...currentFiles, ...uploadedEvidences];
                recipients[recipientIdx] = recipient;
                
                await updateWithdrawalHistory(record.id, { snapshot_data: recipients });
                setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: recipients } : h));
              }
            }
          }
        } else {
          for (const item of selectedGroup.items) {
            const latestBudget = allBudgets.find(b => b.id === item.budgetId);
            if (!latestBudget || !latestBudget.realizations) continue;

            const budget = { ...latestBudget };
            const realizations = [...(budget.realizations || [])];
            const realization = { ...realizations[item.realizationIndex] };
            
            const currentFiles = realization.evidence_files || [];
            realization.evidence_files = [...currentFiles, ...uploadedEvidences];
            
            realizations[item.realizationIndex] = realization;
            budget.realizations = realizations;
            
            onUpdate(budget.id, { realizations: budget.realizations });
          }
        }
        
        setSelectedGroup((prev: any) => {
          if (!prev) return null;
          return { ...prev, evidence_files: [...(prev.evidence_files || []), ...uploadedEvidences] };
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Gagal mengunggah file.");
    } finally {
      setUploadProgress(prev => ({ ...prev, [evidenceType]: false }));
    }
  };

  const handleDeleteFile = async (_evidenceType: string, filePath: string) => {
    if (!selectedGroup) return;

    if (!confirm('Apakah Anda yakin ingin menghapus file ini?')) return;

    try {
      if (selectedGroup.isHistory) {
        const record = history.find(h => h.id === selectedGroup.historyId);
        if (record) {
          let snapshot: any = record.snapshot_data;
          if (typeof snapshot === 'string') {
            try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; }
          }

          if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
            const recipients = [...snapshot.groupedRecipients];
            const recipientIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
            if (recipientIdx !== -1) {
              const recipient = { ...recipients[recipientIdx] };
              recipient.evidence_files = (recipient.evidence_files || []).filter((f: EvidenceFile) => f.path !== filePath);
              recipients[recipientIdx] = recipient;
              
              const updatedSnapshot = { ...snapshot, groupedRecipients: recipients };
              await updateWithdrawalHistory(record.id, { snapshot_data: updatedSnapshot });
              setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: updatedSnapshot } : h));
            }
          } else if (Array.isArray(snapshot)) {
            const recipients = [...snapshot];
            const recipientIdx = recipients.findIndex((r: any) => r.name === selectedGroup.vendor && r.amount === selectedGroup.totalAmount);
            if (recipientIdx !== -1) {
              const recipient = { ...recipients[recipientIdx] };
              recipient.evidence_files = (recipient.evidence_files || []).filter((f: EvidenceFile) => f.path !== filePath);
              recipients[recipientIdx] = recipient;
              
              await updateWithdrawalHistory(record.id, { snapshot_data: recipients });
              setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: recipients } : h));
            }
          }
        }
      } else {
        for (const item of selectedGroup.items) {
          const latestBudget = allBudgets.find(b => b.id === item.budgetId);
          if (!latestBudget || !latestBudget.realizations) continue;

          const budget = { ...latestBudget };
          const realizations = [...(budget.realizations || [])];
          const realization = { ...realizations[item.realizationIndex] };
          
          realization.evidence_files = (realization.evidence_files || []).filter((f: EvidenceFile) => f.path !== filePath);
          
          realizations[item.realizationIndex] = realization;
          budget.realizations = realizations;
          
          onUpdate(budget.id, { realizations: budget.realizations });
        }
      }
      
      setSelectedGroup((prev: any) => {
        if (!prev) return null;
        return { ...prev, evidence_files: (prev.evidence_files || []).filter((f: EvidenceFile) => f.path !== filePath) };
      });
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Gagal menghapus file.");
    }
  };

  const filteredGroups = groupedRealizations.filter(g => 
    g.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.items.some((i: any) => i.budgetDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openPrintModal = (type: string, group?: any) => {
      setCurrentTemplateType(type);
      // Initialize default values from profile
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const year = schoolProfile?.fiscalYear || new Date().getFullYear().toString();
      
      setFormData({
          date: today,
          city: schoolProfile?.city?.replace('KOTA ', '').replace('KABUPATEN ', '') || 'Tempat',
          ksName: schoolProfile?.headmaster || '',
          ksNip: schoolProfile?.headmasterNip || '',
          trName: schoolProfile?.treasurer || '',
          trNip: schoolProfile?.treasurerNip || '',
          schoolName: schoolProfile?.name || '',
          year: year,
          // Specific defaults
          amount: group ? group.totalAmount.toString() : '',
          terbilang: group ? getTerbilang(group.totalAmount) : '',
          receiver: group ? (group.vendor === 'Tanpa Toko/Vendor' ? '' : group.vendor) : '',
          receiverNip: '', 
          description: group ? group.items.map((i: any) => i.budgetDescription).join(', ') : '',
          activityName: group ? group.items[0].budgetDescription : '',
          projectLocation: schoolProfile?.name || '',
          contractorName: '',
          contractorAddress: '',
          contractorRole: 'Tukang / Pelaksana',
          spkNumber: `027 / ... / ... / ${year}`,
          skNumber: `800 / ... / ... / ${year}`,
          mouNumber: `421.2 / ... / ... / ${year}`,
          
          // Peradin Specifics
          suratTugasNumber: `800 / ... / ... / ${year}`,
          sppdNumber: `090 / ... / ... / ${year}`,
          transportMode: 'Kendaraan Umum / Pribadi',
          destination: '',
          departureDate: today,
          returnDate: today,
          reportResult: 'Kegiatan berjalan dengan lancar dan materi yang disampaikan dapat diterapkan di sekolah.', // Default result
          officials: [
              { name: '....................................', nip: '....................................', rank: '-', role: 'Guru / Pendamping' }
          ],

          // SK Specific
          skConsiderations: 'a. Bahwa untuk menjamin kelancaran proses kegiatan sekolah dipandang perlu menetapkan pembagian tugas.\nb. Bahwa nama-nama yang tercantum dalam lampiran surat keputusan ini dipandang cakap dan mampu melaksanakan tugas.',
          skAppointees: [
              { name: '....................................', role: 'Ketua / Koordinator' },
              { name: '....................................', role: 'Anggota / Pelaksana' },
              { name: '....................................', role: 'Anggota / Pelaksana' }
          ],

          // Workers List (For Absensi & Upah)
          workers: [
              { name: '.....................', role: 'Kepala Tukang' },
              { name: '.....................', role: 'Tukang' },
              { name: '.....................', role: 'Tukang' }
          ]
      });
      setIsPrintModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      
      // Auto terbilang if amount changes
      if (name === 'amount') {
          const valNum = parseInt(value) || 0;
          setFormData((prev: any) => ({ 
              ...prev, 
              [name]: value,
              terbilang: valNum > 0 ? getTerbilang(valNum) : '' 
          }));
      } else {
          setFormData((prev: any) => ({ ...prev, [name]: value }));
      }
  };

  // --- Dynamic List Handlers ---
  const handleListChange = (index: number, field: string, value: string, listKey: 'workers' | 'skAppointees' | 'officials') => {
      const newList = [...formData[listKey]];
      newList[index] = { ...newList[index], [field]: value };
      setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
  };

  const addListItem = (listKey: 'workers' | 'skAppointees' | 'officials') => {
      let defaultItem: any = { name: '', role: 'Anggota' };
      if (listKey === 'officials') defaultItem = { name: '', nip: '', rank: '-', role: 'Guru' };
      
      setFormData((prev: any) => ({
          ...prev,
          [listKey]: [...prev[listKey], defaultItem]
      }));
  };

  const removeListItem = (index: number, listKey: 'workers' | 'skAppointees' | 'officials') => {
      const newList = [...formData[listKey]];
      if (newList.length > 1) {
          newList.splice(index, 1);
          setFormData((prev: any) => ({ ...prev, [listKey]: newList }));
      }
  };

  // --- PDF GENERATORS ---























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
          // New Cases
          case 'daftar_transport': generateDaftarTransport(formData); break;
          case 'laporan_sppd': generateLaporanSPPD(formData); break;
          default: alert('Template belum didukung sepenuhnya dalam mode dinamis.');
      }
      setIsPrintModalOpen(false);
  };

  // --- RENDER FORM FIELDS BASED ON TEMPLATE ---
  const renderFormFields = () => {
      return (
          <div className="space-y-3">
              {/* Common Fields */}
              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Tanggal Dokumen</label>
                      <input type="text" name="date" value={formData.date} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Kota/Tempat</label>
                      <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
              </div>

              {/* Template Specifics */}
              {currentTemplateType === 'kuitansi' && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nominal Uang (Rp)</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Terbilang (Otomatis)</label>
                        <textarea name="terbilang" value={formData.terbilang} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm bg-gray-50" rows={2} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Uraian Pembayaran</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Contoh: Belanja ATK kegiatan..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nama Penerima</label>
                        <input type="text" name="receiver" value={formData.receiver} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama Toko / Orang" />
                    </div>
                  </>
              )}

              {currentTemplateType === 'sk' && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nomor SK</label>
                        <input type="text" name="skNumber" value={formData.skNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Tentang / Judul SK</label>
                        <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="PENETAPAN PANITIA..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Menimbang (Konsideran)</label>
                        <textarea 
                            name="skConsiderations" 
                            value={formData.skConsiderations} 
                            onChange={handleInputChange} 
                            className="w-full border rounded px-2 py-1 text-sm h-24" 
                            placeholder="a. Bahwa..." 
                        />
                    </div>
                    <div className="mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Nama yang Ditetapkan (Lampiran)</label>
                        {formData.skAppointees && formData.skAppointees.map((person: any, idx: number) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={person.name} 
                                    onChange={(e) => handleListChange(idx, 'name', e.target.value, 'skAppointees')}
                                    className="flex-1 border rounded px-2 py-1 text-xs" 
                                    placeholder="Nama Lengkap" 
                                />
                                <input 
                                    type="text" 
                                    value={person.role} 
                                    onChange={(e) => handleListChange(idx, 'role', e.target.value, 'skAppointees')}
                                    className="flex-1 border rounded px-2 py-1 text-xs" 
                                    placeholder="Jabatan" 
                                />
                                <button type="button" onClick={() => removeListItem(idx, 'skAppointees')} className="text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button type="button" onClick={() => addListItem('skAppointees')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                            <Plus size={14}/> Tambah Nama
                        </button>
                    </div>
                  </>
              )}

              {/* Peradin Group */}
              {(currentTemplateType === 'surat_tugas' || currentTemplateType === 'sppd' || currentTemplateType === 'daftar_transport' || currentTemplateType === 'laporan_sppd') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Nomor {currentTemplateType === 'surat_tugas' ? 'Surat Tugas' : 'SPPD'}</label>
                            <input 
                                type="text" 
                                name={currentTemplateType === 'surat_tugas' ? 'suratTugasNumber' : 'sppdNumber'} 
                                value={currentTemplateType === 'surat_tugas' ? formData.suratTugasNumber : formData.sppdNumber} 
                                onChange={handleInputChange} 
                                className="w-full border rounded px-2 py-1 text-sm" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tujuan Perjalanan</label>
                            <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Dinas Pendidikan" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tgl Berangkat</label>
                            <input type="text" name="departureDate" value={formData.departureDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Tgl Kembali</label>
                            <input type="text" name="returnDate" value={formData.returnDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Maksud / Keperluan</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Mengikuti Workshop..." />
                    </div>
                    
                    {currentTemplateType === 'sppd' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Alat Angkut</label>
                            <input type="text" name="transportMode" value={formData.transportMode} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    )}

                    {currentTemplateType === 'daftar_transport' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Besaran Transport (Per Orang)</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                        </div>
                    )}

                    {currentTemplateType === 'laporan_sppd' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Hasil Kegiatan (Laporan)</label>
                            <textarea name="reportResult" value={formData.reportResult} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm h-24" placeholder="Hasil kegiatan..." />
                        </div>
                    )}

                    <div className="mt-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pegawai yang Ditugaskan</label>
                        {formData.officials && formData.officials.map((person: any, idx: number) => (
                            <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                                <div className="flex gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        value={person.name} 
                                        onChange={(e) => handleListChange(idx, 'name', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Nama Lengkap" 
                                    />
                                    <input 
                                        type="text" 
                                        value={person.nip} 
                                        onChange={(e) => handleListChange(idx, 'nip', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="NIP" 
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={person.rank} 
                                        onChange={(e) => handleListChange(idx, 'rank', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Pangkat/Golongan" 
                                    />
                                    <input 
                                        type="text" 
                                        value={person.role} 
                                        onChange={(e) => handleListChange(idx, 'role', e.target.value, 'officials')}
                                        className="flex-1 border rounded px-2 py-1 text-xs" 
                                        placeholder="Jabatan" 
                                    />
                                    <button type="button" onClick={() => removeListItem(idx, 'officials')} className="text-red-500 p-1"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={() => addListItem('officials')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                            <Plus size={14}/> Tambah Pegawai
                        </button>
                    </div>
                  </>
              )}

              {(currentTemplateType === 'spk_fisik' || currentTemplateType === 'mou') && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nomor Surat</label>
                        <input type="text" name={currentTemplateType === 'spk_fisik' ? 'spkNumber' : 'mouNumber'} value={currentTemplateType === 'spk_fisik' ? formData.spkNumber : formData.mouNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Nama Pihak Kedua</label>
                            <input type="text" name="contractorName" value={formData.contractorName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500">Jabatan/Pekerjaan</label>
                            <input type="text" name="contractorRole" value={formData.contractorRole} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Alamat Pihak Kedua</label>
                        <input type="text" name="contractorAddress" value={formData.contractorAddress} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Uraian Pekerjaan / Kerjasama</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                    </div>
                    {currentTemplateType === 'spk_fisik' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Lokasi Proyek</label>
                                <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Nilai Kontrak (Rp)</label>
                                <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                        </>
                    )}
                  </>
              )}

              {(currentTemplateType === 'daftar_hadir' || currentTemplateType === 'absensi_tukang' || currentTemplateType === 'upah_tukang') && (
                  <>
                    <div>
                        <label className="block text-xs font-bold text-gray-500">Nama Kegiatan / Proyek</label>
                        <input type="text" name="activityName" value={formData.activityName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Rehab Ruang Kelas" />
                    </div>
                    {currentTemplateType !== 'daftar_hadir' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500">Lokasi</label>
                                <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div className="mt-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pekerja</label>
                                {formData.workers && formData.workers.map((worker: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            value={worker.name} 
                                            onChange={(e) => handleListChange(idx, 'name', e.target.value, 'workers')}
                                            className="flex-1 border rounded px-2 py-1 text-xs" 
                                            placeholder="Nama Pekerja" 
                                        />
                                        <input 
                                            type="text" 
                                            value={worker.role} 
                                            onChange={(e) => handleListChange(idx, 'role', e.target.value, 'workers')}
                                            className="flex-1 border rounded px-2 py-1 text-xs" 
                                            placeholder="Jabatan (Tukang/Pekerja)" 
                                        />
                                        <button type="button" onClick={() => removeListItem(idx, 'workers')} className="text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addListItem('workers')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1">
                                    <Plus size={14}/> Tambah Pekerja
                                </button>
                            </div>
                        </>
                    )}
                  </>
              )}
          </div>
      );
  };

  const renderTemplateButtons = () => {
      if (!activeCategory) return <div className="text-center text-gray-400 py-4 text-xs italic">Pilih kategori di atas.</div>;

      switch (activeCategory) {
          case 'honor':
              return (
                  <>
                    <button onClick={() => openPrintModal('sk')} className="btn-template"><FileSignature size={14} className="text-blue-500"/> SK Penetapan</button>
                    <button onClick={() => openPrintModal('mou')} className="btn-template"><Handshake size={14} className="text-teal-500"/> MOU Tenaga Ekstra</button>
                    <button onClick={() => openPrintModal('daftar_hadir')} className="btn-template"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-purple-500"/> Kuitansi Honor</button>
                  </>
              );
          case 'jasa':
              return (
                  <>
                    <button onClick={() => openPrintModal('spk_fisik')} className="btn-template"><HardHat size={14} className="text-purple-500"/> SPK Konstruksi/Servis</button>
                    <button onClick={() => openPrintModal('absensi_tukang')} className="btn-template"><ClipboardList size={14} className="text-orange-500"/> Absensi Tukang</button>
                    <button onClick={() => openPrintModal('upah_tukang')} className="btn-template"><Hammer size={14} className="text-blue-500"/> Daftar Penerimaan Upah</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-red-500"/> Kuitansi Pembayaran</button>
                  </>
              );
          case 'peradin':
              return (
                  <>
                    <button onClick={() => openPrintModal('surat_tugas')} className="btn-template"><FileSignature size={14} className="text-blue-500"/> Surat Tugas</button>
                    <button onClick={() => openPrintModal('sppd')} className="btn-template"><Bus size={14} className="text-green-500"/> SPPD</button>
                    <button onClick={() => openPrintModal('daftar_transport')} className="btn-template"><DollarSign size={14} className="text-teal-600"/> Daftar Transport</button>
                    <button onClick={() => openPrintModal('laporan_sppd')} className="btn-template"><FileCheck size={14} className="text-orange-500"/> Laporan Perjalanan</button>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-purple-500"/> Kuitansi Transport</button>
                  </>
              );
          default:
              // Generic fallback for other categories
              return (
                  <>
                    <button onClick={() => openPrintModal('kuitansi')} className="btn-template"><Receipt size={14} className="text-blue-500"/> Kuitansi Umum</button>
                    <button onClick={() => openPrintModal('daftar_hadir')} className="btn-template"><ClipboardList size={14} className="text-green-500"/> Daftar Hadir</button>
                    <button onClick={() => openPrintModal('sk')} className="btn-template"><FileSignature size={14} className="text-orange-500"/> SK / Surat Tugas</button>
                  </>
              );
      }
  };

  const allEvidenceFiles = useMemo(() => {
    const list: any[] = [];
    allBudgets.forEach(budget => {
      budget.realizations?.forEach((real, realIdx) => {
        if (real.evidence_files && real.evidence_files.length > 0) {
          const vendorName = real.vendor || 'Tanpa Toko/Vendor';
          const transactionKey = `${vendorName}-${real.date.split('T')[0]}-${real.month}`;
          real.evidence_files.forEach(file => {
             list.push({ 
               ...file, 
               sourceType: 'Belanja', 
               vendor: vendorName, 
               date: real.date, 
               month: real.month,
               transactionKey,
               description: budget.description, 
               amount: real.amount,
               budgetId: budget.id,
               realizationIndex: realIdx
             });
          });
        }
      });
    });
    history.forEach(record => {
        let snapshot: any = record.snapshot_data;
        if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
        if (!snapshot) return;
        if (snapshot.groupedRecipients && Array.isArray(snapshot.groupedRecipients)) {
          snapshot.groupedRecipients.forEach((recipient: any, idx: number) => {
            if (recipient.evidence_files && recipient.evidence_files.length > 0) {
               const vendorName = recipient.name || 'Tanpa Nama';
               const month = new Date(record.letter_date).getMonth() + 1;
               const transactionKey = `history-${record.id}-${idx}`;
               recipient.evidence_files.forEach((file: any) => list.push({ 
                 ...file, 
                 sourceType: 'Riwayat Pencairan', 
                 vendor: vendorName, 
                 date: record.letter_date, 
                 month,
                 transactionKey,
                 description: recipient.descriptions?.join(', ') || 'Pencairan', 
                 amount: recipient.amount,
                 historyId: record.id,
                 historyIdx: idx
               }));
            }
          });
        } else if (Array.isArray(snapshot)) {
          snapshot.forEach((recipient: any, idx: number) => {
            if (recipient.evidence_files && recipient.evidence_files.length > 0) {
               const vendorName = recipient.name || 'Tanpa Nama';
               const month = new Date(record.letter_date).getMonth() + 1;
               const transactionKey = `history-${record.id}-${idx}`;
               recipient.evidence_files.forEach((file: any) => list.push({ 
                 ...file, 
                 sourceType: 'Riwayat Pencairan', 
                 vendor: vendorName, 
                 date: record.letter_date, 
                 month,
                 transactionKey,
                 description: recipient.descriptions?.join(', ') || 'Pencairan', 
                 amount: recipient.amount,
                 historyId: record.id,
                 historyIdx: idx
               }));
            }
          });
        }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allBudgets, history]);

  const groupedAlbum = useMemo(() => {
    const months: Record<number, any[]> = {};
    
    allEvidenceFiles.forEach(file => {
      if (!months[file.month]) {
        months[file.month] = [];
      }
      months[file.month].push(file);
    });

    const result: Record<number, Record<string, any>> = {};
    Object.keys(months).forEach(mStr => {
      const m = parseInt(mStr);
      const transactions: Record<string, any> = {};
      
      months[m].forEach(file => {
        if (!transactions[file.transactionKey]) {
          transactions[file.transactionKey] = {
            key: file.transactionKey,
            vendor: file.vendor,
            date: file.date,
            month: file.month,
            totalAmount: 0,
            files: []
          };
        }
        transactions[file.transactionKey].files.push(file);
        // Important: we only add amount once per unique transaction identity, 
        // but here files are already from realizations. 
        // Wait, if multiple files per realization, we might double count if we just sum.
        // Actually, for the folder view, displaying the transaction total is helpful.
      });

      // Recalculate totals correctly per transaction
      Object.values(transactions).forEach((t: any) => {
        const uniqueItems = new Set();
        t.totalAmount = t.files.reduce((sum: number, f: any) => {
          const itemIdentity = `${f.vendor}-${f.date}-${f.amount}-${f.description}`;
          if (!uniqueItems.has(itemIdentity)) {
            uniqueItems.add(itemIdentity);
            return sum + f.amount;
          }
          return sum;
        }, 0);
      });

      result[m] = transactions;
    });

    return result;
  }, [allEvidenceFiles]);

  const handleDeleteFromAlbum = async (e: React.MouseEvent, file: any) => {
    e.stopPropagation();
    if (!confirm(`Warning: Apakah Anda yakin ingin menghapus arsip fisik ${file.vendor}?`)) return;

    try {
      if (file.sourceType === 'Riwayat Pencairan') {
        const record = history.find(h => h.id === file.historyId);
        if (record) {
          let snapshot: any = record.snapshot_data;
          if (typeof snapshot === 'string') { try { snapshot = JSON.parse(snapshot); } catch(e) { snapshot = {}; } }
          
          let recipients = snapshot.groupedRecipients ? [...snapshot.groupedRecipients] : (Array.isArray(snapshot) ? [...snapshot] : []);
          if (recipients[file.historyIdx]) {
             recipients[file.historyIdx] = { ...recipients[file.historyIdx] };
             recipients[file.historyIdx].evidence_files = (recipients[file.historyIdx].evidence_files || []).filter((f: any) => f.path !== file.path);
             const updatedSnapshot = snapshot.groupedRecipients ? { ...snapshot, groupedRecipients: recipients } : recipients;
             await updateWithdrawalHistory(record.id, { snapshot_data: updatedSnapshot });
             setHistory(prev => prev.map(h => h.id === record.id ? { ...h, snapshot_data: updatedSnapshot } : h));
          }
        }
      } else {
        const budget = allBudgets.find(b => b.id === file.budgetId);
        if (budget && budget.realizations) {
          const upReals = [...budget.realizations];
          if (upReals[file.realizationIndex]) {
             upReals[file.realizationIndex] = { ...upReals[file.realizationIndex] };
             upReals[file.realizationIndex].evidence_files = (upReals[file.realizationIndex].evidence_files || []).filter((f: any) => f.path !== file.path);
             onUpdate(file.budgetId, { realizations: upReals });
          }
        }
      }
    } catch (e) {
      console.error("Gagal menghapus file:", e);
      alert("Kesalahan saat menghapus file.");
    }
  };

  const handleGeneralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const filesArr = Array.from(e.target.files || []);
      if (filesArr.length === 0) return;

      setIsLoading(true);
      const isOnline = !!supabase;

      try {
        for (const file of filesArr) {
          if (isOnline) {
            // Priority: Upload to Cloud Storage
            const result = await uploadEvidenceFile(file, 'general');
            if (result.url && result.path) {
                const newFile = {
                    name: file.name,
                    url: result.url,
                    type: file.type.includes('image') ? 'Gambar / Scan' : 'Dokumen PDF',
                    size: file.size,
                    path: result.path,
                    vendor: 'Dokumen Sekolah',
                    description: 'Arsip Dokumen Pendukung Umum',
                    amount: 0,
                    date: new Date().toISOString(),
                    isGeneral: true
                };
                const savedFile = await saveGeneralFile(newFile);
                if (savedFile) {
                  setGeneralFiles(prev => {
                    const filtered = prev.filter(f => f && f.path !== savedFile.path);
                    return [savedFile, ...filtered];
                  });
                }
            } else {
                alert(`Gagal mengunggah ${file.name}. Pastikan koneksi internet stabil.`);
            }
          } else {
            // Offline Fallback: DataURL (Limited by LocalStorage quota)
            if (file.size > 2 * 1024 * 1024) {
               alert(`File ${file.name} terlalu besar (>2MB). Silakan hubungkan internet/Supabase untuk menyimpan file besar.`);
               continue;
            }

            await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = async (event) => {
                const dataUrl = event.target?.result as string;
                const uniquePath = `general/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
                const newFile = {
                    name: file.name,
                    url: dataUrl,
                    type: file.type.includes('image') ? 'Gambar / Scan' : 'Dokumen PDF',
                    size: file.size,
                    path: uniquePath,
                    vendor: 'Dokumen Sekolah',
                    description: 'Arsip Dokumen Pendukung Umum',
                    amount: 0,
                    date: new Date().toISOString(),
                    isGeneral: true
                };
                const savedFile = await saveGeneralFile(newFile);
                if (savedFile) {
                  setGeneralFiles(prev => {
                    const filtered = prev.filter(f => f && f.path !== savedFile.path);
                    return [savedFile, ...filtered];
                  });
                }
                resolve(null);
              };
              reader.readAsDataURL(file);
            });
          }
        }
      } catch (error) {
        console.error("General upload failed:", error);
        alert("Terjadi kesalahan saat mengunggah dokumen.");
      } finally {
        setIsLoading(false);
      }
  };

  const handleDeleteGeneralFile = async (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();
      if (!confirm('Apakah Anda yakin ingin menghapus arsip umum ini?')) return;
      
      const success = await deleteGeneralFile(filePath);
      if (success) {
        setGeneralFiles(prev => prev.filter(f => f.path !== filePath));
      } else {
        alert("Gagal menghapus file dari cloud.");
      }
  };

  const renderAlbumGallery = () => {
    const { month, transactionKey } = albumView;

    // --- BREADCRUMBS ---
    const renderBreadcrumbs = () => (
        <div className="flex items-center gap-2 mb-8 bg-slate-100/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 shadow-inner w-fit">
            <button 
                onClick={() => setAlbumView({ month: null, transactionKey: null })}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 ${month === null ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5' : 'text-slate-500 hover:text-slate-800'}`}
            >
                Arsip Pusat
            </button>
            {month !== null && (
                <>
                    <ChevronRight size={14} className="text-slate-300" />
                    <button 
                         onClick={() => setAlbumView({ month, transactionKey: null })}
                         className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 ${month !== null && !transactionKey ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/5' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {month === -1 ? 'Dokumen Pendukung' : MONTHS[month - 1]}
                    </button>
                </>
            )}
            {transactionKey && (
                <>
                    <ChevronRight size={14} className="text-slate-300" />
                    <div className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-600 text-white shadow-lg shadow-blue-500/30 rounded-xl border border-blue-500">
                        {groupedAlbum[month!]?.[transactionKey]?.vendor || 'Detail Transaksi'}
                    </div>
                </>
            )}
        </div>
    );

    // --- RENDER LEVEL 0: MONTHS ---
    if (month === null) {
        const availableMonths = Object.keys(groupedAlbum).map(m => parseInt(m)).sort((a, b) => a - b);
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderBreadcrumbs()}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {/* General Supporting Documents Folder */}
                    <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAlbumView({ month: -1, transactionKey: null })}
                        className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-900/5 hover:shadow-2xl hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                            <FileCheck size={120} className="text-indigo-600 -rotate-12" />
                        </div>
                        <div className="w-16 h-16 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:rotate-6 group-hover:shadow-indigo-500/30">
                            <Folder size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Dokumen Pendukung</h3>
                        <div className="flex items-center gap-2 mb-6">
                            <span className="px-2 py-1 bg-white/60 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                                {generalFiles.length} Berkas
                            </span>
                        </div>
                        <div className="pt-6 border-t border-indigo-100/50 flex items-center justify-between text-indigo-600 text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-700">
                            <span>Buka Folder</span>
                            <div className="p-1.5 bg-white/60 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <ChevronRight size={14} />
                            </div>
                        </div>
                    </motion.div>

                    {availableMonths.map(m => (
                        <motion.div
                            key={m}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setAlbumView({ month: m, transactionKey: null })}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                                <Folder size={120} className="text-blue-600 -rotate-12" />
                            </div>
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:rotate-6 group-hover:shadow-blue-500/30">
                                <Folder size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Bukti {MONTHS[m - 1]}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                                    {Object.keys(groupedAlbum[m]).length} Transaksi
                                </span>
                            </div>
                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-blue-600 text-[10px] font-black uppercase tracking-widest group-hover:text-blue-700">
                                <span>Buka Folder</span>
                                <div className="p-1.5 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  <ChevronRight size={14} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    if (month === -1) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderBreadcrumbs()}
                
                {/* Upload Banner */}
                <div className="mb-8 p-8 bg-blue-50/50 backdrop-blur-sm rounded-[2.5rem] border border-blue-100 shadow-xl shadow-blue-900/5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                       <h3 className="text-2xl font-black text-slate-800 mb-2">Arsip Dokumen Pendukung</h3>
                       <p className="text-sm font-semibold text-slate-500 max-w-lg leading-relaxed">Penyimpanan terpusat untuk SK BOSP, SK Bendahara, dan dokumen pendukung standar lainnya.</p>
                    </div>
                    <div className="relative z-10 shrink-0">
                        <input 
                            type="file" 
                            id="generalUpload" 
                            multiple 
                            accept="image/*,.pdf" 
                            className="hidden" 
                            onChange={handleGeneralUpload}
                        />
                        <label htmlFor="generalUpload" className={`px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer group hover:scale-105 active:scale-95 ${isLoading ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'}`}>
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />} 
                            {isLoading ? 'Memproses...' : 'Tambah Dokumen'}
                        </label>
                    </div>
                </div>

                {/* File Grid */}
                {generalFiles.length === 0 ? (
                    <div className="bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-slate-200/50">
                            <Folder size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Folder Masih Kosong</h3>
                        <p className="text-xs font-semibold text-slate-400 max-w-xs">Silakan tambah dokumen menggunakan tombol di atas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {generalFiles.filter(Boolean).map((file, idx) => {
                            const isImage = file.name && file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                            const animationKey = file.path || `gen-${idx}`;

                            return (
                                <motion.div 
                                    layoutId={`card-gen-${animationKey}`}
                                    key={animationKey}
                                    onClick={() => setSelectedFile({ ...file, isImage, idx })}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                    className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden group cursor-pointer flex flex-col relative"
                                    whileHover={{ y: -8 }}
                                >
                                    <motion.div layoutId={`image-container-gen-${animationKey}`} className="relative h-56 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-50">
                                        {isImage ? (
                                            <motion.img layoutId={`image-gen-${animationKey}`} src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                        ) : (
                                            <motion.div layoutId={`image-gen-${animationKey}`} className="text-blue-400 flex flex-col items-center group-hover:scale-110 transition-transform duration-1000">
                                                <div className="p-4 bg-white rounded-2xl shadow-lg shadow-blue-900/5">
                                                  <FileText size={48} />
                                                </div>
                                                <span className="text-[10px] mt-4 font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[80%] text-center px-4">{file.name}</span>
                                            </motion.div>
                                        )}
                                        <div className="absolute top-4 left-4 z-10">
                                            <span className="text-[9px] font-black text-white bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">
                                                {file.type}
                                            </span>
                                        </div>
                                    </motion.div>
                                    <motion.div layoutId={`info-gen-${animationKey}`} className="p-8 bg-white flex-1 flex flex-col">
                                        <h4 className="text-base font-black text-slate-800 mb-2 tracking-tight line-clamp-1" title={file.name}>{file.name}</h4>
                                        <p className="text-xs font-semibold text-slate-400 line-clamp-2 mb-6 leading-relaxed flex-1 opacity-80">{file.description}</p>
                                        
                                        <div className="flex justify-between items-center pt-6 border-t border-slate-50 mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ukuran</span>
                                                <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div 
                                                    onClick={(e) => handleDeleteGeneralFile(e, file.path)}
                                                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={18} />
                                                </div>
                                                <div 
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const link = document.createElement('a');
                                                        link.href = file.url;
                                                        link.download = file.name || 'document';
                                                        document.body.appendChild(link);
                                                        link.click();
                                                        document.body.removeChild(link);
                                                    }}
                                                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                                >
                                                  <Download size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (month && month > 0 && !transactionKey) {
        const transactions = Object.values(groupedAlbum[month] || {}).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {renderBreadcrumbs()}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {transactions.map((t: any) => (
                        <motion.div
                            key={t.key}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setAlbumView({ month: month, transactionKey: t.key })}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-blue-900/5 hover:shadow-2xl hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner group-hover:rotate-6">
                                    <ShoppingCart size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                    <h3 className="text-base font-black text-slate-800 truncate leading-none">{t.vendor}</h3>
                                </div>
                            </div>
                            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Nominal SPJ</span>
                                    <span className="text-indigo-600 text-xs">
                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(t.totalAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Arsip Bukti</span>
                                    <span className="bg-white text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 shadow-sm">{t.files.length} Berkas</span>
                                </div>
                            </div>
                            <div className="mt-8 flex items-center justify-between text-indigo-600 text-[10px] font-black uppercase tracking-widest group-hover:text-indigo-700">
                                <span>Periksa Arsip</span>
                                <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                  <ChevronRight size={14} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    // --- RENDER LEVEL 2: FILES IN TRANSACTION ---
    const filesInTransaction = groupedAlbum[month!]?.[transactionKey!]?.files || [];
    return (
      <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderBreadcrumbs()}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filesInTransaction.map((file: any, idx: number) => {
                const isImage = file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                return (
                    <motion.div 
                        layoutId={`card-${file.url}-${idx}`}
                        key={idx}
                        onClick={() => setSelectedFile({ ...file, isImage, idx })}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden group cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col relative"
                    >
                        <motion.div layoutId={`image-container-${file.url}-${idx}`} className="relative h-56 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-50">
                            {isImage ? (
                                <motion.img layoutId={`image-${file.url}-${idx}`} src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                                <motion.div layoutId={`image-${file.url}-${idx}`} className="text-blue-400 flex flex-col items-center group-hover:scale-110 transition-transform duration-1000">
                                    <div className="p-4 bg-white rounded-2xl shadow-lg shadow-blue-900/5">
                                      <FileText size={48} />
                                    </div>
                                    <span className="text-[10px] mt-4 font-black text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[80%] text-center px-4">{file.name}</span>
                                </motion.div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8 p-6">
                                <span className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-500">
                                    <Eye size={16} className="text-blue-600" /> Buka Berkas
                                </span>
                            </div>
                            
                            {/* Badges on top of image */}
                            <div className="absolute top-4 left-4 z-10">
                              <span className="text-[9px] font-black text-white bg-blue-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg border border-white/20">
                                  {file.type}
                              </span>
                            </div>
                        </motion.div>

                        <motion.div layoutId={`info-${file.url}-${idx}`} className="p-8 bg-white flex-1 flex flex-col">
                            <h4 className="text-base font-black text-slate-800 mb-2 tracking-tight line-clamp-1" title={file.vendor}>{file.vendor}</h4>
                            <p className="text-xs font-semibold text-slate-400 line-clamp-2 mb-6 leading-relaxed flex-1 opacity-80" title={file.description}>{file.description}</p>
                            
                            <div className="flex justify-between items-center pt-6 border-t border-slate-50 mt-auto">
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Nominal Bukti</span>
                                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(file.amount)}
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <div 
                                      onClick={(e) => handleDeleteFromAlbum(e, file)}
                                      className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-red-50 group-hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                      <Trash2 size={18} />
                                  </div>
                                  <div 
                                      onClick={async (e) => {
                                          e.stopPropagation();
                                          const response = await fetch(file.url);
                                          const blob = await response.blob();
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = file.name || 'document';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                      }}
                                      className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors cursor-pointer"
                                  >
                                    <Download size={18} />
                                  </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                );
            })}
        </div>

        {/* Full-Screen Overlay with AnimatePresence */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 bg-slate-900/80 backdrop-blur-lg"
              onClick={() => setSelectedFile(null)}
            >
              <button 
                  onClick={() => setSelectedFile(null)}
                  className="absolute top-8 right-8 z-[110] p-4 bg-white/10 text-white hover:bg-white/20 hover:scale-110 rounded-2xl transition-all backdrop-blur-md shadow-2xl border border-white/10"
              >
                  <X size={24} />
              </button>

              <motion.div
                layoutId={`card-${selectedFile.url}-${selectedFile.idx}`}
                className="relative w-full max-w-6xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] border border-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                 {/* Image/PDF Section */}
                 <motion.div layoutId={`image-container-${selectedFile.url}-${selectedFile.idx}`} className="flex-1 bg-slate-50 relative flex items-center justify-center min-h-[40vh] md:min-h-0 border-r border-slate-100">
                    {selectedFile.isImage ? (
                        <motion.img layoutId={`image-${selectedFile.url}-${selectedFile.idx}`} src={selectedFile.url} className="w-full h-full object-contain p-8" />
                    ) : (
                        <motion.iframe layoutId={`image-${selectedFile.url}-${selectedFile.idx}`} src={selectedFile.url} className="absolute inset-0 w-full h-full border-0 bg-white" title="PDF Document" />
                    )}
                    
                    <div className="absolute bottom-8 right-8 flex gap-4 z-10">
                        <button 
                            onClick={() => window.open(selectedFile.url, '_blank')}
                            className="p-4 bg-white/90 hover:bg-white text-slate-800 backdrop-blur-xl rounded-2xl transition-all shadow-2xl hover:scale-110 border border-slate-200 group/btn flex items-center gap-3 pr-6"
                        >
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors"><Download size={20} /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Unduh</span>
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const win = window.open(selectedFile.url, '_blank');
                                if (win) win.onload = () => win.print();
                            }}
                            className="p-4 bg-slate-900 text-white backdrop-blur-xl rounded-2xl transition-all shadow-2xl hover:scale-110 border border-slate-800 group/btn flex items-center gap-3 pr-6"
                        >
                            <div className="p-2 bg-slate-800 text-blue-400 rounded-xl group-hover/btn:bg-blue-600 group-hover/btn:text-white transition-colors"><Printer size={20} /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Cetak</span>
                        </button>
                    </div>
                 </motion.div>

                 {/* Information Panes (Bento Style) */}
                 <motion.div layoutId={`info-${selectedFile.url}-${selectedFile.idx}`} className="w-full md:w-[400px] lg:w-[450px] bg-white p-10 md:p-12 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6">
                          <span className="inline-block text-[10px] font-black text-white bg-blue-600 px-4 py-1.5 rounded-xl uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
                              {selectedFile.type}
                          </span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-4 leading-tight tracking-tight">{selectedFile.vendor}</h2>
                        <div className="flex items-center gap-2 mb-10">
                          <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><BookOpen size={16} /></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber: <span className="text-blue-600">{selectedFile.sourceType}</span></span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500"><ClipboardList size={14}/></div>
                                  Detail Transaksi
                                </h4>
                                <div className="space-y-5">
                                  <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</span>
                                      <span className="text-xs font-black text-slate-800">
                                          {new Date(selectedFile.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center pb-4 border-b border-slate-200/50">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nominal</span>
                                      <span className="text-sm font-black text-emerald-600 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-emerald-50">
                                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedFile.amount)}
                                      </span>
                                  </div>
                                  <div>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Uraian SPJ</span>
                                      <div className="text-sm font-semibold text-slate-600 leading-relaxed bg-white p-6 rounded-2xl shadow-inner border border-slate-50 italic">
                                          "{selectedFile.description}"
                                      </div>
                                  </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-8 flex flex-col gap-4">
                        <button 
                            onClick={async () => {
                                const response = await fetch(selectedFile.url);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = selectedFile.name || 'document';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 group/main"
                        >
                            <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Unduh Arsip Digital
                        </button>
                        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60">Dokumen tersimpan aman di Cloud RKAS Pintar</p>
                    </div>
                 </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-700">
      {/* MODERN GLASS HEADER & NAV */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6 bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-900/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50"></div>
          
          <div className="relative z-10 flex-1">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                  <BookOpen size={24} />
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-blue-100 shadow-sm">Audit-Ready</span>
             </div>
             <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
               Manajemen Bukti <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Digital</span>
             </h2>
             <p className="text-sm font-semibold text-slate-500">
               Automasi dokumen pendukung dan arsip bukti fisik SIPLah.
             </p>
          </div>

          <div className="relative z-10 flex bg-white/40 backdrop-blur-2xl p-1.5 rounded-[1.5rem] border border-white/60 shadow-xl shadow-blue-900/5">
            {[
              { id: 'templates', label: 'Template', icon: FileText },
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'album', label: 'Album', icon: ImageIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-xl shadow-blue-900/10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTabGlow" className="absolute inset-0 bg-blue-500/5 rounded-xl blur-md" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {activeTab === 'templates' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           {/* LEFT COLUMN: Categories */}
           <div className="lg:col-span-4 space-y-6">
              <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/80 shadow-xl shadow-blue-900/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">Kategori Belanja</p>
                <div className="space-y-3">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                      <button
                         key={cat.id}
                         onClick={() => setActiveCategory(cat.id)}
                         className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                             activeCategory === cat.id 
                             ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/40 scale-[1.02]' 
                             : 'bg-white border-slate-100 text-slate-700 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-lg'
                         }`}
                      >
                         <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-xl transition-colors duration-300 ${activeCategory === cat.id ? 'bg-white/20 text-white shadow-inner' : `${cat.bg} ${cat.color} group-hover:scale-110`}`}>
                               <cat.icon size={20} />
                            </div>
                            <div className="flex-1">
                               <p className="font-black text-sm tracking-tight">{cat.title}</p>
                               <p className={`text-[10px] font-semibold line-clamp-1 mt-0.5 ${activeCategory === cat.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {cat.description}
                               </p>
                            </div>
                         </div>
                         <ChevronRight size={18} className={`relative z-10 transition-all duration-300 ${activeCategory === cat.id ? 'text-white translate-x-0' : 'text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1'}`} />
                         
                         {activeCategory === cat.id && (
                           <div className="absolute top-0 right-0 -mt-4 -mr-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                         )}
                      </button>
                  ))}
                </div>
              </div>
              
              {/* Quick Template Downloads */}
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-colors"></div>
                  <h4 className="text-sm font-black text-white mb-4 flex items-center gap-2 relative z-10">
                      <div className="p-1.5 bg-slate-800 rounded-lg"><Printer size={16} className="text-blue-400" /></div>
                      Cetak Cepat
                  </h4>
                  <div className="space-y-2 relative z-10">
                      {renderTemplateButtons()}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-6 font-bold uppercase tracking-widest text-center opacity-70">Pilih kategori untuk daftar cetak</p>
              </div>
           </div>

           {/* RIGHT COLUMN: Details & Preview */}
           <div className="lg:col-span-8">
              {activeCategory ? (
                  (() => {
                      const cat = TEMPLATE_CATEGORIES.find(c => c.id === activeCategory);
                      if (!cat) return null;
                      return (
                          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                              <div className={`p-10 border-b border-slate-100 relative overflow-hidden ${cat.bg}`}>
                                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                  <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-4 rounded-2xl bg-white shadow-xl ${cat.color}`}>
                                          <cat.icon size={28} />
                                        </div>
                                        <div>
                                          <span className={`px-3 py-1 bg-white/50 backdrop-blur-sm rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/50 mb-2 inline-block ${cat.color}`}>Kategori Terpilih</span>
                                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{cat.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-600 leading-relaxed max-w-2xl">{cat.description}</p>
                                  </div>
                              </div>
                              
                              <div className="p-10">
                                  <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                                          <CheckCircle2 size={20} />
                                        </div>
                                        Checklist Audit BOSP 2026
                                    </h4>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full font-black uppercase tracking-widest border border-slate-200">Wajib Dilengkapi</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {cat.requirements.map((req, idx) => (
                                          <div key={idx} className="group flex items-start gap-4 p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 rounded-2xl border border-transparent hover:border-blue-100 transition-all duration-300">
                                              <div className="min-w-[32px] h-8 flex items-center justify-center bg-white text-blue-600 shadow-sm rounded-xl text-xs font-black mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                                  {idx + 1}
                                              </div>
                                              <p className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors leading-snug">{req}</p>
                                          </div>
                                      ))}
                                  </div>

                                  <div className="mt-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-4">
                                     <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                        <Sparkles size={20} />
                                     </div>
                                     <div>
                                        <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Tips Kelengkapan</p>
                                        <p className="text-[11px] font-bold text-slate-500">Pastikan semua dokumen di atas memiliki stempel basah dan tanda tangan asli sebelum di-scan.</p>
                                     </div>
                                  </div>
                              </div>
                          </div>
                      );
                  })()
              ) : (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center p-12 group">
                      <div className="bg-white p-8 rounded-full shadow-xl shadow-slate-200/50 mb-6 group-hover:scale-110 transition-transform duration-500">
                          <FileText size={56} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </div>
                      <h3 className="text-xl font-black text-slate-700 mb-3 tracking-tight">Kategori Belum Dipilih</h3>
                      <p className="text-sm font-semibold text-slate-400 max-w-xs leading-relaxed">
                          Silakan pilih jenis belanja di panel kiri untuk melihat detail dokumen pendukung yang dibutuhkan untuk audit.
                      </p>
                      <div className="mt-8 flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-0"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-150"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-bounce delay-300"></div>
                      </div>
                  </div>
               )}
           </div>
        </div>
      ) : activeTab === 'album' ? (
        renderAlbumGallery()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Left: Budget List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-900/5">
              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl mb-6 shadow-inner">
                <button
                  onClick={() => setDataSource('history')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
                    dataSource === 'history' 
                      ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  RIWAYAT SPJ (HISTORY)
                </button>
              </div>

              <div className="relative mb-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                    <p className="text-xs font-bold text-slate-400">Tidak ada transaksi ditemukan.</p>
                  </div>
                ) : dataSource === 'history' ? (
                  Object.entries(
                    filteredGroups.reduce((acc: any, group: any) => {
                      const monthName = MONTHS[group.month - 1] || `Bulan ${group.month}`;
                      if (!acc[monthName]) acc[monthName] = [];
                      acc[monthName].push(group);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([monthName, groups]: any) => (
                    <div key={monthName} className="mb-4 last:mb-0">
                      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md px-4 py-2 border border-slate-100/50 mb-3 rounded-xl flex items-center justify-between shadow-sm">
                        <span className="text-xs font-black text-slate-700 tracking-wider uppercase">{monthName}</span>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">{groups.length} Transaksi</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {groups.map((group: any) => (
                          <button
                            key={group.key}
                            onClick={() => handleSelectGroup(group)}
                            className={`w-full text-left p-4 rounded-[1.5rem] border transition-all duration-300 group ${
                              selectedGroup?.key === group.key
                                ? 'border-blue-200 bg-white shadow-xl shadow-blue-900/10 scale-[1.02]'
                                : 'border-transparent hover:bg-white/60 hover:border-slate-100'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${selectedGroup?.key === group.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      {group.vendor}
                                    </span>
                                    {(group.vendor.toLowerCase().includes('siplah') || group.items.some((i: any) => i.budgetDescription.toLowerCase().includes('siplah'))) && (
                                        <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-emerald-200">SIPLah</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(group.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • Bulan {MONTHS[group.month - 1]}
                                  </span>
                              </div>
                              {selectedGroup?.key === group.key && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              )}
                            </div>
                            <div className={`text-xs font-black text-slate-800 leading-snug line-clamp-2 ${selectedGroup?.key === group.key ? '' : 'text-slate-600'}`}>
                              {group.items.map((i: any) => i.budgetDescription).join(', ')}
                            </div>
                            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/50">
                              <span className="text-[10px] font-black text-indigo-600">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(group.totalAmount)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                 <FileText size={10} className="text-slate-300" />
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{group.items.length} Item</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  filteredGroups.map(group => (
                    <button
                      key={group.key}
                      onClick={() => handleSelectGroup(group)}
                      className={`w-full text-left p-4 rounded-[1.5rem] border transition-all duration-300 group ${
                        selectedGroup?.key === group.key
                          ? 'border-blue-200 bg-white shadow-xl shadow-blue-900/10 scale-[1.02]'
                          : 'border-transparent hover:bg-white/60 hover:border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${selectedGroup?.key === group.key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {group.vendor}
                              </span>
                              {(group.vendor.toLowerCase().includes('siplah') || group.items.some((i: any) => i.budgetDescription.toLowerCase().includes('siplah'))) && (
                                  <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-emerald-200">SIPLah</span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(group.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • Bulan {MONTHS[group.month - 1]}
                            </span>
                        </div>
                        {selectedGroup?.key === group.key && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <div className={`text-xs font-black text-slate-800 leading-snug line-clamp-2 ${selectedGroup?.key === group.key ? '' : 'text-slate-600'}`}>
                        {group.items.map((i: any) => i.budgetDescription).join(', ')}
                      </div>
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100/50">
                        <span className="text-[10px] font-black text-indigo-600">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(group.totalAmount)}
                        </span>
                        <div className="flex items-center gap-1.5">
                           <FileText size={10} className="text-slate-300" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{group.items.length} Item</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Upload Interface */}
          <div className="lg:col-span-8">
            {selectedGroup ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-blue-900/5 overflow-hidden min-h-[600px] animate-in slide-in-from-right-8 duration-700">
                <div className="bg-slate-50/80 backdrop-blur-md px-10 py-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2.5 bg-white rounded-xl shadow-lg shadow-blue-900/5 text-blue-600">
                          <ShoppingCart size={20} />
                       </div>
                       <h3 className="text-2xl font-black text-slate-800 tracking-tight">{selectedGroup.vendor}</h3>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      Transaksi <span className="text-slate-800 underline decoration-blue-500/30 underline-offset-4">{new Date(selectedGroup.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span> • {selectedGroup.items.length} Item terdeteksi
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleProcessAi(selectedGroup, true)}
                      disabled={isAiLoading}
                      className="group flex items-center gap-3 px-6 py-3 bg-white text-blue-600 border border-blue-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-xl shadow-blue-900/5 disabled:opacity-50"
                    >
                      {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                      Analisis via AI
                    </button>
                  </div>
                </div>

                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {/* Items Bento Card */}
                    <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
                                <Receipt size={14} /> Detail Belanja
                            </h4>
                            <span className="text-xl font-black">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedGroup.totalAmount)}
                            </span>
                        </div>
                        <div className="space-y-3">
                          {selectedGroup.items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] font-bold opacity-90">
                                <span className="truncate max-w-[180px]">{item.budgetDescription}</span>
                                <span className="font-mono whitespace-nowrap bg-white/10 px-2 py-0.5 rounded">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(item.amount)}</span>
                            </div>
                          ))}
                          {selectedGroup.items.length > 3 && (
                            <p className="text-[9px] font-black opacity-60 text-center pt-2 uppercase tracking-widest">+ {selectedGroup.items.length - 3} Item Lainnya</p>
                          )}
                        </div>
                    </div>

                    {/* Quick Docs Bento Card */}
                    <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mb-16 group-hover:scale-150 transition-transform duration-1000"></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                             <Sparkles size={14} className="text-indigo-400" /> Generator Dokumen
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={() => openPrintModal('kuitansi', selectedGroup)} className="p-4 bg-slate-800/50 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded-2xl transition-all duration-300 group/btn flex flex-col items-center gap-2">
                              <Receipt size={20} className="text-blue-400 group-hover/btn:text-white" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Kuitansi</span>
                           </button>
                           <button onClick={() => openPrintModal('daftar_hadir', selectedGroup)} className="p-4 bg-slate-800/50 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-2xl transition-all duration-300 group/btn flex flex-col items-center gap-2">
                              <Users size={20} className="text-indigo-400 group-hover/btn:text-white" />
                              <span className="text-[9px] font-black uppercase tracking-widest">Absensi</span>
                           </button>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-6 font-bold uppercase tracking-widest text-center">Data SPJ akan diinject otomatis</p>
                    </div>
                  </div>

                  {/* AI Analysis Alert */}
                  <div className="mb-10 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100/50 relative overflow-hidden flex flex-col md:flex-row md:items-center gap-6">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <Sparkles size={120} className="text-amber-600" />
                    </div>
                    <div className="p-5 bg-white rounded-3xl shadow-xl shadow-amber-900/5 text-amber-500 border border-amber-50">
                        <CheckCircle2 size={32} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-base font-black text-amber-900 tracking-tight">Requirement Audit Digital 2026</h4>
                            {!isAiConfigured() && (
                                <span className="text-[8px] font-black bg-amber-200/50 text-amber-700 px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-200">Local Rules</span>
                            )}
                        </div>
                        <p className="text-[11px] font-bold text-amber-700 opacity-80 leading-relaxed max-w-2xl">
                          {isAiConfigured() 
                            ? "AI telah memetakan standar dokumen pendukung berdasarkan Juknis BOSP terbaru. Pastikan semua file di bawah telah terunggah dengan resolusi tinggi."
                            : "Sistem Smart-Rules telah otomatis menentukan daftar kelengkapan bukti fisik yang wajib Anda siapkan untuk transaksi belanja ini."}
                        </p>
                    </div>
                  </div>

                  {/* Evidence Requirement List */}
                  <div className="space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-4">Daftar Berkas Wajib</p>
                    {suggestedEvidence.map((evidence, idx) => {
                      const files = (selectedGroup.evidence_files || []).filter((f: any) => f.type === evidence);
                      const isUploading = uploadProgress[evidence];

                      return (
                        <div key={idx} className="group p-6 rounded-[2rem] border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all duration-500">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-2xl transition-all duration-500 ${files.length > 0 ? 'bg-emerald-50 text-emerald-600 shadow-xl shadow-emerald-900/5 rotate-6' : 'bg-white text-slate-300 border border-slate-50'}`}>
                                {files.length > 0 ? <CheckCircle2 size={24} /> : <FileText size={24} />}
                              </div>
                              <div>
                                <div className="text-base font-black text-slate-800 tracking-tight mb-1">{evidence}</div>
                                <div className="flex items-center gap-3">
                                  {files.length > 0 ? (
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                      <CheckCircle2 size={12} /> {files.length} Arsip Tersimpan
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
                                      <AlertCircle size={12} /> Belum Ada Berkas
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <label className={`relative overflow-hidden group/btn px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all duration-500 w-full md:w-auto text-center ${
                              isUploading 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/30'
                            }`}>
                              {isUploading ? (
                                <div className="flex items-center justify-center gap-3">
                                  <Loader2 size={16} className="animate-spin" />
                                  Proses...
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-3">
                                  <Upload size={16} className="group-hover/btn:-translate-y-1 transition-transform" />
                                  Unggah Bukti
                                </div>
                              )}
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*,application/pdf"
                                multiple
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files?.length) {
                                    const filesArr = Array.from(e.target.files);
                                    if (filesArr.length > 12) {
                                      alert("Maksimal 12 file dapat diunggah sekaligus.");
                                    }
                                    handleFileUpload(evidence, filesArr.slice(0, 12));
                                  }
                                }}
                              />
                            </label>
                          </div>

                          {/* File Preview list */}
                          {files.length > 0 && (
                            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-0 md:pl-20">
                              {files.map((file: any, fIdx: number) => (
                                <div key={fIdx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group/file hover:border-blue-200 transition-all shadow-sm">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-slate-50 rounded-lg text-blue-500 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors">
                                      <FileText size={16} className="shrink-0" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => handleDeleteFile(evidence, file.path)}
                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Hapus"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center h-full min-h-[600px] group transition-all duration-700 hover:bg-white/60 hover:border-blue-200">
                <div className="relative mb-10">
                   <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-10 group-hover:scale-150 transition-transform duration-1000"></div>
                   <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/5 group-hover:rotate-12 transition-transform duration-500">
                      <div className="p-6 bg-blue-50 rounded-[2rem] text-blue-500">
                        <Upload size={56} />
                      </div>
                   </div>
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Mulai Pengarsipan <span className="text-blue-600">Digital</span></h3>
                <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto leading-relaxed mb-12">
                  Pilih transaksi SPJ di panel samping untuk memverifikasi dan mengunggah bukti fisik yang dibutuhkan audit.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                  {[
                    { step: 1, title: 'Input Data', desc: 'Pilih realisasi belanja aktif', icon: Search },
                    { step: 2, title: 'Verifikasi AI', desc: 'Sistem cek kelengkapan dokumen', icon: Sparkles },
                    { step: 3, title: 'Finalisasi', desc: 'Upload berkas digital aman', icon: CheckCircle2 }
                  ].map((s, i) => (
                    <div key={i} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 group/card">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6 group-hover/card:bg-blue-600 group-hover/card:text-white transition-all duration-500 font-black">
                        <s.icon size={20} />
                      </div>
                      <div className="text-[10px] text-blue-600 uppercase tracking-widest font-black mb-2">Step {s.step}</div>
                      <div className="text-base font-black text-slate-800 mb-2">{s.title}</div>
                      <div className="text-[11px] font-semibold text-slate-400 leading-relaxed">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL INPUT DATA */}
      <AnimatePresence>
        {isPrintModalOpen && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white"
                >
                    <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                <Printer size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Generate Dokumen</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automasi Berkas Audit</p>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsPrintModalOpen(false);
                            }} 
                            className="p-3 text-slate-400 hover:text-slate-800 hover:bg-white rounded-2xl transition-all"
                        >
                            <X size={24}/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                        <form id="printForm" onSubmit={handlePrint} className="space-y-6">
                            {renderFormFields()}
                        </form>
                    </div>
                    
                    <div className="p-10 border-t border-slate-100 bg-white/80 backdrop-blur-md">
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setIsPrintModalOpen(false)} 
                                className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-black"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit" 
                                form="printForm" 
                                className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all group"
                            >
                                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
                                Generate PDF
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Style Injection for Template Buttons */}
      <style>{`
        .btn-template {
            @apply w-full text-left text-xs p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 flex items-center gap-2 text-gray-600 transition-all;
        }
      `}</style>
    </div>
  );
};

export default EvidenceTemplates;
