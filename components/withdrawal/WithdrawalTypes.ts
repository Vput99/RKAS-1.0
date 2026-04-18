import { Budget, TransferDetail } from '../../types';

export const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface WithdrawalHistorySnapshot {
    selectedIds: string[];
    recipientDetails: Record<string, TransferDetail>;
    groupedRecipients: any[];
    ksName: string;
    ksTitle: string;
    ksNip: string;
    trName: string;
    trTitle: string;
    trNip: string;
    startMonth: number;
    endMonth: number;
    isGroupingEnabled: boolean;
    bulkName: string;
    bulkAccount: string;
}

export interface BankWithdrawalProps {
    data: Budget[];
    profile: any;
    onUpdate: (id: string, updates: Partial<Budget>) => void;
}
