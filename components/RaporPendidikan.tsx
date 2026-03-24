
import React, { useState, useEffect, useRef } from 'react';
import { RaporIndicator, PBDRecommendation, TransactionType, Budget, SchoolProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, CheckCircle, Plus, TrendingUp, AlertTriangle, CalendarRange, Save, Loader2, X, Check, Upload, FileText, SlidersHorizontal, MousePointerClick, Printer } from 'lucide-react';
import { analyzeRaporQuality, analyzeRaporPDF, isAiConfigured } from '../lib/gemini';
import { getRaporData, saveRaporData } from '../lib/db';
import { generatePDFHeader, generateSignatures, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extractDataFromExcel, parseRaporData } from '../lib/fileProcessor';

interface RaporPendidikanProps {
  onAddBudget: (item: any) => Promise<void>;
  budgetData: Budget[];
  profile: SchoolProfile | null;
}

const DEFAULT_INDICATORS: RaporIndicator[] = [
  { id: 'A.1', label: 'Kemampuan Literasi', score: 0, category: 'Kurang' },
  { id: 'A.2', label: 'Kemampuan Numerasi', score: 0, category: 'Kurang' },
  { id: 'A.3', label: 'Karakter', score: 0, category: 'Kurang' },
  { id: 'D.1', label: 'Kualitas Pembelajaran', score: 0, category: 'Kurang' },
  { id: 'D.4', label: 'Iklim Keamanan Sekolah', score: 0, category: 'Kurang' },
  { id: 'D.8', label: 'Iklim Kebinekaan', score: 0, category: 'Kurang' },
];

const RaporPendidikan: React.FC<RaporPendidikanProps> = ({ onAddBudget, budgetData, profile }) => {
  const [indicators, setIndicators] = useState<RaporIndicator[]>(DEFAULT_INDICATORS);
  const [recommendations, setRecommendations] = useState<PBDRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<'input' | 'analysis' | 'report'>('input');
  const [inputMethod, setInputMethod] = useState<'upload' | 'manual'>('upload');
  const [targetYear, setTargetYear] = useState('2027');
  
  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal State for Budget Breakdown
  const [selectedRec, setSelectedRec] = useState<PBDRecommendation | null>(null);
  const [isAddingToBudget, setIsAddingToBudget] = useState(false);
  
  const strengths = indicators.filter(ind => (ind.score || 0) >= 70);
  const weaknesses = indicators.filter(ind => (ind.score || 0) < 70);
  
  // Load saved data on mount or year change
  useEffect(() => {
    loadSavedRapor();
  }, [targetYear]);

  const loadSavedRapor = async () => {
    const dataYear = (parseInt(targetYear) - 1).toString();
    const savedData = await getRaporData(dataYear);
    if (savedData) {
        const merged = DEFAULT_INDICATORS.map(def => {
            const found = savedData.find(s => s.id === def.id);
            return found ? found : def;
        });
        setIndicators(merged);
    } else {
        setIndicators(DEFAULT_INDICATORS);
    }
  };

  const handleSaveRapor = async () => {
      setIsSaving(true);
      const dataYear = (parseInt(targetYear) - 1).toString();
      await saveRaporData(indicators, dataYear);
      setIsSaving(false);
  };

  const getCategory = (score: number) => {
    if (score >= 70) return 'Baik';
    if (score >= 50) return 'Sedang';
    return 'Kurang';
  };

  const handleScoreChange = (id: string, val: string) => {
    const num = Math.min(100, Math.max(0, Number(val)));
    setIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, score: num, category: getCategory(num) } : ind
    ));
  };

  const handleAnalyze = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isAiConfigured()) {
        alert("API Key AI belum dikonfigurasi. Silakan cek Pengaturan.");
        return;
    }
    await handleSaveRapor();
    setLoading(true);
    const results = await analyzeRaporQuality(indicators, targetYear);
    if (results === null) {
        alert("Gagal menganalisis rapor. Mohon periksa koneksi internet Anda atau coba lagi beberapa saat lagi.");
        setLoading(false);
        return;
    }
    setRecommendations(results);
    setActiveView('analysis');
    setLoading(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = `Analisis PBD & Rapor Pendidikan ${targetYear}`;
    const startY = generatePDFHeader(doc, profile, title);
    autoTable(doc, {
      ...defaultTableStyles,
      startY,
      head: [['Indikator', 'Skor', 'Kategori']],
      body: indicators.map(ind => [ind.label, ind.score, ind.category]),
    });
    if (recommendations.length > 0) {
      autoTable(doc, {
        ...defaultTableStyles,
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Rekomendasi Kegiatan', 'Penjelasan / Justifikasi']],
        body: recommendations.map(rec => [rec.title || rec.activityName, rec.description]),
      });
    }
    generateSignatures(doc, profile, (doc as any).lastAutoTable.finalY + 20);
    doc.save(`Rapor_PBD_${targetYear}.pdf`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

      if (!isPDF && !isExcel) {
          alert("Mohon upload file PDF atau Excel.");
          return;
      }
      setSelectedFile(file);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const triggerFileSelect = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedFile(null);
  };

  const handleProcessFile = async (e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (!selectedFile) return;
      
      const isExcel = selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls');
      if (isExcel) {
          handleProcessExcel();
      } else {
          handleProcessPdf();
      }
  };

  const handleProcessExcel = async () => {
      if (!selectedFile) return;
      setIsUploading(true);

      try {
          const grid = await extractDataFromExcel(selectedFile);
          console.log("Excel Data Extracted:", grid);
          
          const extractedResults = parseRaporData(grid, DEFAULT_INDICATORS);

          if (extractedResults.length > 0) {
              const updatedIndicators = indicators.map(p => {
                  const found = extractedResults.find(r => r.id === p.id);
                  return found ? { ...p, score: found.score || 0, category: getCategory(found.score || 0) as any } : p;
              });
              setIndicators(updatedIndicators);
              
              setLoading(true);
              const results = await analyzeRaporQuality(updatedIndicators, targetYear);
              if (results) {
                  setRecommendations(results);
                  setActiveView('report');
              }
              setLoading(false);
              
              alert(`Berhasil mengimpor ${extractedResults.length} indikator dari Excel.`);
              setSelectedFile(null);
          } else {
              alert("Tidak menemukan data indikator Rapor Pendidikan yang valid dalam file Excel ini.");
          }
          setIsUploading(false);
      } catch (error) {
          console.error("Excel processing error:", error);
          alert("Gagal memproses file Excel.");
          setIsUploading(false);
      }
  };

  const handleProcessPdf = async () => {
      if (!selectedFile) return;
      if (!isAiConfigured()) {
        alert("Fitur AI belum aktif. Masukkan API Key di pengaturan.");
        return;
      }
      setIsUploading(true);
      try {
          // 1. Optional: Local text extraction (can be used for debugging or as fallback)
          // const localText = await extractTextFromPDF(selectedFile);
          // console.log("Local PDF Text Extracted:", localText);

          const reader = new FileReader();
          reader.onload = async () => {
              const resultStr = reader.result as string;
              if (!resultStr) {
                  alert("Gagal membaca file.");
                  setIsUploading(false);
                  return;
              }
              const base64String = resultStr.split(',')[1];
              const result = await analyzeRaporPDF(base64String, targetYear);
              if (result.success && result.data) {
                  let updatedIndicators = [...indicators];
                  if (result.data.indicators && result.data.indicators.length > 0) {
                      updatedIndicators = indicators.map(p => {
                          const found = result.data!.indicators.find(r => r.id === p.id);
                          return found ? { ...p, score: found.score, category: found.category as any } : p;
                      });
                      setIndicators(updatedIndicators);
                  }
                  if (result.data.recommendations && result.data.recommendations.length > 0) {
                      setRecommendations(result.data.recommendations);
                      setActiveView('report'); // Switch to the new professional report view
                  } else {
                      alert("AI berhasil membaca nilai, namun tidak menemukan rekomendasi kegiatan spesifik.");
                  }
                  setSelectedFile(null);
              } else {
                  alert(`Gagal: ${result.error}`);
              }
              setIsUploading(false);
          };
          reader.readAsDataURL(selectedFile);
      } catch (error) {
          console.error("Upload handler error:", error);
          setIsUploading(false);
          alert("Terjadi kesalahan sistem saat upload: " + (error as Error).message);
      }
  };

  const handleConfirmAddToBudget = async () => {
    if (!selectedRec) return;
    setIsAddingToBudget(true);
    try {
        for (const item of selectedRec.items) {
            await onAddBudget({
                type: TransactionType.EXPENSE,
                description: `[PBD ${targetYear}] ${item.name} (${selectedRec.activityName})`,
                amount: item.quantity * item.price,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.price,
                bosp_component: selectedRec.bospComponent,
                category: selectedRec.snpStandard,
                account_code: item.accountCode,
                status: 'draft',
                date: new Date().toISOString(), 
                realization_months: [new Date().getMonth() + 2],
                notes: `PBD Indikator ${selectedRec.indicatorId}`
            });
        }
        alert(`${selectedRec.items.length} item rincian berhasil ditambahkan ke Draft RKAS.`);
        setSelectedRec(null);
    } catch (error) {
        console.error("Failed to add PBD items", error);
        alert("Gagal menambahkan item. Silakan coba lagi.");
    } finally {
        setIsAddingToBudget(false);
    }
  };

  const handleBatchAddToBudget = async () => {
      const unbudgetedRecs = recommendations.filter(rec => !isActivityInBudget(rec));
      if (unbudgetedRecs.length === 0) {
          alert("Semua rekomendasi sudah ada dalam RKAS.");
          return;
      }

      if (!confirm(`Tambahkan ${unbudgetedRecs.length} paket kegiatan rekomendasi ke Draft RKAS?`)) return;

      setIsAddingToBudget(true);
      let totalAdded = 0;

      try {
          for (const rec of unbudgetedRecs) {
              for (const item of rec.items) {
                  await onAddBudget({
                      type: TransactionType.EXPENSE,
                      description: `[PBD ${targetYear}] ${item.name} (${rec.activityName})`,
                      amount: item.quantity * item.price,
                      quantity: item.quantity,
                      unit: item.unit,
                      unit_price: item.price,
                      bosp_component: rec.bospComponent,
                      category: rec.snpStandard,
                      account_code: item.accountCode,
                      status: 'draft',
                      date: new Date().toISOString(),
                      realization_months: [new Date().getMonth() + 2],
                      notes: `PBD Indikator ${rec.indicatorId}`
                  });
              }
              totalAdded++;
          }
          alert(`Berhasil menambahkan ${totalAdded} paket kegiatan ke Draft RKAS.`);
      } catch (error) {
          console.error("Batch error:", error);
          alert("Terjadi kesalahan saat menambahkan beberapa item.");
      } finally {
          setIsAddingToBudget(false);
      }
  };

  const getColor = (category: string) => {
      switch(category) {
          case 'Baik': return '#22c55e';
          case 'Sedang': return '#eab308';
          case 'Kurang': return '#ef4444';
          default: return '#9ca3af';
      }
  };

  const isActivityInBudget = (rec: PBDRecommendation) => {
      if (!budgetData) return false;
      return budgetData.some(b => 
          b.notes?.includes(rec.indicatorId) || 
          b.description.toLowerCase().includes(rec.activityName.toLowerCase())
      );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <TrendingUp className="text-blue-600" /> Rapor Pendidikan & PBD
           </h2>
           <p className="text-sm text-gray-500">Analisis capaian sekolah untuk Perencanaan Berbasis Data.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm flex items-center">
                <div className="bg-blue-50 px-3 py-2 rounded-l-md border-r border-gray-100 text-blue-700 font-bold text-xs flex items-center gap-2">
                    <CalendarRange size={16} />
                    Target RKAS
                </div>
                <select 
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none bg-transparent"
                >
                    <option value="2027">Tahun 2027 (Rapor 2026)</option>
                    <option value="2026">Tahun 2026 (Rapor 2025)</option>
                </select>
            </div>
        </div>
      </div>

      {activeView === 'input' && (
          <div className="space-y-6">
             <div className="flex justify-center">
                 <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
                     <button
                        onClick={() => setInputMethod('upload')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            inputMethod === 'upload' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                     >
                        <BrainCircuit size={18} />
                        Otomatis (PDF/Excel)
                     </button>
                     <button
                        onClick={() => setInputMethod('manual')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                            inputMethod === 'manual' 
                            ? 'bg-white text-blue-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                     >
                        <SlidersHorizontal size={18} />
                        Input Manual
                     </button>
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    {inputMethod === 'upload' && (
                        <div className="flex flex-col h-full justify-center">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Analisis Otomatis (AI & Excel)</h3>
                                <p className="text-sm text-gray-500">Upload file PDF Rapor Pendidikan atau Excel, data akan diproses secara otomatis.</p>
                            </div>
                            <input 
                                type="file" 
                                accept="application/pdf, .xlsx, .xls"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div 
                                onClick={triggerFileSelect}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group block w-full relative ${
                                    selectedFile ? 'border-blue-300 bg-blue-50/50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                                }`}
                            >
                                {!selectedFile ? (
                                    <div className="flex flex-col items-center gap-3 py-6 pointer-events-none">
                                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <Upload size={32} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-700">Klik untuk upload PDF / Excel</p>
                                            <p className="text-xs text-gray-400 mt-1">Maksimal 10MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 py-4">
                                        {selectedFile.type === 'application/pdf' ? (
                                            <FileText size={48} className="text-red-500" />
                                        ) : (
                                            <TrendingUp size={48} className="text-green-600" />
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="text-red-500 hover:text-red-700 text-sm underline z-10 cursor-pointer bg-transparent border-none p-0"
                                        >
                                            Ganti File
                                        </button>
                                    </div>
                                )}
                            </div>
                            {selectedFile && (
                                <button 
                                    type="button"
                                    onClick={handleProcessFile}
                                    disabled={isUploading}
                                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                                >
                                    {isUploading ? <Loader2 size={24} className="animate-spin" /> : (selectedFile.type === 'application/pdf' ? <BrainCircuit size={24} /> : <TrendingUp size={24} />)}
                                    {isUploading ? 'Sedang Memproses...' : (selectedFile.type === 'application/pdf' ? 'Mulai Analisis AI' : 'Impor Data Excel')}
                                </button>
                            )}
                            {!isAiConfigured() && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex gap-2">
                                    <AlertTriangle size={16} />
                                    <span>API Key belum diatur. Masuk ke menu Pengaturan untuk mengaktifkan AI.</span>
                                </div>
                            )}
                        </div>
                    )}
                    {inputMethod === 'manual' && (
                        <div className="space-y-5 animate-fade-in">
                            <div className="flex items-center justify-between border-b pb-3 mb-4">
                                <h3 className="font-bold text-gray-800">Input Nilai Rapor</h3>
                                <button onClick={handleSaveRapor} disabled={isSaving} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                                    <Save size={14} /> Simpan Draft
                                </button>
                            </div>
                            {indicators.map((ind) => (
                                <div key={ind.id} className="flex items-center gap-4">
                                    <div className="w-10 text-xs font-bold text-gray-500">{ind.id}</div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{ind.label}</label>
                                        <input type="range" min="0" max="100" value={ind.score} onChange={(e) => handleScoreChange(ind.id, e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    </div>
                                    <div className="w-12 text-right font-bold text-blue-600">{ind.score}</div>
                                    <div className={`text-xs px-2 py-1 rounded font-bold w-16 text-center ${ind.category === 'Baik' ? 'bg-green-100 text-green-700' : ind.category === 'Sedang' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                        {ind.category}
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAnalyze} disabled={loading} className="w-full mt-4 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                                {loading ? <Loader2 className="animate-spin" /> : <MousePointerClick size={20} />}
                                {loading ? 'Menganalisis...' : 'Analisis Data Manual'}
                            </button>
                        </div>
                    )}
                 </div>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                     <h3 className="font-bold text-gray-700 mb-6">Visualisasi Mutu Sekolah</h3>
                     <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={indicators}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="id" tick={{fontSize: 12}} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} cursor={{fill: '#f3f4f6'}} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                    {indicators.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getColor(entry.category)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="flex gap-4 mt-4 text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Kurang (&lt;50)</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full"></span> Sedang (50-70)</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Baik (&gt;70)</div>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {activeView === 'report' && (
          <div className="space-y-8 animate-fade-in pb-20">
              {/* Header Summary */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="max-w-xl">
                          <h3 className="text-2xl font-bold mb-2">Laporan Hasil Analisis Rapor Pendidikan {targetYear}</h3>
                          <p className="text-blue-100 mb-6">Berikut adalah ringkasan performa sekolah Anda berdasarkan data indikator yang telah diunggah. Kami telah memetakan kekuatan dan area yang perlu ditingkatkan.</p>
                          <div className="flex flex-wrap gap-4">
                              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                  <div className="text-xs text-blue-100">Rataan Skor</div>
                                  <div className="text-2xl font-bold">{(indicators.reduce((acc, curr) => acc + (curr.score || 0), 0) / indicators.length).toFixed(1)}</div>
                              </div>
                              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                  <div className="text-xs text-blue-100">Indikator Prioritas</div>
                                  <div className="text-2xl font-bold">{weaknesses.length}</div>
                              </div>
                              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                                  <div className="text-xs text-blue-100">Total Rekomendasi</div>
                                  <div className="text-2xl font-bold">{recommendations.length}</div>
                              </div>
                          </div>
                      </div>
                      <div className="flex flex-col gap-3 min-w-[200px]">
                          <button onClick={handleBatchAddToBudget} disabled={isAddingToBudget} className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition transform hover:scale-105 active:scale-95">
                              {isAddingToBudget ? <Loader2 size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                              Buat RKAS Otomatis
                          </button>
                          <button onClick={() => setActiveView('analysis')} className="bg-blue-500/30 hover:bg-blue-500/40 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 backdrop-blur-sm border border-white/20 transition">
                              <SlidersHorizontal size={20} />
                              Lihat Detail Analisis
                          </button>
                      </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/10 rounded-full -ml-8 -mb-8 blur-2xl"></div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Kelebihan */}
                  <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden flex flex-col">
                      <div className="bg-green-50 px-6 py-4 flex items-center gap-2 border-b border-green-100">
                          <CheckCircle className="text-green-600" size={24} />
                          <h4 className="font-bold text-green-800">Analisis Kelebihan (Strengths)</h4>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                          <p className="text-sm text-gray-500">Pencapaian luar biasa di area berikut. Pertahankan dan bagikan praktik baik ini ke rekan guru lainnya.</p>
                          <div className="grid grid-cols-1 gap-3">
                              {strengths.length > 0 ? strengths.map(ind => (
                                  <div key={ind.id} className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-green-100 shadow-sm">{ind.id}</div>
                                          <span className="font-medium text-gray-700">{ind.label}</span>
                                      </div>
                                      <div className="text-green-700 font-bold">{ind.score}</div>
                                  </div>
                              )) : (
                                  <div className="text-center py-6 text-gray-400 italic text-sm">Belum ada indikator yang masuk kategori 'Baik'.</div>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Kekurangan */}
                  <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden flex flex-col">
                      <div className="bg-red-50 px-6 py-4 flex items-center gap-2 border-b border-red-100">
                          <AlertTriangle className="text-red-600" size={24} />
                          <h4 className="font-bold text-red-800">Analisis Kekurangan (Weaknesses)</h4>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                          <p className="text-sm text-gray-500">Area berikut membutuhkan perhatian segera. Gunakan rekomendasi PBD untuk merancang intervensi yang tepat.</p>
                          <div className="grid grid-cols-1 gap-3">
                              {weaknesses.length > 0 ? weaknesses.map(ind => (
                                  <div key={ind.id} className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-red-100 shadow-sm">{ind.id}</div>
                                          <span className="font-medium text-gray-700">{ind.label}</span>
                                      </div>
                                      <div className={`font-bold ${ind.score < 50 ? 'text-red-700' : 'text-orange-600'}`}>{ind.score}</div>
                                  </div>
                              )) : (
                                  <div className="text-center py-6 text-gray-400 italic text-sm">Semua area sudah menunjukkan performa yang baik.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Recommendations Summary Toggle/Preview */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h3 className="text-xl font-bold text-gray-800">Paket Anggaran Rekomendasi</h3>
                          <p className="text-sm text-gray-500">Solusi kegiatan yang dirancang khusus untuk memperbaiki area kelemahan di atas.</p>
                      </div>
                      <button onClick={handleBatchAddToBudget} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-2">
                          <Plus size={16} /> Terapkan Semua
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {recommendations.map((rec, idx) => {
                          const isBudgeted = isActivityInBudget(rec);
                          return (
                              <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col">
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold text-gray-400 border border-gray-100 uppercase tracking-wider">{rec.indicatorId}</span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rec.priority === 'Tinggi' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                          {rec.priority}
                                      </span>
                                  </div>
                                  <h5 className="font-bold text-gray-800 mb-2 line-clamp-2">{rec.activityName}</h5>
                                  <div className="text-sm font-bold text-blue-600 mb-4">
                                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rec.estimatedCost)}
                                  </div>
                                  <button onClick={() => setSelectedRec(rec)} disabled={isBudgeted} className={`mt-auto w-full py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${isBudgeted ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                                      {isBudgeted ? <Check size={14} /> : <Plus size={14} />}
                                      {isBudgeted ? 'Sudah Ada' : 'Lihat Rincian'}
                                  </button>
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="flex justify-center">
                  <button onClick={() => setActiveView('input')} className="text-gray-400 hover:text-gray-600 flex items-center gap-2 text-sm font-medium transition">
                      <X size={16} /> Batalkan dan Upload Ulang
                  </button>
              </div>
          </div>
      )}

      {activeView === 'analysis' && (
          <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                     <BrainCircuit className="text-indigo-600" /> Hasil Rekomendasi PBD
                  </h3>
                  <div className="flex gap-2">
                      <button onClick={handleExportPDF} className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-white font-bold flex items-center gap-2 transition shadow-md shadow-indigo-200">
                        <Printer size={14} /> Cetak Rekomendasi
                      </button>
                      <button onClick={() => setActiveView('input')} className="text-sm bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-gray-600 font-medium transition">
                        &larr; Upload Ulang / Edit
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                  {recommendations.length === 0 ? (
                      <div className="p-8 bg-white rounded-xl text-center text-gray-500 border border-gray-200">
                          <CheckCircle className="mx-auto text-green-500 mb-2" size={32} />
                          <p>Tidak ada rekomendasi. Semua indikator sudah BAIK!</p>
                      </div>
                  ) : (
                      recommendations.map((rec, idx) => {
                          const isBudgeted = isActivityInBudget(rec);
                          return (
                            <div key={idx} className={`bg-white rounded-xl shadow-sm border p-6 transition hover:shadow-md ${isBudgeted ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
                                                Indikator {rec.indicatorId}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${rec.priority === 'Tinggi' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                Prioritas {rec.priority}
                                            </span>
                                            {isBudgeted && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-200 flex items-center gap-1">
                                                    <Check size={10} /> Sudah Dianggarkan
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-800 mb-1">{rec.activityName}</h4>
                                        <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                            <span className="bg-gray-100 px-2 py-1 rounded">SNP: {rec.snpStandard}</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded">Komponen: {rec.bospComponent}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-lg font-bold text-gray-800">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rec.estimatedCost)}
                                        </div>
                                        <button onClick={() => setSelectedRec(rec)} disabled={isBudgeted} className={`mt-3 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition ${isBudgeted ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'}`}>
                                            {isBudgeted ? <Check size={16} /> : <Plus size={16} />}
                                            {isBudgeted ? 'Tersimpan' : 'Masukkan ke RKAS'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                          )
                      })
                  )}
              </div>
          </div>
      )}

      {selectedRec && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">Rincian Anggaran Kegiatan</h3>
                      <button onClick={() => setSelectedRec(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                      </button>
                  </div>
                  <div className="p-6">
                      <div className="mb-4">
                          <h4 className="font-bold text-gray-800">{selectedRec.activityName}</h4>
                          <p className="text-sm text-gray-500">Item berikut akan ditambahkan ke Draft Anggaran:</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-6">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200">
                                  <tr>
                                      <th className="px-3 py-2">Uraian / Barang</th>
                                      <th className="px-3 py-2 text-right">Vol</th>
                                      <th className="px-3 py-2 text-right">Harga</th>
                                      <th className="px-3 py-2 text-right">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                  {selectedRec.items.map((item, i) => (
                                      <tr key={i}>
                                          <td className="px-3 py-2">
                                              <div className="font-medium text-gray-800">{item.name}</div>
                                              <div className="text-[10px] text-gray-400 font-mono">{item.accountCode}</div>
                                          </td>
                                          <td className="px-3 py-2 text-right text-xs">{item.quantity} {item.unit}</td>
                                          <td className="px-3 py-2 text-right text-xs">{new Intl.NumberFormat('id-ID').format(item.price)}</td>
                                          <td className="px-3 py-2 text-right font-bold text-xs">{new Intl.NumberFormat('id-ID').format(item.quantity * item.price)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setSelectedRec(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50">Batal</button>
                          <button onClick={handleConfirmAddToBudget} disabled={isAddingToBudget} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2">
                             {isAddingToBudget ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                             Konfirmasi Simpan
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default RaporPendidikan;
