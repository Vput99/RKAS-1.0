import React from 'react';
import { motion } from 'framer-motion';
import { Users, HardHat, X, Save, Loader2, Printer, Download } from 'lucide-react';
import { LetterAgreement } from '../../types';
import { getTerbilang } from './LetterUtils';

interface LetterFormViewProps {
  type: 'ekstrakurikuler' | 'tukang';
  form: Partial<LetterAgreement>;
  handleChange: (key: keyof LetterAgreement, value: any) => void;
  handleSave: () => Promise<void>;
  handleExportCurrentFormJSON: () => void;
  handlePrint: (letter: LetterAgreement) => void;
  setActiveTab: (tab: any) => void;
  editingId: string | null;
  saving: boolean;
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-slate-300";
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input className={inputCls} {...props} />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={inputCls + ' resize-none'} rows={3} {...props} />;

const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    {children}
  </div>
);

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-5 space-y-4">
    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const LetterFormView: React.FC<LetterFormViewProps> = ({
  type, form, handleChange, handleSave, handleExportCurrentFormJSON,
  handlePrint, setActiveTab, editingId, saving
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header Aksi */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
            {type === 'ekstrakurikuler' ? <Users size={20} /> : <HardHat size={20} />}
          </div>
          <div>
            <h2 className="font-black text-slate-800">
              {editingId ? 'Edit' : 'Buat'} MOU / SPK {type === 'ekstrakurikuler' ? 'Tenaga Ekstrakurikuler' : 'Tukang (Rehab Gedung)'}
            </h2>
            <p className="text-xs text-slate-400">Isi form di bawah, lalu simpan atau langsung cetak PDF.</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Form Sections */}
      <FormSection title="Informasi Surat">
        <Field label="Nomor Surat" required>
          <Input value={form.letter_number || ''} onChange={e => handleChange('letter_number', e.target.value)} placeholder="421.2 / SPK / ... / 2026" />
        </Field>
        <Field label="Tanggal Surat" required>
          <Input type="date" value={form.letter_date || ''} onChange={e => handleChange('letter_date', e.target.value)} />
        </Field>
        <Field label="Tahun Anggaran">
          <Input value={form.fiscal_year || ''} onChange={e => handleChange('fiscal_year', e.target.value)} placeholder="2026" />
        </Field>
        <Field label="Status">
          <select
            className={inputCls}
            value={form.status || 'draft'}
            onChange={e => handleChange('status', e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </Field>
      </FormSection>

      <FormSection title="Data Sekolah (Pihak Pertama)">
        <Field label="Nama Sekolah">
          <Input value={form.school_name || ''} onChange={e => handleChange('school_name', e.target.value)} />
        </Field>
        <Field label="Alamat Sekolah">
          <Input value={form.school_address || ''} onChange={e => handleChange('school_address', e.target.value)} />
        </Field>
        <Field label="Nama Kepala Sekolah">
          <Input value={form.headmaster || ''} onChange={e => handleChange('headmaster', e.target.value)} />
        </Field>
        <Field label="NIP Kepala Sekolah">
          <Input value={form.headmaster_nip || ''} onChange={e => handleChange('headmaster_nip', e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title={`Data ${type === 'ekstrakurikuler' ? 'Tenaga Ekstrakurikuler' : 'Tukang/Pelaksana'} (Pihak Kedua)`}>
        <Field label="Nama Lengkap" required>
          <Input value={form.party_name || ''} onChange={e => handleChange('party_name', e.target.value)} placeholder="Nama lengkap pihak kedua" />
        </Field>
        <Field label="NIK">
          <Input value={form.party_nik || ''} onChange={e => handleChange('party_nik', e.target.value)} placeholder="16 digit NIK" maxLength={16} />
        </Field>
        <Field label="Alamat">
          <Input value={form.party_address || ''} onChange={e => handleChange('party_address', e.target.value)} placeholder="Alamat domisili" />
        </Field>
        <Field label="NPWP (opsional)">
          <Input value={form.party_npwp || ''} onChange={e => handleChange('party_npwp', e.target.value)} placeholder="XX.XXX.XXX.X-XXX.XXX" />
        </Field>
      </FormSection>

      <FormSection title="Detail Pekerjaan / Kegiatan">
        <div className="col-span-2">
          <Field label="Deskripsi Kegiatan / Jenis Pekerjaan" required>
            <Textarea value={form.activity_description || ''} onChange={e => handleChange('activity_description', e.target.value)}
              placeholder={type === 'ekstrakurikuler' ? 'Misal: Pembina Ekstrakurikuler Pramuka' : 'Misal: Pekerjaan pengecatan dinding dan perbaikan atap'} />
          </Field>
        </div>
        <Field label="Lokasi">
          <Input value={form.activity_location || ''} onChange={e => handleChange('activity_location', e.target.value)} />
        </Field>
        <Field label="Tanggal Mulai">
          <Input type="date" value={form.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} />
        </Field>
        <Field label="Tanggal Selesai">
          <Input type="date" value={form.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} />
        </Field>

        {type === 'ekstrakurikuler' && (
          <>
            <Field label="Jadwal Kegiatan">
              <Input value={form.schedule_description || ''} onChange={e => handleChange('schedule_description', e.target.value)} placeholder="Misal: Setiap Sabtu, 08.00-10.00 WIB" />
            </Field>
            <Field label="Jumlah Peserta Didik">
              <Input type="number" value={form.student_count || ''} onChange={e => handleChange('student_count', Number(e.target.value))} placeholder="0" />
            </Field>
          </>
        )}

        {type === 'tukang' && (
          <>
            <Field label="Volume Pekerjaan">
              <Input value={form.work_volume || ''} onChange={e => handleChange('work_volume', e.target.value)} placeholder="Misal: 45 m², 1 unit" />
            </Field>
            <Field label="RAB Material (Rp)">
              <Input type="number" value={form.rab_total || ''} onChange={e => handleChange('rab_total', Number(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Jaminan Pekerjaan">
              <Input value={form.work_guarantee || ''} onChange={e => handleChange('work_guarantee', e.target.value)} placeholder="Misal: 6 bulan sejak selesai" />
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title="Nilai Honorarium / Kontrak">
        <Field label={`Nilai ${type === 'ekstrakurikuler' ? 'Honor per Bulan' : 'Kontrak Upah'} (Rp)`} required>
          <Input type="number" value={form.total_amount || ''} onChange={e => handleChange('total_amount', Number(e.target.value))} placeholder="0" />
        </Field>
        {form.total_amount ? (
          <Field label="Terbilang">
            <div className="px-3 py-2.5 bg-indigo-50 rounded-xl text-indigo-700 text-sm font-medium border border-indigo-100">
              {getTerbilang(form.total_amount as number)} Rupiah
            </div>
          </Field>
        ) : null}
      </FormSection>

      {/* Notes */}
      <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Catatan Tambahan</h3>
        <Textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} placeholder="Catatan atau klausul tambahan..." rows={2} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 flex-wrap">
        <button onClick={() => setActiveTab('list')} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm">
          Batal
        </button>
        <button
          onClick={handleExportCurrentFormJSON}
          title="Export data ke JSON untuk dicetak via Python ReportLab (format lebih profesional)"
          className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-all text-sm flex items-center gap-2"
        >
          <Download size={15} /> Export JSON (Python)
        </button>
        <button
          onClick={async () => {
            await handleSave();
            if (form.party_name) {
              const saved = { ...form, id: editingId || 'preview', type } as LetterAgreement;
              handlePrint(saved);
            }
          }}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Printer size={16} />
          Simpan & Cetak PDF
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {editingId ? 'Update Surat' : 'Simpan Surat'}
        </button>
      </div>
    </motion.div>
  );
};

export default LetterFormView;
