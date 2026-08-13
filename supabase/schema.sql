-- ===========================================================
-- CONSULTORIO APP - Supabase Schema
-- Ejecuta este SQL en el SQL Editor de tu proyecto en Supabase
-- ===========================================================

-- ─── TABLA: patients ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                    TEXT PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  monthly_fee           NUMERIC NOT NULL DEFAULT 0,
  start_date            TEXT NOT NULL,
  notes                 TEXT,
  next_control_date     TEXT,
  treatment_type        TEXT CHECK (treatment_type IN ('ortodoncia', 'general')),
  appointment_frequency INT,
  appointment_day       INT,
  last_appointment_date TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: visits ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  reason         TEXT,
  notes          TEXT,
  treatment      TEXT,
  cost           NUMERIC,
  paid           BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount       NUMERIC NOT NULL,
  date         TEXT NOT NULL,
  description  TEXT NOT NULL,
  patient_id   TEXT,
  patient_name TEXT,
  procedure    TEXT,
  visit_id     TEXT,
  category     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Si la tabla ya existe sin la columna category, agregarla libre de riesgos:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category TEXT;

-- ─── TABLA: specialist_blocks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS specialist_blocks (
  id                     TEXT PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name            TEXT NOT NULL,
  specialty              TEXT,
  date                   TEXT,
  is_recurring           BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_days         INT[],
  start_time             TEXT NOT NULL,
  end_time               TEXT NOT NULL,
  shift_title            TEXT,
  notes                  TEXT,
  rental_fee             NUMERIC,
  finance_transaction_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TABLA: saved_doctors ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_doctors (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  specialty  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ÍNDICES para búsquedas frecuentes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_user_id             ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id               ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id            ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id         ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id      ON transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date             ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_specialist_blocks_user_id    ON specialist_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_doctors_user_id        ON saved_doctors(user_id);

-- ─── ROW LEVEL SECURITY (RLS) ─────────────────────────────────────────────────
-- Habilitamos RLS y restringimos el acceso por user_id.
ALTER TABLE patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_doctors     ENABLE ROW LEVEL SECURITY;

-- Política: solo el usuario dueño (doctor) puede leer y escribir sus propios datos
CREATE POLICY "allow_user_patients"          ON patients          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "allow_user_visits"            ON visits            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "allow_user_transactions"      ON transactions      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "allow_user_specialist_blocks" ON specialist_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "allow_user_saved_doctors"     ON saved_doctors     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
