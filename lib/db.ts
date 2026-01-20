import { supabase } from './supabase';
import { Budget, TransactionType, SNPStandard } from '../types';

// Mock data for initial load if Supabase is not connected
const MOCK_DATA: Budget[] = [
  { id: '1', type: TransactionType.INCOME, description: 'Dana BOS Tahap 1', amount: 150000000, date: '2024-01-15', category: 'Dana BOS', status: 'approved' },
  { id: '2', type: TransactionType.EXPENSE, description: 'Pembelian Buku Paket Tematik', amount: 15000000, date: '2024-02-10', category: SNPStandard.ISI, status: 'approved' },
  { id: '3', type: TransactionType.EXPENSE, description: 'Perbaikan Atap Perpustakaan', amount: 5000000, date: '2024-02-20', category: SNPStandard.SARPRAS, status: 'draft' },
  { id: '4', type: TransactionType.EXPENSE, description: 'Honor Guru Ekstrakurikuler', amount: 3000000, date: '2024-03-01', category: SNPStandard.PTK, status: 'approved' },
];

const LOCAL_KEY = 'rkas_local_data';

export const getBudgets = async (): Promise<Budget[]> => {
  if (supabase) {
    const { data, error } = await supabase.from('budgets').select('*').order('date', { ascending: false });
    if (!error && data) return data as Budget[];
  }
  
  // Fallback to local storage
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) return JSON.parse(local);
  
  // Initialize mock data if empty
  localStorage.setItem(LOCAL_KEY, JSON.stringify(MOCK_DATA));
  return MOCK_DATA;
};

export const addBudget = async (item: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> => {
  const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  
  if (supabase) {
    const { data, error } = await supabase.from('budgets').insert([item]).select();
    if (!error && data) return data[0] as Budget;
    console.error("Supabase insert error:", error);
    // If Supabase fails (e.g. RLS or network), we could fallback, but usually we just throw or return null.
    // For this hybrid demo, we will strictly use one source of truth based on `supabase` existence.
  }

  // Local Storage Fallback
  const current = await getBudgets();
  const updated = [newItem, ...current];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  return newItem as Budget;
};

export const deleteBudget = async (id: string): Promise<boolean> => {
  if (supabase) {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    return !error;
  }
  
  const current = await getBudgets();
  const updated = current.filter(b => b.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  return true;
};
