import React, { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { usePatientsStore } from "../features/patients/store";
import { useFinanceStore } from "../features/finance/store";
import { useSpecialistStore } from "../features/specialists/store";
import { runMigrationV1 } from "../services/storage/migrations/v1_transactionsToVisits";
import { runSupabaseMigration } from "../services/supabase/migrationToSupabase";
import { fetchAllPatients } from "../services/supabase/patientsService";
import { fetchAllTransactions } from "../services/supabase/financeService";
import { fetchAllSpecialistBlocks, fetchAllSavedDoctors } from "../services/supabase/specialistsService";
import { AutoReassignService } from "../services/AutoReassignService";
import { processOfflineQueue } from "../services/offlineQueue";
import { LoginScreen } from "../features/auth/components/LoginScreen";
import { useAuthStore } from "../features/auth/store";
import { useSyncStore } from "../shared/stores/syncStore";
import type { Patient } from "../features/patients/types";
import type { Transaction } from "../features/finance/types";

// Re-exports for compatibility
export type { Patient, Visit } from "../features/patients/types";
export type { Transaction } from "../features/finance/types";
export type { SpecialistBlock } from "../features/specialists/types";

/**
 * Corre la migración legacy en SEGUNDO PLANO para no bloquear la carga inicial.
 * AsyncStorage → Supabase (solo una vez por dispositivo).
 */
async function runMigrationBackground(userId: string): Promise<void> {
  try {
    // Verificar si ya se realizó la migración (lectura rápida de AsyncStorage)
    const alreadyDone = await AsyncStorage.getItem("SUPABASE_MIGRATION_V1_DONE");
    if (alreadyDone === "true") return; // Nada que hacer

    const storedPatients = await AsyncStorage.getItem("STORAGE_KEY_PATIENTS");
    const storedTransactions = await AsyncStorage.getItem("STORAGE_KEY_TRANSACTIONS");
    const parsedPatients = storedPatients ? JSON.parse(storedPatients) : [];
    const parsedTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];

    // Migración interna de esquema (v1: transacciones → visitas)
    const migResult = await runMigrationV1(parsedPatients, parsedTransactions);
    if (migResult.ran && migResult.migratedCount > 0) {
      await AsyncStorage.setItem("STORAGE_KEY_PATIENTS", JSON.stringify(migResult.updatedPatients));
      await AsyncStorage.setItem("STORAGE_KEY_TRANSACTIONS", JSON.stringify(migResult.updatedTransactions));
    }

    // Subir datos a Supabase (solo si hay datos locales)
    await runSupabaseMigration();
    console.log("✅ Migración background completada para usuario:", userId);
  } catch (e) {
    console.warn("⚠️ Migración background falló (se intentará la próxima vez):", e);
  }
}

/**
 * AppProvider: muestra LoginScreen si no hay sesión activa.
 * Una vez autenticado, carga PRIMERO los datos del caché local (instantáneo)
 * y luego sincroniza con Supabase en segundo plano.
 *
 * Flujo rápido:
 * 1. Verificar sesión desde AsyncStorage (instantáneo)
 * 2. Si no hay sesión → mostrar LoginScreen
 * 3. Al obtener sesión → cargar caché local (inmediato, ~50ms)
 * 4. Sincronizar con Supabase en segundo plano (1-3s)
 * 5. Migración legacy en SEGUNDO PLANO (no bloquea la UI)
 */
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const session = useAuthStore((s) => s.session);
  const isAuthLoading = useAuthStore((s) => s.isLoading);

  const setPatients = usePatientsStore((s) => s.setPatients);
  const loadFromCache = usePatientsStore((s) => s.loadFromCache);
  const setPatientsLoading = usePatientsStore((s) => s.setLoading);
  const setTransactions = useFinanceStore((s) => s.setTransactions);
  const setFinanceLoading = useFinanceStore((s) => s.setLoading);
  const setLastSynced = useSyncStore((s) => s.setLastSynced);

  // Referencia para evitar cargar datos múltiples veces con el mismo userId
  const lastLoadedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Solo cargar datos cuando hay una sesión activa
    if (!session?.user?.id) {
      // Si no hay sesión, limpiar los datos del store (por si hubo logout)
      if (lastLoadedUserId.current !== null) {
        setPatients([]);
        setTransactions([]);
        lastLoadedUserId.current = null;
      }
      return;
    }

    const currentUserId = session.user.id;

    // Evitar re-cargar si ya están los datos de este usuario
    if (lastLoadedUserId.current === currentUserId) return;

    const loadData = async () => {
      setPatientsLoading(true);
      setFinanceLoading(true);

      try {
        // ── PASO 1 (INSTANTÁNEO): Cargar datos del caché local ──────────────
        // Esto hace que la app sea usable en <100ms después del login
        const hadCache = await loadFromCache();
        const hadFinanceCache = await useFinanceStore.getState().loadFromCache();
        await useSpecialistStore.getState().loadFromCache();

        if (hadCache || hadFinanceCache) {
          console.log("⚡ Datos cargados desde caché local (instantáneo)");
          // Ocultar splash inmediatamente — la app es usable con datos del caché
          SplashScreen.hideAsync().catch(() => {});
        }

        // ── PASO 2 (BACKGROUND): Sincronizar con Supabase ────────────────────
        // Timeout de 5s para no quedar atascado si no hay internet.
        const DATA_TIMEOUT_MS = 5_000;
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DATA_TIMEOUT')), DATA_TIMEOUT_MS)
        );

        try {
          // Primero intentar sincronizar operaciones offline pendientes (con timeout propio)
          const { processedOps } = await Promise.race([
            processOfflineQueue(),
            new Promise<{ processedOps: any[] }>((resolve) =>
              setTimeout(() => resolve({ processedOps: [] }), 3_000)
            ),
          ]).catch(() => ({ processedOps: [] }));
          
          if (processedOps && processedOps.length > 0) {
            const { extractSyncedPatientIds, extractSyncedTransactionIds, extractSyncedVisitIds, extractDeletedTransactionIds } = await import('../services/offlineQueue');
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

          const [finalPatients, finalTransactions, finalSpecialistBlocks, finalSavedDoctors] = await Promise.race([
            Promise.all([
              fetchAllPatients(currentUserId),
              fetchAllTransactions(currentUserId),
              fetchAllSpecialistBlocks(currentUserId),
              fetchAllSavedDoctors(currentUserId),
            ]),
            timeout,
          ]);

          // ── PASO 3: Poblar stores con datos frescos de Supabase ────────────
          setPatients(finalPatients);
          setTransactions(finalTransactions);
          useSpecialistStore.getState().setSpecialistBlocks(finalSpecialistBlocks);
          useSpecialistStore.getState().setSavedDoctors(finalSavedDoctors);
          lastLoadedUserId.current = currentUserId;
          setLastSynced(new Date());

          // Recuperar pacientes que quedaron huérfanos localmente (stuck in pending)
          const orphanedPatients = usePatientsStore.getState().patients.filter(p => p._syncStatus === "pending");
          if (orphanedPatients.length > 0) {
            import('../services/supabase/patientsService').then(({ bulkInsertPatients }) => {
              bulkInsertPatients(orphanedPatients).then(() => {
                const markSynced = usePatientsStore.getState().markSynced;
                orphanedPatients.forEach(p => markSynced(p.id));
                console.log(`✅ Sincronizados ${orphanedPatients.length} pacientes huérfanos`);
              }).catch(e => {
                const msg = e instanceof Error ? e.message : JSON.stringify(e);
                console.warn("Fallo al sincronizar huérfanos:", msg);
                import('react-native').then(({ Alert }) => {
                  Alert.alert("Error subiendo huérfanos", msg);
                });
              });
            });
          }

          // Recuperar transacciones huérfanas localmente (stuck in pending)
          const orphanedTransactions = useFinanceStore.getState().transactions.filter(
            (t) => t._syncStatus === 'pending'
          );
          if (orphanedTransactions.length > 0) {
            import('../services/supabase/financeService').then(({ bulkInsertTransactions }) => {
              bulkInsertTransactions(orphanedTransactions).then(() => {
                const markTxSynced = useFinanceStore.getState().markTransactionSynced;
                orphanedTransactions.forEach(t => markTxSynced(t.id));
                console.log(`✅ Sincronizadas ${orphanedTransactions.length} transacciones huérfanas`);
              }).catch(e => {
                const msg = e instanceof Error ? e.message : JSON.stringify(e);
                console.warn("Fallo al sincronizar transacciones huérfanas:", msg);
              });
            });
          }

          // Recuperar bloques de especialista huérfanos localmente
          const orphanedBlocks = useSpecialistStore.getState().specialistBlocks.filter(
            (b) => b._syncStatus === 'pending'
          );
          if (orphanedBlocks.length > 0) {
            import('../services/supabase/specialistsService').then(({ bulkInsertSpecialistBlocks }) => {
              bulkInsertSpecialistBlocks(orphanedBlocks).then(() => {
                const markBlockSynced = useSpecialistStore.getState().markBlockSynced;
                orphanedBlocks.forEach(b => markBlockSynced(b.id));
                console.log(`✅ Sincronizados ${orphanedBlocks.length} bloques huérfanos de especialista`);
              }).catch(e => {
                console.warn("Fallo al sincronizar bloques huérfanos:", e);
              });
            });
          }

          // Recuperar doctores guardados huérfanos localmente
          const orphanedDoctors = useSpecialistStore.getState().savedDoctors.filter(
            (d) => d._syncStatus === 'pending'
          );
          if (orphanedDoctors.length > 0) {
            import('../services/supabase/specialistsService').then(({ bulkInsertSavedDoctors }) => {
              bulkInsertSavedDoctors(orphanedDoctors).then(() => {
                console.log(`✅ Sincronizados ${orphanedDoctors.length} doctores huérfanos`);
              }).catch(e => {
                console.warn("Fallo al sincronizar doctores huérfanos:", e);
              });
            });
          }

          console.log(`☁️ Datos sincronizados: ${finalPatients.length} pacientes, ${finalSpecialistBlocks.length} bloques especialista`);
        } catch (syncError) {
          console.warn("⚠️ Sync con Supabase falló, usando datos del caché:", syncError);
          // Si tenemos caché, la app sigue siendo usable
          if (hadCache) {
            lastLoadedUserId.current = currentUserId;
          } else {
            // Sin caché y sin red — no hay datos disponibles
            throw syncError;
          }
        }

        // ── PASO 4: Migración en SEGUNDO PLANO (no bloquea) ──────────────────
        runMigrationBackground(currentUserId);

        // ── PASO 5: Auto-reasignación de ortodoncia ───────────────────────────
        const currentPatients = usePatientsStore.getState().patients;
        if (currentPatients.length > 0) {
          AutoReassignService.checkAndRunAutoReassign(
            currentPatients,
            usePatientsStore.getState().updatePatient
          ).then((result) => {
            if (result.count > 0) {
              console.log(`🔄 Reasignación automática: ${result.message}`);
            }
          });
        }
      } catch (e) {
        console.error("❌ Error al cargar datos:", e);
      } finally {
        setPatientsLoading(false);
        setFinanceLoading(false);
        // Datos listos (o error) → ocultar splash para mostrar la app
        SplashScreen.hideAsync().catch(() => {});
      }
    };

    loadData();
  }, [session?.user?.id, loadFromCache, setFinanceLoading, setLastSynced, setPatients, setPatientsLoading, setTransactions]);

  // ── Listener de conectividad: procesar cola offline al reconectar ──────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && session?.user?.id) {
        processOfflineQueue().then(async (result) => {
          // Verificar si hay operaciones procesadas, pacientes huérfanos u transacciones huérfanas
          const hasPatientOrphans = usePatientsStore.getState().patients.some(p => p._syncStatus === "pending");
          const hasTransactionOrphans = useFinanceStore.getState().transactions.some(t => t._syncStatus === "pending");
          
          if (result.processed > 0 || hasPatientOrphans || hasTransactionOrphans) {
            console.log(`✅ Reconexión: procesadas ${result.processed} ops, huérfanos pacientes: ${hasPatientOrphans}, huérfanos tx: ${hasTransactionOrphans}`);
            
            if (result.processed > 0) {
              // 1. Marcar en la UI inmediatamente los que subieron de la cola
              const { extractSyncedPatientIds, extractSyncedTransactionIds, extractSyncedVisitIds, extractDeletedTransactionIds } = await import('../services/offlineQueue');
              const syncedPatientIds = extractSyncedPatientIds(result.processedOps);
              const markSynced = usePatientsStore.getState().markSynced;
              syncedPatientIds.forEach(id => markSynced(id));

              const syncedTxIds = extractSyncedTransactionIds(result.processedOps);
              const markTxSynced = useFinanceStore.getState().markTransactionSynced;
              syncedTxIds.forEach(id => markTxSynced(id));

              const deletedTxIds = extractDeletedTransactionIds(result.processedOps);
              const removeTx = useFinanceStore.getState().removeTransaction;
              deletedTxIds.forEach(id => removeTx(id));

              const syncedVisitIds = extractSyncedVisitIds(result.processedOps);
              const markVisitSynced = usePatientsStore.getState().markVisitSynced;
              syncedVisitIds.forEach(({ patientId, visitId }) => markVisitSynced(patientId, visitId));
            }

            // 2. Re-sincronizar datos (esto ejecuta la subida de huérfanos de pacientes y transacciones)
            useSyncStore.getState().refetch(session.user.id).catch(() => {});
          }
        });
      }
    });
    return () => unsubscribe();
  }, [session?.user?.id]);

  // Ocultar splash cuando auth terminó de verificar (mostrar login o app)
  useEffect(() => {
    if (!isAuthLoading) {
      // Auth terminó: ocultar splash inmediatamente.
      // Si hay sesión, se mostrará el Dashboard (con skeleton si aún no hay datos).
      // Si no hay sesión, se mostrará el LoginScreen.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isAuthLoading]);

  // Mostrar login mientras se verifica la sesión o si no hay sesión activa
  if (isAuthLoading || !session) {
    return <LoginScreen />;
  }

  return <>{children}</>;
};

/**
 * @deprecated Legacy hook for compatibility.
 * Please use `usePatientsStore` and `useFinanceStore` directly in components
 * with granular selectors (e.g. `usePatientsStore(s => s.patients)`) to avoid re-renders.
 */
export const useApp = () => {
  const patientsState = usePatientsStore();
  const financeState = useFinanceStore();

  const importData = async (newPatients: Patient[], newTransactions: Transaction[]) => {
    try {
      // 1. Guardar en la nube (Supabase)
      const { bulkInsertPatients } = await import("../services/supabase/patientsService");
      const { bulkInsertTransactions } = await import("../services/supabase/financeService");
      await bulkInsertPatients(newPatients);
      await bulkInsertTransactions(newTransactions);

      // 2. Actualizar estado local
      patientsState.setPatients(newPatients);
      financeState.setTransactions(newTransactions);

      console.log("✅ Datos importados correctamente a la nube y local");
      import("../services/NotificationService").then(({ NotificationService }) => {
        NotificationService.rescheduleAllNotifications(newPatients);
      });
    } catch (error) {
      console.error("❌ Error al importar datos:", error);
      throw error;
    }
  };

  return {
    ...patientsState,
    ...financeState,
    importData,
  };
};
