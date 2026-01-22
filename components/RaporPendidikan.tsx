import React, { useState, useEffect } from 'react';
import { RaporIndicator, PBDRecommendation, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, BrainCircuit, CheckCircle, Plus, Search, TrendingUp, AlertTriangle, CalendarRange, Save, Loader2, List, X, ShoppingCart } from 'lucide-react';
import { analyzeRaporQuality, isAiConfigured } from '../lib/gemini';
import { getRaporData, saveRaporData } from '../lib/db';

interface RaporPendidikanProps {
  onAddBudget: (item: any) => Promise<void>;
}

const DEFAULT_INDICATORS: RaporIndicator[] = [
  { id: 'A.1', label: 'Kemampuan Literasi', score: 0, category: 'Kurang' },
  { id: 'A.2', label: 'Kemampuan Numerasi', score: 0, category: 'Kurang' },
  { id: 'A.3', label: 'Karakter', score: 0, category: 'Kurang' },
  { id: 'D.1', label: 'Kualitas Pembelajaran', score: 0, category: 'Kurang' },
  { id: 'D.4', label: 'Iklim Keamanan Sekolah', score: 0, category: 'Kurang' },
  { id: 'D.8', label: 'Iklim Kebinekaan', score: 0, category: 'Kurang' },
];

const RaporPendidikan: React.FC<RaporPendidikanProps> = ({ onAddBudget }) => {
  const [indicators, setIndicators] = useState<RaporIndicator[]>(DEFAULT_INDICATORS);
  const [recommendations, setRecommendations] = useState<PBDRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeView, setActiveView] = useState<'input' | 'analysis'>('input');
  const [targetYear, setTargetYear] = useState('2027');
  
  // Modal State for Budget Breakdown
  const [selectedRec, setSelectedRec] = useState<PBDRecommendation | null>(null);
  const [isAddingToBudget, setIsAddingToBudget] = useState(false);
  
  // Load saved data on mount or year change
  useEffect(() => {
    loadSavedRapor();
  }, [targetYear]);

  const loadSavedRapor = async () => {
    // Determine the "Data Year". If planning for 2027, usually we use Rapor 2026 data.
    // For simplicity, let's map UI Target Year to Data Year.
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
      const success = await saveRaporData(indicators, dataYear);
      if (success) {
          // Optional: Show toast
      }
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
    setRecommendations(results);
    setActiveView('analysis');
    setLoading(false);
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
                date: `${targetYear}-01-01T00:00:00.000Z`, 
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
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2 flex justify-between">
                    <span>Input Nilai Rapor Pendidikan</span>
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
                            <div className="w-16">
                                <input 
                                   type="number" 
                                   className="w-full px-2 py-1 border border-gray-300 rounded text-center font-bold text-sm"
                                   value={ind.score}
                                   onChange={(e) => handleScoreChange(ind.id, e.target.value)}
                                />
                            </div>
                            <div className="w-20 text-center">
                                <span className={`text-xs px-2 py-1 rounded font-bold text-white`} style={{backgroundColor: getColor(ind.category)}}>
                                    {ind.category}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <BrainCircuit size={20} />}
                        {loading ? 'Menganalisis...' : `Simpan & Buat Rekomendasi RKAS ${targetYear}`}
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-2">Powered by Gemini AI</p>
                </div>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
                <h3 className="font-bold text-gray-700 mb-4 w-full">Visualisasi Capaian</h3>
                <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={indicators} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="id" type="category" width={30} />
                            <Tooltip />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                                {indicators.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getColor(entry.category)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-4 text-xs font-medium">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Kurang (&lt;50)</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Sedang (50-70)</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Baik (&gt;70)</div>
                </div>
             </div>
          </div>
      )}

      {activeView === 'analysis' && (
          <div className="space-y-4">
              <button 
                onClick={() => setActiveView('input')} 
                className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
              >
                 &larr; Kembali ke Input Data
              </button>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3">
                 <BrainCircuit className="text-blue-600 flex-shrink-0" size={24} />
                 <div>
                    <h3 className="font-bold text-blue-900">Hasil Analisis PBD (Target RKAS {targetYear})</h3>
                    <p className="text-sm text-blue-700">AI telah menyusun rekomendasi kegiatan (Benahi) beserta <b>rincian anggaran (RAB)</b>.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.length === 0 ? (
                      <div className="col-span-3 text-center py-12 text-gray-400 bg-white rounded-xl">
                          <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
                          <p>Semua indikator bernilai Baik! Pertahankan kualitas sekolah Anda.</p>
                      </div>
                  ) : (
                      recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition relative overflow-hidden group">
                              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold text-white ${rec.priority === 'Tinggi' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                                  Prioritas {rec.priority}
                              </div>
                              
                              <div className="mb-3">
                                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Benahi: Indikator {rec.indicatorId}</div>
                                  <h4 className="font-bold text-gray-800 text-lg leading-tight">{rec.activityName}</h4>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3">{rec.description}</p>
                              
                              <div className="space-y-2 mb-4">
                                  <div className="flex justify-between text-xs border-b border-gray-50 pb-1">
                                      <span className="text-gray-400">SNP</span>
                                      <span className="text-gray-700 text-right truncate w-40">{rec.snpStandard}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">Est. Total Biaya</span>
                                      <span className="font-bold text-green-600">
                                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rec.estimatedCost)}
                                      </span>
                                  </div>
                              </div>

                              <button 
                                 onClick={() => setSelectedRec(rec)}
                                 className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 font-bold text-sm rounded-lg border border-blue-200 flex items-center justify-center gap-2 transition"
                              >
                                 <List size={16} /> Lihat Rincian Anggaran
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

      {/* Detail Breakdown Modal */}
      {selectedRec && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <p className="text-xs font-bold text-gray-500 uppercase">Rincian Kegiatan</p>
                          <h3 className="text-lg font-bold text-gray-800">{selectedRec.activityName}</h3>
                      </div>
                      <button onClick={() => setSelectedRec(null)} className="text-gray-400 hover:text-gray-600">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                          <p className="text-sm text-blue-800">{selectedRec.description}</p>
                      </div>

                      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <ShoppingCart size={18} /> Daftar Item Belanja (RAB)
                      </h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                                  <tr>
                                      <th className="px-4 py-3">Uraian Item</th>
                                      <th className="px-4 py-3 text-center">Volume</th>
                                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                                      <th className="px-4 py-3 text-right">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {selectedRec.items.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                          <td className="px-4 py-2">
                                              <div className="font-medium text-gray-800">{item.name}</div>
                                              <div className="text-[10px] text-gray-400 font-mono">{item.accountCode}</div>
                                          </td>
                                          <td className="px-4 py-2 text-center text-gray-600">
                                              {item.quantity} {item.unit}
                                          </td>
                                          <td className="px-4 py-2 text-right text-gray-600">
                                              {new Intl.NumberFormat('id-ID').format(item.price)}
                                          </td>
                                          <td className="px-4 py-2 text-right font-bold text-gray-800">
                                              {new Intl.NumberFormat('id-ID').format(item.quantity * item.price)}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                              <tfoot className="bg-gray-50 font-bold text-gray-800">
                                  <tr>
                                      <td colSpan={3} className="px-4 py-3 text-right">Total Estimasi:</td>
                                      <td className="px-4 py-3 text-right text-blue-600">
                                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedRec.estimatedCost)}
                                      </td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                      <button 
                          onClick={() => setSelectedRec(null)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
                      >
                          Tutup
                      </button>
                      <button 
                          onClick={handleConfirmAddToBudget}
                          disabled={isAddingToBudget}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm font-bold flex items-center gap-2"
                      >
                          {isAddingToBudget ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                          {isAddingToBudget ? 'Menambahkan...' : 'Simpan Semua ke RKAS'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default RaporPendidikan;