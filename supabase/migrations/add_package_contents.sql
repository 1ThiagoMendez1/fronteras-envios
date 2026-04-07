-- Agregar columna para guardar el contenido declarado del paquete
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS package_contents TEXT DEFAULT NULL;
