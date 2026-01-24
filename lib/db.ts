
import { supabase } from './supabase';
import { Budget, TransactionType, SNPStandard, BOSPComponent, SchoolProfile, BankStatement, RaporIndicator, WithdrawalHistory, AccountCodes } from '../types';

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
      const { data, error } = await supabase.from('school_profiles').select('*').single();
      
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
    const userId = await getCurrentUserId();
    if (!userId) {
        alert("Anda harus login untuk menyimpan profil.");
        return profile;
    }

    const dbPayload = {
      user_id: userId,
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
    
    const { error } = await supabase.from('school_profiles').upsert(dbPayload, { onConflict: 'user_id' });
    if (error) {
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
      const { data, error } = await supabase
          .from('rapor_pendidikan')
          .select('*')
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

    // CRITICAL FIX: onConflict harus sesuai dengan UNIQUE INDEX di database
    // Index yang benar adalah (user_id, year, indicator_id)
    const { error } = await supabase
        .from('rapor_pendidikan')
        .upsert(upsertData, { onConflict: 'user_id,year,indicator_id' });

    if (error) {
        console.error("Error saving rapor:", error);
        
        // Deteksi error specific constraint conflict
        if (error.message.includes("rapor_pendidikan_year_indicator_id_key") || error.code === '23505') {
            alert(
                "⚠️ ERROR DUPLIKASI DATA DATABASE\n\n" +
                "Database Anda masih menggunakan aturan validasi lama.\n" +
                "Mohon jalankan script 'FIX_CONSTRAINT.sql' di SQL Editor Supabase untuk memperbaikinya."
            );
        } else {
            alert("Gagal menyimpan data rapor: " + error.message);
        }
        return false;
    }
    return true;
};


// --- Bank Statement Functions ---

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
      const { data, error } = await supabase.from('bank_statements').select('*').order('month', { ascending: true });
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
     const { error } = await supabase.from('bank_statements').upsert({
         ...statement,
         user_id: userId
     });
     if (error) throw error;
  }

  const current = await getBankStatements();
  const filtered = current.filter(s => !(s.month === statement.month && s.year === statement.year));
  const updated = [...filtered, statement].sort((a,b) => a.month - b.month);
  localStorage.setItem(BANK_STATEMENT_KEY, JSON.stringify(updated));
  
  return statement;
};

export const deleteBankStatement = async (id: string): Promise<void> => {
    const current = await getBankStatements();
    const itemToDelete = current.find(s => s.id === id);

    if (supabase && itemToDelete) {
        if (itemToDelete.file_path) {
            try { await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]); } catch(e){}
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
            const { data, error } = await supabase.from('withdrawal_history').select('*').order('created_at', { ascending: false });
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

export const deleteWithdrawalHistory = async (id: string): Promise<boolean> => {
    const current = await getWithdrawalHistory();
    const itemToDelete = current.find(h => h.id === id);

    if (supabase) {
        if (itemToDelete && itemToDelete.file_path) {
            try { await supabase.storage.from('rkas_storage').remove([itemToDelete.file_path]); } catch(e) {}
        }
        const { error } = await supabase.from('withdrawal_history').delete().eq('id', id);
        if (error) return false;
        return true;
    }

    const updated = current.filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return true;
};

// --- Custom Account Codes Functions ---

export const getStoredAccounts = async (): Promise<Record<string, string>> => {
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('account_codes')
                .select('*')
                .or(`user_id.is.null,user_id.eq.${await getCurrentUserId()}`)
                .order('code', { ascending: true });

            if (data && !error) {
                const dbMap: Record<string, string> = {};
                data.forEach((item: any) => {
                    dbMap[item.code] = item.name;
                });
                return { ...AccountCodes, ...dbMap };
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
        const { error } = await supabase.from('account_codes').upsert({ code, name, user_id: userId });
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
        const { error } = await supabase.from('account_codes').delete().eq('code', code);
        if (error) console.error("Error deleting account from DB", error);
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
        for (let i = 0; i < rows.length; i += 100) {
            const chunk = rows.slice(i, i + 100);
            const { error } = await supabase.from('account_codes').upsert(chunk);
            if (error) console.error("Error bulk upserting accounts", error);
        }
    }

    const current = (localStorage.getItem(CUSTOM_ACCOUNTS_KEY) ? JSON.parse(localStorage.getItem(CUSTOM_ACCOUNTS_KEY)!) : {});
    const updated = { ...current, ...accounts };
    localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(updated));
    
    return await getStoredAccounts();
}
