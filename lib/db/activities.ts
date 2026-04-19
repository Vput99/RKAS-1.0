import { supabase } from '../supabase';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export interface SubKegiatanDB {
    id: string;
    kode: string;
    nama: string;
    createdAt?: string;
}

export const getSubKegiatanDB = async (): Promise<SubKegiatanDB[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase
                .from('sub_kegiatan_db')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                const mapped: SubKegiatanDB[] = data.map((d: any) => ({
                    id: d.id,
                    kode: d.kode,
                    nama: d.nama,
                    createdAt: d.created_at
                }));
                // Sync to IDB
                await db.subKegiatanDB.where('user_id').equals(userId).delete();
                await db.subKegiatanDB.bulkAdd(mapped.map(m => ({ ...m, user_id: userId })));
                return mapped;
            }
        } catch (e) { console.error('Cloud sub kegiatan fetch error:', e); }
    }

    if (userId) {
        return await db.subKegiatanDB.where('user_id').equals(userId).toArray();
    }
    return [];
};

export const saveSubKegiatanItem = async (item: SubKegiatanDB): Promise<SubKegiatanDB | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    if (supabase) {
        const payload = {
            id: item.id,
            user_id: userId,
            kode: item.kode,
            nama: item.nama
        };
        await supabase.from('sub_kegiatan_db').upsert([payload], { onConflict: 'id' });
    }
    
    await db.subKegiatanDB.put({ ...item, user_id: userId });
    return item;
};

export const deleteSubKegiatanItem = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        const { error } = await supabase.from('sub_kegiatan_db').delete().eq('id', id).eq('user_id', userId);
        if (error) return false;
    }
    await db.subKegiatanDB.delete(id);
    return true;
};

export const updateSubKegiatanItem = async (id: string, kode: string, nama: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        const { error } = await supabase.from('sub_kegiatan_db').update({ kode, nama }).eq('id', id).eq('user_id', userId);
        if (error) return false;
    }
    await db.subKegiatanDB.update(id, { kode, nama });
    return true;
};
