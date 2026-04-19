import Dexie, { Table } from 'dexie';
import { Budget, SchoolProfile, BankStatement, RaporIndicator, WithdrawalHistory, LetterAgreement } from '../../types';
import { InventoryItemDB, WithdrawalTransactionDB } from './inventory';
import { SubKegiatanDB } from './activities';

export class RKASPintarDB extends Dexie {
    // Entities
    budgets!: Table<Budget & { user_id?: string }>;
    schoolProfiles!: Table<SchoolProfile & { user_id?: string }>;
    bankStatements!: Table<BankStatement & { user_id?: string }>;
    raporPendidikan!: Table<RaporIndicator & { user_id: string; year: string }>; 
    withdrawalHistory!: Table<WithdrawalHistory & { user_id?: string }>;
    accountCodes!: Table<{ code: string; name: string; user_id: string | null }>;
    inventoryItems!: Table<InventoryItemDB & { user_id: string }>;
    inventoryWithdrawals!: Table<WithdrawalTransactionDB & { user_id: string }>;
    inventoryOverrides!: Table<any & { user_id: string; item_id: string }>;
    inventoryMutationOverrides!: Table<any & { user_id: string; category: string }>;
    subKegiatanDB!: Table<SubKegiatanDB & { user_id: string }>;
    letterAgreements!: Table<LetterAgreement & { user_id?: string }>;
    generalEvidence!: Table<any & { user_id?: string; path: string }>;

    constructor() {
        super('RKASPintarDB');
        this.version(1).stores({
            budgets: 'id, user_id, type, date',
            schoolProfiles: '++id, user_id, npsn',
            bankStatements: 'id, user_id, month, year',
            raporPendidikan: '++id, [user_id+year+indicator_id], user_id, year',
            withdrawalHistory: 'id, user_id, created_at',
            accountCodes: 'code, user_id',
            inventoryItems: 'id, user_id, account_code, category',
            inventoryWithdrawals: 'id, user_id, inventory_item_id, date',
            inventoryOverrides: '++id, [user_id+item_id], user_id, item_id',
            inventoryMutationOverrides: '++id, [user_id+category], user_id, category',
            subKegiatanDB: 'id, user_id, kode',
            letterAgreements: 'id, user_id, created_at',
            generalEvidence: 'path, user_id'
        });
    }
}

export const db = new RKASPintarDB();
