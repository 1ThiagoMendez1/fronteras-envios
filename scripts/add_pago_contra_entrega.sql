-- Script SQL para añadir los campos de Pago Contra Entrega.
-- Por favor, ejecuta esto en el SQL Editor de Supabase.

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS cash_on_delivery numeric DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS is_cash_on_delivery_collected boolean DEFAULT false;

-- Opcional: comentar la tabla para entender mejor
COMMENT ON COLUMN public.shipments.cash_on_delivery IS 'Monto a cobrar en modalidad contra entrega';
COMMENT ON COLUMN public.shipments.is_cash_on_delivery_collected IS 'Indica si el dinero del contra entrega ya fue recaudado por la oficina';
