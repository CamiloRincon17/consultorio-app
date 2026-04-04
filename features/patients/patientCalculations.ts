import type { Patient, Transaction } from '../../shared/types';

// ─── Lógica de estadísticas de pacientes (pura, sin React) ──────────────────

/**
 * Calcula el total pagado y número de visitas de un paciente.
 */
export function computePatientStats(
  patientId: string,
  patients: Patient[],
  transactions: Transaction[]
): { totalPaid: number; visitCount: number } {
  const patient = patients.find((p) => p.id === patientId);

  const patientTransactions = transactions.filter(
    (t) => t.patientId === patientId && t.type === 'INCOME'
  );

  const totalPaid = patientTransactions.reduce(
    (acc, curr) => acc + curr.amount,
    0
  );

  const visitCount = patient?.visits?.length || 0;

  return { totalPaid, visitCount };
}

/**
 * Retorna las visitas de un paciente o un array vacío si no existe.
 */
export function getPatientVisits(patientId: string, patients: Patient[]) {
  const patient = patients.find((p) => p.id === patientId);
  return patient?.visits || [];
}
