
import React, { useState, useEffect, useRef } from 'react';
import { RaporIndicator, PBDRecommendation, TransactionType, Budget, SchoolProfile } from '../types';
import { analyzeRaporQuality, analyzeRaporPDF, isAiConfigured } from '../lib/gemini';
import { getRaporData, saveRaporData } from '../lib/db';
import { generatePDFHeader, generateSignatures, defaultTableStyles } from '../lib/pdfUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { extractDataFromExcel, parseRaporData } from '../lib/fileProcessor';

// Modular Components
import RaporHeader from './rapor/RaporHeader';
import RaporInputView from './rapor/RaporInputView';
import RaporVisualization from './rapor/RaporVisualization';
import RaporReportView from './rapor/RaporReportView';
import RaporAnalysisView from './rapor/RaporAnalysisView';
import BudgetBreakdownModal from './rapor/BudgetBreakdownModal';

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
  const [generalAnalysis, setGeneralAnalysis] = useState<string | undefined>(undefined);
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
    setRecommendations(results.recommendations);
    setGeneralAnalysis(results.generalAnalysis);
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
                  setRecommendations(results.recommendations);
                  setGeneralAnalysis(results.generalAnalysis);
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
                      setGeneralAnalysis(result.data.generalAnalysis);
                      setActiveView('report'); 
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
      <RaporHeader 
        targetYear={targetYear} 
        setTargetYear={setTargetYear} 
      />

      {activeView === 'input' && (
          <RaporInputView
            inputMethod={inputMethod}
            setInputMethod={setInputMethod}
            isAiConfigured={isAiConfigured}
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            handleFileSelect={handleFileSelect}
            triggerFileSelect={triggerFileSelect}
            handleRemoveFile={handleRemoveFile}
            handleProcessFile={handleProcessFile}
            isUploading={isUploading}
            indicators={indicators}
            handleSaveRapor={handleSaveRapor}
            isSaving={isSaving}
            handleScoreChange={handleScoreChange}
            handleAnalyze={handleAnalyze}
            loading={loading}
          >
            <RaporVisualization 
                indicators={indicators} 
                getColor={getColor} 
            />
          </RaporInputView>
      )}

      {activeView === 'report' && (
          <RaporReportView 
            indicators={indicators}
            recommendations={recommendations}
            targetYear={targetYear}
            strengths={strengths}
            weaknesses={weaknesses}
            handleBatchAddToBudget={handleBatchAddToBudget}
            isAddingToBudget={isAddingToBudget}
            setActiveView={setActiveView}
            isActivityInBudget={isActivityInBudget}
            setSelectedRec={setSelectedRec}
            generalAnalysis={generalAnalysis}
          />
      )}

      {activeView === 'analysis' && (
          <RaporAnalysisView 
            recommendations={recommendations}
            handleExportPDF={handleExportPDF}
            setActiveView={setActiveView}
            isActivityInBudget={isActivityInBudget}
            setSelectedRec={setSelectedRec}
            generalAnalysis={generalAnalysis}
          />
      )}

      {selectedRec && (
          <BudgetBreakdownModal 
            selectedRec={selectedRec}
            setSelectedRec={setSelectedRec}
            isAddingToBudget={isAddingToBudget}
            handleConfirmAddToBudget={handleConfirmAddToBudget}
          />
      )}
    </div>
  );
};

export default RaporPendidikan;
