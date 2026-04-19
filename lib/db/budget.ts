import { supabase } from '../supabase';
import { Budget } from '../../types';
import { getCurrentUserId, LOCAL_KEY, MOCK_DATA } from './core';

export const getBudgets = async (): Promise<Budget[]> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return []; // Security guard

        const { data, error } = await supabase.from('budgets')
            .select('*')
            .eq('user_id', userId) // Explicit Filter
            .order('date', { ascending: false });

        if (error) {
            console.error("Error fetching budgets:", error);
            return [];
        }
        if (data) return data as Budget[];
    }

    const local = localStorage.getItem(LOCAL_KEY);
    if (local) return JSON.parse(local);
    return MOCK_DATA;
};

export const addBudget = async (item: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> => {
    const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() };

    if (supabase) {
        const userId = await getCurrentUserId();

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
            alert(`Gagal menyimpan data: ${error.message}`);
            return null;
        }

        return data ? data[0] as Budget : null;
    }

    const current = await getBudgets();
    const updated = [newItem, ...current];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    return newItem as Budget;
};

export const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget | null> => {
    if (supabase) {
        const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select();
        if (error) {
            console.error("Supabase update error:", error);
            alert(`Gagal mengupdate data: ${error.message}`);
            return null;
        }
        return data ? data[0] as Budget : null;
    }

    const current = await getBudgets();
    const index = current.findIndex(b => b.id === id);
    if (index === -1) return null;

    const updatedItem = { ...current[index], ...updates };
    const newList = [...current];
    newList[index] = updatedItem;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newList));
    return updatedItem;
};

export const deleteBudget = async (id: string): Promise<boolean> => {
    if (supabase) {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (error) {
            console.error("Supabase delete error:", error);
            return false;
        }
        return true;
    }

    const current = await getBudgets();
    const updated = current.filter(b => b.id !== id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    return true;
};
