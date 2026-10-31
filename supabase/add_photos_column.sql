-- ===========================================================
-- CONSULTORIO APP - Agregar columna 'photos' a Supabase
-- Ejecuta este script en el SQL Editor de Supabase si deseas
-- guardar fotografías clínicas en la base de datos remota.
-- ===========================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
