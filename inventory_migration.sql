-- =========================================================
-- INVENTORY TABLES MIGRATION (VERSI PERBAIKAN LENGKAP)
-- Jalankan di: Supabase Dashboard > SQL Editor > Run
-- Aman dijalankan berulang kali (IF NOT EXISTS / IF EXISTS)
-- =========================================================

-- Hapus tabel lama jika ada (untuk rekreasi dengan skema yang benar)
-- Urutan penting: hapus tabel yang punya FK terlebih dahulu
DROP TABLE IF EXISTS public.inventory_withdrawals CASCADE;
DROP TABLE IF EXISTS public.inventory_overrides CASCADE;
DROP TABLE IF EXISTS public.inventory_mutation_overrides CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;

-- =========================================================
-- 1. Tabel Inventory Items (Pengadaan Manual)
--    CATATAN: id bertipe TEXT (bukan UUID) karena kode menggunakan
--    format "manual-{timestamp}" untuk membedakan item manual vs AI
-- =========================================================
CREATE TABLE public.inventory_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    spec TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    price NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    sub_activity_code TEXT,
    sub_activity_name TEXT,
    account_code TEXT,
    date DATE,
    contract_type TEXT,
    vendor TEXT,
    doc_number TEXT,
    category TEXT,
    codification TEXT,
    used_quantity NUMERIC DEFAULT 0,
    last_year_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query per user
CREATE INDEX idx_inventory_items_user ON public.inventory_items(user_id);

-- =========================================================
-- 2. Tabel Inventory Withdrawals (Pengeluaran Barang)
--    id juga TEXT untuk konsistensi dengan format "wd-{timestamp}"
-- =========================================================
CREATE TABLE public.inventory_withdrawals (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL,
    date DATE NOT NULL,
    doc_number TEXT,
    quantity NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_withdrawals_user ON public.inventory_withdrawals(user_id);
CREATE INDEX idx_inventory_withdrawals_item ON public.inventory_withdrawals(inventory_item_id);

-- =========================================================
-- 3. Tabel Inventory Overrides (Override Sisa Tahun Lalu & Terpakai)
-- =========================================================
CREATE TABLE public.inventory_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    used_quantity NUMERIC,
    last_year_balance NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

CREATE INDEX idx_inventory_overrides_user ON public.inventory_overrides(user_id);

-- =========================================================
-- 4. Tabel Mutation Overrides (Override Laporan Mutasi)
-- =========================================================
CREATE TABLE public.inventory_mutation_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    awal NUMERIC DEFAULT 0,
    tambah NUMERIC DEFAULT 0,
    kurang NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

CREATE INDEX idx_inventory_mutation_overrides_user ON public.inventory_mutation_overrides(user_id);

-- =========================================================
-- B. AKTIFKAN RLS (Row Level Security)
-- =========================================================
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_mutation_overrides ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- C. BUAT SECURITY POLICIES
-- =========================================================

-- Policies untuk inventory_items
DROP POLICY IF EXISTS "Users manage own inventory items" ON public.inventory_items;
CREATE POLICY "Users manage own inventory items" ON public.inventory_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies untuk inventory_withdrawals
DROP POLICY IF EXISTS "Users manage own inventory withdrawals" ON public.inventory_withdrawals;
CREATE POLICY "Users manage own inventory withdrawals" ON public.inventory_withdrawals
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies untuk inventory_overrides
DROP POLICY IF EXISTS "Users manage own inventory overrides" ON public.inventory_overrides;
CREATE POLICY "Users manage own inventory overrides" ON public.inventory_overrides
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies untuk inventory_mutation_overrides
DROP POLICY IF EXISTS "Users manage own mutation overrides" ON public.inventory_mutation_overrides;
CREATE POLICY "Users manage own mutation overrides" ON public.inventory_mutation_overrides
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- D. VERIFIKASI (opsional - lihat hasilnya di output)
-- =========================================================
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('inventory_items', 'inventory_withdrawals', 'inventory_overrides', 'inventory_mutation_overrides')
ORDER BY table_name, ordinal_position;
