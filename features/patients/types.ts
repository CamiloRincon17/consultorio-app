// ─── Patient Domain Types ───────────────────────────────────────────────────

/** Estado de sincronización con Supabase. */
export type SyncStatus = 'synced' | 'pending' | 'error';

export interface Visit {
  id: string;
  date: string;
  reason?: string;
  notes?: string;
  treatment?: string;
  cost?: number;
  paid?: boolean;
  transactionId?: string; // Enlace a la transacción asociada
  photos?: string[]; // Fotografías de procedimientos asociadas a la visita
  /** Estado de sincronización individual de esta visita con Supabase. */
  _syncStatus?: SyncStatus;
  /** Timestamp ISO de la última modificación local (para mostrar "Modificado"). */
  _lastModified?: string;
}

export interface Appointment {
  id: string;
  date: string; // ISO string de la fecha y hora de la cita programada
  reason?: string; // Motivo de la cita (ej. "Control", "Ajuste de brackets", "Limpieza")
  notes?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  /** Estado de sincronización individual de esta cita con Supabase. */
  _syncStatus?: SyncStatus;
  /** Timestamp ISO de la última modificación local. */
  _lastModified?: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  monthlyFee: number;
  startDate: string;
  notes?: string;
  nextControlDate?: string; // Fecha de la próxima cita (mantenida sincronizada con la cita más próxima)
  treatmentType?: 'ortodoncia' | 'general'; // Tipo de tratamiento
  appointmentFrequency?: number; // Frecuencia de citas en semanas (ortodoncia)
  appointmentDay?: number; // Día del mes para citas de ortodoncia (1-31)
  lastAppointmentDate?: string; // Última cita realizada
  appointments?: Appointment[]; // Lista de citas programadas
  visits?: Visit[]; // Historial de visitas
  photos?: string[]; // Fotografías clínicas del paciente
  /** Metadato local: indica si el paciente ha sido sincronizado con Supabase. */
  _syncStatus?: SyncStatus;
}
