import { supabase } from '../supabase';
import { getCurrentUserId, INVENTORY_ITEMS_KEY, INVENTORY_WITHDRAWALS_KEY, INVENTORY_OVERRIDES_KEY, MUTATION_OVERRIDES_KEY } from './core';

export interface InventoryItemDB {
    id: string;
    name: string;
    spec: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
    sub_activity_code?: string;
    sub_activity_name?: string;
    account_code: string;
    date: string;
    contract_type?: string;
    vendor?: string;
    doc_number: string;
    category: string;
    codification?: string;
    used_quantity?: number;
    last_year_balance?: number;
}

export interface WithdrawalTransactionDB {
    id: string;
    inventory_item_id: string;
    date: string;
    doc_number: string;
    quantity: number;
    notes?: string;
}

export const getInventoryItems = async (): Promise<InventoryItemDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('inventory_items')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    spec: d.spec || '',
                    quantity: Number(d.quantity),
                    unit: d.unit || 'Unit',
                    price: Number(d.price),
                    total: Number(d.total),
                    sub_activity_code: d.sub_activity_code,
                    sub_activity_name: d.sub_activity_name,
                    account_code: d.account_code || '',
                    date: d.date || '',
                    contract_type: d.contract_type,
                    vendor: d.vendor || '',
                    doc_number: d.doc_number || '',
                    category: d.category || '',
                    codification: d.codification,
                    used_quantity: Number(d.used_quantity || 0),
                    last_year_balance: Number(d.last_year_balance || 0)
                }));
                localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching inventory items:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_ITEMS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveInventoryItem = async (item: InventoryItemDB): Promise<InventoryItemDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = {
            id: item.id,
            user_id: userId,
            name: item.name,
            spec: item.spec,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            total: item.total,
            sub_activity_code: item.sub_activity_code,
            sub_activity_name: item.sub_activity_name,
            account_code: item.account_code,
            date: item.date || null,
            contract_type: item.contract_type,
            vendor: item.vendor,
            doc_number: item.doc_number,
            category: item.category,
            codification: item.codification,
            used_quantity: item.used_quantity || 0,
            last_year_balance: item.last_year_balance || 0
        };

        const { data, error } = await supabase
            .from('inventory_items')
            .upsert([payload], { onConflict: 'id' })
            .select();
        if (error) {
            console.error('Error saving inventory item:', error);
            alert(`Gagal menyimpan inventaris: ${error.message}`);
            return null;
        }
        return data ? data[0] : null;
    }

    const current = await getInventoryItems();
    const updated = [item, ...current];
    localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(updated));
    return item;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;
        const { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('Error deleting inventory item:', error);
            return false;
        }
    }
    const current = await getInventoryItems();
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(updated));
    return true;
};

export const getWithdrawalTransactions = async (): Promise<WithdrawalTransactionDB[]> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return [];

            const { data, error } = await supabase.from('inventory_withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map((d: any) => ({
                    id: d.id,
                    inventory_item_id: d.inventory_item_id,
                    date: d.date,
                    doc_number: d.doc_number || '',
                    quantity: Number(d.quantity),
                    notes: d.notes || ''
                }));
                localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(mapped));
                return mapped;
            }
        } catch (e) {
            console.error('Error fetching withdrawals:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_WITHDRAWALS_KEY);
    return local ? JSON.parse(local) : [];
};

export const saveWithdrawalTransaction = async (tx: WithdrawalTransactionDB): Promise<WithdrawalTransactionDB | null> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        const payload = {
            id: tx.id,
            user_id: userId,
            inventory_item_id: tx.inventory_item_id,
            date: tx.date,
            doc_number: tx.doc_number,
            quantity: tx.quantity,
            notes: tx.notes
        };

        const { data, error } = await supabase
            .from('inventory_withdrawals')
            .upsert([payload], { onConflict: 'id' })
            .select();
        if (error) {
            console.error('Error saving withdrawal:', error);
            alert(`Gagal menyimpan pengeluaran: ${error.message}`);
            return null;
        }
        return data ? data[0] : null;
    }

    const current = await getWithdrawalTransactions();
    const updated = [...current, tx];
    localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(updated));
    return tx;
};

export const deleteWithdrawalTransaction = async (id: string): Promise<boolean> => {
    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;
        const { error } = await supabase.from('inventory_withdrawals').delete().eq('id', id).eq('user_id', userId);
        if (error) {
            console.error('Error deleting withdrawal:', error);
            return false;
        }
    }
    const current = await getWithdrawalTransactions();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(INVENTORY_WITHDRAWALS_KEY, JSON.stringify(updated));
    return true;
};

export const getInventoryOverrides = async (): Promise<Record<string, { usedQuantity?: number; lastYearBalance?: number }>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return {};

            const { data, error } = await supabase.from('inventory_overrides')
                .select('*')
                .eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = {};
                data.forEach((d: any) => {
                    map[d.item_id] = {
                        usedQuantity: d.used_quantity != null ? Number(d.used_quantity) : undefined,
                        lastYearBalance: d.last_year_balance != null ? Number(d.last_year_balance) : undefined
                    };
                });
                localStorage.setItem(INVENTORY_OVERRIDES_KEY, JSON.stringify(map));
                return map;
            }
        } catch (e) {
            console.error('Error fetching overrides:', e);
        }
    }
    const local = localStorage.getItem(INVENTORY_OVERRIDES_KEY);
    return local ? JSON.parse(local) : {};
};

export const saveInventoryOverride = async (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number): Promise<boolean> => {
    const current = await getInventoryOverrides();
    const updated = {
        ...current,
        [itemId]: {
            ...(current[itemId] || {}),
            [field]: value
        }
    };
    localStorage.setItem(INVENTORY_OVERRIDES_KEY, JSON.stringify(updated));

    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const existing = current[itemId] || {};
        const payload = {
            user_id: userId,
            item_id: itemId,
            used_quantity: field === 'usedQuantity' ? value : (existing.usedQuantity ?? null),
            last_year_balance: field === 'lastYearBalance' ? value : (existing.lastYearBalance ?? null),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('inventory_overrides')
            .upsert(payload, { onConflict: 'user_id,item_id' });

        if (error) {
            console.error('Error saving override:', error);
            await supabase.from('inventory_overrides').delete().eq('user_id', userId).eq('item_id', itemId);
            await supabase.from('inventory_overrides').insert([payload]);
        }
    }
    return true;
};

export const getMutationOverrides = async (): Promise<Record<string, { awal?: number; tambah?: number; kurang?: number }>> => {
    if (supabase) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return {};

            const { data, error } = await supabase.from('inventory_mutation_overrides')
                .select('*')
                .eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { awal?: number; tambah?: number; kurang?: number }> = {};
                data.forEach((d: any) => {
                    map[d.category] = {
                        awal: d.awal != null ? Number(d.awal) : undefined,
                        tambah: d.tambah != null ? Number(d.tambah) : undefined,
                        kurang: d.kurang != null ? Number(d.kurang) : undefined
                    };
                });
                localStorage.setItem(MUTATION_OVERRIDES_KEY, JSON.stringify(map));
                return map;
            }
        } catch (e) {
            console.error('Error fetching mutation overrides:', e);
        }
    }
    const local = localStorage.getItem(MUTATION_OVERRIDES_KEY);
    return local ? JSON.parse(local) : {};
};

export const saveMutationOverride = async (category: string, field: 'awal' | 'tambah' | 'kurang', value: number): Promise<boolean> => {
    const current = await getMutationOverrides();
    const updated = {
        ...current,
        [category]: {
            ...(current[category] || {}),
            [field]: value
        }
    };
    localStorage.setItem(MUTATION_OVERRIDES_KEY, JSON.stringify(updated));

    if (supabase) {
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const existing = current[category] || {};
        const payload = {
            user_id: userId,
            category: category,
            awal: field === 'awal' ? value : (existing.awal ?? 0),
            tambah: field === 'tambah' ? value : (existing.tambah ?? 0),
            kurang: field === 'kurang' ? value : (existing.kurang ?? 0),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('inventory_mutation_overrides')
            .upsert(payload, { onConflict: 'user_id,category' });

        if (error) {
            console.error('Error saving mutation override:', error);
            await supabase.from('inventory_mutation_overrides').delete().eq('user_id', userId).eq('category', category);
            await supabase.from('inventory_mutation_overrides').insert([payload]);
        }
    }
    return true;
};

export const migrateLocalStorageToSupabase = async (): Promise<void> => {
    if (!supabase) return;

    const userId = await getCurrentUserId();
    if (!userId) return;

    try {
        const { data: existingItems, error: checkError } = await supabase
            .from('inventory_items')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

        if (checkError) {
            console.warn('Inventory table mungkin belum dibuat.');
            return;
        }

        if (existingItems && existingItems.length > 0) return;

        const localItems = localStorage.getItem(INVENTORY_ITEMS_KEY);
        const localWithdrawals = localStorage.getItem(INVENTORY_WITHDRAWALS_KEY);
        const localOverrides = localStorage.getItem(INVENTORY_OVERRIDES_KEY);
        const localMutationOv = localStorage.getItem(MUTATION_OVERRIDES_KEY);

        if (!(localItems || localWithdrawals || localOverrides || localMutationOv)) return;

        console.log('Memulai migrasi data localStorage → Supabase...');

        if (localItems) {
            const items: InventoryItemDB[] = JSON.parse(localItems);
            for (const item of items) { await saveInventoryItem(item); }
        }

        if (localWithdrawals) {
            const txs: WithdrawalTransactionDB[] = JSON.parse(localWithdrawals);
            for (const tx of txs) { await saveWithdrawalTransaction(tx); }
        }

        if (localOverrides) {
            const overrides: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = JSON.parse(localOverrides);
            for (const [itemId, vals] of Object.entries(overrides)) {
                if (vals.usedQuantity !== undefined) await saveInventoryOverride(itemId, 'usedQuantity', vals.usedQuantity);
                if (vals.lastYearBalance !== undefined) await saveInventoryOverride(itemId, 'lastYearBalance', vals.lastYearBalance);
            }
        }

        if (localMutationOv) {
            const mutOv: Record<string, { awal?: number; tambah?: number; kurang?: number }> = JSON.parse(localMutationOv);
            for (const [cat, vals] of Object.entries(mutOv)) {
                if (vals.awal !== undefined) await saveMutationOverride(cat, 'awal', vals.awal);
                if (vals.tambah !== undefined) await saveMutationOverride(cat, 'tambah', vals.tambah);
                if (vals.kurang !== undefined) await saveMutationOverride(cat, 'kurang', vals.kurang);
            }
        }
        console.log('🎉 Migrasi data stok opname selesai!');
    } catch (e) {
        console.warn('Migrasi localStorage → Supabase gagal:', e);
    }
};
