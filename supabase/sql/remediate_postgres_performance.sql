-- =========================================================
-- REMEDIASI PERFORMA & KEAMANAN POSTGRES (SUPABASE BEST PRACTICES)
-- =========================================================

-- 1. Tambahkan Indeks pada Foreign Keys & RLS Columns
-- Menghindari Sequential Scan pada pencarian data per user
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_rapor_pendidikan_user_id ON public.rapor_pendidikan(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_user_id ON public.withdrawal_history(user_id);

-- 2. Tambahkan Indeks Komposit untuk Filtring Umum
CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON public.bank_statements(year, month);
CREATE INDEX IF NOT EXISTS idx_budgets_type_status ON public.budgets(type, status);

-- 3. Optimasi Performance RLS (Wrap auth.uid() in SELECT)
-- Memungkinkan caching hasil auth.uid() satu kali per query, bukan per baris.

-- Budgets
DROP POLICY IF EXISTS "User Access Budgets" ON public.budgets;
CREATE POLICY "User Access Budgets" ON public.budgets 
    USING ((select auth.uid()) = user_id) 
    WITH CHECK ((select auth.uid()) = user_id);

-- Profiles
DROP POLICY IF EXISTS "User Access Profiles" ON public.school_profiles;
CREATE POLICY "User Access Profiles" ON public.school_profiles 
    USING ((select auth.uid()) = user_id) 
    WITH CHECK ((select auth.uid()) = user_id);

-- Bank Statements
DROP POLICY IF EXISTS "User Access Bank Statements" ON public.bank_statements;
CREATE POLICY "User Access Bank Statements" ON public.bank_statements 
    USING ((select auth.uid()) = user_id) 
    WITH CHECK ((select auth.uid()) = user_id);

-- Rapor
DROP POLICY IF EXISTS "User Access Rapor" ON public.rapor_pendidikan;
CREATE POLICY "User Access Rapor" ON public.rapor_pendidikan 
    USING ((select auth.uid()) = user_id) 
    WITH CHECK ((select auth.uid()) = user_id);

-- History
DROP POLICY IF EXISTS "User Access History" ON public.withdrawal_history;
CREATE POLICY "User Access History" ON public.withdrawal_history 
    USING ((select auth.uid()) = user_id) 
    WITH CHECK ((select auth.uid()) = user_id);

-- Account Codes
DROP POLICY IF EXISTS "User Access Accounts" ON public.account_codes;
CREATE POLICY "User Access Accounts" ON public.account_codes 
    USING (user_id = (select auth.uid()) OR user_id IS NULL) 
    WITH CHECK (user_id = (select auth.uid()));

-- 4. Perbaikan Tipe Data Rapor (Opsional tapi disarankan)
-- Ubah 'year' dari TEXT ke INTEGER untuk efisiensi sorting dan join
-- Catatan: Pastikan data yang ada valid sebelum menjalankan ini.
-- ALTER TABLE public.rapor_pendidikan ALTER COLUMN year TYPE INTEGER USING (year::integer);
