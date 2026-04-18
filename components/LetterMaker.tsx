import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { getSchoolProfile, getLetterAgreements, saveLetterAgreement, deleteLetterAgreement, updateLetterAgreement } from '../lib/db';
import { SchoolProfile, LetterAgreement } from '../types';

import HonorariumForm from './HonorariumForm';
import UpahTukangForm from './UpahTukangForm';
import RoolstaatForm from './RoolstaatForm';

// Modular Imports
import { LetterMakerProps, LetterTab, LetterFilterType } from './letter/LetterTypes';
import { defaultForm } from './letter/LetterUtils';
import { generateEkskulPDF, generateTukangPDF } from './letter/LetterPdfGenerator';
import LetterListView from './letter/LetterListView';
import LetterFormView from './letter/LetterFormView';

const LetterMaker = ({ schoolProfile: propProfile }: LetterMakerProps) => {
  const [activeTab, setActiveTab] = useState<LetterTab>('list');
  const [letters, setLetters] = useState<LetterAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SchoolProfile | null>(propProfile || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<LetterFilterType>('all');
  const [form, setForm] = useState<Partial<LetterAgreement>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [p, ls] = await Promise.all([
        propProfile ? Promise.resolve(propProfile) : getSchoolProfile(),
        getLetterAgreements()
      ]);
      setProfile(p);
      setLetters(ls);
      setLoading(false);
    };
    load();
  }, [propProfile]);

  const initForm = useCallback((type: 'ekstrakurikuler' | 'tukang') => {
    setEditingId(null);
    setForm(defaultForm(profile, type));
    setActiveTab(type === 'ekstrakurikuler' ? 'form-ekskul' : 'form-tukang');
  }, [profile]);

  const handleEdit = (letter: LetterAgreement) => {
    setEditingId(letter.id);
    setForm({ ...letter });
    setActiveTab(letter.type === 'ekstrakurikuler' ? 'form-ekskul' : 'form-tukang');
  };

  const handleChange = (key: keyof LetterAgreement, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.party_name?.trim()) { alert('Nama pihak kedua wajib diisi.'); return; }
    if (!form.activity_description?.trim()) { alert('Deskripsi kegiatan/pekerjaan wajib diisi.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateLetterAgreement(editingId, form);
        setLetters(prev => prev.map(l => l.id === editingId ? { ...l, ...form } as LetterAgreement : l));
      } else {
        const saved = await saveLetterAgreement(form as Omit<LetterAgreement, 'id' | 'created_at' | 'user_id'>);
        if (saved) setLetters(prev => [saved, ...prev]);
      }
      setActiveTab('list');
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus surat ini?')) return;
    const ok = await deleteLetterAgreement(id);
    if (ok) setLetters(prev => prev.filter(l => l.id !== id));
  };

  const handlePrint = (letter: LetterAgreement) => {
    if (letter.type === 'ekstrakurikuler') generateEkskulPDF(letter);
    else generateTukangPDF(letter);
  };

  const handleExportJSON = (letter: LetterAgreement) => {
    const json = JSON.stringify(letter, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPK_${letter.type}_${(letter.party_name || 'data').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentFormJSON = () => {
    if (!form.party_name?.trim()) { alert('Isi Nama Pihak Kedua terlebih dahulu.'); return; }
    const json = JSON.stringify(form, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPK_${form.type || 'surat'}_${(form.party_name || 'data').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeTab === 'list' && (
          <LetterListView
            key="list"
            letters={letters}
            loading={loading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterType={filterType}
            setFilterType={setFilterType}
            initForm={initForm}
            handleEdit={handleEdit}
            handlePrint={handlePrint}
            handleDelete={handleDelete}
            handleExportJSON={handleExportJSON}
            setActiveTab={setActiveTab}
          />
        )}
        {(activeTab === 'form-ekskul' || activeTab === 'form-tukang') && (
          <LetterFormView
            key={activeTab}
            type={activeTab === 'form-ekskul' ? 'ekstrakurikuler' : 'tukang'}
            form={form}
            handleChange={handleChange}
            handleSave={handleSave}
            handleExportCurrentFormJSON={handleExportCurrentFormJSON}
            handlePrint={handlePrint}
            setActiveTab={setActiveTab}
            editingId={editingId}
            saving={saving}
          />
        )}
        {activeTab === 'form-honor' && (
          <motion.div key="honor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HonorariumForm profile={profile} onBack={() => setActiveTab('list')} />
          </motion.div>
        )}
        {activeTab === 'form-upah-tukang' && (
          <motion.div key="upah-tukang" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UpahTukangForm profile={profile} onBack={() => setActiveTab('list')} />
          </motion.div>
        )}
        {activeTab === 'form-roolstaat' && (
          <motion.div key="roolstaat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RoolstaatForm profile={profile} onBack={() => setActiveTab('list')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LetterMaker;
