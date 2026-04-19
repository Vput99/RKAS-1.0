import { supabase } from '../supabase';
import { Budget, TransactionType, SchoolProfile } from '../../types';
import { db } from './dexie';

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

// Security: Clear all local data on logout
export const clearLocalData = async () => {
    // Clear legacy localStorage
    localStorage.clear();
    
    // Clear IndexedDB tables
    try {
        // Use a more generic way to clear all tables to avoid type issues during circular dependency resolution
        if (db && db.tables) {
            await Promise.all(db.tables.map(table => table.clear()));
        }
    } catch (e) {
        console.error("Failed to clear IndexedDB", e);
    }
};

export const checkDatabaseConnection = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { error } = await supabase.from('school_profiles').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        return false;
    }
};
