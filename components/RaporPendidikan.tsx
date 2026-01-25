
import React, { useState, useEffect, useRef } from 'react';
import { RaporIndicator, PBDRecommendation, TransactionType, Budget } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, BrainCircuit, CheckCircle, Plus, TrendingUp, AlertTriangle, CalendarRange, Save, Loader2, List, X, Check, Upload, FileText } from 'lucide-react';
import { analyzeRaporQuality, analyzeRaporPDF, isAiConfigured } from '../lib/gemini';
import { getRaporData, saveRaporData } from '../lib/db';

interface RaporPendidikanProps {
  onAddBudget: (item: any) => Promise<void>;
  budgetData: Budget[]; // Receive current budget data to check for duplicates
}

const DEFAULT_INDICATORS: RaporIndicator[] = [
  { id: 'A.1', label: 'Kemampuan Literasi', score: 0, category: 'Kurang' },
  { id: 'A.2', label: 'Kemampuan Numerasi', score: 0, category: 'Kurang' },
  { id: 'A.3', label: 'Karakter', score: 0, category: 'Kurang' },
  { id: 'D.1', label: 'Kualitas Pembelajaran', score: 0, category: 'Kurang' },
  { id: 'D.4', label: 'Iklim Keamanan Sekolah', score: 0, category: 'Kurang' },
  { id: 'D.8', label: 'Iklim Kebinekaan', score: 0, category: 'Kurang' },
];

const RaporPendidikan: React.FC<RaporPendidikanProps> = ({ onAddBudget, budgetData }) => {
  const [indicators, setIndicators] = useState<RaporIndicator[]>(DEFAULT_INDICATORS);
  const [recommendations, setRecommendations] = useState<PBDRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<'input' | 'analysis'>('input');
  const [targetYear, setTargetYear] = useState('2027');
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Modal State for Budget Breakdown
  const [selectedRec, setSelectedRec] = useState<PBDRecommendation | null>(null);
  const [isAddingToBudget, setIsAddingToBudget] = useState(false);
  
  // Load saved data on mount or year change
  useEffect(() => {
    loadSavedRapor();
  }, [targetYear]);

  const loadSavedRapor = async () => {
    // Determine the "Data Year". If planning for 2027, usually we use Rapor 2026 data.
    const dataYear = (parseInt(targetYear) - 1).toString();
    
    const savedData = await getRaporData(dataYear);
    if (savedData) {
        // Merge with defaults to ensure all IDs exist
        const merged = DEFAULT_INDICATORS.map(def => {
            const found = savedData.find(s => s.id === def.id);
            return found ? found : def;
        });
        setIndicators(merged);
    } else {
        // Reset to 0 if no data found for that year
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

  const handleAnalyze = async () => {
    if (!isAiConfigured()) {
        alert("API Key AI belum dikonfigurasi. Silakan cek Pengaturan.");
        return;
    }
    
    // Auto save before analyzing
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.type !== 'application/pdf') {
          alert("Mohon upload file PDF.");
          return;
      }

      if (!isAiConfigured()) {
        alert("Fitur AI belum aktif. Masukkan API Key di pengaturan.");
        return;
      }

      setIsUploading(true);
      
      try {
          const reader = new FileReader();
          reader.onload = async () => {
              const base64String = (reader.result as string).split(',')[1];
              console.log("Mengirim PDF ke AI untuk analisis...");
              
              const result = await analyzeRaporPDF(base64String, targetYear);

              if (result) {
                  console.log("Hasil Analisis AI:", result);
                  
                  // 1. Update Indicators Logic
                  let updatedIndicators = [...indicators];
                  if (result.indicators && result.indicators.length > 0) {
                      updatedIndicators = indicators.map(p => {
                          const found = result.indicators.find(r => r.id === p.id);
                          return found ? { ...p, score: found.score, category: found.category as any } : p;
                      });
                      setIndicators(updatedIndicators);
                  }

                  // 2. Update Recommendations Logic
                  if (result.recommendations && result.recommendations.length > 0) {
                      setRecommendations(result.recommendations);
                      setActiveView('analysis');
                  } else {
                      alert("AI berhasil membaca nilai, namun tidak menemukan rekomendasi kegiatan spesifik.");
                  }
                  
                  // 3. Try Auto Save (Background) - Even if this fails, UI stays updated
                  try {
                      const dataYear = (parseInt(targetYear) - 1).toString();
                      saveRaporData(updatedIndicators, dataYear).then(success => {
                          if(!success) console.warn("Background save failed, but UI updated.");
                      });
                  } catch(e) {
                      console.warn("DB save error ignored:", e);
                  }

              } else {
                  alert("AI gagal membaca PDF. Kemungkinan file terlalu besar atau format tidak terbaca. Coba gunakan manual input.");
              }
              setIsUploading(false);
          };
          reader.readAsDataURL(file);
      } catch (error) {
          console.error("Upload handler error:", error);
          setIsUploading(false);
          alert("Terjadi kesalahan sistem saat upload.");
      }
  };

  const handleConfirmAddToBudget = async () => {
    if (!selectedRec) return;
    setIsAddingToBudget(true);

    try {
        // Add items sequentially
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
                account_code: item.accountCode, // Use specific item account code
                status: 'draft',
                date: new Date().toISOString(), 
                realization_months: [new Date().getMonth() + 2],
                notes: `PBD Indikator ${selectedRec.indicatorId}`
            });
        }
        alert(`${selectedRec.items.length} item rincian berhasil ditambahkan ke Draft RKAS.`);
        setSelectedRec(null); // Close modal
    } catch (error) {
        console.error("Failed to add PBD items", error);
        alert("Gagal menambahkan item. Silakan coba lagi.");
    } finally {
        setIsAddingToBudget(false);
    }
  };

  const getColor = (category: string) => {
      switch(category) {
          case 'Baik': return '#22c55e'; // Green
          case 'Sedang': return '#eab308'; // Yellow
          case 'Kurang': return '#ef4444'; // Red
          default: return '#9ca3af';
      }
  };

  // Helper to check if an activity is already in budget
  const isActivityInBudget = (rec: PBDRecommendation) => {
      if (!budgetData) return false;
      // Loose check: look for indicator ID or activity name in existing budget descriptions
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
        
        {/* Year Selector */}
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
            
            {activeView === 'input' && (
                <button
                    onClick={handleSaveRapor}
                    disabled={isSaving}
                    className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
                    title="Simpan Nilai Manual"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span className="hidden sm:inline text-sm font-bold">Simpan</span>
                </button>
            )}
        </div>
      </div>

      {activeView === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                
                {/* PDF Upload Section */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-6 rounded-xl shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-3 rounded-xl shadow-sm text-blue-600 border border-blue-100">
                           <FileText size={28} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-blue-900 text-base mb-1">Upload Rapor Pendidikan (PDF)</h4>
                            <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                                AI akan membaca nilai dan otomatis membuat rekomendasi kegiatan anggaran (PBD).
                            </p>
                            <input 
                                type="file" 
                                accept="application/pdf"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition disabled:opacity-50 shadow-lg shadow-blue-200"
                            >
                                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                {isUploading ? 'Sedang Menganalisis...' : 'Pilih File PDF Rapor'}
                            </button>
                        </div>
                    </div>
                </div>

                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2 flex justify-between items-end">
                    <span>Input Nilai Manual</span>
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">Data Tahun {parseInt(targetYear)-1}</span>
                </h3>
                <div className="space-y-4">
                    {indicators.map((ind) => (
                        <div key={ind.id} className="flex items-center gap-4">
                            <div className="w-10 text-xs font-bold text-gray-500">{ind.id}</div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700">{ind.label}</label>
                                <input 
                                   type="range" 
                                   min="0" 
                                   max="100" 
                                   value={ind.score}
                                   onChange={(e) => handleScoreChange(ind.id, e.target.value)}
                                   className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                            <div className="w-12 text-right font-bold text-blue-600">{ind.score}</div>
                            <div className={`text-xs px-2 py-1 rounded font-bold w-16 text-center ${
                                ind.category === 'Baik' ? 'bg-green-100 text-green-700' : 
                                ind.category === 'Sedang' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {ind.category}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading || isUploading}
                        className="w-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
                        {loading ? 'Menganalisis PBD...' : 'Analisis Manual (Tanpa PDF)'}
                    </button>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center text-center">
                 <h3 className="font-bold text-gray-700 mb-6">Visualisasi Mutu Sekolah</h3>
                 <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={indicators}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="id" tick={{fontSize: 12}} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                cursor={{fill: '#f3f4f6'}}
                            />
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
      )}

      {activeView === 'analysis' && (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-lg">Rekomendasi Kegiatan (PBD)</h3>
                  <button 
                    onClick={() => setActiveView('input')}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Kembali ke Input
                  </button>
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
                                        <button 
                                            onClick={() => setSelectedRec(rec)}
                                            disabled={isBudgeted}
                                            className={`mt-3 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                                                isBudgeted 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                                            }`}
                                        >
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

      {/* Confirmation Modal */}
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
                                          <td className="px-3 py-2 text-right text-xs">
                                            {new Intl.NumberFormat('id-ID').format(item.price)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold text-xs">
                                            {new Intl.NumberFormat('id-ID').format(item.quantity * item.price)}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      <div className="flex gap-3">
                          <button 
                            onClick={() => setSelectedRec(null)}
                            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50"
                          >
                             Batal
                          </button>
                          <button 
                            onClick={handleConfirmAddToBudget}
                            disabled={isAddingToBudget}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2"
                          >
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
