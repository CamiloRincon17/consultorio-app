// ─── Finance Domain Types ────────────────────────────────────────────────────

export type TransactionSyncStatus = 'synced' | 'pending' | 'deleting' | 'error';

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  description: string;
  patientId?: string;
  patientName?: string; // Para anónimos o snapshot del nombre
  procedure?: string;
  visitId?: string; // Enlace a la visita asociada
  /** Categoría para agrupar visualmente (ej. 'arriendo_consultorio') */
  category?: string;
  /** Estado de sincronización con Supabase. 'pending' = aún no subido. */
  _syncStatus?: TransactionSyncStatus;
}
