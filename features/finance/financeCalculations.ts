import type { Transaction } from './types';

// ─── Lógica de resumen financiero (pura, sin React) ─────────────────────────

/**
 * Calcula ingresos, gastos y balance total sobre todas las transacciones.
 */
export function computeFinancialSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.type === 'INCOME' && t._syncStatus !== 'deleting')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === 'EXPENSE' && t._syncStatus !== 'deleting')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return { income, expenses, balance: income - expenses };
}

/**
 * Calcula ingresos del mes actual e ingresos de la semana actual.
 */
export function computeDashboardStats(transactions: Transaction[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Inicio de semana (lunes)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const monthlyIncome = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return (
        t.type === 'INCOME' &&
        t._syncStatus !== 'deleting' &&
        tDate.getMonth() === currentMonth &&
        tDate.getFullYear() === currentYear
      );
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const weeklyIncome = transactions
    .filter((t) => {
      const tDate = new Date(t.date);
      return t.type === 'INCOME' && t._syncStatus !== 'deleting' && tDate >= startOfWeek;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  return { monthlyIncome, weeklyIncome };
}
