import React from 'react';
import { BrainCircuit, SlidersHorizontal, CheckCircle, AlertTriangle, X, Plus, Check, Loader2 } from 'lucide-react';
import { RaporIndicator, PBDRecommendation } from '../../types';

interface RaporReportViewProps {
  indicators: RaporIndicator[];
  recommendations: PBDRecommendation[];
  targetYear: string;
  weaknesses: RaporIndicator[];
  strengths: RaporIndicator[];
  handleBatchAddToBudget: () => Promise<void>;
  isAddingToBudget: boolean;
  setActiveView: (view: 'input' | 'analysis' | 'report') => void;
  isActivityInBudget: (rec: PBDRecommendation) => boolean;
  setSelectedRec: (rec: PBDRecommendation) => void;
  generalAnalysis?: string;
}

const RaporReportView: React.FC<RaporReportViewProps> = ({
  indicators,
  recommendations,
  targetYear,
  weaknesses,
  strengths,
  handleBatchAddToBudget,
  isAddingToBudget,
  setActiveView,
  isActivityInBudget,
  setSelectedRec,
  generalAnalysis
}) => {
  const avgScore = (indicators.reduce((acc, curr) => acc + (curr.score || 0), 0) / indicators.length).toFixed(1);

  return (
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
                            <div className="text-2xl font-bold">{avgScore}</div>
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

        {/* General AI Analysis */}
        {generalAnalysis && (
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden mb-8">
                <div className="bg-blue-50 px-6 py-4 flex items-center gap-2 border-b border-blue-100">
                    <BrainCircuit className="text-blue-600" size={24} />
                    <h4 className="font-bold text-blue-800">Analisis Umum AI (AI General Review)</h4>
                </div>
                <div className="p-6 text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                    {generalAnalysis}
                </div>
            </div>
        )}

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
                            <div key={ind.id} className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-red-100 shadow-sm">{ind.id}</div>
                                        <span className="font-medium text-gray-700">{ind.label}</span>
                                    </div>
                                    <div className={`font-bold ${ind.score < 50 ? 'text-red-700' : 'text-orange-600'}`}>{ind.score}</div>
                                </div>
                                {recommendations.find(r => r.indicatorId === ind.id)?.componentAnalysis && (
                                    <div className="text-[11px] text-red-600/80 italic line-clamp-2 pl-11 border-l-2 border-red-200 ml-4 py-0.5">
                                        AI Analysis: {recommendations.find(r => r.indicatorId === ind.id)?.componentAnalysis}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="text-center py-6 text-gray-400 italic text-sm">Semua area sudah menunjukkan performa yang baik.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Recommendations Summary */}
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
  );
};

export default RaporReportView;
