import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ─── Cola de reintentos offline ──────────────────────────────────────────────
// Cuando una operación Supabase falla por red, se guarda en AsyncStorage
// y se reintenta automáticamente cuando vuelve la conexión.

const QUEUE_KEY = 'OFFLINE_OPERATIONS_QUEUE';

export interface OfflineOperation {
  id: string;
  timestamp: number;
  /** Nombre de la función del servicio (e.g. 'insertPatient', 'updatePatientDb') */
  service: 'patients' | 'finance' | 'specialists';
  /** Nombre del método */
  method: string;
  /** Argumentos serializados */
  args: any[];
  /** Número de reintentos realizados */
  retries: number;
}

/** Resultado detallado del procesamiento de la cola. */
export interface QueueProcessResult {
  processed: number;
  failed: number;
  remaining: number;
  /** Operaciones que se procesaron exitosamente (para actualizar UI). */
  processedOps: OfflineOperation[];
}

/** Lee la cola de operaciones pendientes. */
async function getQueue(): Promise<OfflineOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Guarda la cola en AsyncStorage. */
async function saveQueue(queue: OfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Encola una operación que falló por error de red.
 * Retorna `true` si se encoló, `false` si el error no es de red y debe propagarse.
 */
export async function enqueueIfOffline(
  error: unknown,
  service: OfflineOperation['service'],
  method: string,
  args: any[],
): Promise<boolean> {
  // Solo encolar errores de red (no errores de validación/auth)
  if (!isNetworkError(error)) return false;

  const operation: OfflineOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    service,
    method,
    args,
    retries: 0,
  };

  const queue = await getQueue();
  queue.push(operation);
  await saveQueue(queue);

  console.warn(`📥 Operación encolada offline: ${service}.${method} (${queue.length} en cola)`);
  return true;
}

/** Detecta si un error es de red (timeout, fetch failed, etc.) */
function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  let msg = '';
  if (error instanceof Error) {
    msg = error.message.toLowerCase();
  } else if (typeof error === 'object' && error !== null) {
    msg = JSON.stringify(error).toLowerCase();
  } else {
    msg = String(error).toLowerCase();
  }

  return (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('net::') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('internet')
  );
}

/**
 * Procesa todas las operaciones pendientes en la cola.
 * Se llama cuando se detecta que volvió la conexión.
 * Retorna las operaciones procesadas exitosamente para actualizar el estado de la UI.
 */
export async function processOfflineQueue(): Promise<QueueProcessResult> {
  const queue = await getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0, processedOps: [] };

  // Verificar conectividad antes de intentar
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { processed: 0, failed: 0, remaining: queue.length, processedOps: [] };
  }

  console.log(`🔄 Procesando cola offline: ${queue.length} operaciones pendientes`);

  const resolvers = await getResolvers();
  const remaining: OfflineOperation[] = [];
  const processedOps: OfflineOperation[] = [];
  let processed = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      const fn = resolvers[op.service]?.[op.method];
      if (!fn) {
        console.warn(`⚠️ Operación desconocida: ${op.service}.${op.method}, descartando`);
        failed++;
        continue;
      }

      await fn(...op.args);
      processed++;
      processedOps.push(op);
      console.log(`✅ Operación reintentada: ${op.service}.${op.method}`);
    } catch (e) {
      op.retries++;
      const errorMessage = e instanceof Error ? e.message : JSON.stringify(e);
      console.error(`❌ Operación falló (${op.retries}/5): ${op.service}.${op.method}`, errorMessage);
      if (op.retries >= 5) {
        // Demasiados reintentos, descartar para no bloquear la cola
        console.error(`❌ Operación descartada tras 5 reintentos: ${op.service}.${op.method}`);
        failed++;
        import('react-native').then(({ Alert }) => {
           Alert.alert(`Error de Sincronización`, `Una operación de ${op.service} no pudo completarse después de varios intentos. Por favor, revisa tu conexión e inténtalo de nuevo.`);
        });
      } else {
        remaining.push(op);
      }
    }
  }

  await saveQueue(remaining);

  if (processed > 0) {
    console.log(`✅ Cola offline: ${processed} operaciones sincronizadas, ${remaining.length} pendientes`);
  }

  return { processed, failed, remaining: remaining.length, processedOps };
}

/**
 * Extrae los IDs de pacientes de las operaciones procesadas.
 * Útil para marcarlos como sincronizados en el store.
 */
export function extractSyncedPatientIds(ops: OfflineOperation[]): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    if (op.service !== 'patients') continue;
    // insertPatient recibe [patient] donde patient.id es el ID
    if (op.method === 'insertPatient' && op.args[0]?.id) {
      ids.push(op.args[0].id);
    }
    // updatePatientDb recibe [id, updates]
    if (op.method === 'updatePatientDb' && typeof op.args[0] === 'string') {
      ids.push(op.args[0]);
    }
  }
  return ids;
}

/**
 * Extrae los IDs de visitas y sus pacientes de las operaciones procesadas.
 * Útil para marcarlas como sincronizadas en el store.
 */
export function extractSyncedVisitIds(ops: OfflineOperation[]): { patientId: string; visitId: string }[] {
  const ids: { patientId: string; visitId: string }[] = [];
  for (const op of ops) {
    if (op.service !== 'patients') continue;
    // insertVisit recibe [visit, patientId]
    if (op.method === 'insertVisit' && op.args[0]?.id && typeof op.args[1] === 'string') {
      ids.push({ visitId: op.args[0].id, patientId: op.args[1] });
    }
    // updateVisitDb recibe [visitId, updates, patientId]
    if (op.method === 'updateVisitDb' && typeof op.args[0] === 'string' && typeof op.args[2] === 'string') {
      ids.push({ visitId: op.args[0], patientId: op.args[2] });
    }
  }
  return ids;
}

/**
 * Extrae los IDs de transacciones de las operaciones procesadas.
 * Útil para marcarlas como sincronizadas en el finance store.
 */
export function extractSyncedTransactionIds(ops: OfflineOperation[]): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    if (op.service !== 'finance') continue;
    // insertTransaction recibe [transaction] donde transaction.id es el ID
    if (op.method === 'insertTransaction' && op.args[0]?.id) {
      ids.push(op.args[0].id);
    }
    // updateTransactionDb recibe [id, updates]
    if (op.method === 'updateTransactionDb' && typeof op.args[0] === 'string') {
      ids.push(op.args[0]);
    }
  }
  return ids;
}

/**
 * Extrae los IDs de transacciones que fueron eliminadas exitosamente de la cola.
 * Útil para removerlas definitivamente del store local.
 */
export function extractDeletedTransactionIds(ops: OfflineOperation[]): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    if (op.service !== 'finance') continue;
    // deleteTransactionDb recibe [id]
    if (op.method === 'deleteTransactionDb' && typeof op.args[0] === 'string') {
      ids.push(op.args[0]);
    }
  }
  return ids;
}

/**
 * Extrae los IDs de bloques de especialistas de las operaciones procesadas.
 */
export function extractSyncedSpecialistBlockIds(ops: OfflineOperation[]): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    if (op.service !== 'specialists') continue;
    if (op.method === 'insertSpecialistBlock' && op.args[0]?.id) {
      ids.push(op.args[0].id);
    }
    if (op.method === 'updateSpecialistBlockDb' && typeof op.args[0] === 'string') {
      ids.push(op.args[0]);
    }
  }
  return ids;
}

export function extractDeletedSpecialistBlockIds(ops: OfflineOperation[]): string[] {
  const ids: string[] = [];
  for (const op of ops) {
    if (op.service !== 'specialists') continue;
    if (op.method === 'deleteSpecialistBlockDb' && typeof op.args[0] === 'string') {
      ids.push(op.args[0]);
    }
  }
  return ids;
}

/** Retorna el número de operaciones pendientes. */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/** Limpia toda la cola (para debugging o reset). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Lazy-imports de los servicios para evitar dependencias circulares.
 * Mapa: service → method → función.
 */
async function getResolvers(): Promise<Record<string, Record<string, (...args: any[]) => Promise<void>>>> {
  const [patientsService, financeService, specialistsService] = await Promise.all([
    import('./supabase/patientsService'),
    import('./supabase/financeService'),
    import('./supabase/specialistsService'),
  ]);

  return {
    patients: {
      insertPatient: patientsService.insertPatient,
      updatePatientDb: patientsService.updatePatientDb,
      deletePatientDb: patientsService.deletePatientDb,
      insertVisit: patientsService.insertVisit,
      updateVisitDb: patientsService.updateVisitDb,
      deleteVisitDb: patientsService.deleteVisitDb,
    },
    finance: {
      insertTransaction: financeService.insertTransaction,
      updateTransactionDb: financeService.updateTransactionDb,
      deleteTransactionDb: financeService.deleteTransactionDb,
    },
    specialists: {
      insertSpecialistBlock: specialistsService.insertSpecialistBlock,
      updateSpecialistBlockDb: specialistsService.updateSpecialistBlockDb,
      deleteSpecialistBlockDb: specialistsService.deleteSpecialistBlockDb,
      insertSavedDoctor: specialistsService.insertSavedDoctor,
      deleteSavedDoctorDb: specialistsService.deleteSavedDoctorDb,
    },
  };
}
