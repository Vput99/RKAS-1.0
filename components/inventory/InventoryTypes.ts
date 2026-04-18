import { Budget } from '../../types';

export interface SubKegiatanEntry {
  id: string;
  kode: string;
  nama: string;
  createdAt?: string;
}

export interface WithdrawalTransaction {
  id: string;
  inventoryItemId: string;
  date: string;
  docNumber: string;
  quantity: number;
  notes?: string;
}

export interface InventoryReportsProps {
  budgets: Budget[];
  schoolProfile: any;
}
