import { supabase } from './client';
import type { Transaction } from '../../features/finance/types';

/** Obtiene el user_id del doctor actualmente logueado. */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('No hay sesión activa');
  return uid;
}

// ─── Mappers: DB (snake_case) ↔ App (camelCase) ───────────────────────────────

function dbToTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type as 'INCOME' | 'EXPENSE',
    amount: Number(row.amount),
    date: row.date,
    description: row.description,
    patientId: row.patient_id ?? undefined,
    patientName: row.patient_name ?? undefined,
    procedure: row.procedure ?? undefined,
    visitId: row.visit_id ?? undefined,
    category: row.category ?? undefined,
    photos: 'photos' in row && Array.isArray(row.photos) ? row.photos : undefined,
  };
}

function transactionToDb(t: Transaction, userId?: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: t.id,
    user_id: userId ?? undefined,
    type: t.type,
    amount: t.amount,
    date: t.date,
    description: t.description,
    patient_id: t.patientId ?? null,
    patient_name: t.patientName ?? null,
    procedure: t.procedure ?? null,
    visit_id: t.visitId ?? null,
    category: t.category ?? null,
  };

  if (t.photos && t.photos.length > 0) {
    row.photos = t.photos;
  }

  return row;
}

// ─── Transactions CRUD ────────────────────────────────────────────────────────

/** Carga todas las transacciones del doctor. */
export async function fetchAllTransactions(userId?: string): Promise<Transaction[]> {
  // Obtener userId si no se pasó explícitamente
  const uid = userId ?? (await getCurrentUserId());

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', uid)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToTransaction);
}

export async function insertTransaction(t: Transaction): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('transactions').upsert(transactionToDb(t, userId));
  if (error) throw error;
}

export async function updateTransactionDb(id: string, updates: Partial<Transaction>): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.type !== undefined)        dbUpdates.type = updates.type;
  if (updates.amount !== undefined)      dbUpdates.amount = updates.amount;
  if (updates.date !== undefined)        dbUpdates.date = updates.date;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.patientId !== undefined)   dbUpdates.patient_id = updates.patientId ?? null;
  if (updates.patientName !== undefined) dbUpdates.patient_name = updates.patientName ?? null;
  if (updates.procedure !== undefined)   dbUpdates.procedure = updates.procedure ?? null;
  if (updates.visitId !== undefined)     dbUpdates.visit_id = updates.visitId ?? null;
  if (updates.category !== undefined)    dbUpdates.category = updates.category ?? null;

  const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTransactionDb(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Inserta múltiples transacciones en lote (usado por la migración e importación de respaldos). */
export async function bulkInsertTransactions(transactions: Transaction[]): Promise<void> {
  if (transactions.length === 0) return;
  const userId = await getCurrentUserId();
  // Siempre sobrescribir user_id con el usuario actual para cumplir con RLS
  const rows = transactions.map((t) => ({ ...transactionToDb(t, userId), user_id: userId }));

  // Insertar en lotes de 50 para evitar límites de payload de Supabase
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('transactions').upsert(batch);
    if (error) throw error;
  }
}
