-- Tabel Transaksi & Anggaran (Budgets)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  amount NUMERIC NOT NULL,
  realizations JSONB DEFAULT '[]'::jsonb,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  bosp_component TEXT,
  category TEXT,
  account_code TEXT,
  realization_months INTEGER[],
  status TEXT DEFAULT 'draft',
  is_bosp_eligible BOOLEAN DEFAULT true,
  warning_message TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tabel Profil Sekolah (Single Row)
CREATE TABLE IF NOT EXISTS school_profiles (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT,
  npsn TEXT,
  address TEXT,
  headmaster TEXT,
  headmaster_nip TEXT,
  treasurer TEXT,
  treasurer_nip TEXT,
  fiscal_year TEXT DEFAULT '2026',
  student_count NUMERIC DEFAULT 0,
  budget_ceiling NUMERIC DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT single_row_check CHECK (id = 1)
);

-- Kebijakan Akses (Row Level Security)
-- Catatan: Untuk demo ini kita buka akses public (Anon). 
-- Di production sebaiknya gunakan Authentication.

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON budgets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE school_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON school_profiles FOR ALL USING (true) WITH CHECK (true);
