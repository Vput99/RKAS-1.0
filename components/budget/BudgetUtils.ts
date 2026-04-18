import { MonthEntry } from './BudgetTypes';

export const mkEntry = (month: number): MonthEntry => ({
    id: Math.random().toString(36).slice(2),
    month,
    quantity: 1,
    unit: '',
});

export const formatRupiah = (num: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(num);

export const getMonthCount = (allExpenses: any[], monthNum: number) =>
    allExpenses.filter((d) => d.realization_months?.includes(monthNum)).length;
