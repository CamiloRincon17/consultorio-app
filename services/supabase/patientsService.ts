import { supabase } from './client';
import type { Patient, Visit, Appointment } from '../../features/patients/types';

/** Obtiene el user_id del doctor actualmente logueado. */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('No hay sesión activa');
  return uid;
}

// ─── Mappers: DB (snake_case) ↔ App (camelCase) ───────────────────────────────

function dbToVisit(row: any): Visit {
  let parsedPhotos: string[] = [];
  if ('photos' in row && row.photos) {
    if (Array.isArray(row.photos)) {
      parsedPhotos = row.photos;
    } else if (typeof row.photos === 'string') {
      try {
        parsedPhotos = JSON.parse(row.photos);
      } catch {
        parsedPhotos = [];
      }
    }
  }

  return {
    id: row.id,
    date: row.date,
    reason: row.reason ?? undefined,
    notes: row.notes ?? undefined,
    treatment: row.treatment ?? undefined,
    cost: row.cost !== null ? Number(row.cost) : undefined,
    paid: row.paid,
    transactionId: row.transaction_id ?? undefined,
    photos: parsedPhotos.length > 0 ? parsedPhotos : undefined,
  };
}

function dbToPatient(row: any, visits: Visit[] = []): Patient {
  let parsedPhotos: string[] = [];
  if ('photos' in row && row.photos) {
    if (Array.isArray(row.photos)) {
      parsedPhotos = row.photos;
    } else if (typeof row.photos === 'string') {
      try {
        parsedPhotos = JSON.parse(row.photos);
      } catch {
        parsedPhotos = [];
      }
    }
  }

  let parsedAppointments: Appointment[] = [];
  if (row.appointments) {
    if (Array.isArray(row.appointments)) {
      parsedAppointments = row.appointments;
    } else if (typeof row.appointments === 'string') {
      try {
        parsedAppointments = JSON.parse(row.appointments);
      } catch {
        parsedAppointments = [];
      }
    }
  }

  // Fallback de compatibilidad: si no hay citas en 'appointments' pero sí hay 'next_control_date', crear cita inicial
  if (parsedAppointments.length === 0 && row.next_control_date) {
    parsedAppointments = [{
      id: `legacy-${row.id}`,
      date: row.next_control_date,
      reason: row.treatment_type === 'ortodoncia' ? 'Control de ortodoncia' : 'Consulta',
      status: 'scheduled',
    }];
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    monthlyFee: Number(row.monthly_fee),
    startDate: row.start_date,
    notes: row.notes ?? undefined,
    nextControlDate: row.next_control_date ?? undefined,
    treatmentType: row.treatment_type ?? undefined,
    appointmentFrequency: row.appointment_frequency ?? undefined,
    appointmentDay: row.appointment_day ?? undefined,
    lastAppointmentDate: row.last_appointment_date ?? undefined,
    appointments: parsedAppointments,
    visits,
    photos: parsedPhotos.length > 0 ? parsedPhotos : undefined,
  };
}

function patientToDb(patient: Patient, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: patient.id,
    user_id: userId,
    name: patient.name,
    phone: patient.phone ?? '',
    email: patient.email ?? null,
    // Coerce null/undefined a 0 para cumplir con NOT NULL en la DB
    monthly_fee: patient.monthlyFee ?? 0,
    start_date: patient.startDate,
    notes: patient.notes ?? null,
    next_control_date: patient.nextControlDate ?? null,
    treatment_type: patient.treatmentType ?? null,
    appointment_frequency: patient.appointmentFrequency ?? null,
    appointment_day: patient.appointmentDay ?? null,
    last_appointment_date: patient.lastAppointmentDate ?? null,
  };

  // Solo incluir 'appointments' si contiene elementos para evitar PGRST204 si la columna aún no existe en Supabase
  if (patient.appointments && patient.appointments.length > 0) {
    row.appointments = patient.appointments;
  }

  // Solo incluir 'photos' si contiene elementos para evitar PGRST204 si la columna no existe en Supabase
  if (patient.photos && patient.photos.length > 0) {
    row.photos = patient.photos;
  }

  return row;
}

function visitToDb(visit: Visit, patientId: string, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: visit.id,
    user_id: userId,
    patient_id: patientId,
    date: visit.date,
    reason: visit.reason ?? null,
    notes: visit.notes ?? null,
    treatment: visit.treatment ?? null,
    cost: visit.cost ?? null,
    paid: visit.paid ?? false,
    transaction_id: visit.transactionId ?? null,
  };

  // Solo incluir 'photos' si contiene elementos para evitar PGRST204 si la columna no existe en Supabase
  if (visit.photos && visit.photos.length > 0) {
    row.photos = visit.photos;
  }

  return row;
}

// ─── Patients CRUD ────────────────────────────────────────────────────────────

/** Carga todos los pacientes del doctor con sus visitas embebidas. */
export async function fetchAllPatients(userId?: string): Promise<Patient[]> {
  // Obtener userId si no se pasó explícitamente
  const uid = userId ?? (await getCurrentUserId());

  const [patientsRes, visitsRes] = await Promise.all([
    supabase
      .from('patients')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true }),
    supabase
      .from('visits')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
  ]);

  if (patientsRes.error) throw patientsRes.error;
  if (visitsRes.error) throw visitsRes.error;

  // Agrupa visitas por patient_id
  const visitsByPatient = (visitsRes.data ?? []).reduce<Record<string, Visit[]>>((acc, row) => {
    const v = dbToVisit(row);
    if (!acc[row.patient_id]) acc[row.patient_id] = [];
    acc[row.patient_id].push(v);
    return acc;
  }, {});

  return (patientsRes.data ?? []).map((row) =>
    dbToPatient(row, visitsByPatient[row.id] ?? [])
  );
}

export async function insertPatient(patient: Patient): Promise<void> {
  const userId = await getCurrentUserId();
  const payload = patientToDb(patient, userId);
  const { error } = await supabase.from('patients').upsert(payload);
  if (error && (error.code === 'PGRST204' || error.message?.includes('appointments'))) {
    delete payload.appointments;
    const retry = await supabase.from('patients').upsert(payload);
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function updatePatientDb(id: string, updates: Partial<Patient>): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined)                dbUpdates.name = updates.name;
  if (updates.phone !== undefined)               dbUpdates.phone = updates.phone;
  if (updates.email !== undefined)               dbUpdates.email = updates.email ?? null;
  if (updates.monthlyFee !== undefined)          dbUpdates.monthly_fee = updates.monthlyFee;
  if (updates.startDate !== undefined)           dbUpdates.start_date = updates.startDate;
  if (updates.notes !== undefined)               dbUpdates.notes = updates.notes ?? null;
  // Usar 'in' para detectar el campo incluso cuando su valor es undefined (quitar cita)
  if ('nextControlDate' in updates)              dbUpdates.next_control_date = updates.nextControlDate ?? null;
  if (updates.treatmentType !== undefined)       dbUpdates.treatment_type = updates.treatmentType ?? null;
  if (updates.appointmentFrequency !== undefined) dbUpdates.appointment_frequency = updates.appointmentFrequency ?? null;
  if (updates.appointmentDay !== undefined)      dbUpdates.appointment_day = updates.appointmentDay ?? null;
  if (updates.lastAppointmentDate !== undefined) dbUpdates.last_appointment_date = updates.lastAppointmentDate ?? null;
  if (updates.appointments !== undefined)        dbUpdates.appointments = updates.appointments;
  if (updates.photos !== undefined && updates.photos.length > 0) dbUpdates.photos = updates.photos;

  const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id).eq('user_id', userId);
  if (error && (error.code === 'PGRST204' || error.message?.includes('appointments'))) {
    delete dbUpdates.appointments;
    const retry = await supabase.from('patients').update(dbUpdates).eq('id', id).eq('user_id', userId);
    if (retry.error) throw retry.error;
    return;
  }
  if (error) throw error;
}

export async function deletePatientDb(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  // ON DELETE CASCADE elimina automáticamente las visitas asociadas
  const { error } = await supabase.from('patients').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ─── Visits CRUD ──────────────────────────────────────────────────────────────

export async function insertVisit(visit: Visit, patientId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('visits').upsert(visitToDb(visit, patientId, userId));
  if (error) throw error;
}

export async function updateVisitDb(visitId: string, updates: Partial<Visit>, patientId?: string): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates: Record<string, unknown> = {};
  if (updates.date !== undefined)          dbUpdates.date = updates.date;
  if (updates.reason !== undefined)        dbUpdates.reason = updates.reason ?? null;
  if (updates.notes !== undefined)         dbUpdates.notes = updates.notes ?? null;
  if (updates.treatment !== undefined)     dbUpdates.treatment = updates.treatment ?? null;
  if (updates.cost !== undefined)          dbUpdates.cost = updates.cost ?? null;
  if (updates.paid !== undefined)          dbUpdates.paid = updates.paid;
  if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId ?? null;
  if (updates.photos !== undefined && updates.photos.length > 0) dbUpdates.photos = updates.photos;

  const { error } = await supabase.from('visits').update(dbUpdates).eq('id', visitId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteVisitDb(visitId: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('visits').delete().eq('id', visitId).eq('user_id', userId);
  if (error) throw error;
}

/** Inserta múltiples pacientes y sus visitas en lote (usado por la migración e importación de respaldos). */
export async function bulkInsertPatients(patients: Patient[]): Promise<void> {
  const userId = await getCurrentUserId();

  // Siempre sobrescribir user_id con el usuario actual para cumplir con las
  // políticas RLS de Supabase, sin importar qué user_id tenga el respaldo.
  // patientToDb ya incluye user_id, pero lo forzamos explícitamente por seguridad.
  const patientRows = patients.map((p) => ({ ...patientToDb(p, userId), user_id: userId }));
  const visitRows = patients.flatMap((p) =>
    (p.visits ?? []).map((v) => ({ ...visitToDb(v, p.id, userId), user_id: userId }))
  );

  // Insertar en lotes de 50 para evitar límites de payload de Supabase
  const BATCH_SIZE = 50;
  for (let i = 0; i < patientRows.length; i += BATCH_SIZE) {
    const batch = patientRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('patients').upsert(batch);
    if (error) throw error;
  }
  for (let i = 0; i < visitRows.length; i += BATCH_SIZE) {
    const batch = visitRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('visits').upsert(batch);
    if (error) throw error;
  }
}
