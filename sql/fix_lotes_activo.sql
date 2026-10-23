-- ============================================================
-- PASO 1: agregar columna activo si no existe
-- ============================================================
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- ============================================================
-- PASO 2: marcar inactivos los lotes propios que ya no se trabajan
-- ============================================================

-- Burgra / Burga (campo arrendado que ya no se trabaja)
UPDATE lotes SET activo = false
WHERE id IN (
  'fbcfe23e-0347-4fe8-afcd-832ccb727fd9',  -- Burga lote 1
  'f128b45e-133b-4ec3-bc5c-f40a50efa9ac'   -- BURGRA General (propietario_id=null)
);

-- SANT YAGO (con espacio, sin guión) — duplicado del campo propio Sant-Yago
UPDATE lotes SET activo = false
WHERE id = '9acafa4a-8f98-4dab-b69a-8db11d18667a';  -- SANT YAGO General (propietario_id=null)

-- MELANO General sin propietario (de la migración cosechadora)
UPDATE lotes SET activo = false
WHERE id = '85e7b8d2-c40d-4410-b370-81c9072f9ed3';  -- MELANO General (propietario_id=null)

-- DON ALFREDO General sin propietario (de la migración cosechadora)
UPDATE lotes SET activo = false
WHERE id = '7fe4e145-267e-47ae-9b34-dba7bbb46af9';  -- DON ALFREDO General (propietario_id=null)

-- ============================================================
-- PASO 3: El Recreo y La Pampa — son de ganadería/terceros,
-- no deben aparecer en Historial de Lotes agrícolas propios.
-- Marcar inactivos hasta asignarles propietario_id real.
-- ============================================================
UPDATE lotes SET activo = false
WHERE campo IN ('El Recreo', 'La Pampa')
  AND propietario_id IS NULL;

-- ============================================================
-- VERIFICACIÓN — ejecutar después para confirmar
-- ============================================================
SELECT campo, lote, propietario_id, activo
FROM lotes
WHERE propietario_id IS NULL
ORDER BY activo DESC, campo, lote;
