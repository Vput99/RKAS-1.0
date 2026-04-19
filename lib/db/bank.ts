import { supabase } from '../supabase';
import { BankStatement } from '../../types';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getBankStatements = async (): Promise<BankStatement[]> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase.from('bank_statements')
                .select('*')
                .eq('user_id', userId)
                .order('month', { ascending: true });

            if (!error && data) {
                const statements = data as BankStatement[];
                // Cache to IDB
                await db.bankStatements.where('user_id').equals(userId).delete();
                await db.bankStatements.bulkAdd(statements.map(s => ({ ...s, user_id: userId })));
                return statements;
            }
        } catch (e) {
            console.warn("Bank statement fetch error from cloud");
        }
    }

    if (userId) {
        return await db.bankStatements.where('user_id').equals(userId).sortBy('month');
    }
    
    return [];
};

export const saveBankStatement = async (statement: BankStatement): Promise<BankStatement> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const payload = { ...statement, user_id: userId };
        await supabase.from('bank_statements').upsert([payload], { onConflict: 'id' });
        await db.bankStatements.put({ ...statement, user_id: userId });
    } else if (userId) {
        await db.bankStatements.put({ ...statement, user_id: userId });
    }

    return statement;
};

export const deleteBankStatement = async (id: string): Promise<void> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const item = await db.bankStatements.get(id);
        if (item?.file_path) {
            try { await supabase.storage.from('rkas_storage').remove([item.file_path]); } catch (e) { }
        }
        await supabase.from('bank_statements').delete().eq('id', id);
    }

    if (userId) {
        await db.bankStatements.delete(id);
    }
};
