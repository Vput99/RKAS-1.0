import { supabase } from '../supabase';
import { Budget } from '../../types';
import { getCurrentUserId } from './auth';
import { MOCK_DATA } from './core';
import { db } from './dexie';

export const getBudgets = async (): Promise<Budget[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return MOCK_DATA;

    // Fast path: get local data first
    const localData = await db.budgets.where('user_id').equals(userId).reverse().sortBy('date');

    if (supabase) {
        try {
            const { data, error } = await supabase.from('budgets')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (!error && data) {
                const budgetData = data as Budget[];
                // Sync in background and return fresh data
                await db.budgets.where('user_id').equals(userId).delete();
                await db.budgets.bulkAdd(budgetData.map(b => ({ ...b, user_id: userId })));
                return budgetData;
            }
        } catch (e) {
            console.warn("Supabase fetch failed, returning local cache.");
        }
    }

    return localData.length > 0 ? localData : MOCK_DATA;
};

export const addBudget = async (item: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> => {
    const userId = await getCurrentUserId();
    const newItem = { 
        ...item, 
        id: crypto.randomUUID(), 
        created_at: new Date().toISOString()
    } as Budget;

    if (supabase && userId) {
        const dbPayload = {
            ...item,
            user_id: userId,
            realizations: item.realizations || [],
            realization_months: item.realization_months || [],
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            month_quantities: item.month_quantities || {},
            ai_analysis_logic: item.ai_analysis_logic || '',
        };

        const { data, error } = await supabase.from('budgets').insert([dbPayload]).select();

        if (!error && data) {
            const savedItem = data[0] as Budget;
            await db.budgets.put({ ...savedItem, user_id: userId });
            return savedItem;
        }
    }

    // Always update local for offline resiliency
    if (userId) {
        await db.budgets.add({ ...newItem, user_id: userId });
        return newItem;
    }
    return null;
};

export const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    // Update local immediately (Optimistic Update pattern)
    const existing = await db.budgets.get(id);
    if (existing) {
        const updated = { ...existing, ...updates };
        await db.budgets.put(updated);
    }
    
    if (supabase) {
        const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select();
        if (!error && data) {
            const updatedItem = data[0] as Budget;
            await db.budgets.update(id, { ...updatedItem, user_id: userId });
            return updatedItem;
        }
    }

    return existing ? { ...existing, ...updates } : null;
};

export const deleteBudget = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    // Delete local immediately
    await db.budgets.delete(id);
    
    if (supabase) {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        return !error;
    }

    return true;
};
