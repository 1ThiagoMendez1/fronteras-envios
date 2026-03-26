-- Add comentarios JSONB column to shipments table to store chat history
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS comentarios jsonb NULL DEFAULT '[]'::jsonb;
