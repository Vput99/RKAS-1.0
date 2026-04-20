import React from 'react';
import { BrainCircuit, SlidersHorizontal, Upload, FileText, Loader2, MousePointerClick, AlertTriangle, Save } from 'lucide-react';
import { RaporIndicator } from '../../types';

interface RaporInputViewProps {
  inputMethod: 'upload' | 'manual';
  setInputMethod: (method: 'upload' | 'manual') => void;
  isAiConfigured: () => boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileSelect: () => void;
  handleRemoveFile: (e: React.MouseEvent) => void;
  handleProcessFile: (e?: React.MouseEvent) => Promise<void>;
  isUploading: boolean;
  indicators: RaporIndicator[];
  handleSaveRapor: () => Promise<void>;
  isSaving: boolean;
  handleScoreChange: (id: string, val: string) => void;
  handleAnalyze: (e?: React.MouseEvent) => Promise<void>;
  loading: boolean;
  children?: React.ReactNode; // For the visualization chart
}

const RaporInputView: React.FC<RaporInputViewProps> = ({
  inputMethod,
  setInputMethod,
  isAiConfigured,
  fileInputRef,
  selectedFile,
  handleFileSelect,
  triggerFileSelect,
  handleRemoveFile,
  handleProcessFile,
  isUploading,
  indicators,
  handleSaveRapor,
  isSaving,
  handleScoreChange,
  handleAnalyze,
  loading,
  children
}) => {
  return (
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
           {children}
       </div>
    </div>
  );
};

// Helper for icon in Upload
const TrendingUp = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default RaporInputView;
