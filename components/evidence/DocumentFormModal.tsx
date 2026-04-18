import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Sparkles, X, Trash2, Plus } from 'lucide-react';
import { FormDataState } from './EvidenceTypes';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplateType: string;
  formData: FormDataState;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleListChange: (index: number, field: string, value: string, listKey: 'workers' | 'skAppointees' | 'officials') => void;
  addListItem: (listKey: 'workers' | 'skAppointees' | 'officials') => void;
  removeListItem: (index: number, listKey: 'workers' | 'skAppointees' | 'officials') => void;
  handlePrint: (e: React.FormEvent) => void;
}

const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen, onClose, currentTemplateType, formData, handleInputChange,
  handleListChange, addListItem, removeListItem, handlePrint
}) => {
  const renderFormFields = () => {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-gray-500">Tanggal Dokumen</label>
                    <input type="text" name="date" value={formData.date} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500">Kota/Tempat</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
            </div>

            {currentTemplateType === 'kuitansi' && (
                <>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Nominal Uang (Rp)</label>
                      <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Terbilang (Otomatis)</label>
                      <textarea name="terbilang" value={formData.terbilang} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm bg-gray-50" rows={2} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Uraian Pembayaran</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Contoh: Belanja ATK kegiatan..." />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Nama Penerima</label>
                      <input type="text" name="receiver" value={formData.receiver} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Nama Toko / Orang" />
                  </div>
                </>
            )}

            {currentTemplateType === 'sk' && (
                <>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Nomor SK</label>
                      <input type="text" name="skNumber" value={formData.skNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Tentang / Judul SK</label>
                      <input type="text" name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="PENETAPAN PANITIA..." />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Menimbang (Konsideran)</label>
                      <textarea 
                          name="skConsiderations" 
                          value={formData.skConsiderations} 
                          onChange={handleInputChange} 
                          className="w-full border rounded px-2 py-1 text-sm h-24" 
                          placeholder="a. Bahwa..." 
                      />
                  </div>
                  <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Nama yang Ditetapkan (Lampiran)</label>
                      {formData.skAppointees && formData.skAppointees.map((person: any, idx: number) => (
                          <div key={idx} className="flex gap-2 mb-2">
                              <input type="text" value={person.name} onChange={(e) => handleListChange(idx, 'name', e.target.value, 'skAppointees')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Nama Lengkap" />
                              <input type="text" value={person.role} onChange={(e) => handleListChange(idx, 'role', e.target.value, 'skAppointees')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Jabatan" />
                              <button type="button" onClick={() => removeListItem(idx, 'skAppointees')} className="text-red-500"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      <button type="button" onClick={() => addListItem('skAppointees')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1"><Plus size={14}/> Tambah Nama</button>
                  </div>
                </>
            )}

            {(currentTemplateType === 'surat_tugas' || currentTemplateType === 'sppd' || currentTemplateType === 'daftar_transport' || currentTemplateType === 'laporan_sppd') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Nomor {currentTemplateType === 'surat_tugas' ? 'Surat Tugas' : 'SPPD'}</label>
                          <input type="text" name={currentTemplateType === 'surat_tugas' ? 'suratTugasNumber' : 'sppdNumber'} value={currentTemplateType === 'surat_tugas' ? formData.suratTugasNumber : formData.sppdNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Tujuan Perjalanan</label>
                          <input type="text" name="destination" value={formData.destination} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Dinas Pendidikan" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Tgl Berangkat</label>
                          <input type="text" name="departureDate" value={formData.departureDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Tgl Kembali</label>
                          <input type="text" name="returnDate" value={formData.returnDate} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Maksud / Keperluan</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Mengikuti Workshop..." />
                  </div>
                  
                  {currentTemplateType === 'sppd' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Alat Angkut</label>
                          <input type="text" name="transportMode" value={formData.transportMode} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                  )}

                  {currentTemplateType === 'daftar_transport' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Besaran Transport (Per Orang)</label>
                          <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm font-bold" />
                      </div>
                  )}

                  {currentTemplateType === 'laporan_sppd' && (
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Hasil Kegiatan (Laporan)</label>
                          <textarea name="reportResult" value={formData.reportResult} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm h-24" placeholder="Hasil kegiatan..." />
                      </div>
                  )}

                  <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pegawai yang Ditugaskan</label>
                      {formData.officials && formData.officials.map((person: any, idx: number) => (
                          <div key={idx} className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <div className="flex gap-2 mb-1">
                                  <input type="text" value={person.name} onChange={(e) => handleListChange(idx, 'name', e.target.value, 'officials')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Nama Lengkap" />
                                  <input type="text" value={person.nip} onChange={(e) => handleListChange(idx, 'nip', e.target.value, 'officials')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="NIP" />
                              </div>
                              <div className="flex gap-2">
                                  <input type="text" value={person.rank} onChange={(e) => handleListChange(idx, 'rank', e.target.value, 'officials')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Pangkat/Golongan" />
                                  <input type="text" value={person.role} onChange={(e) => handleListChange(idx, 'role', e.target.value, 'officials')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Jabatan" />
                                  <button type="button" onClick={() => removeListItem(idx, 'officials')} className="text-red-500 p-1"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                      <button type="button" onClick={() => addListItem('officials')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1"><Plus size={14}/> Tambah Pegawai</button>
                  </div>
                </>
            )}

            {(currentTemplateType === 'spk_fisik' || currentTemplateType === 'mou') && (
                <>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Nomor Surat</label>
                      <input type="text" name={currentTemplateType === 'spk_fisik' ? 'spkNumber' : 'mouNumber'} value={currentTemplateType === 'spk_fisik' ? formData.spkNumber : formData.mouNumber} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Nama Pihak Kedua</label>
                          <input type="text" name="contractorName" value={formData.contractorName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500">Jabatan/Pekerjaan</label>
                          <input type="text" name="contractorRole" value={formData.contractorRole} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Alamat Pihak Kedua</label>
                      <input type="text" name="contractorAddress" value={formData.contractorAddress} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Uraian Pekerjaan / Kerjasama</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" rows={2} />
                  </div>
                  {currentTemplateType === 'spk_fisik' && (
                      <>
                          <div>
                              <label className="block text-xs font-bold text-gray-500">Lokasi Proyek</label>
                              <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500">Nilai Kontrak (Rp)</label>
                              <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                      </>
                  )}
                </>
            )}

            {(currentTemplateType === 'daftar_hadir' || currentTemplateType === 'absensi_tukang' || currentTemplateType === 'upah_tukang') && (
                <>
                  <div>
                      <label className="block text-xs font-bold text-gray-500">Nama Kegiatan / Proyek</label>
                      <input type="text" name="activityName" value={formData.activityName} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" placeholder="Contoh: Rehab Ruang Kelas" />
                  </div>
                  {currentTemplateType !== 'daftar_hadir' && (
                      <>
                          <div>
                              <label className="block text-xs font-bold text-gray-500">Lokasi</label>
                              <input type="text" name="projectLocation" value={formData.projectLocation} onChange={handleInputChange} className="w-full border rounded px-2 py-1 text-sm" />
                          </div>
                          <div className="mt-2">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Daftar Pekerja</label>
                              {formData.workers && formData.workers.map((worker: any, idx: number) => (
                                  <div key={idx} className="flex gap-2 mb-2">
                                      <input type="text" value={worker.name} onChange={(e) => handleListChange(idx, 'name', e.target.value, 'workers')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Nama Pekerja" />
                                      <input type="text" value={worker.role} onChange={(e) => handleListChange(idx, 'role', e.target.value, 'workers')} className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Jabatan (Tukang/Pekerja)" />
                                      <button type="button" onClick={() => removeListItem(idx, 'workers')} className="text-red-500"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              <button type="button" onClick={() => addListItem('workers')} className="text-xs text-blue-600 flex items-center gap-1 font-bold mt-1"><Plus size={14}/> Tambah Pekerja</button>
                          </div>
                      </>
                  )}
                </>
            )}
        </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-white">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Printer size={20}/></div>
                          <div>
                              <h3 className="text-xl font-black text-slate-800 tracking-tight">Generate Dokumen</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automasi Berkas Audit</p>
                          </div>
                      </div>
                      <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-white rounded-2xl transition-all"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                      <form id="printForm" onSubmit={handlePrint} className="space-y-6">{renderFormFields()}</form>
                  </div>
                  <div className="p-10 border-t border-slate-100 bg-white/80 backdrop-blur-md">
                      <div className="flex gap-4">
                          <button type="button" onClick={onClose} className="flex-1 py-4 px-6 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Batal</button>
                          <button type="submit" form="printForm" className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all group">
                              <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> Generate PDF
                          </button>
                      </div>
                  </div>
              </motion.div>
          </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentFormModal;
