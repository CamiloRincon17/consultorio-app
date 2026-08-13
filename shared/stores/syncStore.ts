import { create } from 'zustand';
import { fetchAllPatients } from '../../services/supabase/patientsService';
import { fetchAllTransactions } from '../../services/supabase/financeService';
import { fetchAllSpecialistBlocks, fetchAllSavedDoctors } from '../../services/supabase/specialistsService';
import { processOfflineQueue } from '../../services/offlineQueue';
import { usePatientsStore } from '../../features/patients/store';
import { useFinanceStore } from '../../features/finance/store';
import { useSpecialistStore } from '../../features/specialists/store';

// Tiempo máximo de espera para sincronización manual (ms)
const REFETCH_TIMEOUT_MS = 10_000;

/** Promesa que rechaza después de N milisegundos. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── Sync Store ──────────────────────────────────────────────────────────────
// Maneja el estado de sincronización con Supabase.
// Expone un refetch() para pull-to-refresh y un indicador de último sync.

interface SyncState {
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  /** Re-carga pacientes y transacciones desde Supabase. */
  refetch: (userId: string) => Promise<void>;
  setLastSynced: (date: Date) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  lastSyncedAt: null,
  isSyncing: false,

  setLastSynced: (date) => set({ lastSyncedAt: date }),

  refetch: async (userId: string) => {
    set({ isSyncing: true });
    try {
      // Primero intentar sincronizar operaciones offline pendientes
      const { processedOps } = await processOfflineQueue().catch(() => ({ processedOps: [] }));
      
      if (processedOps && processedOps.length > 0) {
        const { extractSyncedPatientIds, extractSyncedTransactionIds, extractSyncedVisitIds, extractDeletedTransactionIds } = await import('../../services/offlineQueue');
        const syncedPatientIds = extractSyncedPatientIds(processedOps);
        const markSynced = usePatientsStore.getState().markSynced;
        syncedPatientIds.forEach(id => markSynced(id));

        const syncedTxIds = extractSyncedTransactionIds(processedOps);
        const markTxSynced = useFinanceStore.getState().markTransactionSynced;
        syncedTxIds.forEach(id => markTxSynced(id));

        const deletedTxIds = extractDeletedTransactionIds(processedOps);
        const removeTx = useFinanceStore.getState().removeTransaction;
        deletedTxIds.forEach(id => removeTx(id));

        const syncedVisitIds = extractSyncedVisitIds(processedOps);
        const markVisitSynced = usePatientsStore.getState().markVisitSynced;
        syncedVisitIds.forEach(({ patientId, visitId }) => markVisitSynced(patientId, visitId));
      }

      const [patients, transactions, specialistBlocks, savedDoctors] = await withTimeout(
        Promise.all([
          fetchAllPatients(userId),
          fetchAllTransactions(userId),
          fetchAllSpecialistBlocks(userId),
          fetchAllSavedDoctors(userId),
        ]),
        REFETCH_TIMEOUT_MS,
        'refetchData'
      );
      usePatientsStore.getState().setPatients(patients);
      useFinanceStore.getState().setTransactions(transactions);
      useSpecialistStore.getState().setSpecialistBlocks(specialistBlocks);
      useSpecialistStore.getState().setSavedDoctors(savedDoctors);
      
      // Recuperar huérfanos locales que se quedaron atascados en 'pending'
      const orphanedPatients = usePatientsStore.getState().patients.filter(p => p._syncStatus === "pending");
      if (orphanedPatients.length > 0) {
        import('../../services/supabase/patientsService').then(({ bulkInsertPatients }) => {
          bulkInsertPatients(orphanedPatients).then(() => {
            const markSynced = usePatientsStore.getState().markSynced;
            orphanedPatients.forEach(p => markSynced(p.id));
          }).catch(e => {
            const msg = e instanceof Error ? e.message : JSON.stringify(e);
            console.warn("Fallo refetch huérfanos:", msg);
            import('react-native').then(({ Alert }) => Alert.alert("Error subiendo huérfanos", msg));
          });
        });
      }

      // Recuperar transacciones huérfanas locales (stuck in pending)
      const orphanedTransactions = useFinanceStore.getState().transactions.filter(
        (t) => t._syncStatus === 'pending'
      );
      if (orphanedTransactions.length > 0) {
        import('../../services/supabase/financeService').then(({ bulkInsertTransactions }) => {
          bulkInsertTransactions(orphanedTransactions).then(() => {
            const markTxSynced = useFinanceStore.getState().markTransactionSynced;
            orphanedTransactions.forEach(t => markTxSynced(t.id));
            console.log(`✅ Sincronizadas ${orphanedTransactions.length} transacciones huérfanas (refetch)`);
          }).catch(e => {
            const msg = e instanceof Error ? e.message : JSON.stringify(e);
            console.warn("Fallo refetch transacciones huérfanas:", msg);
          });
        });
      }

      set({ lastSyncedAt: new Date(), isSyncing: false });
    } catch (error) {
      console.error('❌ Error al re-sincronizar datos:', error);
      set({ isSyncing: false });
      throw error;
    }
  },
}));

