-- Agregar columna activo a lotes
ALTER TABLE lotes ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- Marcar como inactivos los lotes que ya no se trabajan
-- (ajustar según corresponda — esto es un ejemplo con Burgra)
-- UPDATE lotes SET activo = false WHERE campo = 'Burgra';
