import { supabase } from '../supabase';
import { AccountCodes } from '../../types';
import { getCurrentUserId, CUSTOM_ACCOUNTS_KEY } from './core';

export const getStoredAccounts = async (): Promise<Record<string, string>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            
            if (!userId) {
                const local = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
                const localMap = local ? JSON.parse(local) : {};
                return { ...AccountCodes, ...localMap };
            }
            
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

                sorted.forEach((item: any) => {
                    dbMap[item.code] = item.name;
                });

                if (Object.keys(dbMap).length > 0) {
                    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(dbMap));
                    return dbMap;
                }
            }
        } catch (e) {
            console.error("Failed to fetch accounts from DB", e);
        }
    }

    const local = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
    const localMap = local ? JSON.parse(local) : {};
    return { ...AccountCodes, ...localMap };
};

export const saveCustomAccount = async (code: string, name: string): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        await supabase.from('account_codes').delete().eq('code', code).eq('user_id', userId);
        const { error } = await supabase.from('account_codes').insert({ code, name, user_id: userId });

        if (error) {
            alert("Gagal menyimpan akun: " + error.message);
            return await getStoredAccounts();
        }
    }

    const current = (localStorage.getItem(CUSTOM_ACCOUNTS_KEY) ? JSON.parse(localStorage.getItem(CUSTOM_ACCOUNTS_KEY)!) : {});
    const updated = { ...current, [code]: name };
    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(updated));

    return await getStoredAccounts();
};

export const deleteCustomAccount = async (code: string): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const { data: existing } = await supabase
            .from('account_codes')
            .select('user_id')
            .eq('code', code)
            .maybeSingle();

        if (existing) {
            if (existing.user_id === userId) {
                const { error } = await supabase.from('account_codes').delete().eq('code', code).eq('user_id', userId);
                if (error) console.error("Error deleting account", error);
            } else if (existing.user_id === null) {
                alert("Akun standar sistem tidak dapat dihapus secara permanen. Anda hanya dapat menghapus akun yang Anda buat sendiri.");
            }
        }
    }

    const current = (localStorage.getItem(CUSTOM_ACCOUNTS_KEY) ? JSON.parse(localStorage.getItem(CUSTOM_ACCOUNTS_KEY)!) : {});
    const newAccounts = { ...current };
    delete newAccounts[code];
    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(newAccounts));

    return await getStoredAccounts();
};

export const bulkSaveCustomAccounts = async (accounts: Record<string, string>): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const rows = Object.entries(accounts).map(([code, name]) => ({ code, name, user_id: userId }));

        for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            const { error } = await supabase.from('account_codes').upsert(chunk);
            if (error) {
                const codes = chunk.map(c => c.code);
                await supabase.from('account_codes').delete().in('code', codes).eq('user_id', userId);
                await supabase.from('account_codes').insert(chunk);
            }
        }
    }

    const current = (localStorage.getItem(CUSTOM_ACCOUNTS_KEY) ? JSON.parse(localStorage.getItem(CUSTOM_ACCOUNTS_KEY)!) : {});
    const updated = { ...current, ...accounts };
    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(updated));

    return await getStoredAccounts();
};

export const initializeUserAccounts = async (): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return await getStoredAccounts();

        const { data: systemAccounts } = await supabase
            .from('account_codes')
            .select('code, name')
            .is('user_id', null);

        if (systemAccounts && systemAccounts.length > 0) {
            const rows = systemAccounts.map(a => ({ ...a, user_id: userId }));
            const { error } = await supabase.from('account_codes').upsert(rows);
            if (error) console.error("Error initializing accounts", error);
        }
    }
    return await getStoredAccounts();
};
