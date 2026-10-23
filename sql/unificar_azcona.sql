-- Unificar "Don Alfredo (Azcona)" dentro de "Azcona"
-- Los lotes 6 y 8 pasan directo; el lote 1 se renombra a "1-DA"
-- para no colisionar con Azcona lote 1 ya existente.

-- Actualizar campo (y lote 1 para evitar duplicado)
UPDATE lotes
SET campo = 'Azcona',
    lote  = CASE lote WHEN '1' THEN '1-DA' ELSE lote END
WHERE campo = 'Don Alfredo (Azcona)'
  AND propietario_id IS NULL;

-- Verificar resultado
SELECT campo, lote, propietario_id, activo
FROM lotes
WHERE campo = 'Azcona' AND propietario_id IS NULL
ORDER BY lote;
