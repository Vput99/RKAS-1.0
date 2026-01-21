import { supabase } from './supabase';
import { Budget, TransactionType, SNPStandard, BOSPComponent, SchoolProfile, BankStatement } from '../types';

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
];

const LOCAL_KEY = 'rkas_local_data_v7';
const SCHOOL_PROFILE_KEY = 'rkas_school_profile_v1';
const BANK_STATEMENT_KEY = 'rkas_bank_statements_v1';

const DEFAULT_PROFILE: SchoolProfile = {
  name: 'SD Negeri 1 Contoh',
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
    const { data, error } = await supabase.from('budgets').select('*').order('date', { ascending: false });
    if (error) {
        console.error("Error fetching budgets:", error);
        // Do not fallback to local if supabase is configured but errors (to avoid split brain)
        return []; 
    }
    if (data) return data as Budget[];
  }
  
  // Only use local storage if Supabase is NOT configured (Offline Mode)
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) return JSON.parse(local);
  
  localStorage.setItem(LOCAL_KEY, JSON.stringify(MOCK_DATA));
  return MOCK_DATA;
};

export const addBudget = async (item: Omit<Budget, 'id' | 'created_at'>): Promise<Budget | null> => {
  // Generate ID locally first for Optimistic UI support if needed
  const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  
  if (supabase) {
    // Sanitize payload: ensure realizations is array, undefined fields handled
    const dbPayload = {
        ...item,
        // Ensure strictly typed fields for Postgres
        realizations: item.realizations || [], 
        realization_months: item.realization_months || [],
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
    };

    const { data, error } = await supabase.from('budgets').insert([dbPayload]).select();
    
    if (error) {
        console.error("Supabase insert error:", error);
        alert(`Gagal menyimpan data ke Cloud: ${error.message}\n\nPastikan Anda sudah menjalankan script SQL di Database.`);
        return null; // Return null to indicate failure
    }
    
    return data ? data[0] as Budget : null;
  }

  // Local Storage Logic (Only runs if supabase is null)
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
        alert(`Gagal menghapus data: ${error.message}`);
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
      const { data, error } = await supabase.from('school_profiles').select('*').single();
      if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found" which is fine initially
          console.error("Profile fetch error:", error);
      }
      
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
          budgetCeiling: data.budget_ceiling
        };
      }
    } catch (error) {
      console.warn("Supabase profile fetch error.", error);
    }
  }
  
  const local = localStorage.getItem(SCHOOL_PROFILE_KEY);
  if (local) return JSON.parse(local);
  
  localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
  return DEFAULT_PROFILE;
};

export const saveSchoolProfile = async (profile: SchoolProfile): Promise<SchoolProfile> => {
  if (supabase) {
    const dbPayload = {
      id: 1, // Singleton Row
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
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase.from('school_profiles').upsert(dbPayload);
    if (error) {
        console.error("Supabase profile save error:", error);
        alert(`Gagal menyimpan profil: ${error.message}`);
    }
  }

  // Save to local storage as backup/cache
  localStorage.setItem(SCHOOL_PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

// --- Bank Statement Functions ---

export const uploadBankStatementFile = async (file: File): Promise<{ url: string | null, path: string | null }> => {
    if (!supabase) return { url: null, path: null };

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from('rkas_storage') // Nama bucket yang kita buat
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload error:', uploadError);
            alert(`Gagal Upload File ke Storage: ${uploadError.message}\nPastikan Bucket 'rkas_storage' sudah dibuat dan Public.`);
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
      const { data, error } = await supabase.from('bank_statements').select('*').order('month', { ascending: true });
      if (error) {
          console.error("Failed to fetch bank statements:", error);
      }
      if (!error && data) return data as BankStatement[];
    } catch (e) {
      console.warn("Bank statement table fetch error, falling back to local.");
    }
  }

  const local = localStorage.getItem(BANK_STATEMENT_KEY);
  return local ? JSON.parse(local) : [];
};

export const saveBankStatement = async (statement: BankStatement): Promise<BankStatement> => {
  const current = await getBankStatements();
  
  // Remove existing entry for same month/year if exists (Local update)
  const filtered = current.filter(s => !(s.month === statement.month && s.year === statement.year));
  const updated = [...filtered, statement].sort((a,b) => a.month - b.month);
  
  if (supabase) {
     const { error } = await supabase.from('bank_statements').upsert(statement);
     if (error) {
         console.error("Supabase bank_statements upsert error:", error);
         alert(`Gagal menyimpan Rekening Koran ke Database.\n\nPesan Error: ${error.message}\n\nKemungkinan kolom 'file_url' belum ada di tabel. Silakan jalankan Script SQL Update.`);
         throw error; // Stop process so UI doesn't reset falsely
     }
  }

  // Backup to local
  localStorage.setItem(BANK_STATEMENT_KEY, JSON.stringify(updated));
  return statement;
};

export const deleteBankStatement = async (id: string): Promise<void> => {
    const current = await getBankStatements();
    // Get file path to delete from storage if needed
    const itemToDelete = current.find(s => s.id === id);

    if (supabase && itemToDelete && itemToDelete.file_path) {
        try {
            await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]);
            await supabase.from('bank_statements').delete().eq('id', id);
        } catch (e) { console.error("Error deleting from storage/db", e)}
    } else if (supabase) {
        try { await supabase.from('bank_statements').delete().eq('id', id); } catch(e){}
    }

    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(BANK_STATEMENT_KEY, JSON.stringify(updated));
};