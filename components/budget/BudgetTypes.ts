import { Budget, SchoolProfile, SNPStandard, BOSPComponent } from '../../types';

export type { SchoolProfile };
export { SNPStandard, BOSPComponent };

export interface BudgetPlanningProps {
    data: Budget[];
    profile: SchoolProfile | null;
    onAdd: (item: Omit<Budget, 'id' | 'created_at'>) => void;
    onUpdate: (id: string, updates: Partial<Budget>) => void;
    onDelete: (id: string) => void;
}

export type MonthEntry = {
    id: string;
    month: number;
    quantity: number;
    unit: string;
};

export const MONTHS_FULL = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const CURRENT_YEAR = new Date().getFullYear();
export const BOSP_PER_SISWA = 900_000;
