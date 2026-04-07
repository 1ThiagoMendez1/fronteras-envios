-- ============================================================
-- Fronteras Envíos – JWT Custom Claims Hook
-- Este hook inyecta role, is_active, branch y permissions
-- directamente en el access_token JWT de cada usuario.
-- ============================================================

-- Función que Supabase/GoTrue ejecuta al generar cada JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_is_active boolean;
  user_branch text;
  user_permissions jsonb;
BEGIN
  claims := event->'claims';

  -- Leer datos del perfil en la tabla profiles
  SELECT p.role, p.is_active, p.permissions
  INTO user_role, user_is_active, user_permissions
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  -- Leer branch de user_metadata (se guarda ahí al crear usuario)
  user_branch := COALESCE(
    claims->'user_metadata'->>'branch',
    'Bogotá'
  );

  -- Si no hay perfil, usar defaults desde user_metadata
  IF user_role IS NULL THEN
    user_role := COALESCE(claims->'user_metadata'->>'role', 'operator');
    user_is_active := TRUE;
    user_permissions := '{}'::jsonb;
  END IF;

  -- Inyectar claims personalizados en el JWT
  claims := jsonb_set(claims, '{app_role}', to_jsonb(user_role));
  claims := jsonb_set(claims, '{app_is_active}', to_jsonb(user_is_active));
  claims := jsonb_set(claims, '{app_branch}', to_jsonb(user_branch));
  claims := jsonb_set(claims, '{app_permissions}', COALESCE(user_permissions, '{}'::jsonb));

  -- Actualizar el evento con los claims modificados
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Permisos necesarios para que el hook funcione
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

-- ============================================================
-- INSTRUCCIONES POST-MIGRACIÓN (Self-Hosted GoTrue):
-- 
-- Agrega estas variables de entorno a tu servicio GoTrue/Auth:
--
--   GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_ENABLED=true
--   GOTRUE_HOOK_CUSTOM_ACCESS_TOKEN_URI=pg-functions://postgres/public/custom_access_token_hook
--
-- Luego reinicia el servicio auth de Supabase.
-- ============================================================
