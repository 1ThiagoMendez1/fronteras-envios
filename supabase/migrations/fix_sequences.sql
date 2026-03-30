-- ============================================================
-- FRONTERAS ENVÍOS - REAJUSTE DE SECUENCIAS
-- ============================================================
-- Instrucciones: Pega esto en el SQL Editor de tu "NUEVA" 
-- base de datos Supabase y ejecútalo. 
-- Esto sincronizará los autoincrementables con los IDs 
-- altos que acabamos de migrar para evitar errores de 
-- "duplicate key value violates unique constraint".

SELECT setval('public.clients_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.clients));
SELECT setval('public.drivers_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.drivers));
SELECT setval('public.shipments_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.shipments));
SELECT setval('public.shipment_history_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.shipment_history));
SELECT setval('public.financial_movements_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.financial_movements));
SELECT setval('public.daily_close_id_seq', (SELECT COALESCE(MAX(id), 1)::bigint FROM public.daily_close));

