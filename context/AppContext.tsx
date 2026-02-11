import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AutoReassignService } from "../services/AutoReassignService";

// --- Types ---
export interface Visit {
  id: string;
  date: string;
  reason?: string;
  notes?: string;
  treatment?: string;
  cost?: number;
  paid?: boolean;
  transactionId?: string; // Link to associated transaction
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  monthlyFee: number;
  startDate: string;
  notes?: string;
  nextControlDate?: string; // Manual override
  treatmentType?: "ortodoncia" | "general"; // Tipo de tratamiento
  appointmentFrequency?: number; // Frecuencia de citas en semanas (para ortodoncia)
  appointmentDay?: number; // Día del mes para citas de ortodoncia (1-31)
  lastAppointmentDate?: string; // Última cita realizada
  visits?: Visit[]; // Historial de visitas
}

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  description: string;
  patientId?: string;
  patientName?: string; // For anonymous or snapshot
  procedure?: string;
  visitId?: string; // Link to associated visit
}

interface AppData {
  patients: Patient[];
  transactions: Transaction[];
  addPatient: (patient: Omit<Patient, "id">) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importData: (
    patients: Patient[],
    transactions: Transaction[],
  ) => Promise<void>;
  getFinancialSummary: () => {
    income: number;
    expenses: number;
    balance: number;
  };
  getDashboardStats: () => { monthlyIncome: number; weeklyIncome: number };
  getPatientStats: (patientId: string) => {
    totalPaid: number;
    visitCount: number;
  };
  // Visit management functions
  addVisit: (patientId: string, visit: Omit<Visit, "id">) => void;
  updateVisit: (patientId: string, visitId: string, updates: Partial<Visit>) => void;
  deleteVisit: (patientId: string, visitId: string) => void;
  getPatientVisits: (patientId: string) => Visit[];
}

// --- Default State ---
const AppContext = createContext<AppData | undefined>(undefined);

// --- Provider ---
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPatients = await AsyncStorage.getItem(
          "STORAGE_KEY_PATIENTS",
        );
        const storedTransactions = await AsyncStorage.getItem(
          "STORAGE_KEY_TRANSACTIONS",
        );

        if (storedPatients) setPatients(JSON.parse(storedPatients));
        if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data on changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("STORAGE_KEY_PATIENTS", JSON.stringify(patients));
    }
  }, [patients, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(
        "STORAGE_KEY_TRANSACTIONS",
        JSON.stringify(transactions),
      );
    }
  }, [transactions, isLoading]);

  // Migration: Convert existing transactions to visits (run once after data loads)
  useEffect(() => {
    const migrateTransactionsToVisits = async () => {
      if (isLoading) return;

      // Check if migration has already been done
      const migrationDone = await AsyncStorage.getItem("MIGRATION_TRANSACTIONS_TO_VISITS");
      if (migrationDone === "true") return;

      console.log("🔄 Iniciando migración de transacciones a visitas...");

      // Find transactions that:
      // 1. Are INCOME type
      // 2. Have a patientId
      // 3. Don't have a visitId (old transactions)
      const transactionsToMigrate = transactions.filter(
        (t) => t.type === "INCOME" && t.patientId && !t.visitId
      );

      if (transactionsToMigrate.length === 0) {
        console.log("✅ No hay transacciones para migrar");
        await AsyncStorage.setItem("MIGRATION_TRANSACTIONS_TO_VISITS", "true");
        return;
      }

      console.log(`📝 Migrando ${transactionsToMigrate.length} transacciones...`);

      const updatedPatients = [...patients];
      const updatedTransactions = [...transactions];

      transactionsToMigrate.forEach((transaction) => {
        const patientIndex = updatedPatients.findIndex(
          (p) => p.id === transaction.patientId
        );

        if (patientIndex !== -1) {
          const visitId = Math.random().toString(36).substr(2, 9);

          // Create visit from transaction
          const visit: Visit = {
            id: visitId,
            date: transaction.date.split("T")[0], // Extract YYYY-MM-DD
            reason: transaction.procedure || "Pago registrado",
            treatment: transaction.description,
            cost: transaction.amount,
            paid: true,
            notes: "Migrado automáticamente desde transacción existente",
            transactionId: transaction.id,
          };

          // Add visit to patient
          const currentVisits = updatedPatients[patientIndex].visits || [];
          updatedPatients[patientIndex] = {
            ...updatedPatients[patientIndex],
            visits: [visit, ...currentVisits],
          };

          // Link transaction to visit
          const transactionIndex = updatedTransactions.findIndex(
            (t) => t.id === transaction.id
          );
          if (transactionIndex !== -1) {
            updatedTransactions[transactionIndex] = {
              ...updatedTransactions[transactionIndex],
              visitId: visitId,
            };
          }
        }
      });

      // Update state
      setPatients(updatedPatients);
      setTransactions(updatedTransactions);

      // Mark migration as done
      await AsyncStorage.setItem("MIGRATION_TRANSACTIONS_TO_VISITS", "true");
      console.log("✅ Migración completada exitosamente");
    };

    migrateTransactionsToVisits();
  }, [isLoading, patients, transactions]);

  // Auto-reassign orthodontic appointments monthly
  useEffect(() => {
    const runAutoReassign = async () => {
      if (isLoading || patients.length === 0) {
        return;
      }

      const result = await AutoReassignService.checkAndRunAutoReassign(
        patients,
        updatePatient,
      );

      if (result.count > 0) {
        console.log("✅ Reasignación automática:", result.message);

        // Importar Alert de forma dinámica para mostrar notificación
        import("react-native").then(({ Alert }) => {
          Alert.alert(
            "🔄 Reasignación Automática",
            result.message +
            "\n\nPuedes ver el historial en la sección de reasignación de ortodoncia.",
            [{ text: "OK" }],
          );
        });
      }
    };

    runAutoReassign();
  }, [isLoading, patients.length]);

  const addPatient = (newPatient: Omit<Patient, "id">) => {
    const patient: Patient = {
      ...newPatient,
      id: Math.random().toString(36).substr(2, 9), // Simple ID generation
    };
    setPatients((prev) => [...prev, patient]);

    // Schedule notification if nextControlDate exists
    if (patient.nextControlDate) {
      import("../services/NotificationService").then(
        ({ NotificationService }) => {
          NotificationService.scheduleAppointmentNotification(
            patient.id,
            patient.name,
            new Date(patient.nextControlDate!),
          );
        },
      );
    }
  };

  const updatePatient = (id: string, updates: Partial<Patient>) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );

    // Reschedule notification if nextControlDate was updated
    if (updates.nextControlDate !== undefined) {
      const patient = patients.find((p) => p.id === id);
      if (patient) {
        import("../services/NotificationService").then(
          ({ NotificationService }) => {
            if (updates.nextControlDate) {
              NotificationService.scheduleAppointmentNotification(
                id,
                updates.name || patient.name,
                new Date(updates.nextControlDate),
              );
            } else {
              // If nextControlDate was cleared, cancel notification
              NotificationService.cancelAppointmentNotification(id);
            }
          },
        );
      }
    }
  };

  const deletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));

    // Cancel notification for this patient
    import("../services/NotificationService").then(
      ({ NotificationService }) => {
        NotificationService.cancelAppointmentNotification(id);
      },
    );
  };

  const addTransaction = (newTransaction: Omit<Transaction, "id">) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: Math.random().toString(36).substr(2, 9),
    };
    setTransactions((prev) => [transaction, ...prev]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const getFinancialSummary = () => {
    const income = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, curr) => acc + curr.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const getDashboardStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const monthlyIncome = transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        return (
          t.type === "INCOME" &&
          tDate.getMonth() === currentMonth &&
          tDate.getFullYear() === currentYear
        );
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    const weeklyIncome = transactions
      .filter((t) => {
        const tDate = new Date(t.date);
        // Simple check: is it after start of week?
        return t.type === "INCOME" && tDate >= startOfWeek;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { monthlyIncome, weeklyIncome };
  };

  const getPatientStats = useCallback((patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    const patientTransactions = transactions.filter(
      (t) => t.patientId === patientId && t.type === "INCOME",
    );
    const totalPaid = patientTransactions.reduce(
      (acc, curr) => acc + curr.amount,
      0,
    );
    const visitCount = patient?.visits?.length || 0;
    return { totalPaid, visitCount };
  }, [patients, transactions]);

  const importData = async (
    newPatients: Patient[],
    newTransactions: Transaction[],
  ) => {
    try {
      // Reemplazar todos los datos
      setPatients(newPatients);
      setTransactions(newTransactions);

      // Guardar inmediatamente en AsyncStorage
      await AsyncStorage.setItem(
        "STORAGE_KEY_PATIENTS",
        JSON.stringify(newPatients),
      );
      await AsyncStorage.setItem(
        "STORAGE_KEY_TRANSACTIONS",
        JSON.stringify(newTransactions),
      );

      console.log("✅ Datos importados correctamente");

      // Reschedule all notifications
      import("../services/NotificationService").then(
        ({ NotificationService }) => {
          NotificationService.rescheduleAllNotifications(newPatients);
        },
      );
    } catch (error) {
      console.error("❌ Error al importar datos:", error);
      throw error;
    }
  };

  // Visit management functions
  const addVisit = (patientId: string, newVisit: Omit<Visit, "id">) => {
    const visitId = Math.random().toString(36).substr(2, 9);
    let transactionId: string | undefined;

    // If visit has a cost, create a linked transaction
    if (newVisit.cost !== undefined && newVisit.cost > 0) {
      transactionId = Math.random().toString(36).substr(2, 9);

      const patient = patients.find((p) => p.id === patientId);
      const transaction: Transaction = {
        id: transactionId,
        type: "INCOME",
        amount: newVisit.cost,
        date: new Date().toISOString(),
        description: newVisit.treatment || newVisit.reason || "Visita",
        patientId: patientId,
        patientName: patient?.name,
        procedure: newVisit.reason,
        visitId: visitId,
      };

      setTransactions((prev) => [transaction, ...prev]);
    }

    const visit: Visit = {
      ...newVisit,
      id: visitId,
      transactionId,
    };

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId) {
          const visits = p.visits || [];
          return { ...p, visits: [visit, ...visits] };
        }
        return p;
      }),
    );
  };

  const updateVisit = (
    patientId: string,
    visitId: string,
    updates: Partial<Visit>,
  ) => {
    // Find the current visit to get its transactionId
    const patient = patients.find((p) => p.id === patientId);
    const currentVisit = patient?.visits?.find((v) => v.id === visitId);

    // Handle transaction updates
    if (updates.cost !== undefined) {
      if (currentVisit?.transactionId) {
        // Update existing transaction
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === currentVisit.transactionId
              ? {
                ...t,
                amount: updates.cost!,
                description: updates.treatment || updates.reason || t.description,
                procedure: updates.reason || t.procedure,
              }
              : t
          )
        );
      } else if (updates.cost > 0) {
        // Create new transaction if visit now has a cost
        const transactionId = Math.random().toString(36).substr(2, 9);
        const transaction: Transaction = {
          id: transactionId,
          type: "INCOME",
          amount: updates.cost,
          date: new Date().toISOString(),
          description: updates.treatment || updates.reason || "Visita",
          patientId: patientId,
          patientName: patient?.name,
          procedure: updates.reason,
          visitId: visitId,
        };

        setTransactions((prev) => [transaction, ...prev]);
        updates.transactionId = transactionId;
      }
    }

    // Update the visit
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId && p.visits) {
          return {
            ...p,
            visits: p.visits.map((v) =>
              v.id === visitId ? { ...v, ...updates } : v
            ),
          };
        }
        return p;
      }),
    );
  };

  const deleteVisit = (patientId: string, visitId: string) => {
    // Find the visit to get its transactionId before deleting
    const patient = patients.find((p) => p.id === patientId);
    const visit = patient?.visits?.find((v) => v.id === visitId);

    // Delete linked transaction if it exists
    if (visit?.transactionId) {
      setTransactions((prev) =>
        prev.filter((t) => t.id !== visit.transactionId)
      );
    }

    // Delete the visit
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId && p.visits) {
          return {
            ...p,
            visits: p.visits.filter((v) => v.id !== visitId),
          };
        }
        return p;
      }),
    );
  };

  const getPatientVisits = useCallback((patientId: string): Visit[] => {
    const patient = patients.find((p) => p.id === patientId);
    return patient?.visits || [];
  }, [patients]);

  return (
    <AppContext.Provider
      value={{
        patients,
        transactions,
        addPatient,
        updatePatient,
        deletePatient,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        importData,
        getFinancialSummary,
        getDashboardStats,
        getPatientStats,
        addVisit,
        updateVisit,
        deleteVisit,
        getPatientVisits,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// --- Hook ---
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
