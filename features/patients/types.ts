// ─── Patient Domain Types ───────────────────────────────────────────────────

export interface Visit {
  id: string;
  date: string;
  reason?: string;
  notes?: string;
  treatment?: string;
  cost?: number;
  paid?: boolean;
  transactionId?: string; // Enlace a la transacción asociada
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
}
