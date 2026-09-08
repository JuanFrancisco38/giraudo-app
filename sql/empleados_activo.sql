-- Corrección de tabla EMPLEADOS — agregar columna activo
-- Correr en Supabase SQL Editor

-- 1. Agregar columna activo (todos quedan true por defecto)
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- 2. Ver qué empleados hay antes de tocar nada
SELECT id, nombre, rol, activo FROM empleados ORDER BY nombre;

-- 3. Marcar inactivos a Maxi (veterinario) y cualquier empleado viejo de
--    henificación que ya no trabaje. AJUSTAR los nombres según lo que devuelva
--    la query anterior.
--    Ejemplos probables — revisar y descomentar los que correspondan:
--
-- UPDATE empleados SET activo = false WHERE nombre ILIKE '%maxi%';
-- UPDATE empleados SET activo = false WHERE nombre ILIKE '%pepe%';
-- UPDATE empleados SET activo = false WHERE nombre = 'Nombre Exacto';

-- 4. Confirmar empleados activos después del paso 3
SELECT nombre, rol, activo FROM empleados ORDER BY activo DESC, nombre;
