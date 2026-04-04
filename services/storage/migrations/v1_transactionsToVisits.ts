import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Patient, Visit } from '../../../shared/types';
import type { Transaction } from '../../../shared/types';
import { generateId } from '../../../shared/utils/generateId';

// ─── Migración v1: Transacciones → Visitas ──────────────────────────────────
// Convierte transacciones INCOME antiguas (sin visitId) en registros de visita
// dentro del paciente correspondiente, y vincula la transacción a la nueva visita.
//
// Se ejecuta UNA SOLA VEZ gracias a la clave MIGRATION_TRANSACTIONS_TO_VISITS.
// Es segura re-correrla: si la clave está en "true", sale inmediatamente.

const MIGRATION_KEY = 'MIGRATION_TRANSACTIONS_TO_VISITS';

export interface MigrationResult {
  ran: boolean;          // true si la migración fue necesaria y se ejecutó
  migratedCount: number; // cuántas transacciones se migraron
  updatedPatients: Patient[];
  updatedTransactions: Transaction[];
}

export async function runMigrationV1(
  patients: Patient[],
  transactions: Transaction[]
): Promise<MigrationResult> {
  // Verificar si ya se corrió
  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done === 'true') {
    return {
      ran: false,
      migratedCount: 0,
      updatedPatients: patients,
      updatedTransactions: transactions,
    };
  }

  console.log('🔄 Iniciando migración v1: transacciones → visitas...');

  // Transacciones candidatas: INCOME con patientId pero sin visitId (registros viejos)
  const candidates = transactions.filter(
    (t) => t.type === 'INCOME' && t.patientId && !t.visitId
  );

  if (candidates.length === 0) {
    console.log('✅ No hay transacciones para migrar');
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    return {
      ran: true,
      migratedCount: 0,
      updatedPatients: patients,
      updatedTransactions: transactions,
    };
  }

  console.log(`📝 Migrando ${candidates.length} transacciones...`);

  const updatedPatients = [...patients];
  const updatedTransactions = [...transactions];

  candidates.forEach((transaction) => {
    const patientIndex = updatedPatients.findIndex(
      (p) => p.id === transaction.patientId
    );
    if (patientIndex === -1) return;

    const visitId = generateId();

    // Crear visita desde la transacción
    const visit: Visit = {
      id: visitId,
      date: transaction.date.split('T')[0], // Solo YYYY-MM-DD
      reason: transaction.procedure || 'Pago registrado',
      treatment: transaction.description,
      cost: transaction.amount,
      paid: true,
      notes: 'Migrado automáticamente desde transacción existente',
      transactionId: transaction.id,
    };

    // Agregar visita al paciente
    const currentVisits = updatedPatients[patientIndex].visits || [];
    updatedPatients[patientIndex] = {
      ...updatedPatients[patientIndex],
      visits: [visit, ...currentVisits],
    };

    // Vincular transacción a la nueva visita
    const txIdx = updatedTransactions.findIndex((t) => t.id === transaction.id);
    if (txIdx !== -1) {
      updatedTransactions[txIdx] = {
        ...updatedTransactions[txIdx],
        visitId,
      };
    }
  });

  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  console.log('✅ Migración v1 completada exitosamente');

  return {
    ran: true,
    migratedCount: candidates.length,
    updatedPatients,
    updatedTransactions,
  };
}
