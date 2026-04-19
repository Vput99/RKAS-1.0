import { supabase } from '../supabase';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getGeneralFiles = async (): Promise<any[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase
                .from('general_evidence')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Sync to IDB
                await db.generalEvidence.where('user_id').equals(userId).delete();
                await db.generalEvidence.bulkAdd(data.map(d => ({ ...d, user_id: userId })));
                return data;
            }
        } catch (e) {
            console.warn('Gagal mengambil data arsip umum dari cloud:', e);
        }
    }
    
    if (userId) {
        return await db.generalEvidence.where('user_id').equals(userId).reverse().sortBy('created_at');
    }
    return [];
};

export const saveGeneralFile = async (file: any): Promise<any> => {
    if (!file || !file.path) return null;
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (supabase) {
        try {
            const payload = { ...file, user_id: userId, created_at: file.date || new Date().toISOString() };
            const { data, error } = await supabase.from('general_evidence').upsert([payload], { onConflict: 'path' }).select();
            if (!error && data && data.length > 0) {
                await db.generalEvidence.put({ ...data[0], user_id: userId });
                return data[0];
            }
        } catch (e) { console.warn("Cloud save failed for evidence", e); }
    }
    
    await db.generalEvidence.put({ ...file, user_id: userId });
    return file;
};

export const deleteGeneralFile = async (path: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        try {
            await supabase.storage.from('rkas_storage').remove([path]);
            await supabase.from('general_evidence').delete().eq('path', path).eq('user_id', userId);
        } catch (e) { console.error("Cloud delete error:", e); }
    }
    
    await db.generalEvidence.delete(path);
    return true;
};
