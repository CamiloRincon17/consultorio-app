import AsyncStorage from "@react-native-async-storage/async-storage";
import { Patient } from "../context/AppContext";
import { NotificationService } from "./NotificationService";

const LAST_AUTO_REASSIGN_KEY = "lastAutoReassign";
const AUTO_REASSIGN_HISTORY_KEY = "autoReassignHistory";

// Tipo para el historial de reasignaciones
export interface ReassignmentHistoryEntry {
  id: string;
  date: string; // Fecha cuando se hizo la reasignación
  type: "automatic" | "manual"; // Tipo de reasignación
  patientsAffected: {
    id: string;
    name: string;
    previousDate?: string;
    newDate: string;
    frequency: number;
  }[];
  totalCount: number;
}

export class AutoReassignService {
  /**
   * Checks if auto-reassignment should run and executes it if needed
   * Should be called when the app starts or periodically
   */
  static async checkAndRunAutoReassign(
    patients: Patient[],
    updatePatient: (id: string, updates: Partial<Patient>) => void,
  ): Promise<{ count: number; message: string }> {
    try {
      const lastRun = await AsyncStorage.getItem(LAST_AUTO_REASSIGN_KEY);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let shouldRun = false;

      if (!lastRun) {
        // Never run before
        shouldRun = true;
      } else {
        const lastRunDate = new Date(lastRun);
        const lastRunMonth = lastRunDate.getMonth();
        const lastRunYear = lastRunDate.getFullYear();

        // Check if we're in a new month
        if (
          currentYear > lastRunYear ||
          (currentYear === lastRunYear && currentMonth > lastRunMonth)
        ) {
          shouldRun = true;
        }
      }

      if (!shouldRun) {
        return { count: 0, message: "No se necesita reasignación este mes" };
      }

      // Get orthodontic patients with frequency configured
      const orthodonticPatients = patients.filter(
        (p) =>
          p.treatmentType === "ortodoncia" &&
          p.appointmentFrequency &&
          p.appointmentFrequency > 0,
      );

      if (orthodonticPatients.length === 0) {
        // Save that we checked, even if no patients to reassign
        await AsyncStorage.setItem(LAST_AUTO_REASSIGN_KEY, now.toISOString());
        return {
          count: 0,
          message: "No hay pacientes de ortodoncia configurados",
        };
      }

      let reassignedCount = 0;
      const patientsAffected: ReassignmentHistoryEntry["patientsAffected"] = [];

      for (const patient of orthodonticPatients) {
        const previousDate = patient.nextControlDate;
        const newDate = await this.reassignPatient(patient, updatePatient);

        patientsAffected.push({
          id: patient.id,
          name: patient.name,
          previousDate: previousDate,
          newDate: newDate,
          frequency: patient.appointmentFrequency || 0,
        });

        reassignedCount++;
      }

      // Save the last run date
      await AsyncStorage.setItem(LAST_AUTO_REASSIGN_KEY, now.toISOString());

      // Save to history
      await this.addToHistory({
        id: now.toISOString(),
        date: now.toISOString(),
        type: "automatic",
        patientsAffected,
        totalCount: reassignedCount,
      });

      return {
        count: reassignedCount,
        message: `Se reasignaron ${reassignedCount} citas automáticamente`,
      };
    } catch (error) {
      console.error("Error en reasignación automática:", error);
      return { count: 0, message: "Error en la reasignación automática" };
    }
  }

  /**
   * Reassigns a single patient's appointment based on their frequency
   * Returns the new appointment date as ISO string
   */
  static async reassignPatient(
    patient: Patient,
    updatePatient: (id: string, updates: Partial<Patient>) => void,
  ): Promise<string> {
    if (!patient.appointmentFrequency) {
      return patient.nextControlDate || new Date().toISOString();
    }

    const baseDate = patient.nextControlDate
      ? new Date(patient.nextControlDate)
      : new Date();

    const nextAppointment = new Date(baseDate);
    nextAppointment.setDate(
      nextAppointment.getDate() + patient.appointmentFrequency * 7,
    );

    const nextAppointmentISO = nextAppointment.toISOString();

    // Update patient data
    updatePatient(patient.id, {
      nextControlDate: nextAppointmentISO,
      lastAppointmentDate: new Date().toISOString(),
    });

    // Schedule notification
    await NotificationService.scheduleAppointmentNotification(
      patient.id,
      patient.name,
      nextAppointment,
    );

    return nextAppointmentISO;
  }

  /**
   * Manually trigger reassignment for all orthodontic patients
   */
  static async manualReassignAll(
    patients: Patient[],
    updatePatient: (id: string, updates: Partial<Patient>) => void,
  ): Promise<{ count: number; message: string }> {
    const orthodonticPatients = patients.filter(
      (p) =>
        p.treatmentType === "ortodoncia" &&
        p.appointmentFrequency &&
        p.appointmentFrequency > 0,
    );

    if (orthodonticPatients.length === 0) {
      return {
        count: 0,
        message: "No hay pacientes de ortodoncia configurados",
      };
    }

    let reassignedCount = 0;
    const patientsAffected: ReassignmentHistoryEntry["patientsAffected"] = [];

    for (const patient of orthodonticPatients) {
      const previousDate = patient.nextControlDate;
      const newDate = await this.reassignPatient(patient, updatePatient);

      patientsAffected.push({
        id: patient.id,
        name: patient.name,
        previousDate: previousDate,
        newDate: newDate,
        frequency: patient.appointmentFrequency || 0,
      });

      reassignedCount++;
    }

    // Update last run date
    const now = new Date();
    await AsyncStorage.setItem(LAST_AUTO_REASSIGN_KEY, now.toISOString());

    // Save to history
    await this.addToHistory({
      id: now.toISOString(),
      date: now.toISOString(),
      type: "manual",
      patientsAffected,
      totalCount: reassignedCount,
    });

    return {
      count: reassignedCount,
      message: `Se reasignaron ${reassignedCount} citas exitosamente`,
    };
  }

  /**
   * Get the last auto-reassign date
   */
  static async getLastAutoReassignDate(): Promise<Date | null> {
    try {
      const lastRun = await AsyncStorage.getItem(LAST_AUTO_REASSIGN_KEY);
      return lastRun ? new Date(lastRun) : null;
    } catch (error) {
      console.error("Error al obtener última fecha de reasignación:", error);
      return null;
    }
  }

  /**
   * Add entry to reassignment history
   */
  static async addToHistory(entry: ReassignmentHistoryEntry): Promise<void> {
    try {
      const history = await this.getHistory();
      history.unshift(entry); // Add to beginning

      // Keep only last 50 entries
      const trimmedHistory = history.slice(0, 50);

      await AsyncStorage.setItem(
        AUTO_REASSIGN_HISTORY_KEY,
        JSON.stringify(trimmedHistory),
      );
    } catch (error) {
      console.error("Error al guardar historial de reasignación:", error);
    }
  }

  /**
   * Get reassignment history
   */
  static async getHistory(): Promise<ReassignmentHistoryEntry[]> {
    try {
      const history = await AsyncStorage.getItem(AUTO_REASSIGN_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error("Error al obtener historial de reasignación:", error);
      return [];
    }
  }

  /**
   * Clear reassignment history
   */
  static async clearHistory(): Promise<void> {
    await AsyncStorage.removeItem(AUTO_REASSIGN_HISTORY_KEY);
  }

  /**
   * Reset the last auto-reassign date (for testing purposes)
   */
  static async resetLastAutoReassignDate(): Promise<void> {
    await AsyncStorage.removeItem(LAST_AUTO_REASSIGN_KEY);
  }
}
