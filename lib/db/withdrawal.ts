import { supabase } from '../supabase';
import { WithdrawalHistory } from '../../types';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getWithdrawalHistory = async (): Promise<WithdrawalHistory[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase.from('withdrawal_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const history = data as WithdrawalHistory[];
                // Cache to IDB
                await db.withdrawalHistory.where('user_id').equals(userId).delete();
                await db.withdrawalHistory.bulkAdd(history.map(h => ({ ...h, user_id: userId })));
                return history;
            }
        } catch (e) { console.error("Cloud withdraw history fetch error:", e); }
    }

    if (userId) {
        return await db.withdrawalHistory.where('user_id').equals(userId).reverse().sortBy('created_at');
    }
    
    return [];
};

export const saveWithdrawalHistory = async (history: Omit<WithdrawalHistory, 'id' | 'created_at'>): Promise<WithdrawalHistory | null> => {
    const userId = await getCurrentUserId();
    const newItem = { 
        ...history, 
        id: crypto.randomUUID(), 
        created_at: new Date().toISOString() 
    } as WithdrawalHistory;

    if (supabase && userId) {
        const { data, error } = await supabase.from('withdrawal_history').insert([{ ...newItem, user_id: userId }]).select();
        if (error) {
            console.error("History save error:", error);
            alert(`Gagal menyimpan ke cloud: ${error.message}`);
            return null;
        }
        const saved = data[0] as WithdrawalHistory;
        await db.withdrawalHistory.put({ ...saved, user_id: userId });
        return saved;
    }

    if (userId) {
        await db.withdrawalHistory.add({ ...newItem, user_id: userId });
    }
    return newItem;
};

export const updateWithdrawalHistory = async (id: string, updates: Partial<WithdrawalHistory>): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { error } = await supabase.from('withdrawal_history').update(updates).eq('id', id);
        if (!error) {
            await db.withdrawalHistory.update(id, updates);
            return true;
        }
    }

    if (userId) {
        await db.withdrawalHistory.update(id, updates);
        return true;
    }
    return false;
};

export const deleteWithdrawalHistory = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const itemToDelete = await db.withdrawalHistory.get(id);
        if (itemToDelete && itemToDelete.file_path) {
            try { await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]); } catch (e) { }
        }
        const { error } = await supabase.from('withdrawal_history').delete().eq('id', id).eq('user_id', userId);
        if (!error) {
            await db.withdrawalHistory.delete(id);
            return true;
        }
    }

    if (userId) {
        await db.withdrawalHistory.delete(id);
        return true;
    }
    return false;
};
