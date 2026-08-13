import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Patient, Visit, SyncStatus } from "./types";
import { generateId } from "../../shared/utils/generateId";
import { computePatientStats, getPatientVisits } from "./patientCalculations";
import { useFinanceStore } from "../finance/store";
import {
  insertPatient,
  updatePatientDb,
  deletePatientDb,
  insertVisit,
  updateVisitDb,
  deleteVisitDb,
} from "../../services/supabase/patientsService";
import { enqueueIfOffline } from "../../services/offlineQueue";

const PATIENTS_CACHE_KEY = "PATIENTS_LOCAL_CACHE";

interface PatientsState {
  patients: Patient[];
  isLoading: boolean;
  /** Número de operaciones pendientes por sincronizar. */
  pendingSyncCount: number;
  /** Si los datos vinieron del caché local (aún sin confirmar con Supabase). */
  isFromCache: boolean;
  setPatients: (patients: Patient[]) => void;
  /** Carga pacientes desde el caché local de AsyncStorage (instantáneo). */
  loadFromCache: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  addPatient: (patient: Omit<Patient, "id">) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addVisit: (patientId: string, visit: Omit<Visit, "id">) => void;
  updateVisit: (patientId: string, visitId: string, updates: Partial<Visit>) => void;
  deleteVisit: (patientId: string, visitId: string) => void;
  getPatientStats: (patientId: string) => { totalPaid: number; visitCount: number };
  getPatientVisits: (patientId: string) => Visit[];
  /** Marca un paciente específico como sincronizado. */
  markSynced: (patientId: string) => void;
  /** Marca una visita específica como sincronizada. */
  markVisitSynced: (patientId: string, visitId: string) => void;
}

/** Guarda los pacientes actuales en AsyncStorage para carga instantánea. */
async function saveToCache(patients: Patient[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PATIENTS_CACHE_KEY, JSON.stringify(patients));
  } catch {
    // Silencioso — el caché es best-effort
  }
}

/**
 * Helper: ejecuta una operación Supabase y, si falla por red, la encola.
 * Retorna true si la operación fue exitosa, false si se encoló o falló.
 */
async function persistWithRetry(
  fn: () => Promise<void>,
  service: 'patients',
  method: string,
  args: any[],
): Promise<boolean> {
  try {
    await fn();
    return true; // ✅ Sincronizado con Supabase
  } catch (error) {
    const queued = await enqueueIfOffline(error, service, method, args);
    if (queued) {
      // Incrementar contador de pendientes para el SyncIndicator
      usePatientsStore.setState((s) => ({ pendingSyncCount: s.pendingSyncCount + 1 }));
    } else {
      // Error no de red (auth, validación, etc.) — loggear pero no encolar
      console.error(`❌ Supabase ${method}:`, error);
    }
    return false;
  }
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  isLoading: true,
  pendingSyncCount: 0,
  isFromCache: false,

  /** 
   * Establece pacientes desde Supabase (cloud). 
   * Todos se marcan como 'synced' y se guarda caché local.
   * - Pacientes solo-locales pendientes se preservan (merge).
   * - Visitas locales que aún no llegaron a la nube se re-adjuntan
   *   para evitar pérdida de datos entre dispositivos o recargas.
   */
  setPatients: (cloudPatients) => {
    const current = get().patients;
    const cloudIds = new Set(cloudPatients.map((p) => p.id));

    // Mapa rápido de pacientes locales para lookup de visitas pendientes
    const localMap = new Map(current.map((p) => [p.id, p]));

    // 1. Pacientes que están solo en local (no subidos aún)
    const localOnlyPending = current.filter(
      (p) => p._syncStatus === "pending" && !cloudIds.has(p.id)
    );

    // 2. Para pacientes que SÍ están en la nube, re-adjuntar visitas
    //    locales que aún no aparecen en Supabase (pendientes de sync)
    const synced = cloudPatients.map((cloudPatient) => {
      const localPatient = localMap.get(cloudPatient.id);
      const cloudVisitIds = new Set((cloudPatient.visits || []).map((v) => v.id));

      // Visitas locales que no están en la nube todavía
      const pendingLocalVisits = (localPatient?.visits || []).filter(
        (v) => !cloudVisitIds.has(v.id)
      );

      return {
        ...cloudPatient,
        _syncStatus: "synced" as SyncStatus,
        // Añadir las visitas locales pendientes al inicio (más recientes)
        visits: pendingLocalVisits.length > 0
          ? [...pendingLocalVisits, ...(cloudPatient.visits || [])]
          : cloudPatient.visits,
      };
    });

    // 3. Combinar: nube (con visitas pendientes re-adjuntadas) + pacientes solo-locales
    const merged = [...synced, ...localOnlyPending];

    set({ patients: merged, isFromCache: false });
    saveToCache(merged);
  },

  /** Carga pacientes desde AsyncStorage para arranque instantáneo. */
  loadFromCache: async () => {
    try {
      const raw = await AsyncStorage.getItem(PATIENTS_CACHE_KEY);
      if (raw) {
        const cached: Patient[] = JSON.parse(raw);
        if (cached.length > 0) {
          set({ patients: cached, isFromCache: true, isLoading: false });
          return true;
        }
      }
    } catch {
      // Cache corrupto — ignorar
    }
    return false;
  },

  setLoading: (isLoading) => set({ isLoading }),

  addPatient: (newPatient) => {
    const patient: Patient = {
      ...newPatient,
      id: generateId(),
      _syncStatus: "pending", // Inicia como pendiente
    };

    // 1. Actualizar UI inmediatamente (optimistic update)
    set((state) => ({ patients: [...state.patients, patient] }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => insertPatient(patient),
      'patients',
      'insertPatient',
      [patient],
    ).then((success) => {
      if (success) {
        // Marcar como sincronizado
        usePatientsStore.getState().markSynced(patient.id);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().patients);

    // 4. Notificaciones
    if (patient.nextControlDate) {
      import("../../services/NotificationService").then(({ NotificationService }) => {
        NotificationService.scheduleAppointmentNotification(
          patient.id,
          patient.name,
          new Date(patient.nextControlDate!)
        );
      });
    }
  },

  updatePatient: (id, updates) => {
    // 1. Actualizar UI inmediatamente (marcar como pendiente hasta confirmar sync)
    set((state) => {
      const patients = state.patients.map((p) => (p.id === id ? { ...p, ...updates, _syncStatus: 'pending' as SyncStatus } : p));
      return { patients };
    });

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => updatePatientDb(id, updates),
      'patients',
      'updatePatientDb',
      [id, updates],
    ).then((success) => {
      if (success) {
        usePatientsStore.getState().markSynced(id);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().patients);

    // 4. Notificaciones
    if (updates.nextControlDate !== undefined) {
      const patient = get().patients.find((p) => p.id === id);
      if (patient) {
        import("../../services/NotificationService").then(({ NotificationService }) => {
          if (updates.nextControlDate) {
            NotificationService.scheduleAppointmentNotification(
              id,
              updates.name || patient.name,
              new Date(updates.nextControlDate)
            );
          } else {
            NotificationService.cancelAppointmentNotification(id);
          }
        });
      }
    }
  },

  deletePatient: (id) => {
    // 1. Actualizar UI inmediatamente
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
    }));

    // 2. Persistir en Supabase (CASCADE elimina visitas automáticamente)
    persistWithRetry(
      () => deletePatientDb(id),
      'patients',
      'deletePatientDb',
      [id],
    );

    // 3. Guardar caché local
    saveToCache(get().patients);

    import("../../services/NotificationService").then(({ NotificationService }) => {
      NotificationService.cancelAppointmentNotification(id);
    });
  },

  addVisit: (patientId, newVisit) => {
    const visitId = generateId();
    let transactionId: string | undefined;

    if (newVisit.cost !== undefined && newVisit.cost > 0) {
      transactionId = generateId();
      const patient = get().patients.find((p) => p.id === patientId);
      useFinanceStore.getState().addTransaction({
        id: transactionId,
        type: "INCOME",
        amount: newVisit.cost,
        date: new Date().toISOString(),
        description: newVisit.treatment || newVisit.reason || "Visita",
        patientId,
        patientName: patient?.name,
        procedure: newVisit.reason,
        visitId,
      });
    }

    const visit: Visit = {
      ...newVisit,
      id: visitId,
      transactionId,
      _syncStatus: 'pending' as SyncStatus,
      _lastModified: new Date().toISOString(),
    };

    // 1. Actualizar UI inmediatamente
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return { ...p, visits: [visit, ...(p.visits || [])] };
        }
        return p;
      }),
    }));

    // 2. Persistir visita en Supabase con cola offline
    persistWithRetry(
      () => insertVisit(visit, patientId),
      'patients',
      'insertVisit',
      [visit, patientId],
    ).then((success) => {
      if (success) {
        usePatientsStore.getState().markVisitSynced(patientId, visitId);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().patients);
  },

  updateVisit: (patientId, visitId, updates) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const currentVisit = patient?.visits?.find((v) => v.id === visitId);

    if (updates.cost !== undefined) {
      if (currentVisit?.transactionId) {
        useFinanceStore.getState().updateTransaction(currentVisit.transactionId, {
          amount: updates.cost,
          description: updates.treatment || updates.reason || undefined,
          procedure: updates.reason || undefined,
        });
      } else if (updates.cost > 0) {
        const transactionId = generateId();
        useFinanceStore.getState().addTransaction({
          id: transactionId,
          type: "INCOME",
          amount: updates.cost,
          date: new Date().toISOString(),
          description: updates.treatment || updates.reason || "Visita",
          patientId,
          patientName: patient?.name,
          procedure: updates.reason,
          visitId,
        });
        updates.transactionId = transactionId;
      }
    }

    const now = new Date().toISOString();

    // 1. Actualizar UI inmediatamente (marcar como pendiente y registrar timestamp)
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId && p.visits) {
          return {
            ...p,
            visits: p.visits.map((v) =>
              v.id === visitId
                ? { ...v, ...updates, _syncStatus: 'pending' as SyncStatus, _lastModified: now }
                : v
            ),
          };
        }
        return p;
      }),
    }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => updateVisitDb(visitId, updates, patientId),
      'patients',
      'updateVisitDb',
      [visitId, updates, patientId],
    ).then((success) => {
      if (success) {
        usePatientsStore.getState().markVisitSynced(patientId, visitId);
      }
    });

    // 3. Guardar caché local
    saveToCache(get().patients);
  },

  deleteVisit: (patientId, visitId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    const visit = patient?.visits?.find((v) => v.id === visitId);

    if (visit?.transactionId) {
      useFinanceStore.getState().deleteTransaction(visit.transactionId);
    }

    // 1. Actualizar UI inmediatamente
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId && p.visits) {
          const newVisits = p.visits.filter((v) => {
            if (visitId && v.id === visitId) return false;
            if (!visitId && !v.id) return false;
            return true;
          });
          return { ...p, visits: newVisits };
        }
        return p;
      }),
    }));

    // 2. Persistir en Supabase con cola offline
    persistWithRetry(
      () => deleteVisitDb(visitId),
      'patients',
      'deleteVisitDb',
      [visitId],
    );

    // 3. Guardar caché local
    saveToCache(get().patients);
  },

  getPatientStats: (patientId: string) => {
    const transactions = useFinanceStore.getState().transactions;
    return computePatientStats(patientId, get().patients, transactions);
  },

  getPatientVisits: (patientId: string) => getPatientVisits(patientId, get().patients),

  markSynced: (patientId: string) => {
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === patientId ? { ...p, _syncStatus: "synced" as SyncStatus } : p
      ),
    }));
    saveToCache(get().patients);
  },

  markVisitSynced: (patientId: string, visitId: string) => {
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id !== patientId || !p.visits) return p;
        return {
          ...p,
          visits: p.visits.map((v) =>
            v.id === visitId
              ? { ...v, _syncStatus: 'synced' as SyncStatus }
              : v
          ),
        };
      }),
    }));
    saveToCache(get().patients);
  },
}));
