-- ===========================================================
-- ACTUALIZACIÓN: Agregar user_id para separación de datos por doctor
-- Ejecuta esto en el SQL Editor de Supabase
-- ===========================================================

-- 1. Agregar columna user_id a las tablas existentes
ALTER TABLE patients     ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE visits        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE transactions  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Eliminar las políticas abiertas anteriores
DROP POLICY IF EXISTS "allow_all_patients"     ON patients;
DROP POLICY IF EXISTS "allow_all_visits"       ON visits;
DROP POLICY IF EXISTS "allow_all_transactions" ON transactions;

-- 3. Crear políticas RLS por doctor (cada doctor solo ve sus propios datos)

-- Patients: solo el doctor dueño puede ver/insertar/editar/eliminar
CREATE POLICY "patients_own_data" ON patients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Visits: el doctor solo ve las visitas de sus propios pacientes
CREATE POLICY "visits_own_data" ON visits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactions: el doctor solo ve sus propias transacciones
CREATE POLICY "transactions_own_data" ON transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Índices para rendimiento en consultas filtradas por user_id
CREATE INDEX IF NOT EXISTS idx_patients_user_id     ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id       ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
