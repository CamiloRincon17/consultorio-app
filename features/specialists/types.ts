// ─── Specialist Domain Types ───────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface SpecialistBlock {
  id: string;
  doctorName: string;         // Nombre del especialista (ej. "Dr. Gómez")
  specialty?: string;         // Especialidad (ej. "Ortodoncia", "Endodoncia")
  date?: string;              // ISO date string (YYYY-MM-DD) para franja única
  isRecurring?: boolean;      // Si se repite habitualmente ciertos días de la semana
  recurringDays?: number[];   // Días de la semana [0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb]
  startTime: string;          // Hora inicio en formato "HH:mm" (ej. "08:00")
  endTime: string;            // Hora fin en formato "HH:mm" (ej. "12:00")
  shiftTitle?: string;        // Título del turno (ej. "Turno Mañana")
  notes?: string;             // Observaciones opcionales
  rentalFee?: number;         // Valor por uso/alquiler del consultorio (opcional)
  financeTransactionId?: string; // ID de la transacción en finanzas vinculada al cobro
  _syncStatus?: SyncStatus;   // Estado de sincronización local/nube
  _lastModified?: string;     // ISO Timestamp
}
