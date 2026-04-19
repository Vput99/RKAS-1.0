import { supabase } from '../supabase';
import { getCurrentUserId } from './core';

const GENERAL_EVIDENCE_KEY = 'rkas_general_evidence_v1';

export const getGeneralFiles = async (): Promise<any[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase
                .from('general_evidence')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                localStorage.setItem(GENERAL_EVIDENCE_KEY, JSON.stringify(data));
                return data;
            }
        } catch (e) {
            console.warn('Gagal mengambil data arsip umum dari cloud:', e);
        }
    }
    
    try {
        const local = localStorage.getItem(GENERAL_EVIDENCE_KEY);
        if (local) {
            const parsed = JSON.parse(local);
            return Array.isArray(parsed) ? parsed : [];
        }
    } catch (e) {
        console.error("Gagal parse data arsip umum lokal:", e);
    }
    return [];
};

export const saveGeneralFile = async (file: any): Promise<any> => {
    if (!file || !file.path) return null;

    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (userId) {
                const payload = { ...file, user_id: userId, created_at: file.date || new Date().toISOString() };
                const { data, error } = await supabase
                    .from('general_evidence')
                    .upsert([payload], { onConflict: 'path' })
                    .select();
                
                if (!error && data && data.length > 0) return data[0];
            }
        } catch (e) {
            console.warn("Gagal simpan arsip ke cloud, beralih ke lokal:", e);
        }
    }
    
    try {
        const current = await getGeneralFiles();
        const updated = [file, ...current.filter(f => f && f.path !== file.path)];
        localStorage.setItem(GENERAL_EVIDENCE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn("Gagal simpan arsip lokal (kemungkinan kuota penuh):", e);
    }
    return file;
};

export const deleteGeneralFile = async (path: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (userId) {
            try {
                await supabase.storage.from('rkas_storage').remove([path]);
                const { error } = await supabase.from('general_evidence').delete().eq('path', path).eq('user_id', userId);
                return !error;
            } catch (e) {
                console.error("Gagal hapus file dari database:", e);
            }
        }
    }
    
    const current = await getGeneralFiles();
    localStorage.setItem(GENERAL_EVIDENCE_KEY, JSON.stringify(current.filter(f => f.path !== path)));
    return true;
};
