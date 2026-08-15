-- Agregar campos faltantes a la tabla trabajos
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS cantidad_rollos numeric;
ALTER TABLE trabajos ADD COLUMN IF NOT EXISTS rendimiento     numeric;
