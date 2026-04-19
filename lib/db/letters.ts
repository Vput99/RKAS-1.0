import { supabase } from '../supabase';
import { LetterAgreement } from '../../types';
import { getCurrentUserId } from './core';

const LETTER_AGREEMENTS_KEY = 'rkas_letter_agreements_v1';

export const getLetterAgreements = async (): Promise<LetterAgreement[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase
                .from('letter_agreements')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(data));
                return data as LetterAgreement[];
            }
        } catch (e) {
            console.warn('letter_agreements fetch error:', e);
        }
    }
    const local = localStorage.getItem(LETTER_AGREEMENTS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveLetterAgreement = async (
    data: Omit<LetterAgreement, 'id' | 'created_at' | 'user_id'>
): Promise<LetterAgreement | null> => {
    const newItem: LetterAgreement = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
    };

    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = { ...newItem, user_id: userId };

        const { data: inserted, error } = await supabase
            .from('letter_agreements')
            .insert([payload])
            .select();

        if (error) {
            console.error('Error saving letter agreement:', error);
            alert(`Gagal menyimpan surat: ${error.message}`);
            return null;
        }

        if (inserted && inserted[0]) {
            const current = await getLetterAgreements();
            localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify([inserted[0], ...current.filter(l => l.id !== inserted[0].id)]));
            return inserted[0] as LetterAgreement;
        }
    }

    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    const updated = [newItem, ...current];
    localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(updated));
    return newItem;
};

export const updateLetterAgreement = async (
    id: string,
    updates: Partial<LetterAgreement>
): Promise<boolean> => {
    if (supabase) {
        const { error } = await supabase
            .from('letter_agreements')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating letter agreement:', error);
            return false;
        }
    }

    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    localStorage.setItem(
        LETTER_AGREEMENTS_KEY,
        JSON.stringify(current.map(l => l.id === id ? { ...l, ...updates } : l))
    );
    return true;
};

export const deleteLetterAgreement = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const { error } = await supabase
            .from('letter_agreements')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting letter agreement:', error);
            return false;
        }
    }

    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(current.filter(l => l.id !== id)));
    return true;
};
