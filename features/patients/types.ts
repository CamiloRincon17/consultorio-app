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
  /** Estado de sincronización individual de esta visita con Supabase. */
  _syncStatus?: SyncStatus;
  /** Timestamp ISO de la última modificación local (para mostrar "Modificado"). */
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
  nextControlDate?: string; // Override manual de la fecha de control
  treatmentType?: 'ortodoncia' | 'general'; // Tipo de tratamiento
  appointmentFrequency?: number; // Frecuencia de citas en semanas (ortodoncia)
  appointmentDay?: number; // Día del mes para citas de ortodoncia (1-31)
  lastAppointmentDate?: string; // Última cita realizada
  visits?: Visit[]; // Historial de visitas
  /** Metadato local: indica si el paciente ha sido sincronizado con Supabase. */
  _syncStatus?: SyncStatus;
}
