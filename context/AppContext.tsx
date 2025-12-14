import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// --- Types ---
export interface Patient {
    id: string;
    name: string;
    phone: string;
    email?: string;
    monthlyFee: number;
    startDate: string;
    notes?: string;
    nextControlDate?: string; // Manual override
}

export interface Transaction {
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    date: string;
    description: string;
    patientId?: string;
    patientName?: string; // For anonymous or snapshot
    procedure?: string;
}

interface AppData {
    patients: Patient[];
    transactions: Transaction[];
    addPatient: (patient: Omit<Patient, 'id'>) => void;
    updatePatient: (id: string, updates: Partial<Patient>) => void;
    deletePatient: (id: string) => void;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    importData: (patients: Patient[], transactions: Transaction[]) => Promise<void>;
    getFinancialSummary: () => { income: number; expenses: number; balance: number };
    getPatientStats: (patientId: string) => { totalPaid: number; visitCount: number };
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
                const storedPatients = await AsyncStorage.getItem('STORAGE_KEY_PATIENTS');
                const storedTransactions = await AsyncStorage.getItem('STORAGE_KEY_TRANSACTIONS');

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
            AsyncStorage.setItem('STORAGE_KEY_PATIENTS', JSON.stringify(patients));
        }
    }, [patients, isLoading]);

    useEffect(() => {
        if (!isLoading) {
            AsyncStorage.setItem('STORAGE_KEY_TRANSACTIONS', JSON.stringify(transactions));
        }
    }, [transactions, isLoading]);

    const addPatient = (newPatient: Omit<Patient, 'id'>) => {
        const patient: Patient = {
            ...newPatient,
            id: Math.random().toString(36).substr(2, 9), // Simple ID generation
        };
        setPatients(prev => [...prev, patient]);

        // Schedule notification if nextControlDate exists
        if (patient.nextControlDate) {
            import('../services/NotificationService').then(({ NotificationService }) => {
                NotificationService.scheduleAppointmentNotification(
                    patient.id,
                    patient.name,
                    new Date(patient.nextControlDate!)
                );
            });
        }
    };

    const updatePatient = (id: string, updates: Partial<Patient>) => {
        setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        // Reschedule notification if nextControlDate was updated
        if (updates.nextControlDate !== undefined) {
            const patient = patients.find(p => p.id === id);
            if (patient) {
                import('../services/NotificationService').then(({ NotificationService }) => {
                    if (updates.nextControlDate) {
                        NotificationService.scheduleAppointmentNotification(
                            id,
                            updates.name || patient.name,
                            new Date(updates.nextControlDate)
                        );
                    } else {
                        // If nextControlDate was cleared, cancel notification
                        NotificationService.cancelAppointmentNotification(id);
                    }
                });
            }
        }
    };

    const deletePatient = (id: string) => {
        setPatients(prev => prev.filter(p => p.id !== id));

        // Cancel notification for this patient
        import('../services/NotificationService').then(({ NotificationService }) => {
            NotificationService.cancelAppointmentNotification(id);
        });
    };

    const addTransaction = (newTransaction: Omit<Transaction, 'id'>) => {
        const transaction: Transaction = {
            ...newTransaction,
            id: Math.random().toString(36).substr(2, 9),
        };
        setTransactions(prev => [transaction, ...prev]);
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const getFinancialSummary = () => {
        const income = transactions
            .filter(t => t.type === 'INCOME')
            .reduce((acc, curr) => acc + curr.amount, 0);
        const expenses = transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((acc, curr) => acc + curr.amount, 0);
        return { income, expenses, balance: income - expenses };
    };

    const getPatientStats = (patientId: string) => {
        const patientTransactions = transactions.filter(t => t.patientId === patientId && t.type === 'INCOME');
        const totalPaid = patientTransactions.reduce((acc, curr) => acc + curr.amount, 0);
        const visitCount = patientTransactions.length;
        return { totalPaid, visitCount };
    };

    const importData = async (newPatients: Patient[], newTransactions: Transaction[]) => {
        try {
            // Reemplazar todos los datos
            setPatients(newPatients);
            setTransactions(newTransactions);

            // Guardar inmediatamente en AsyncStorage
            await AsyncStorage.setItem('STORAGE_KEY_PATIENTS', JSON.stringify(newPatients));
            await AsyncStorage.setItem('STORAGE_KEY_TRANSACTIONS', JSON.stringify(newTransactions));

            console.log('✅ Datos importados correctamente');

            // Reschedule all notifications
            import('../services/NotificationService').then(({ NotificationService }) => {
                NotificationService.rescheduleAllNotifications(newPatients);
            });
        } catch (error) {
            console.error('❌ Error al importar datos:', error);
            throw error;
        }
    };

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
                getPatientStats,
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
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
