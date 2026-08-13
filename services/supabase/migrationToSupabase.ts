/**
 * Migración única: AsyncStorage → Supabase
 *
 * Se ejecuta una sola vez al arrancar la app.
 * Si detecta datos en AsyncStorage y Supabase está vacío, los sube a la nube.
 * Al terminar, marca la migración como completada en AsyncStorage para no volver a correr.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bulkInsertPatients } from './patientsService';
import { bulkInsertTransactions } from './financeService';
import { supabase } from './client';
import type { Patient } from '../../features/patients/types';
import type { Transaction } from '../../features/finance/types';

const MIGRATION_FLAG_KEY = 'SUPABASE_MIGRATION_V1_DONE';

export async function runSupabaseMigration(): Promise<{ ran: boolean; count: number }> {
  try {
    // 1. Verificar si ya se corrió la migración
    const alreadyDone = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (alreadyDone === 'true') {
      return { ran: false, count: 0 };
    }

    // El paso de verificar si Supabase tiene datos globales se eliminó
    // para permitir que teléfonos con datos reales migren su información local
    // incluso si el usuario ya creó pacientes de prueba desde otro dispositivo (como Expo).

    // 3. Leer datos del AsyncStorage local
    const [storedPatients, storedTransactions] = await Promise.all([
      AsyncStorage.getItem('STORAGE_KEY_PATIENTS'),
      AsyncStorage.getItem('STORAGE_KEY_TRANSACTIONS'),
    ]);

    const patients: Patient[] = storedPatients ? JSON.parse(storedPatients) : [];
    const transactions: Transaction[] = storedTransactions ? JSON.parse(storedTransactions) : [];

    if (patients.length === 0 && transactions.length === 0) {
      // No hay datos que migrar — app recién instalada
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return { ran: true, count: 0 };
    }

    // 4. Subir datos a Supabase
    console.log(`🔄 Migrando ${patients.length} pacientes y ${transactions.length} transacciones a Supabase...`);
    await bulkInsertPatients(patients);
    await bulkInsertTransactions(transactions);

    // 5. Marcar migración como completada
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    const total = patients.length + transactions.length;
    console.log(`✅ Migración a Supabase completada: ${total} registros subidos.`);
    return { ran: true, count: total };
  } catch (error) {
    console.error('❌ Error durante la migración a Supabase:', error);
    // No marcamos como hecho para que intente de nuevo la próxima vez
    throw error;
  }
}
