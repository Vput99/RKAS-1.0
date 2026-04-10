
import { supabase } from './supabase';
import { Budget, TransactionType, SchoolProfile, BankStatement, RaporIndicator, WithdrawalHistory, AccountCodes, LetterAgreement } from '../types';

// Mock data for Offline Mode
const MOCK_DATA: Budget[] = [
    {
        id: '1',
        type: TransactionType.INCOME,
        description: 'Dana BOSP Reguler Tahap 1 (Data Lokal)',
        amount: 150000000,
        date: '2026-01-15',
        bosp_component: 'Penerimaan',
        category: 'Dana Transfer',
        realization_months: [1],
        status: 'approved'
    },
];

const LOCAL_KEY = 'rkas_local_data_v7';
const SCHOOL_PROFILE_KEY = 'rkas_school_profile_v1';
const BANK_STATEMENT_KEY = 'rkas_bank_statements_v1';
const HISTORY_KEY = 'rkas_withdrawal_history_v1';
const CUSTOM_ACCOUNTS_KEY = 'rkas_custom_accounts_v1';
const INVENTORY_ITEMS_KEY = 'rkas_manual_inventory_v1';
const INVENTORY_WITHDRAWALS_KEY = 'rkas_withdrawal_transactions_v1';
const INVENTORY_OVERRIDES_KEY = 'rkas_inventory_overrides_v1';
const MUTATION_OVERRIDES_KEY = 'rkas_mutation_overrides_v1';

const DEFAULT_PROFILE: SchoolProfile = {
    name: 'SD Negeri Contoh (Lokal)',
    npsn: '12345678',
    address: 'Jl. Pendidikan No. 1',
    headmaster: 'Budi Santoso, S.Pd',
    headmasterNip: '19800101 200501 1 001',
    treasurer: 'Siti Aminah, S.Pd',
    treasurerNip: '19850202 201001 2 002',
    fiscalYear: '2026',
    studentCount: 150,
    budgetCeiling: 150000000
};

// Helper: Get Current User ID
const getCurrentUserId = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || null;
};

// Security: Clear all local data on logout to prevent leakage between schools
export const clearLocalData = () => {
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(SCHOOL_PROFILE_KEY);
    localStorage.removeItem(BANK_STATEMENT_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(CUSTOM_ACCOUNTS_KEY);
    localStorage.removeItem(INVENTORY_ITEMS_KEY);
    localStorage.removeItem(INVENTORY_WITHDRAWALS_KEY);
    localStorage.removeItem(INVENTORY_OVERRIDES_KEY);
    localStorage.removeItem(MUTATION_OVERRIDES_KEY);
    localStorage.removeItem('rkas_active_tab');
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('school_profiles').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        console.error("Supabase connection check failed:", e);
        return false;
    }
};

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
}

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

// --- School Profile Functions ---

export const getSchoolProfile = async (): Promise<SchoolProfile> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return DEFAULT_PROFILE;

            const { data } = await supabase.from('school_profiles')
                .select('*')
                .eq('user_id', userId) // Explicit Filter
                .single();

            if (data) {
                return {
                    name: data.name,
                    npsn: data.npsn,
                    address: data.address,
                    headmaster: data.headmaster,
                    headmasterNip: data.headmaster_nip,
                    treasurer: data.treasurer,
                    treasurerNip: data.treasurer_nip,
                    fiscalYear: data.fiscal_year,
                    studentCount: data.student_count,
                    budgetCeiling: data.budget_ceiling,
                    city: data.city,
                    district: data.district,
                    postalCode: data.postal_code,
                    bankName: data.bank_name,
                    bankBranch: data.bank_branch,
                    bankAddress: data.bank_address,
                    accountNo: data.account_no,
                    headerImage: data.header_image
                };
            }
        } catch (error) {
            console.log("No profile found for this user yet.");
        }
    }

    const local = localStorage.getItem(SCHOOL_PROFILE_KEY);
    if (local) return JSON.parse(local);
    return DEFAULT_PROFILE;
};

export const saveSchoolProfile = async (profile: SchoolProfile): Promise<SchoolProfile> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                // Check if we are in signup flow (session might be setting up)
                // Retry once after 500ms
                await new Promise(r => setTimeout(r, 500));
                const retryUser = await getCurrentUserId();
                if (!retryUser) {
                    console.warn("User not authenticated to save profile");
                    return profile;
                }
            }

            // Re-get user id to be sure
            const confirmedUserId = await getCurrentUserId();

            const dbPayload = {
                user_id: confirmedUserId,
                name: profile.name,
                npsn: profile.npsn,
                address: profile.address,
                headmaster: profile.headmaster,
                headmaster_nip: profile.headmasterNip,
                treasurer: profile.treasurer,
                treasurer_nip: profile.treasurerNip,
                fiscal_year: profile.fiscalYear,
                student_count: profile.studentCount,
                budget_ceiling: profile.budgetCeiling,
                updated_at: new Date().toISOString(),
                city: profile.city,
                district: profile.district,
                postal_code: profile.postalCode,
                bank_name: profile.bankName,
                bank_branch: profile.bankBranch,
                bank_address: profile.bankAddress,
                account_no: profile.accountNo,
                header_image: profile.headerImage
            };

            // Manual Upsert Logic
            const { data: existing } = await supabase
                .from('school_profiles')
                .select('id')
                .eq('user_id', confirmedUserId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase.from('school_profiles').update(dbPayload).eq('user_id', confirmedUserId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('school_profiles').insert([dbPayload]);
                if (error) throw error;
            }
        } catch (error: any) {
            console.error("Supabase profile save error:", error);
            alert(`Gagal menyimpan profil: ${error.message}`);
        }
    }

    localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(profile));
    return profile;
};

// --- Rapor Pendidikan Functions ---

export const getRaporData = async (year: string): Promise<RaporIndicator[] | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const { data, error } = await supabase
            .from('rapor_pendidikan')
            .select('*')
            .eq('user_id', userId) // Explicit Filter
            .eq('year', year);

        if (error) {
            console.error("Error fetching rapor:", error);
            return null;
        }

        if (data && data.length > 0) {
            return data.map(item => ({
                id: item.indicator_id,
                label: item.label,
                score: Number(item.score),
                category: item.category
            }));
        }
    }
    return null;
};

export const saveRaporData = async (indicators: RaporIndicator[], year: string): Promise<boolean> => {
    if (!supabase) return false;
    const userId = await getCurrentUserId();

    if (!userId) {
        console.error("User not authenticated");
        alert("Sesi login berakhir. Silakan login ulang.");
        return false;
    }

    const upsertData = indicators.map(ind => ({
        user_id: userId,
        year: year,
        indicator_id: ind.id,
        label: ind.label,
        score: ind.score,
        category: ind.category,
        updated_at: new Date().toISOString()
    }));

    // CRITICAL FIX: onConflict strategy matching the UNIQUE INDEX
    const { error } = await supabase
        .from('rapor_pendidikan')
        .upsert(upsertData, { onConflict: 'user_id,year,indicator_id' });

    if (error) {
        console.error("Error saving rapor (Upsert):", error);

        // Fallback: Delete old data and Insert new (Manual Upsert)
        try {
            await supabase.from('rapor_pendidikan').delete().eq('user_id', userId).eq('year', year);
            const { error: insertError } = await supabase.from('rapor_pendidikan').insert(upsertData);
            if (insertError) throw insertError;
            return true;
        } catch (retryError: any) {
            console.error("Retry save failed:", retryError);
            alert("Gagal menyimpan data rapor: " + retryError.message);
            return false;
        }
    }
    return true;
};


// --- Bank Statement Functions ---

export const uploadEvidenceFile = async (file: File, budgetId: string): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };

    const userId = await getCurrentUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/evidence/${budgetId}/${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('rkas_storage')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        console.error("Error uploading evidence file:", error);
        return { url: null, path: null };
    }
};
export const uploadBankStatementFile = async (file: File): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };

    const userId = await getCurrentUserId();
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('rkas_storage')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        console.error("Error uploading file:", error);
        return { url: null, path: null };
    }
};

export const getBankStatements = async (): Promise<BankStatement[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('bank_statements')
                .select('*')
                .eq('user_id', userId) // Explicit Filter
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

        // Robust Manual Upsert Logic
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

// --- Withdrawal History Functions ---

export const getWithdrawalHistory = async (): Promise<WithdrawalHistory[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('withdrawal_history')
                .select('*')
                .eq('user_id', userId) // Explicit Filter
                .order('created_at', { ascending: false });

            if (!error && data) return data as WithdrawalHistory[];
        } catch (e) { console.error(e); }
    }
    const local = localStorage.getItem(HISTORY_KEY);
    return local ? JSON.parse(local) : [];
};

export const uploadWithdrawalFile = async (fileBlob: Blob, fileName: string): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };
    const userId = await getCurrentUserId();
    const filePath = `${userId}/withdrawal_docs/${Date.now()}_${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage')
            .upload(filePath, fileBlob, { contentType: 'application/pdf', upsert: true });

        if (uploadError) return { url: null, path: null };

        const { data } = supabase.storage.from('rkas_storage').getPublicUrl(filePath);
        return { url: data.publicUrl, path: filePath };
    } catch (error) {
        return { url: null, path: null };
    }
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

// --- Custom Account Codes Functions ---

export const getStoredAccounts = async (): Promise<Record<string, string>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            
            // If no user session yet, skip DB query and use fallback
            if (!userId) {
                const local = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
                const localMap = local ? JSON.parse(local) : {};
                return { ...AccountCodes, ...localMap };
            }
            
            // Fetch both system accounts (NULL user_id) and current user's accounts
            const { data, error } = await supabase
                .from('account_codes')
                .select('*')
                .or(`user_id.is.null,user_id.eq.${userId}`)
                .order('code', { ascending: true });

            if (data && !error) {
                const dbMap: Record<string, string> = {};
                
                // Sort data to ensure user-owned accounts override system ones
                const sorted = [...data].sort((a, b) => {
                    if (a.user_id === b.user_id) return 0;
                    return a.user_id === null ? -1 : 1;
                });

                sorted.forEach((item: any) => {
                    dbMap[item.code] = item.name;
                });

                // If we have data in DB, use it as source of truth
                if (Object.keys(dbMap).length > 0) {
                    // Cache to localStorage for offline use
                    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(dbMap));
                    return dbMap;
                }
            }
        } catch (e) {
            console.error("Failed to fetch accounts from DB", e);
        }
    }

    // Fallback to localStorage and hardcoded constants for offline/init
    const local = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
    const localMap = local ? JSON.parse(local) : {};
    return { ...AccountCodes, ...localMap };
};

export const saveCustomAccount = async (code: string, name: string): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        // Fallback: Delete then insert to avoid upsert constraint issues
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
        // First, check if the row belongs to the user
        const { data: existing } = await supabase
            .from('account_codes')
            .select('user_id')
            .eq('code', code)
            .maybeSingle();

        if (existing) {
            if (existing.user_id === userId) {
                // User owns it, can delete
                const { error } = await supabase.from('account_codes').delete().eq('code', code).eq('user_id', userId);
                if (error) console.error("Error deleting account", error);
            } else if (existing.user_id === null) {
                // It's a system account. We can't delete it globally, but we can "hide" it for this user.
                // For now, let's show an alert that system accounts are protected, 
                // OR we could implement a 'hidden_accounts' table.
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

        // Chunking
        for (let i = 0; i < rows.length; i += 50) {
            const chunk = rows.slice(i, i + 50);
            const { error } = await supabase.from('account_codes').upsert(chunk);
            if (error) {
                // Retry with delete-insert for this chunk
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
}

export const initializeUserAccounts = async (): Promise<Record<string, string>> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return await getStoredAccounts();

        // Fetch system accounts
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

// --- DANGER ZONE: Reset Data ---

// --- System Health & Usage Monitoring ---

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
        databaseLimit: 50 * 1024 * 1024, // 50MB for Free Tier Warning
        storageBytes: 0,
        storageLimit: 400 * 1024 * 1024, // 400MB for Free Tier Warning (1GB limit)
        fileCount: 0
    };

    if (!supabase) return DEFAULT_USAGE;

    try {
        const userId = await getCurrentUserId();
        if (!userId) return DEFAULT_USAGE;

        // 1. Fetch data for DB estimation
        const [budgets, history, reports, bank, accounts] = await Promise.all([
            supabase.from('budgets').select('id, realizations').eq('user_id', userId),
            supabase.from('withdrawal_history').select('id, file_path').eq('user_id', userId),
            supabase.from('rapor_pendidikan').select('id').eq('user_id', userId),
            supabase.from('bank_statements').select('id, file_path').eq('user_id', userId),
            supabase.from('account_codes').select('id').eq('user_id', userId)
        ]);

        // Estimated row sizes (Heuristic)
        const budgetCount = budgets.data?.length || 0;
        const historyCount = history.data?.length || 0;
        const reportCount = reports.data?.length || 0;
        const bankCount = bank.data?.length || 0;
        const accountCount = accounts.data?.length || 0;

        // Weighted Calculation (Average row size in bytes)
        const dbSize = (budgetCount * 5000) + (historyCount * 10000) + (reportCount * 1000) + (bankCount * 2000) + (accountCount * 500);

        // 2. Storage Estimation (Count files referenced)
        let storageSize = 0;
        let fileCount = 0;

        // Files in Budgets
        budgets.data?.forEach(b => {
           if (b.realizations && Array.isArray(b.realizations)) {
               b.realizations.forEach((r: any) => {
                   if (r.evidence_files && Array.isArray(r.evidence_files)) {
                       fileCount += r.evidence_files.length;
                   }
               });
           }
        });

        // Files in Withdrawal History
        history.data?.forEach(h => {
            if (h.file_path) fileCount++;
        });

        // Files in Bank Statements
        bank.data?.forEach(b => {
            if (b.file_path) fileCount++;
        });

        // Average file size assumption: 800KB (Mixed Images/PDFs)
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

            // Parallel deletion of data tables (FKs should be handled by cascade if configured, but explicit is safer)
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

// --- Inventory Items Functions ---

export interface InventoryItemDB {
    id: string;
    name: string;
    spec: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
    sub_activity_code?: string;
    sub_activity_name?: string;
    account_code: string;
    date: string;
    contract_type?: string;
    vendor?: string;
    doc_number: string;
    category: string;
    codification?: string;
    used_quantity?: number;
    last_year_balance?: number;
}

export interface WithdrawalTransactionDB {
    id: string;
    inventory_item_id: string;
    date: string;
    doc_number: string;
    quantity: number;
    notes?: string;
}

export const getInventoryItems = async (): Promise<InventoryItemDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('inventory_items')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    spec: d.spec || '',
                    quantity: Number(d.quantity),
                    unit: d.unit || 'Unit',
                    price: Number(d.price),
                    total: Number(d.total),
                    sub_activity_code: d.sub_activity_code,
                    sub_activity_name: d.sub_activity_name,
                    account_code: d.account_code || '',
                    date: d.date || '',
                    contract_type: d.contract_type,
                    vendor: d.vendor || '',
                    doc_number: d.doc_number || '',
                    category: d.category || '',
                    codification: d.codification,
                    used_quantity: Number(d.used_quantity || 0),
                    last_year_balance: Number(d.last_year_balance || 0)
                }));
                localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching inventory items:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_ITEMS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveInventoryItem = async (item: InventoryItemDB): Promise<InventoryItemDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = {
            id: item.id,
            user_id: userId,
            name: item.name,
            spec: item.spec,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            total: item.total,
            sub_activity_code: item.sub_activity_code,
            sub_activity_name: item.sub_activity_name,
            account_code: item.account_code,
            date: item.date || null,
            contract_type: item.contract_type,
            vendor: item.vendor,
            doc_number: item.doc_number,
            category: item.category,
            codification: item.codification,
            used_quantity: item.used_quantity || 0,
            last_year_balance: item.last_year_balance || 0
        };

        const { data, error } = await supabase
            .from('inventory_items')
            .upsert([payload], { onConflict: 'id' })
            .select();
        if (error) {
            console.error('Error saving inventory item:', error);
            alert(`Gagal menyimpan inventaris: ${error.message}`);
            return null;
        }
        return data ? data[0] : null;
    }

    // localStorage fallback
    const current = await getInventoryItems();
    const updated = [item, ...current];
    localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(updated));
    return item;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;
        const { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('Error deleting inventory item:', error);
            return false;
        }
    }
    const current = await getInventoryItems();
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(updated));
    return true;
};

// --- Inventory Withdrawal Functions ---

export const getWithdrawalTransactions = async (): Promise<WithdrawalTransactionDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('inventory_withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((d: any) => ({
                    id: d.id,
                    inventory_item_id: d.inventory_item_id,
                    date: d.date,
                    doc_number: d.doc_number || '',
                    quantity: Number(d.quantity),
                    notes: d.notes || ''
                }));
                localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching withdrawals:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_WITHDRAWALS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveWithdrawalTransaction = async (tx: WithdrawalTransactionDB): Promise<WithdrawalTransactionDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = {
            id: tx.id,
            user_id: userId,
            inventory_item_id: tx.inventory_item_id,
            date: tx.date,
            doc_number: tx.doc_number,
            quantity: tx.quantity,
            notes: tx.notes
        };

        const { data, error } = await supabase
            .from('inventory_withdrawals')
            .upsert([payload], { onConflict: 'id' })
            .select();
        if (error) {
            console.error('Error saving withdrawal:', error);
            alert(`Gagal menyimpan pengeluaran: ${error.message}`);
            return null;
        }
        return data ? data[0] : null;
    }

    const current = await getWithdrawalTransactions();
    const updated = [...current, tx];
    localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(updated));
    return tx;
};

export const deleteWithdrawalTransaction = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;
        const { error } = await supabase.from('inventory_withdrawals').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('Error deleting withdrawal:', error);
            return false;
        }
    }
    const current = await getWithdrawalTransactions();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(updated));
    return true;
};

// --- Inventory Overrides Functions ---

export const getInventoryOverrides = async (): Promise<Record<string, { usedQuantity?: number; lastYearBalance?: number }>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return {};

            const { data, error } = await supabase.from('inventory_overrides')
                .select('*')
                .eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = {};
                data.forEach((d: any) => {
                    map[d.item_id] = {
                        usedQuantity: d.used_quantity != null ? Number(d.used_quantity) : undefined,
                        lastYearBalance: d.last_year_balance != null ? Number(d.last_year_balance) : undefined
                    };
                });
                localStorage.setItem(INVENTORY_OVERRIDES_KEY, JSON.stringify(map));
                return map;
            }
        } catch (e) {
            console.error('Error fetching overrides:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_OVERRIDES_KEY);
    return local ? JSON.parse(local) : {};
};

export const saveInventoryOverride = async (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number): Promise<boolean> => {
    // Update localStorage immediately for responsiveness
    const current = await getInventoryOverrides();
    const updated = {
        ...current,
        [itemId]: {
            ...(current[itemId] || {}),
            [field]: value
        }
    };
    localStorage.setItem(INVENTORY_OVERRIDES_KEY, JSON.stringify(updated));

    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const existing = current[itemId] || {};
        const payload = {
            user_id: userId,
            item_id: itemId,
            used_quantity: field === 'usedQuantity' ? value : (existing.usedQuantity ?? null),
            last_year_balance: field === 'lastYearBalance' ? value : (existing.lastYearBalance ?? null),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('inventory_overrides')
            .upsert(payload, { onConflict: 'user_id,item_id' });

        if (error) {
            console.error('Error saving override:', error);
            await supabase.from('inventory_overrides').delete().eq('user_id', userId).eq('item_id', itemId);
            await supabase.from('inventory_overrides').insert([payload]);
        }
    }
    return true;
};

// --- Mutation Overrides Functions ---

export const getMutationOverrides = async (): Promise<Record<string, { awal?: number; tambah?: number; kurang?: number }>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return {};

            const { data, error } = await supabase.from('inventory_mutation_overrides')
                .select('*')
                .eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { awal?: number; tambah?: number; kurang?: number }> = {};
                data.forEach((d: any) => {
                    map[d.category] = {
                        awal: d.awal != null ? Number(d.awal) : undefined,
                        tambah: d.tambah != null ? Number(d.tambah) : undefined,
                        kurang: d.kurang != null ? Number(d.kurang) : undefined
                    };
                });
                localStorage.setItem(MUTATION_OVERRIDES_KEY, JSON.stringify(map));
                return map;
            }
        } catch (e) {
            console.error('Error fetching mutation overrides:', e);
        }
    }
    const local = localStorage.getItem(MUTATION_OVERRIDES_KEY);
    return local ? JSON.parse(local) : {};
};

export const saveMutationOverride = async (category: string, field: 'awal' | 'tambah' | 'kurang', value: number): Promise<boolean> => {
    // Update localStorage immediately
    const current = await getMutationOverrides();
    const updated = {
        ...current,
        [category]: {
            ...(current[category] || {}),
            [field]: value
        }
    };
    localStorage.setItem(MUTATION_OVERRIDES_KEY, JSON.stringify(updated));

    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const existing = current[category] || {};
        const payload = {
            user_id: userId,
            category: category,
            awal: field === 'awal' ? value : (existing.awal ?? 0),
            tambah: field === 'tambah' ? value : (existing.tambah ?? 0),
            kurang: field === 'kurang' ? value : (existing.kurang ?? 0),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('inventory_mutation_overrides')
            .upsert(payload, { onConflict: 'user_id,category' });

        if (error) {
            console.error('Error saving mutation override:', error);
            await supabase.from('inventory_mutation_overrides').delete().eq('user_id', userId).eq('category', category);
            await supabase.from('inventory_mutation_overrides').insert([payload]);
        }
    }
    return true;
};

// --- Migrasi Data localStorage → Supabase (dijalankan satu kali) ---

export const migrateLocalStorageToSupabase = async (): Promise<void> => {
    if (!supabase) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    try {
        // 1. Cek apakah inventory_items di Supabase sudah ada data
        const { data: existingItems, error: checkError } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        if (checkError) {
            console.warn('Inventory table mungkin belum dibuat. Jalankan inventory_migration.sql di Supabase dashboard.');
            return;
        }

        // 2. Jika Supabase sudah punya data, tidak perlu migrasi
        if (existingItems && existingItems.length > 0) return;

        // 3. Ambil data dari localStorage
        const localItems = localStorage.getItem(INVENTORY_ITEMS_KEY);
        const localWithdrawals = localStorage.getItem(INVENTORY_WITHDRAWALS_KEY);
        const localOverrides = localStorage.getItem(INVENTORY_OVERRIDES_KEY);
        const localMutationOv = localStorage.getItem(MUTATION_OVERRIDES_KEY);

        const hasMigratableData = localItems || localWithdrawals || localOverrides || localMutationOv;
        if (!hasMigratableData) return;

        console.log('Memulai migrasi data localStorage → Supabase...');

        // 4. Migrasi inventory items
        if (localItems) {
            const items: InventoryItemDB[] = JSON.parse(localItems);
            for (const item of items) {
                await saveInventoryItem(item);
            }
            console.log(`✅ Migrasi ${items.length} inventory items selesai`);
        }

        // 5. Migrasi withdrawal transactions
        if (localWithdrawals) {
            const txs: WithdrawalTransactionDB[] = JSON.parse(localWithdrawals);
            for (const tx of txs) {
                await saveWithdrawalTransaction(tx);
            }
            console.log(`✅ Migrasi ${txs.length} withdrawal transactions selesai`);
        }

        // 6. Migrasi overrides
        if (localOverrides) {
            const overrides: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = JSON.parse(localOverrides);
            for (const [itemId, vals] of Object.entries(overrides)) {
                if (vals.usedQuantity !== undefined) {
                    await saveInventoryOverride(itemId, 'usedQuantity', vals.usedQuantity);
                }
                if (vals.lastYearBalance !== undefined) {
                    await saveInventoryOverride(itemId, 'lastYearBalance', vals.lastYearBalance);
                }
            }
            console.log(`✅ Migrasi ${Object.keys(overrides).length} inventory overrides selesai`);
        }

        // 7. Migrasi mutation overrides
        if (localMutationOv) {
            const mutOv: Record<string, { awal?: number; tambah?: number; kurang?: number }> = JSON.parse(localMutationOv);
            for (const [cat, vals] of Object.entries(mutOv)) {
                if (vals.awal !== undefined) await saveMutationOverride(cat, 'awal', vals.awal);
                if (vals.tambah !== undefined) await saveMutationOverride(cat, 'tambah', vals.tambah);
                if (vals.kurang !== undefined) await saveMutationOverride(cat, 'kurang', vals.kurang);
            }
            console.log(`✅ Migrasi ${Object.keys(mutOv).length} mutation overrides selesai`);
        }

        console.log('🎉 Migrasi data stok opname selesai!');
    } catch (e) {
        console.warn('Migrasi localStorage → Supabase gagal (tabel mungkin belum dibuat):', e);
    }
};

// --- Sub Kegiatan DB Functions ---

const SK_DB_LOCAL_KEY = 'rkas_sub_kegiatan_db_v1';

export interface SubKegiatanDB {
    id: string;
    kode: string;
    nama: string;
    createdAt?: string;
}

export const getSubKegiatanDB = async (): Promise<SubKegiatanDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase
                .from('sub_kegiatan_db')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                const mapped: SubKegiatanDB[] = data.map((d: any) => ({
                    id: d.id,
                    kode: d.kode,
                    nama: d.nama,
                    createdAt: d.created_at
                }));
                // Cache ke localStorage untuk offline fallback
                localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching sub kegiatan db:', e);
        }
    }
    const local = localStorage.getItem(SK_DB_LOCAL_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveSubKegiatanItem = async (item: SubKegiatanDB): Promise<SubKegiatanDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return null;

        const payload = {
            id: item.id,
            user_id: userId,
            kode: item.kode,
            nama: item.nama
        };

        const { data, error } = await supabase
            .from('sub_kegiatan_db')
            .upsert([payload], { onConflict: 'id' })
            .select();

        if (error) {
            console.error('Error saving sub kegiatan item:', error);
            // Fallback tetap simpan ke localStorage
        } else if (data) {
            // Sinkron localStorage
            const current = await getSubKegiatanDB();
            const updated = current.map(s => s.id === item.id ? item : s);
            if (!updated.find(s => s.id === item.id)) updated.push(item);
            localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(updated));
            return data[0] as SubKegiatanDB;
        }
    }
    // localStorage fallback
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    const updated = current.map(s => s.id === item.id ? item : s);
    if (!updated.find(s => s.id === item.id)) updated.push(item);
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(updated));
    return item;
};

export const deleteSubKegiatanItem = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const { error } = await supabase
            .from('sub_kegiatan_db')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting sub kegiatan item:', error);
            return false;
        }
    }
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(current.filter(s => s.id !== id)));
    return true;
};

export const updateSubKegiatanItem = async (id: string, kode: string, nama: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const { error } = await supabase
            .from('sub_kegiatan_db')
            .update({ kode, nama })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating sub kegiatan item:', error);
            return false;
        }
    }
    const current = JSON.parse(localStorage.getItem(SK_DB_LOCAL_KEY) || '[]') as SubKegiatanDB[];
    localStorage.setItem(SK_DB_LOCAL_KEY, JSON.stringify(current.map(s => s.id === id ? { ...s, kode, nama } : s)));
    return true;
};

// --- Letter Agreements (Pembuat Surat MOU/SPK) ---

const LETTER_AGREEMENTS_KEY = 'rkas_letter_agreements_v1';

export const getLetterAgreements = async (): Promise<LetterAgreement[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase
                .from('letter_agreements')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Cache untuk offline
                localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(data));
                return data as LetterAgreement[];
            }
        } catch (e) {
            console.warn('letter_agreements fetch error:', e);
        }
    }
    const local = localStorage.getItem(LETTER_AGREEMENTS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveLetterAgreement = async (
    data: Omit<LetterAgreement, 'id' | 'created_at' | 'user_id'>
): Promise<LetterAgreement | null> => {
    const newItem: LetterAgreement = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
    };

    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = { ...newItem, user_id: userId };

        const { data: inserted, error } = await supabase
            .from('letter_agreements')
            .insert([payload])
            .select();

        if (error) {
            console.error('Error saving letter agreement:', error);
            alert(`Gagal menyimpan surat: ${error.message}`);
            return null;
        }

        if (inserted && inserted[0]) {
            // Sync local
            const current = await getLetterAgreements();
            localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify([inserted[0], ...current.filter(l => l.id !== inserted[0].id)]));
            return inserted[0] as LetterAgreement;
        }
    }

    // Offline fallback
    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    const updated = [newItem, ...current];
    localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(updated));
    return newItem;
};

export const updateLetterAgreement = async (
    id: string,
    updates: Partial<LetterAgreement>
): Promise<boolean> => {
    if (supabase) {
        const { error } = await supabase
            .from('letter_agreements')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating letter agreement:', error);
            return false;
        }
    }

    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    localStorage.setItem(
        LETTER_AGREEMENTS_KEY,
        JSON.stringify(current.map(l => l.id === id ? { ...l, ...updates } : l))
    );
    return true;
};

export const deleteLetterAgreement = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const { error } = await supabase
            .from('letter_agreements')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting letter agreement:', error);
            return false;
        }
    }

    const current = JSON.parse(localStorage.getItem(LETTER_AGREEMENTS_KEY) || '[]') as LetterAgreement[];
    localStorage.setItem(LETTER_AGREEMENTS_KEY, JSON.stringify(current.filter(l => l.id !== id)));
    return true;
};
