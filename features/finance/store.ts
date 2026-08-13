import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction, TransactionSyncStatus } from "./types";
import { generateId } from "../../shared/utils/generateId";
import { computeFinancialSummary, computeDashboardStats } from "./financeCalculations";
import {
  insertTransaction,
  updateTransactionDb,
  deleteTransactionDb,
} from "../../services/supabase/financeService";
import { enqueueIfOffline } from "../../services/offlineQueue";

const TRANSACTIONS_CACHE_KEY = "TRANSACTIONS_LOCAL_CACHE";

interface FinanceState {
  transactions: Transaction[];
  isLoading: boolean;
  setTransactions: (transactions: Transaction[]) => void;
  /** Carga transacciones desde el caché local de AsyncStorage (instantáneo). */
  loadFromCache: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  addTransaction: (transaction: Omit<Transaction, "id"> | Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  /** Elimina definitivamente la transacción (hard-delete) tras confirmación. */
  removeTransaction: (id: string) => void;
  /** Marca una transacción como sincronizada con Supabase. */
  markTransactionSynced: (id: string) => void;
  getFinancialSummary: () => { income: number; expenses: number; balance: number };
  getDashboardStats: () => { monthlyIncome: number; weeklyIncome: number };
}

/** Guarda las transacciones en AsyncStorage para carga instantánea. */
async function saveToCache(transactions: Transaction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSACTIONS_CACHE_KEY, JSON.stringify(transactions));
  } catch {
    // Silencioso — el caché es best-effort
  }
}

/**
 * Helper: ejecuta una operación Supabase y, si falla por red, la encola.
 * Retorna true si se sincronizó exitosamente.
 */
async function persistWithRetry(
  fn: () => Promise<void>,
  method: string,
  args: any[],
): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (error) {
    const queued = await enqueueIfOffline(error, 'finance', method, args);
    if (!queued) {
      console.error(`❌ Supabase ${method}:`, error);
    }
    return false;
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: true,

  setTransactions: (transactions) => {
    const currentState = get();
    const cloudIds = new Set(transactions.map((t) => t.id));

    // Preservar transacciones locales que aún no se subieron a Supabase
    const pendingLocal = currentState.transactions.filter(
      (t) => t._syncStatus === 'pending' && !cloudIds.has(t.id)
    );

    // Mapear transacciones de la nube, preservando estado 'deleting' si existe localmente
    const synced = transactions.map((t) => {
      const local = currentState.transactions.find((lt) => lt.id === t.id);
      if (local && local._syncStatus === 'deleting') {
        return { ...t, _syncStatus: 'deleting' as TransactionSyncStatus };
      }
      return { ...t, _syncStatus: 'synced' as TransactionSyncStatus };
    });

    const merged = [...pendingLocal, ...synced];
    set({ transactions: merged });
    saveToCache(merged);
  },

  /** Carga transacciones desde AsyncStorage para arranque instantáneo. */
  loadFromCache: async () => {
    try {
      const raw = await AsyncStorage.getItem(TRANSACTIONS_CACHE_KEY);
      if (raw) {
        const cached: Transaction[] = JSON.parse(raw);
        if (cached.length > 0) {
          set({ transactions: cached, isLoading: false });
          return true;
        }
      }
    } catch {
      // Cache corrupto — ignorar
    }
    return false;
  },

  setLoading: (isLoading) => set({ isLoading }),

  addTransaction: (newTransaction) => {
    const transaction: Transaction = {
      ...("id" in newTransaction ? (newTransaction as Transaction) : { ...newTransaction, id: generateId() }),
      _syncStatus: 'pending' as TransactionSyncStatus,
    };

    // 1. Actualizar UI inmediatamente (optimistic update con estado 'pending')
    set((state) => ({ transactions: [transaction, ...state.transactions] }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => insertTransaction(transaction),
      'insertTransaction',
      [transaction],
    ).then((success) => {
      if (success) {
        useFinanceStore.getState().markTransactionSynced(transaction.id);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().transactions);
  },

  updateTransaction: (id, updates) => {
    // 1. Actualizar UI inmediatamente
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => updateTransactionDb(id, updates),
      'updateTransactionDb',
      [id, updates],
    );

    // 3. Guardar caché local
    saveToCache(get().transactions);
  },

  deleteTransaction: (id) => {
    // 1. Marcar como 'deleting' en UI inmediatamente (soft-delete)
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, _syncStatus: 'deleting' as TransactionSyncStatus } : t
      ),
    }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => deleteTransactionDb(id),
      'deleteTransactionDb',
      [id],
    ).then((success) => {
      if (success) {
        useFinanceStore.getState().removeTransaction(id);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().transactions);
  },

  removeTransaction: (id) => {
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
    saveToCache(get().transactions);
  },

  markTransactionSynced: (id: string) => {
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, _syncStatus: 'synced' as TransactionSyncStatus } : t
      ),
    }));
    saveToCache(get().transactions);
  },

  getFinancialSummary: () => computeFinancialSummary(get().transactions),
  getDashboardStats: () => computeDashboardStats(get().transactions),
}));
