-- ATENCIÓN: Esto borrará los datos actuales en Supabase para que el respaldo entre limpio.
-- Asegúrate de que tu respaldo (JSON) tiene todo lo que necesitas antes de ejecutar esto.

TRUNCATE TABLE patients CASCADE;
TRUNCATE TABLE transactions CASCADE;
