import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Patient, Visit } from "./types";
import { generateId } from "../../shared/utils/generateId";
import { computePatientStats, getPatientVisits } from "./patientCalculations";
import { useFinanceStore } from "../finance/store";

interface PatientsState {
  patients: Patient[];
  isLoading: boolean;
  setPatients: (patients: Patient[]) => void;
  setLoading: (loading: boolean) => void;
  addPatient: (patient: Omit<Patient, "id">) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addVisit: (patientId: string, visit: Omit<Visit, "id">) => void;
  updateVisit: (patientId: string, visitId: string, updates: Partial<Visit>) => void;
  deleteVisit: (patientId: string, visitId: string) => void;
  getPatientStats: (patientId: string) => { totalPaid: number; visitCount: number };
  getPatientVisits: (patientId: string) => Visit[];
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  isLoading: true,
  setPatients: (patients) => set({ patients }),
  setLoading: (isLoading) => set({ isLoading }),

  addPatient: (newPatient) => {
    const patient: Patient = { ...newPatient, id: generateId() };
    set((state) => ({ patients: [...state.patients, patient] }));
    
    // Notifications...
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
    set((state) => {
      const patients = state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p));
      return { patients };
    });
    
    // Notifications...
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
    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
    }));
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

    const visit: Visit = { ...newVisit, id: visitId, transactionId };
    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId) {
          return { ...p, visits: [visit, ...(p.visits || [])] };
        }
        return p;
      })
    }));
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

    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId && p.visits) {
          return {
            ...p,
            visits: p.visits.map((v) => (v.id === visitId ? { ...v, ...updates } : v)),
          };
        }
        return p;
      })
    }));
  },

  deleteVisit: (patientId, visitId) => {
    console.log("👉 deleteVisit invocada:", { patientId, visitId });
    const patient = get().patients.find((p) => p.id === patientId);
    const visit = patient?.visits?.find((v) => v.id === visitId);

    console.log("👉 paciente encontrado:", !!patient, "visita encontrada:", !!visit);

    if (visit?.transactionId) {
      console.log("👉 eliminando transaccion:", visit.transactionId);
      useFinanceStore.getState().deleteTransaction(visit.transactionId);
    }

    set((state) => ({
      patients: state.patients.map((p) => {
        if (p.id === patientId && p.visits) {
          const newVisits = p.visits.filter((v) => {
            // Si el visitId que recibimos coincide con el v.id, lo descartamos
            if (visitId && v.id === visitId) return false;
            // Si por error v.id está vacío (visitas viejas) y visitId venía vacío, lo descartamos
            if (!visitId && !v.id) return false;
            return true;
          });
          console.log("👉 visitas actualizadas de", p.visits.length, "a", newVisits.length);
          return { ...p, visits: newVisits };
        }
        return p;
      })
    }));
  },

  getPatientStats: (patientId: string) => {
    const transactions = useFinanceStore.getState().transactions;
    return computePatientStats(patientId, get().patients, transactions);
  },

  getPatientVisits: (patientId: string) => getPatientVisits(patientId, get().patients),
}));

// Subscribe to persist to AsyncStorage
usePatientsStore.subscribe((state, prevState) => {
  if (state.patients !== prevState.patients && !state.isLoading) {
    AsyncStorage.setItem("STORAGE_KEY_PATIENTS", JSON.stringify(state.patients)).catch(e => console.error(e));
  }
});
