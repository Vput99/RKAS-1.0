import { supabase } from '../supabase';
import { getCurrentUserId } from './auth';
import { db } from './dexie';

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
    const userId = await getCurrentUserId();
    if (!userId) return [];

    // Instant local load
    const local = await db.inventoryItems.where('user_id').equals(userId).toArray();
    
    if (supabase) {
        try {
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
                // Sync in background
                await db.inventoryItems.where('user_id').equals(userId).delete();
                await db.inventoryItems.bulkAdd(mapped.map(m => ({ ...m, user_id: userId })));
                return mapped;
            }
        } catch (e) { console.warn('Supabase inventory fetch failed.'); }
    }

    return local;
};

export const saveInventoryItem = async (item: InventoryItemDB): Promise<InventoryItemDB | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    // Save local instantly
    await db.inventoryItems.put({ ...item, user_id: userId });

    if (supabase) {
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
        await supabase.from('inventory_items').upsert([payload], { onConflict: 'id' });
    }
    
    return item;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    // Delete local instantly
    await db.inventoryItems.delete(id);

    if (supabase) {
        const { error } = await supabase.from('inventory_items').delete().eq('id', id).eq('user_id', userId);
        return !error;
    }
    return true;
};

export const getWithdrawalTransactions = async (): Promise<WithdrawalTransactionDB[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const local = await db.inventoryWithdrawals.where('user_id').equals(userId).toArray();
    
    if (supabase) {
        try {
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
                await db.inventoryWithdrawals.where('user_id').equals(userId).delete();
                await db.inventoryWithdrawals.bulkAdd(mapped.map(m => ({ ...m, user_id: userId })));
                return mapped;
            }
        } catch (e) { console.warn('Supabase withdrawals fetch failed.'); }
    }

    return local;
};

export const saveWithdrawalTransaction = async (tx: WithdrawalTransactionDB): Promise<WithdrawalTransactionDB | null> => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    await db.inventoryWithdrawals.put({ ...tx, user_id: userId });

    if (supabase) {
        const payload = {
            id: tx.id,
            user_id: userId,
            inventory_item_id: tx.inventory_item_id,
            date: tx.date,
            doc_number: tx.doc_number,
            quantity: tx.quantity,
            notes: tx.notes
        };
        await supabase.from('inventory_withdrawals').upsert([payload], { onConflict: 'id' });
    }

    return tx;
};

export const deleteWithdrawalTransaction = async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    await db.inventoryWithdrawals.delete(id);

    if (supabase) {
        const { error } = await supabase.from('inventory_withdrawals').delete().eq('id', id).eq('user_id', userId);
        return !error;
    }
    return true;
};

export const getInventoryOverrides = async (): Promise<Record<string, { usedQuantity?: number; lastYearBalance?: number }>> => {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const localData = await db.inventoryOverrides.where('user_id').equals(userId).toArray();
    const localMap: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = {};
    localData.forEach((d: any) => {
        localMap[d.item_id] = { usedQuantity: d.usedQuantity, lastYearBalance: d.lastYearBalance };
    });

    if (supabase) {
        try {
            const { data, error } = await supabase.from('inventory_overrides').select('*').eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { usedQuantity?: number; lastYearBalance?: number }> = {};
                data.forEach((d: any) => {
                    map[d.item_id] = {
                        usedQuantity: d.used_quantity != null ? Number(d.used_quantity) : undefined,
                        lastYearBalance: d.last_year_balance != null ? Number(d.last_year_balance) : undefined
                    };
                });
                await db.inventoryOverrides.where('user_id').equals(userId).delete();
                await db.inventoryOverrides.bulkAdd(Object.entries(map).map(([itemId, vals]) => ({ ...vals, user_id: userId, item_id: itemId })));
                return map;
            }
        } catch (e) { console.warn('Supabase overrides fetch failed.'); }
    }

    return localMap;
};

export const saveInventoryOverride = async (itemId: string, field: 'usedQuantity' | 'lastYearBalance', value: number): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const current = await getInventoryOverrides();
    const existing = current[itemId] || {};
    const updatedVals = { ...existing, [field]: value };

    await db.inventoryOverrides.put({ ...updatedVals, user_id: userId, item_id: itemId });

    if (supabase) {
        const payload = {
            user_id: userId,
            item_id: itemId,
            used_quantity: field === 'usedQuantity' ? value : (existing.usedQuantity ?? null),
            last_year_balance: field === 'lastYearBalance' ? value : (existing.lastYearBalance ?? null),
            updated_at: new Date().toISOString()
        };
        await supabase.from('inventory_overrides').upsert(payload, { onConflict: 'user_id,item_id' });
    }

    return true;
};

export const getMutationOverrides = async (): Promise<Record<string, { awal?: number; tambah?: number; kurang?: number }>> => {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const localData = await db.inventoryMutationOverrides.where('user_id').equals(userId).toArray();
    const localMap: Record<string, { awal?: number; tambah?: number; kurang?: number }> = {};
    localData.forEach((d: any) => {
        localMap[d.category] = { awal: d.awal, tambah: d.tambah, kurang: d.kurang };
    });

    if (supabase) {
        try {
            const { data, error } = await supabase.from('inventory_mutation_overrides').select('*').eq('user_id', userId);

            if (!error && data) {
                const map: Record<string, { awal?: number; tambah?: number; kurang?: number }> = {};
                data.forEach((d: any) => {
                    map[d.category] = {
                        awal: d.awal != null ? Number(d.awal) : undefined,
                        tambah: d.tambah != null ? Number(d.tambah) : undefined,
                        kurang: d.kurang != null ? Number(d.kurang) : undefined
                    };
                });
                await db.inventoryMutationOverrides.where('user_id').equals(userId).delete();
                await db.inventoryMutationOverrides.bulkAdd(Object.entries(map).map(([cat, vals]) => ({ ...vals, user_id: userId, category: cat })));
                return map;
            }
        } catch (e) { console.warn('Supabase mutation overrides fetch failed.'); }
    }

    return localMap;
};

export const saveMutationOverride = async (category: string, field: 'awal' | 'tambah' | 'kurang', value: number): Promise<boolean> => {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const current = await getMutationOverrides();
    const existing = current[category] || {};
    const updatedVals = { ...existing, [field]: value };

    await db.inventoryMutationOverrides.put({ ...updatedVals, user_id: userId, category: category });

    if (supabase) {
        const payload = {
            user_id: userId,
            category: category,
            awal: field === 'awal' ? value : (existing.awal ?? 0),
            tambah: field === 'tambah' ? value : (existing.tambah ?? 0),
            kurang: field === 'kurang' ? value : (existing.kurang ?? 0),
            updated_at: new Date().toISOString()
        };
        await supabase.from('inventory_mutation_overrides').upsert(payload, { onConflict: 'user_id,category' });
    }

    return true;
};

export const migrateLocalStorageToSupabase = async (): Promise<void> => {};
