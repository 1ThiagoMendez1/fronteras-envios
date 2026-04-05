-- Tabla global para roles de la plataforma
CREATE TABLE IF NOT EXISTS public.app_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

INSERT INTO public.app_roles (id, name, description, permissions) VALUES 
('admin', 'Administrador', 'Control total del sistema', '["dashboard","clients","shipments","drivers","financial","daily_close","users"]'),
('operator', 'Operador', 'Gestión operativa', '["dashboard","clients","shipments","daily_close"]')
ON CONFLICT (id) DO NOTHING;
