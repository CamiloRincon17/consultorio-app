import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction } from "./types";
import { generateId } from "../../shared/utils/generateId";
import { computeFinancialSummary, computeDashboardStats } from "./financeCalculations";

interface FinanceState {
  transactions: Transaction[];
  isLoading: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  setLoading: (loading: boolean) => void;
  addTransaction: (transaction: Omit<Transaction, "id"> | Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getFinancialSummary: () => { income: number; expenses: number; balance: number };
  getDashboardStats: () => { monthlyIncome: number; weeklyIncome: number };
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: true,
  setTransactions: (transactions) => set({ transactions }),
  setLoading: (isLoading) => set({ isLoading }),

  addTransaction: (newTransaction) => {
    const transaction: Transaction = "id" in newTransaction ? newTransaction as Transaction : { ...newTransaction, id: generateId() };
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
  },

  updateTransaction: (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }));
  },

  deleteTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getFinancialSummary: () => computeFinancialSummary(get().transactions),
  getDashboardStats: () => computeDashboardStats(get().transactions)
}));

// Subscribe to persist to AsyncStorage
useFinanceStore.subscribe((state, prevState) => {
  if (state.transactions !== prevState.transactions && !state.isLoading) {
    AsyncStorage.setItem("STORAGE_KEY_TRANSACTIONS", JSON.stringify(state.transactions)).catch(e => console.error(e));
  }
});
