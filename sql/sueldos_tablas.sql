-- Módulo de Sueldos — tablas nuevas
-- Correr en Supabase SQL Editor

-- 1. Préstamos (va primero, porque empleado_entrega lo referencia)
CREATE TABLE IF NOT EXISTS empleado_prestamo (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id     uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha           date NOT NULL,
  descripcion     text,
  monto_total     numeric NOT NULL,
  cantidad_cuotas int  NOT NULL DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

-- 2. Entregas puntuales (puede venir de un préstamo)
CREATE TABLE IF NOT EXISTS empleado_entrega (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha       date NOT NULL,
  descripcion text,
  monto       numeric NOT NULL DEFAULT 0,
  prestamo_id uuid REFERENCES empleado_prestamo(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- 3. Ítems de la ficha mensual (sueldo, aguinaldo, libres devengado/recibido)
CREATE TABLE IF NOT EXISTS empleado_ficha_item (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  anio        int  NOT NULL,
  mes         int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  bloque      text NOT NULL CHECK (bloque IN ('devengado','recibido')),
  concepto    text NOT NULL,
  monto       numeric NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- 4. Porcentaje de comisión por tipo de labor
CREATE TABLE IF NOT EXISTS comision_tipo_labor (
  tipo_labor text PRIMARY KEY,
  porcentaje numeric NOT NULL
);
INSERT INTO comision_tipo_labor (tipo_labor, porcentaje) VALUES
  ('corte',    8),
  ('enrollado', 8)
ON CONFLICT DO NOTHING;

-- RLS: acceso anónimo igual que el resto del proyecto
ALTER TABLE empleado_prestamo   ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_entrega    ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado_ficha_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE comision_tipo_labor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON empleado_prestamo   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON empleado_entrega    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON empleado_ficha_item FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON comision_tipo_labor FOR ALL TO anon USING (true) WITH CHECK (true);
