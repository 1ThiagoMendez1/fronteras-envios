-- Migración para añadir el campo recipient_document a la tabla shipments

ALTER TABLE public.shipments 
ADD COLUMN IF NOT EXISTS recipient_document TEXT;
