import { supabase } from '../supabase';
import { WithdrawalHistory } from '../../types';
import { getCurrentUserId, HISTORY_KEY } from './core';

export const getWithdrawalHistory = async (): Promise<WithdrawalHistory[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('withdrawal_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) return data as WithdrawalHistory[];
        } catch (e) { console.error(e); }
    }
    const local = localStorage.getItem(HISTORY_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveWithdrawalHistory = async (history: Omit<WithdrawalHistory, 'id' | 'created_at'>): Promise<WithdrawalHistory | null> => {
    const newItem = { ...history, id: crypto.randomUUID(), created_at: new Date().toISOString() };

    if (supabase) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase.from('withdrawal_history').insert([{ ...newItem, user_id: userId }]).select();
        if (error) {
            console.error("History save error:", error);
            return null;
        }
        return data ? data[0] as WithdrawalHistory : null;
    }

    const current = await getWithdrawalHistory();
    const updated = [newItem, ...current];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return newItem as WithdrawalHistory;
};

export const updateWithdrawalHistory = async (id: string, updates: Partial<WithdrawalHistory>): Promise<boolean> => {
    if (supabase) {
        const { error } = await supabase.from('withdrawal_history').update(updates).eq('id', id);
        return !error;
    }
    const current = await getWithdrawalHistory();
    const updated = current.map(h => h.id === id ? { ...h, ...updates } : h);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return true;
};

export const deleteWithdrawalHistory = async (id: string): Promise<boolean> => {
    const current = await getWithdrawalHistory();
    const itemToDelete = current.find(h => h.id === id);

    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                console.error("Delete failed: no user session");
                return false;
            }

            if (itemToDelete && itemToDelete.file_path) {
                try { await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]); } catch (e) { }
            }
            const { error } = await supabase.from('withdrawal_history').delete().eq('id', id).eq('user_id', userId);
            if (error) {
                console.error("Supabase delete history error:", error);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Delete history exception:", e);
            return false;
        }
    }

    const updated = current.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return true;
};
