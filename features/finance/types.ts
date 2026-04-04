// ─── Finance Domain Types ────────────────────────────────────────────────────

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
}
