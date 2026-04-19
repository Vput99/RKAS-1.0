import { supabase } from '../supabase';
import { BankStatement } from '../../types';
import { getCurrentUserId, BANK_STATEMENT_KEY } from './core';

export const getBankStatements = async (): Promise<BankStatement[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('bank_statements')
                .select('*')
                .eq('user_id', userId)
                .order('month', { ascending: true });

            if (!error && data) return data as BankStatement[];
        } catch (e) {
            console.warn("Bank statement table fetch error");
        }
    }
    const local = localStorage.getItem(BANK_STATEMENT_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveBankStatement = async (statement: BankStatement): Promise<BankStatement> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = { ...statement, user_id: userId };

        const { data: existing } = await supabase
            .from('bank_statements')
            .select('id')
            .eq('id', statement.id)
            .maybeSingle();

        if (existing) {
            await supabase.from('bank_statements').update(payload).eq('id', statement.id);
        } else {
            await supabase.from('bank_statements').insert([payload]);
        }
    }

    const current = await getBankStatements();
    const filtered = current.filter(s => !(s.month === statement.month && s.year === statement.year));
    const updated = [...filtered, statement].sort((a, b) => a.month - b.month);
    localStorage.setItem(BANK_STATEMENT_KEY, JSON.stringify(updated));

    return statement;
};

export const deleteBankStatement = async (id: string): Promise<void> => {
    const current = await getBankStatements();
    const itemToDelete = current.find(s => s.id === id);

    if (supabase && itemToDelete) {
        if (itemToDelete.file_path) {
            try { await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]); } catch (e) { }
        }
        await supabase.from('bank_statements').delete().eq('id', id);
    }

    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(BANK_STATEMENT_KEY, JSON.stringify(updated));
};
