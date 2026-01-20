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
    realization_months: [1],
    status: 'approved' 
  },
  { 
    id: '2', 
    type: TransactionType.EXPENSE, 
    description: 'Pengadaan Buku Teks Utama Kurikulum Merdeka', 
    quantity: 300,
    unit: 'Eksemplar',
    unit_price: 50000,
    amount: 15000000, 
    // Realisasi sama dengan anggaran (Pas) - Single month
    realizations: [
      { month: 2, amount: 15000000, date: '2026-02-15', evidence_file: 'kuitansi_buku_001.pdf' }
    ],
    date: '2026-02-10', 
    bosp_component: BOSPComponent.PERPUSTAKAAN,
    category: SNPStandard.SARPRAS,
    account_code: '5.2.02.13.01.0001',
    realization_months: [2],
    status: 'approved',
    is_bosp_eligible: true
  },
  { 
    id: '3', 
    type: TransactionType.EXPENSE, 
    description: 'Pengecatan Ruang Kelas 1 dan 2', 
    quantity: 2,
    unit: 'Ruang',
    unit_price: 2500000,
    amount: 5000000, 
    // Realisasi lebih kecil (Ada SILPA)
    realizations: [
       { month: 2, amount: 4850000, date: '2026-02-25', evidence_file: 'nota_toko_cat.jpg' }
    ],
    date: '2026-02-20', 
    bosp_component: BOSPComponent.SARPRAS,
    category: SNPStandard.SARPRAS,
    account_code: '5.1.02.03.02.0111',
    realization_months: [2],
    status: 'draft',
    is_bosp_eligible: true
  },
  { 
    id: '4', 
    type: TransactionType.EXPENSE, 
    description: 'Honor Guru Ekstrakurikuler Pramuka', 
    quantity: 12,
    unit: 'Bulan',
    unit_price: 250000,
    amount: 3000000, 
    // Belum direalisasikan semua, baru bulan 1
    realizations: [
      { month: 1, amount: 250000, date: '2026-01-31', evidence_file: 'sk_honor_jan.pdf' }
    ],
    date: '2026-03-01', 
    bosp_component: BOSPComponent.PEMBELAJARAN,
    category: SNPStandard.PTK,
    account_code: '5.1.02.02.01.0013',
    realization_months: [1,2,3,4,5,6,7,8,9,10,11,12],
    status: 'approved',
    is_bosp_eligible: true
  },
];

const LOCAL_KEY = 'rkas_local_data_v7';

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

export const updateBudget = async (id: string, updates: Partial<Budget>): Promise<Budget | null> => {
  if (supabase) {
    const { data, error } = await supabase.from('budgets').update(updates).eq('id', id).select();
    if (!error && data) return data[0] as Budget;
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
    return !error;
  }
  
  const current = await getBudgets();
  const updated = current.filter(b => b.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  return true;
};
