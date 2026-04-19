import { supabase } from '../supabase';
import { LetterAgreement } from '../../types';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getLetterAgreements = async (): Promise<LetterAgreement[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase
                .from('letter_agreements')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const letters = data as LetterAgreement[];
                // Sync to IDB
                await db.letterAgreements.where('user_id').equals(userId).delete();
                await db.letterAgreements.bulkAdd(letters.map(l => ({ ...l, user_id: userId })));
                return letters;
            }
        } catch (e) { console.warn('Cloud letters fetch error:', e); }
    }

    if (userId) {
        return await db.letterAgreements.where('user_id').equals(userId).reverse().sortBy('created_at');
    }
    return [];
};

export const saveLetterAgreement = async (
    data: Omit<LetterAgreement, 'id' | 'created_at' | 'user_id'>
): Promise<LetterAgreement | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const newItem: LetterAgreement = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
    };

    if (supabase) {
        const payload = { ...newItem, user_id: userId };
        const { error } = await supabase.from('letter_agreements').insert([payload]);
        if (error) {
            console.error('Error saving letter:', error);
            alert(`Gagal menyimpan ke cloud: ${error.message}`);
            return null;
        }
    }

    await db.letterAgreements.add({ ...newItem, user_id: userId });
    return newItem;
};

export const updateLetterAgreement = async (
    id: string,
    updates: Partial<LetterAgreement>
): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        const { error } = await supabase.from('letter_agreements').update(updates).eq('id', id);
        if (error) return false;
    }

    await db.letterAgreements.update(id, updates);
    return true;
};

export const deleteLetterAgreement = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (supabase) {
        const { error } = await supabase.from('letter_agreements').delete().eq('id', id).eq('user_id', userId);
        if (error) return false;
    }

    await db.letterAgreements.delete(id);
    return true;
};
