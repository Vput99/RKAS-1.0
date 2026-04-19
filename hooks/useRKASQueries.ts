import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as db from '../lib/db';
import { Budget } from '../types';

// --- BUDGET HOOKS ---
export const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: db.getBudgets,
  });
};

export const useAddBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.addBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Budget> }) => 
      db.updateBudget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// --- PROFILE HOOKS ---
export const useSchoolProfile = () => {
  return useQuery({
    queryKey: ['schoolProfile'],
    queryFn: db.getSchoolProfile,
  });
};

export const useSaveSchoolProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.saveSchoolProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolProfile'] });
    },
  });
};

// --- BANK HOOKS ---
export const useBankStatements = () => {
  return useQuery({
    queryKey: ['bankStatements'],
    queryFn: db.getBankStatements,
  });
};

// --- RAPOR HOOKS ---
export const useRaporData = (year: string) => {
  return useQuery({
    queryKey: ['raporData', year],
    queryFn: () => db.getRaporData(year),
    enabled: !!year,
  });
};

// --- INVENTORY HOOKS ---
export const useInventoryItems = () => {
  return useQuery({
    queryKey: ['inventoryItems'],
    queryFn: db.getInventoryItems,
  });
};

export const useWithdrawalHistory = () => {
  return useQuery({
    queryKey: ['withdrawalHistory'],
    queryFn: db.getWithdrawalHistory,
  });
};
