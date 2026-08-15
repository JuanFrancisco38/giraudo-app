-- Agregar precio de gasoil y total en pesos al cobro de trabajos
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE trabajo_maquinaria
  ADD COLUMN IF NOT EXISTS precio_gasoil_ars numeric,
  ADD COLUMN IF NOT EXISTS cobro_total_pesos  numeric;

-- También en trabajos_agricolas para el dual-write
ALTER TABLE trabajos_agricolas
  ADD COLUMN IF NOT EXISTS precio_gasoil_ars numeric;
