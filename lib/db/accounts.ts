import { supabase } from '../supabase';
import { AccountCodes } from '../../types';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

export const getStoredAccounts = async (): Promise<Record<string, string>> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        try {
            const { data, error } = await supabase
                .from('account_codes')
                .select('*')
                .or(`user_id.is.null,user_id.eq.${userId}`)
                .order('code', { ascending: true });

            if (data && !error) {
                const dbMap: Record<string, string> = {};
                const sorted = [...data].sort((a, b) => {
                    if (a.user_id === b.user_id) return 0;
                    return a.user_id === null ? -1 : 1;
                });
                sorted.forEach((item: any) => { dbMap[item.code] = item.name; });

                if (Object.keys(dbMap).length > 0) {
                    // Sync to IDB
                    await db.accountCodes.where('user_id').equals(userId).delete();
                    await db.accountCodes.bulkAdd(Object.entries(dbMap).map(([code, name]) => ({ code, name, user_id: userId })));
                    return dbMap;
                }
            }
        } catch (e) { console.error("Cloud accounts fetch error:", e); }
    }

    if (userId) {
        const localData = await db.accountCodes.where('user_id').equals(userId).toArray();
        if (localData.length > 0) {
            const map: Record<string, string> = {};
            localData.forEach((d: { code: string; name: string }) => { map[d.code] = d.name; });
            return { ...AccountCodes, ...map };
        }
    }

    return AccountCodes;
};

export const saveCustomAccount = async (code: string, name: string): Promise<Record<string, string>> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        await supabase.from('account_codes').upsert({ code, name, user_id: userId }, { onConflict: 'code,user_id' });
        await db.accountCodes.put({ code, name, user_id: userId });
    } else if (userId) {
        await db.accountCodes.put({ code, name, user_id: userId });
    }

    return await getStoredAccounts();
};

export const deleteCustomAccount = async (code: string): Promise<Record<string, string>> => {
    const userId = await getCurrentUserId();
    
    if (supabase && userId) {
        const { error } = await supabase.from('account_codes').delete().eq('code', code).eq('user_id', userId);
        if (!error) {
            await db.accountCodes.delete(code);
        }
    } else if (userId) {
        await db.accountCodes.delete(code);
    }

    return await getStoredAccounts();
};

export const bulkSaveCustomAccounts = async (accounts: Record<string, string>): Promise<Record<string, string>> => {
    const userId = await getCurrentUserId();
    if (!userId) return await getStoredAccounts();

    if (supabase) {
        const rows = Object.entries(accounts).map(([code, name]) => ({ code, name, user_id: userId }));
        await supabase.from('account_codes').upsert(rows);
    }
    
    await db.accountCodes.bulkPut(Object.entries(accounts).map(([code, name]) => ({ code, name, user_id: userId })));
    return await getStoredAccounts();
};

export const initializeUserAccounts = async (): Promise<Record<string, string>> => {
    const userId = await getCurrentUserId();
    if (supabase && userId) {
        const { data: systemAccounts } = await supabase
            .from('account_codes')
            .select('code, name')
            .is('user_id', null);

        if (systemAccounts && systemAccounts.length > 0) {
            const rows = systemAccounts.map(a => ({ ...a, user_id: userId }));
            await supabase.from('account_codes').upsert(rows);
            await db.accountCodes.bulkPut(rows);
        }
    }
    return await getStoredAccounts();
};
