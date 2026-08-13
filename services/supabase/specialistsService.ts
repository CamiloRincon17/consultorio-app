import { supabase } from './client';
import type { SpecialistBlock } from '../../features/specialists/types';
import type { SavedDoctor } from '../../features/specialists/store';

/** Obtiene el user_id del usuario actualmente logueado. */
async function getCurrentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('No hay sesión activa');
  return uid;
}

// ─── Mappers: SpecialistBlock DB (snake_case) ↔ App (camelCase) ─────────────

function dbToSpecialistBlock(row: any): SpecialistBlock {
  return {
    id: row.id,
    doctorName: row.doctor_name,
    specialty: row.specialty ?? undefined,
    date: row.date ?? undefined,
    isRecurring: Boolean(row.is_recurring),
    recurringDays: row.recurring_days ?? undefined,
    startTime: row.start_time,
    endTime: row.end_time,
    shiftTitle: row.shift_title ?? undefined,
    notes: row.notes ?? undefined,
    rentalFee: row.rental_fee ? Number(row.rental_fee) : undefined,
    financeTransactionId: row.finance_transaction_id ?? undefined,
  };
}

function specialistBlockToDb(b: SpecialistBlock, userId?: string): Record<string, unknown> {
  return {
    id: b.id,
    user_id: userId ?? undefined,
    doctor_name: b.doctorName,
    specialty: b.specialty ?? null,
    date: b.date ?? null,
    is_recurring: b.isRecurring ?? false,
    recurring_days: b.recurringDays ?? null,
    start_time: b.startTime,
    end_time: b.endTime,
    shift_title: b.shiftTitle ?? null,
    notes: b.notes ?? null,
    rental_fee: b.rentalFee ?? null,
    finance_transaction_id: b.financeTransactionId ?? null,
  };
}

// ─── Mappers: SavedDoctor DB (snake_case) ↔ App (camelCase) ─────────────────

function dbToSavedDoctor(row: any): SavedDoctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty ?? undefined,
  };
}

function savedDoctorToDb(d: SavedDoctor, userId?: string): Record<string, unknown> {
  return {
    id: d.id,
    user_id: userId ?? undefined,
    name: d.name,
    specialty: d.specialty ?? null,
  };
}

// ─── Specialist Blocks CRUD ───────────────────────────────────────────────────

export async function fetchAllSpecialistBlocks(userId?: string): Promise<SpecialistBlock[]> {
  const uid = userId ?? (await getCurrentUserId());

  const { data, error } = await supabase
    .from('specialist_blocks')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(dbToSpecialistBlock);
}

export async function insertSpecialistBlock(block: SpecialistBlock): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('specialist_blocks')
    .upsert(specialistBlockToDb(block, userId));
  if (error) throw error;
}

export async function updateSpecialistBlockDb(
  id: string,
  updates: Partial<SpecialistBlock>
): Promise<void> {
  const userId = await getCurrentUserId();
  const dbUpdates: Record<string, unknown> = {};

  if (updates.doctorName !== undefined)           dbUpdates.doctor_name = updates.doctorName;
  if (updates.specialty !== undefined)            dbUpdates.specialty = updates.specialty ?? null;
  if (updates.date !== undefined)                 dbUpdates.date = updates.date ?? null;
  if (updates.isRecurring !== undefined)          dbUpdates.is_recurring = updates.isRecurring;
  if (updates.recurringDays !== undefined)       dbUpdates.recurring_days = updates.recurringDays ?? null;
  if (updates.startTime !== undefined)           dbUpdates.start_time = updates.startTime;
  if (updates.endTime !== undefined)             dbUpdates.end_time = updates.endTime;
  if (updates.shiftTitle !== undefined)          dbUpdates.shift_title = updates.shiftTitle ?? null;
  if (updates.notes !== undefined)               dbUpdates.notes = updates.notes ?? null;
  if (updates.rentalFee !== undefined)           dbUpdates.rental_fee = updates.rentalFee ?? null;
  if (updates.financeTransactionId !== undefined) dbUpdates.finance_transaction_id = updates.financeTransactionId ?? null;

  const { error } = await supabase
    .from('specialist_blocks')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteSpecialistBlockDb(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('specialist_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function bulkInsertSpecialistBlocks(blocks: SpecialistBlock[]): Promise<void> {
  if (blocks.length === 0) return;
  const userId = await getCurrentUserId();
  const rows = blocks.map((b) => ({ ...specialistBlockToDb(b, userId), user_id: userId }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('specialist_blocks').upsert(batch);
    if (error) throw error;
  }
}

// ─── Saved Doctors CRUD ───────────────────────────────────────────────────────

export async function fetchAllSavedDoctors(userId?: string): Promise<SavedDoctor[]> {
  const uid = userId ?? (await getCurrentUserId());

  const { data, error } = await supabase
    .from('saved_doctors')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(dbToSavedDoctor);
}

export async function insertSavedDoctor(doctor: SavedDoctor): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('saved_doctors')
    .upsert(savedDoctorToDb(doctor, userId));
  if (error) throw error;
}

export async function deleteSavedDoctorDb(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('saved_doctors')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function bulkInsertSavedDoctors(doctors: SavedDoctor[]): Promise<void> {
  if (doctors.length === 0) return;
  const userId = await getCurrentUserId();
  const rows = doctors.map((d) => ({ ...savedDoctorToDb(d, userId), user_id: userId }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('saved_doctors').upsert(batch);
    if (error) throw error;
  }
}
