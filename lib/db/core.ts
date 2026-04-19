import { supabase } from '../supabase';
import { Budget, TransactionType, SchoolProfile } from '../../types';

// Mock data for Offline Mode
export const MOCK_DATA: Budget[] = [
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

export const LOCAL_KEY = 'rkas_local_data_v7';
export const SCHOOL_PROFILE_KEY = 'rkas_school_profile_v1';
export const BANK_STATEMENT_KEY = 'rkas_bank_statements_v1';
export const HISTORY_KEY = 'rkas_withdrawal_history_v1';
export const CUSTOM_ACCOUNTS_KEY = 'rkas_custom_accounts_v1';
export const INVENTORY_ITEMS_KEY = 'rkas_manual_inventory_v1';
export const INVENTORY_WITHDRAWALS_KEY = 'rkas_withdrawal_transactions_v1';
export const INVENTORY_OVERRIDES_KEY = 'rkas_inventory_overrides_v1';
export const MUTATION_OVERRIDES_KEY = 'rkas_mutation_overrides_v1';

export const DEFAULT_PROFILE: SchoolProfile = {
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
export const getCurrentUserId = async () => {
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
