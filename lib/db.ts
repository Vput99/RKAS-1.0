import { supabase } from './supabase';
import { Budget, TransactionType, SNPStandard, BOSPComponent } from '../types';

// Mock data reflecting BOSP structure
const MOCK_DATA: Budget[] = [
  { 
    id: '1', 
    type: TransactionType.INCOME, 
    description: 'Dana BOSP Reguler Tahap 1', 
    amount: 150000000, 
    date: '2026-01-15', 
    bosp_component: 'Penerimaan',
    category: 'Dana Transfer', 
    status: 'approved' 
  },
  { 
    id: '2', 
    type: TransactionType.EXPENSE, 
    description: 'Pengadaan Buku Teks Utama Kurikulum Merdeka', 
    amount: 15000000, 
    date: '2026-02-10', 
    bosp_component: BOSPComponent.PERPUSTAKAAN,
    category: SNPStandard.SARPRAS, 
    status: 'approved',
    is_bosp_eligible: true
  },
  { 
    id: '3', 
    type: TransactionType.EXPENSE, 
    description: 'Pengecatan Ruang Kelas 1 dan 2', 
    amount: 5000000, 
    date: '2026-02-20', 
    bosp_component: BOSPComponent.SARPRAS,
    category: SNPStandard.SARPRAS, 
    status: 'draft',
    is_bosp_eligible: true
  },
  { 
    id: '4', 
    type: TransactionType.EXPENSE, 
    description: 'Honor Guru Ekstrakurikuler Pramuka', 
    amount: 3000000, 
    date: '2026-03-01', 
    bosp_component: BOSPComponent.PEMBELAJARAN,
    category: SNPStandard.PTK, 
    status: 'approved',
    is_bosp_eligible: true
  },
];

const LOCAL_KEY = 'rkas_local_data_v2';

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
