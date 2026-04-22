import React from 'react';
import { BrainCircuit, CheckCircle, Printer, Check, Plus, Sparkles } from 'lucide-react';
import { PBDRecommendation } from '../../types';

interface RaporAnalysisViewProps {
  recommendations: PBDRecommendation[];
  handleExportPDF: () => void;
  setActiveView: (view: 'input' | 'analysis' | 'report') => void;
  isActivityInBudget: (rec: PBDRecommendation) => boolean;
  setSelectedRec: (rec: PBDRecommendation) => void;
  generalAnalysis?: string;
}

const RaporAnalysisView: React.FC<RaporAnalysisViewProps> = ({
  recommendations,
  handleExportPDF,
  setActiveView,
  isActivityInBudget,
  setSelectedRec,
  generalAnalysis
}) => {
  return (
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

        {generalAnalysis && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden mb-6">
                <div className="bg-indigo-50 px-6 py-4 flex items-center gap-2 border-b border-indigo-100">
                    <Sparkles className="text-indigo-600" size={20} />
                    <h4 className="font-bold text-indigo-800">Analisis Umum AI (AI General Review)</h4>
                </div>
                <div className="p-6 text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                    {generalAnalysis}
                </div>
            </div>
        )}
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
                                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                                  
                                  {rec.componentAnalysis && (
                                      <div className="bg-blue-50/50 border-l-4 border-blue-400 p-3 mb-3 rounded-r-lg">
                                          <p className="text-xs font-bold text-blue-700 mb-1 uppercase">Hasil Analisis Indikator:</p>
                                          <p className="text-xs text-blue-800 leading-relaxed italic">"{rec.componentAnalysis}"</p>
                                      </div>
                                  )}

                                  {rec.analysisSteps && rec.analysisSteps.length > 0 && (
                                      <div className="mb-4">
                                          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Langkah Strategis Perbaikan:</p>
                                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                                              {rec.analysisSteps.map((step, i) => (
                                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                                      {step}
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}

                                  <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-tight text-gray-400">
                                      <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">SNP: {rec.snpStandard}</span>
                                      <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100">Komponen: {rec.bospComponent}</span>
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
  );
};

export default RaporAnalysisView;
