import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, HardHat, FileText, Search, FileSignature, 
  Hash, Calendar, DollarSign, FilePen, Printer, 
  Download, Trash2, AlertCircle, Loader2, CheckCircle2 
} from 'lucide-react';
import { LetterAgreement } from '../../types';
import { LetterFilterType, LetterTab } from './LetterTypes';
import { fmt, fmtDate } from './LetterUtils';

interface LetterListViewProps {
  letters: LetterAgreement[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterType: LetterFilterType;
  setFilterType: (v: LetterFilterType) => void;
  initForm: (type: 'ekstrakurikuler' | 'tukang') => void;
  handleEdit: (letter: LetterAgreement) => void;
  handlePrint: (letter: LetterAgreement) => void;
  handleDelete: (id: string) => void;
  handleExportJSON: (letter: LetterAgreement) => void;
  setActiveTab: (tab: LetterTab) => void;
}

const LetterListView: React.FC<LetterListViewProps> = ({
  letters, loading, searchTerm, setSearchTerm, filterType, setFilterType,
  initForm, handleEdit, handlePrint, handleDelete, handleExportJSON, setActiveTab
}) => {
  const filtered = letters.filter(l => {
    const matchSearch = l.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.activity_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || l.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pembuat Surat</h2>
          <p className="text-sm text-slate-500 mt-0.5">MOU / Surat Perjanjian Kerja Tenaga Sekolah</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => initForm('ekstrakurikuler')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Users size={16} /> SPK Ekskul
          </button>
          <button onClick={() => initForm('tukang')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <HardHat size={16} /> SPK Tukang
          </button>
          <button onClick={() => setActiveTab('form-honor')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <FileText size={16} /> Daftar Honor Ekskul
          </button>
          <button onClick={() => setActiveTab('form-upah-tukang')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <HardHat size={16} /> Daftar Upah Tukang
          </button>
          <button onClick={() => setActiveTab('form-roolstaat')} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-sky-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Calendar size={16} /> Roolstaat (Absen)
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau jenis kegiatan..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="flex gap-1.5 bg-white/70 border border-slate-200 rounded-xl p-1">
          {(['all', 'ekstrakurikuler', 'tukang'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'all' ? 'Semua' : t === 'ekstrakurikuler' ? 'Ekskul' : 'Tukang'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Surat', value: letters.length, color: 'indigo', icon: FileText },
          { label: 'SPK Ekskul', value: letters.filter(l => l.type === 'ekstrakurikuler').length, color: 'blue', icon: Users },
          { label: 'SPK Tukang', value: letters.filter(l => l.type === 'tukang').length, color: 'amber', icon: HardHat },
          { label: 'Sudah Final', value: letters.filter(l => l.status === 'final').length, color: 'emerald', icon: CheckCircle2 },
        ].map(stat => (
          <div key={stat.label} className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-indigo-400">
          <Loader2 size={24} className="animate-spin" />
          <span className="font-semibold text-sm">Memuat data...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-4 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
            <FileSignature size={28} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-600">Belum ada surat</p>
            <p className="text-sm mt-1">Buat MOU/SPK baru dengan tombol di atas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => (
            <motion.div
              key={letter.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${letter.type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                  {letter.type === 'ekstrakurikuler' ? <Users size={20} /> : <HardHat size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{letter.party_name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${letter.status === 'final' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {letter.status === 'final' ? 'Final' : 'Draft'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${letter.type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                      {letter.type === 'ekstrakurikuler' ? 'Ekskul' : 'Tukang'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{letter.activity_description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1"><Hash size={10} /> {letter.letter_number}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(letter.letter_date)}</span>
                    <span className="flex items-center gap-1"><DollarSign size={10} /> {fmt(letter.total_amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => handleEdit(letter)} title="Edit" className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                    <FilePen size={15} />
                  </button>
                  <button onClick={() => handlePrint(letter)} title="Cetak PDF (jsPDF)" className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                    <Printer size={15} />
                  </button>
                  <button onClick={() => handleExportJSON(letter)} title="Export JSON untuk Python ReportLab" className="p-2 rounded-xl hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                    <Download size={15} />
                  </button>
                  <button onClick={() => handleDelete(letter.id)} title="Hapus" className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="bg-blue-50/70 border border-blue-200/50 rounded-2xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-bold mb-1">Cara Penggunaan:</p>
          <p>1. Klik <strong>SPK Ekskul</strong> atau <strong>SPK Tukang</strong> untuk membuat surat baru.</p>
          <p>2. Isi data form, lalu <strong>Simpan</strong> ke database atau langsung <strong>Simpan & Cetak PDF</strong>.</p>
          <p>3. Surat yang tersimpan bisa diedit dan dicetak ulang kapan saja.</p>
          <p className="mt-1 text-blue-500">💡 Jalankan <code className="bg-blue-100 px-1 rounded">letter_agreements_migration.sql</code> di Supabase terlebih dahulu agar data tersimpan ke database.</p>
        </div>
      </div>
    </motion.div>
  );
};

export default LetterListView;
