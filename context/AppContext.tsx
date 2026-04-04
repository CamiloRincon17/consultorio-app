import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePatientsStore } from "../features/patients/store";
import { useFinanceStore } from "../features/finance/store";
import { runMigrationV1 } from "../services/storage/migrations/v1_transactionsToVisits";
import { AutoReassignService } from "../services/AutoReassignService";
import { PinLockScreen } from "../features/auth/components/PinLockScreen";
import type { Patient, Visit } from "../features/patients/types";
import type { Transaction } from "../features/finance/types";

// Re-exports for compatibility
export type { Patient, Visit } from "../features/patients/types";
export type { Transaction } from "../features/finance/types";

// The AppProvider now acts exclusively as an initialization and hydration wrapper.
// It loads data from AsyncStorage, runs migrations, and populates the Zustand stores.
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const setPatients = usePatientsStore((s) => s.setPatients);
  const setPatientsLoading = usePatientsStore((s) => s.setLoading);
  const setTransactions = useFinanceStore((s) => s.setTransactions);
  const setFinanceLoading = useFinanceStore((s) => s.setLoading);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedPatients = await AsyncStorage.getItem("STORAGE_KEY_PATIENTS");
        const storedTransactions = await AsyncStorage.getItem("STORAGE_KEY_TRANSACTIONS");

        const parsedPatients = storedPatients ? JSON.parse(storedPatients) : [];
        const parsedTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];

        // Run migrations before loading into state
        const migResult = await runMigrationV1(parsedPatients, parsedTransactions);
        
        const finalPatients = (migResult.ran && migResult.migratedCount > 0) 
          ? migResult.updatedPatients 
          : parsedPatients;
          
        const finalTrans = (migResult.ran && migResult.migratedCount > 0) 
          ? migResult.updatedTransactions 
          : parsedTransactions;

        // Populate Zustand stores
        setPatients(finalPatients);
        setTransactions(finalTrans);

        // Auto-reassign orthodontics
        if (finalPatients.length > 0) {
          AutoReassignService.checkAndRunAutoReassign(
            finalPatients, 
            usePatientsStore.getState().updatePatient
          ).then((result) => {
            if (result.count > 0) {
              import("react-native").then(({ Alert }) => {
                Alert.alert(
                  "🔄 Reasignación Automática",
                  result.message + "\n\nPuedes ver el historial en la sección de reasignación.",
                  [{ text: "OK" }]
                );
              });
            }
          });
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setPatientsLoading(false);
        setFinanceLoading(false);
      }
    };

    loadData();
  }, [setFinanceLoading, setPatients, setPatientsLoading, setTransactions]);

  return (
    <>
      {children}
      <PinLockScreen />
    </>
  );
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
      patientsState.setPatients(newPatients);
      financeState.setTransactions(newTransactions);
      
      await AsyncStorage.setItem("STORAGE_KEY_PATIENTS", JSON.stringify(newPatients));
      await AsyncStorage.setItem("STORAGE_KEY_TRANSACTIONS", JSON.stringify(newTransactions));
      
      console.log("✅ Datos importados correctamente");
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
