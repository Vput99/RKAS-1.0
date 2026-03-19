-- INVENTORY TABLES MIGRATION

-- 1. Inventory Items (Manual entries and general store for inventory tracking)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    used_quantity NUMERIC DEFAULT 0,
    last_year_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inventory Withdrawals (Transactions)
CREATE TABLE IF NOT EXISTS inventory_withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL, -- Can be UUID or string from AI result
    date DATE NOT NULL,
    doc_number TEXT,
    quantity NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Inventory Overrides (Local overrides for stock opname)
CREATE TABLE IF NOT EXISTS inventory_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL, -- Item ID being overridden
    used_quantity NUMERIC,
    last_year_balance NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- 4. Mutation Overrides (Manual adjustments for the mutation report)
CREATE TABLE IF NOT EXISTS inventory_mutation_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    awal NUMERIC DEFAULT 0,
    tambah NUMERIC DEFAULT 0,
    kurang NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_mutation_overrides ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_items
CREATE POLICY "Users can manage their own inventory items" ON inventory_items
    FOR ALL USING (auth.uid() = user_id);

-- Policies for inventory_withdrawals
CREATE POLICY "Users can manage their own inventory withdrawals" ON inventory_withdrawals
    FOR ALL USING (auth.uid() = user_id);

-- Policies for inventory_overrides
CREATE POLICY "Users can manage their own inventory overrides" ON inventory_overrides
    FOR ALL USING (auth.uid() = user_id);

-- Policies for inventory_mutation_overrides
CREATE POLICY "Users can manage their own inventory mutation overrides" ON inventory_mutation_overrides
    FOR ALL USING (auth.uid() = user_id);
