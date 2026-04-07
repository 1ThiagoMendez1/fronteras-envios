DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name 
              FROM information_schema.constraint_column_usage 
              WHERE table_name = 'drivers' AND column_name = 'vehicle_type') 
    LOOP
        EXECUTE 'ALTER TABLE public.drivers DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END$$;

ALTER TABLE public.drivers ADD CONSTRAINT drivers_vehicle_type_check CHECK (vehicle_type IN ('motorcycle', 'car', 'van', 'truck', 'office'));
