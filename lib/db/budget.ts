import { supabase } from '../supabase';
import { Budget } from '../../types';
import { getCurrentUserId } from './auth';
import { MOCK_DATA } from './core';
import { db } from './dexie';

export const getBudgets = async (): Promise<Budget[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { data, error } = await supabase.from('budgets')
            .select('*')
            .eq('user_id', userId) // Explicit Filter
            .order('date', { ascending: false });

        if (!error && data) {
            const budgetData = data as Budget[];
            // Sync to IndexedDB
            await db.budgets.where('user_id').equals(userId).delete();
            await db.budgets.bulkAdd(budgetData.map(b => ({ ...b, user_id: userId })));
            return budgetData;
        }
        if (error) console.error("Error fetching budgets from Supabase:", error);
    }

    // Fallback to IndexedDB
    if (userId) {
        const localData = await db.budgets.where('user_id').equals(userId).reverse().sortBy('date');
        if (localData.length > 0) return localData;
    }

    return MOCK_DATA;
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

        if (error) {
            console.error("Supabase insert error:", error);
            alert(`Gagal menyimpan data ke cloud: ${error.message}`);
            return null;
        }

        const savedItem = data[0] as Budget;
        await db.budgets.put({ ...savedItem, user_id: userId });
        return savedItem;
    }

    // Offline mode
    if (userId) {
        await db.budgets.add({ ...newItem, user_id: userId });
    }
    return newItem;
};

export const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget | null> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select();
        if (error) {
            console.error("Supabase update error:", error);
            alert(`Gagal mengupdate data di cloud: ${error.message}`);
            return null;
        }
        const updatedItem = data[0] as Budget;
        await db.budgets.update(id, { ...updatedItem, user_id: userId });
        return updatedItem;
    }

    // Offline mode
    if (userId) {
        const existing = await db.budgets.get(id);
        if (existing) {
            const updated = { ...existing, ...updates };
            await db.budgets.put(updated);
            return updated;
        }
    }
    return null;
};

export const deleteBudget = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (error) {
            console.error("Supabase delete error:", error);
            return false;
        }
        await db.budgets.delete(id);
        return true;
    }

    // Offline mode
    if (userId) {
        await db.budgets.delete(id);
        return true;
    }
    return false;
};
