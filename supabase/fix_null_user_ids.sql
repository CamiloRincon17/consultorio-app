-- Este script asigna tu usuario a todos los registros antiguos que se quedaron sin dueño
-- Ejecútalo en el SQL Editor de Supabase

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obtenemos el ID del primer usuario en tu sistema
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Asignamos los registros huérfanos a tu usuario
    UPDATE patients SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE visits SET user_id = v_user_id WHERE user_id IS NULL;
    UPDATE transactions SET user_id = v_user_id WHERE user_id IS NULL;
  END IF;
END $$;
