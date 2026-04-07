-- Add `status` column to `daily_close` table

ALTER TABLE public.daily_close
ADD COLUMN status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pre_close', 'completed'));
