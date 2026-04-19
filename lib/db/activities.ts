import { supabase } from '../supabase';
import { getCurrentUserId } from './core';

export interface SubKegiatanDB {
    id: string;
    kode: string;
    nama: string;
    createdAt?: string;
}

const SK_DB_LOCAL_KEY = 'rkas_sub_kegiatan_db_v1';

export const getSubKegiatanDB = async (): Promise<SubKegiatanDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

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
                localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching sub kegiatan db:', e);
        }
    }
    const local = localStorage.getItem(SK_DB_LOCAL_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveSubKegiatanItem = async (item: SubKegiatanDB): Promise<SubKegiatanDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const payload = {
            id: item.id,
            user_id: userId,
            kode: item.kode,
            nama: item.nama
        };

        const { data, error } = await supabase
            .from('sub_kegiatan_db')
            .upsert([payload], { onConflict: 'id' })
            .select();

        if (error) {
            console.error('Error saving sub kegiatan item:', error);
        } else if (data) {
            const current = await getSubKegiatanDB();
            const updated = current.map(s => s.id === item.id ? item : s);
            if (!updated.find(s => s.id === item.id)) updated.push(item);
            localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(updated));
            return data[0] as SubKegiatanDB;
        }
    }
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    const updated = current.map(s => s.id === item.id ? item : s);
    if (!updated.find(s => s.id === item.id)) updated.push(item);
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(updated));
    return item;
};

export const deleteSubKegiatanItem = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const { error } = await supabase
            .from('sub_kegiatan_db')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting sub kegiatan item:', error);
            return false;
        }
    }
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(current.filter(s => s.id !== id)));
    return true;
};

export const updateSubKegiatanItem = async (id: string, kode: string, nama: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const { error } = await supabase
            .from('sub_kegiatan_db')
            .update({ kode, nama })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating sub kegiatan item:', error);
            return false;
        }
    }
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(current.map(s => s.id === id ? { ...s, kode, nama } : s)));
    return true;
};
