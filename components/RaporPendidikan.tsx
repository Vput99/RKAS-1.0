import React, { useState } from 'react';
import { RaporIndicator, PBDRecommendation, TransactionType } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, BrainCircuit, CheckCircle, Plus, Search, TrendingUp, AlertTriangle, CalendarRange } from 'lucide-react';
import { analyzeRaporQuality, isAiConfigured } from '../lib/gemini';

interface RaporPendidikanProps {
  onAddBudget: (item: any) => void;
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
  const [activeView, setActiveView] = useState<'input' | 'analysis'>('input');
  const [targetYear, setTargetYear] = useState('2027');

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
    setLoading(true);
    const results = await analyzeRaporQuality(indicators, targetYear);
    setRecommendations(results);
    setActiveView('analysis');
    setLoading(false);
  };

  const handleAddToBudget = (rec: PBDRecommendation) => {
    onAddBudget({
        type: TransactionType.EXPENSE,
        description: `[PBD ${targetYear}] ${rec.activityName} - ${rec.description}`,
        amount: rec.estimatedCost,
        quantity: 1,
        unit: 'Kegiatan',
        unit_price: rec.estimatedCost,
        bosp_component: rec.bospComponent,
        category: rec.snpStandard,
        account_code: rec.accountCode,
        status: 'draft',
        // Set date to Jan 1st of the target year
        date: `${targetYear}-01-01T00:00:00.000Z`, 
        realization_months: [new Date().getMonth() + 2], // Default to next 2 months relative to planning
        notes: `Sumber: Analisis Rapor Pendidikan Indikator ${rec.indicatorId} untuk TA ${targetYear}`
    });
    alert(`Kegiatan "${rec.activityName}" berhasil ditambahkan ke Draft RKAS Tahun ${targetYear}.`);
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
                <option value="2027">Tahun 2027 (Murni)</option>
                <option value="2026">Tahun 2026 (Perubahan)</option>
            </select>
        </div>
      </div>

      {activeView === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">Input Nilai Rapor Pendidikan</h3>
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
                        {loading ? 'Menganalisis...' : `Buat Rekomendasi RKAS ${targetYear}`}
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
                    <p className="text-sm text-blue-700">AI telah menyusun rekomendasi kegiatan (Benahi) untuk dimasukkan ke draft anggaran tahun depan.</p>
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
                                      <span className="text-gray-400">Kode Rekening</span>
                                      <span className="font-mono text-gray-700">{rec.accountCode}</span>
                                  </div>
                                  <div className="flex justify-between text-xs border-b border-gray-50 pb-1">
                                      <span className="text-gray-400">SNP</span>
                                      <span className="text-gray-700 text-right truncate w-40">{rec.snpStandard}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                      <span className="text-gray-400">Est. Biaya ({targetYear})</span>
                                      <span className="font-bold text-green-600">
                                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(rec.estimatedCost)}
                                      </span>
                                  </div>
                              </div>

                              <button 
                                 onClick={() => handleAddToBudget(rec)}
                                 className="w-full py-2 bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700 font-bold text-sm rounded-lg border border-gray-200 hover:border-green-200 flex items-center justify-center gap-2 transition"
                              >
                                 <Plus size={16} /> Draft RKAS {targetYear}
                              </button>
                          </div>
                      ))
                  )}
              </div>
          </div>
      )}

    </div>
  );
};

export default RaporPendidikan;