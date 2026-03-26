-- ============================================================
-- Fronteras Envíos – Clients Table Migration v2
-- Run this in Supabase SQL Editor
-- ============================================================
-- Adds: tipo_cliente, tipo_identificacion, apellido, razon_social,
--       responsable_iva, regimen, departamento, categoria
-- NOTE: No CHECK constraints on these columns to allow easy option
--       expansion from the frontend without altering the schema.
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tipo_cliente       TEXT,
  ADD COLUMN IF NOT EXISTS tipo_identificacion TEXT,
  ADD COLUMN IF NOT EXISTS apellido            TEXT,
  ADD COLUMN IF NOT EXISTS razon_social        TEXT,
  ADD COLUMN IF NOT EXISTS responsable_iva     TEXT,
  ADD COLUMN IF NOT EXISTS regimen             TEXT,
  ADD COLUMN IF NOT EXISTS departamento        TEXT,
  ADD COLUMN IF NOT EXISTS categoria           TEXT;

-- Optional: set sensible defaults on existing rows
UPDATE public.clients
SET
  tipo_cliente        = 'NATURAL',
  tipo_identificacion = 'CC',
  responsable_iva     = 'NO',
  regimen             = 'ORDINARIO',
  categoria           = 'CLIENTE'
WHERE tipo_cliente IS NULL;

-- Confirm columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'clients'
ORDER BY ordinal_position;
