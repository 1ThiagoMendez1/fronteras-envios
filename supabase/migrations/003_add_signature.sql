-- ============================================================
-- Fronteras Envíos – Add Driver Signature Column
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS driver_signature TEXT;
