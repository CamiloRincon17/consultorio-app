-- ===========================================================
-- MIGRACIÓN: Soporte para múltiples citas programadas (appointments)
-- Ejecuta este SQL en el SQL Editor de tu proyecto en Supabase
-- ===========================================================

-- Agrega la columna 'appointments' como JSONB a la tabla 'patients'
ALTER TABLE patients ADD COLUMN IF NOT EXISTS appointments JSONB DEFAULT '[]'::jsonb;
