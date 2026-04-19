import { supabase } from '../supabase';
import { getCurrentUserId, clearLocalData } from './core';

export interface SystemUsage {
    databaseBytes: number;
    databaseLimit: number;
    storageBytes: number;
    storageLimit: number;
    fileCount: number;
}

export const getSystemUsage = async (): Promise<SystemUsage> => {
    const DEFAULT_USAGE: SystemUsage = {
        databaseBytes: 0,
        databaseLimit: 50 * 1024 * 1024,
        storageBytes: 0,
        storageLimit: 400 * 1024 * 1024,
        fileCount: 0
    };

    if (!supabase) return DEFAULT_USAGE;

    try {
        const userId = await getCurrentUserId();
        if (!userId) return DEFAULT_USAGE;

        const [budgets, history, reports, bank, accounts] = await Promise.all([
            supabase.from('budgets').select('id, realizations').eq('user_id', userId),
            supabase.from('withdrawal_history').select('id, file_path').eq('user_id', userId),
            supabase.from('rapor_pendidikan').select('id').eq('user_id', userId),
            supabase.from('bank_statements').select('id, file_path').eq('user_id', userId),
            supabase.from('account_codes').select('id').eq('user_id', userId)
        ]);

        const budgetCount = budgets.data?.length || 0;
        const historyCount = history.data?.length || 0;
        const reportCount = reports.data?.length || 0;
        const bankCount = bank.data?.length || 0;
        const accountCount = accounts.data?.length || 0;

        const dbSize = (budgetCount * 5000) + (historyCount * 10000) + (reportCount * 1000) + (bankCount * 2000) + (accountCount * 500);

        let storageSize = 0;
        let fileCount = 0;

        budgets.data?.forEach(b => {
           if (b.realizations && Array.isArray(b.realizations)) {
               b.realizations.forEach((r: any) => {
                   if (r.evidence_files && Array.isArray(r.evidence_files)) {
                       fileCount += r.evidence_files.length;
                   }
               });
           }
        });

        history.data?.forEach(h => { if (h.file_path) fileCount++; });
        bank.data?.forEach(b => { if (b.file_path) fileCount++; });

        storageSize = fileCount * 800 * 1024;

        return {
            databaseBytes: dbSize,
            databaseLimit: 50 * 1024 * 1024, 
            storageBytes: storageSize,
            storageLimit: 400 * 1024 * 1024,
            fileCount
        };

    } catch (error) {
        console.error("Usage monitoring error:", error);
        return DEFAULT_USAGE;
    }
};

export const resetAllData = async (): Promise<boolean> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return false;

            await Promise.all([
                supabase.from('budgets').delete().eq('user_id', userId),
                supabase.from('bank_statements').delete().eq('user_id', userId),
                supabase.from('rapor_pendidikan').delete().eq('user_id', userId),
                supabase.from('withdrawal_history').delete().eq('user_id', userId)
            ]);

            return true;
        } catch (e) {
            console.error("Reset Error:", e);
            return false;
        }
    }

    clearLocalData();
    return true;
};
