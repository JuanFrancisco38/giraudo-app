-- Agregar tipo_labor_asociado a la tabla maquinaria
-- Correr en Supabase SQL Editor

ALTER TABLE maquinaria ADD COLUMN IF NOT EXISTS tipo_labor_asociado text;

-- Poblar con los valores del mapa hardcodeado en trabajos.js
-- (los IDs son los que ya estaban en TIPO_LABOR_MAQUINAS)
UPDATE maquinaria SET tipo_labor_asociado = 'corte'             WHERE id = '12ad762c-6a3d-4158-b8a4-417606732785';
UPDATE maquinaria SET tipo_labor_asociado = 'rastrillado'       WHERE id = 'b77334c2-18e8-445d-89cb-77cc4553ca6b';
UPDATE maquinaria SET tipo_labor_asociado = 'enrollado'         WHERE id = '879f7b85-0b7f-4573-ad1d-1d13411b6b8f';
UPDATE maquinaria SET tipo_labor_asociado = 'recoleccion_rollos' WHERE id = 'ae011f70-6b2a-4958-b8b7-9b8cdda3de4d';
UPDATE maquinaria SET tipo_labor_asociado = 'cosecha'           WHERE id = 'bd759fb7-1ae2-4bef-a88a-8df3a7a85937';
UPDATE maquinaria SET tipo_labor_asociado = 'siembra'           WHERE id = 'e45170d7-8851-4a70-9c1b-3c02d048bfa4';
UPDATE maquinaria SET tipo_labor_asociado = 'picado'            WHERE id = '90d4acf6-98ea-4754-967b-a3090a42a960';
UPDATE maquinaria SET tipo_labor_asociado = 'pulverizacion'     WHERE id = 'c0f57a24-d499-4502-8155-965acaa934b7';

-- Verificar
SELECT nombre, categoria, tipo_labor_asociado FROM maquinaria ORDER BY categoria, nombre;
