-- ============================================================
-- ESQUEMA DE BASE DE DATOS - Grupo Giraudo - Sistema de Gestión
-- ============================================================
-- Convenciones:
--  - Todas las tablas tienen id uuid (default gen_random_uuid()) y created_at.
--  - "campo" es texto libre (Don Alfredo / Doña Vica / Sant-Yago / Varios).
--  - Montos en pesos como numeric; kg/cantidades como numeric o integer.
--  - Usar CREATE TABLE IF NOT EXISTS para poder correr este script
--    sin riesgo si alguna tabla ya existe de versiones anteriores.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- GANADERÍA
-- ------------------------------------------------------------

create table if not exists animales (
  id uuid primary key default gen_random_uuid(),
  caravana text,
  categoria text not null,            -- Vaca, Vaquillona, Toro, Torito, Ternero, Ternera, Novillo
  sexo text not null,                 -- Macho / Hembra
  raza text default 'Aberdeen Angus',
  fecha_nacimiento date,
  lote text,
  peso_inicial numeric,
  campo text,
  propietario text not null default 'propio',  -- propio / hoteleria
  activo boolean not null default true,
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists eventos_ganaderos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,                 -- Vacunación, Desparasitación, Destete, Nacimiento, Mortandad, etc.
  campo text,
  lote text,
  titulo text,
  cantidad_animales integer,
  detalle jsonb,                      -- {categoria, producto, dosis, observaciones}
  created_at timestamptz not null default now()
);

create table if not exists pesadas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  campo text,
  lote text,
  categoria text,
  cantidad_animales integer,
  peso_promedio numeric,
  peso_total numeric,
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists hoteleria (
  id uuid primary key default gen_random_uuid(),
  propietario text not null,
  fecha_ingreso date,
  fecha_egreso date,
  categoria text not null,
  cantidad integer,
  raza text,
  peso_promedio numeric,
  activo boolean not null default true,
  observaciones text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TRABAJOS (agrícolas + alimentación, vía importador IA)
-- ------------------------------------------------------------

create table if not exists trabajos_agricolas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,                 -- siembra, pulverizacion, cosecha, alimentacion, mantenimiento, etc.
  campo text,
  lote text,
  descripcion text,
  detalle jsonb,                      -- datos específicos según tipo (has, contratista, insumo, dosis, costo, etc.)
  created_at timestamptz not null default now()
);

create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  campo text not null,
  hectareas numeric,
  uso_actual text,                    -- cultivo / pastura actual
  observaciones text,
  created_at timestamptz not null default now()
);

-- Historia de un lote: se consulta filtrando trabajos_agricolas por lote+campo, no hace falta tabla aparte.

create table if not exists certificaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,
  campo text,
  lote text,
  descripcion text,
  archivo_url text,
  vencimiento date,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MAQUINARIA
-- ------------------------------------------------------------

create table if not exists maquinaria (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,               -- Ej: Case Puma 140
  tipo text,                          -- tractor, cosechadora, implemento, etc.
  marca text,
  modelo text,
  anio integer,
  horas_uso numeric,
  estado text default 'operativo',    -- operativo / en reparacion / fuera de servicio
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists mantenimiento (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  maquina_id uuid references maquinaria(id) on delete set null,
  tipo text,                          -- service, reparacion, etc.
  descripcion text,
  horas_maquina numeric,
  costo numeric,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MERCADO
-- ------------------------------------------------------------

create table if not exists precios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  producto text not null,             -- soja, maiz, trigo, girasol, novillo, etc.
  precio numeric not null,
  unidad text,                        -- $/tn, $/kg, $/cab
  fuente text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- LIQUIDACIONES
-- ------------------------------------------------------------

create table if not exists liquidaciones_hacienda (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  numero text,
  consignatario text,
  categoria text,
  cabezas integer,
  kg_totales numeric,
  precio numeric,
  subtotal numeric,
  comision numeric,
  ret_ganancias numeric,
  iva numeric,
  total_neto numeric,
  created_at timestamptz not null default now()
);

create table if not exists liquidaciones_granos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  numero text,
  acopio text,
  cultivo text,                       -- soja, maiz, trigo, girasol
  kg numeric,
  precio numeric,
  subtotal numeric,
  comision numeric,
  flete numeric,
  ret_iva numeric,
  ret_iva_rg4310 numeric,
  ret_ganancias numeric,
  total_neto numeric,
  campania text,                      -- ej: 25/26
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CONTABILIDAD
-- ------------------------------------------------------------

create table if not exists boletas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  proveedor text,
  concepto text,
  campo text,
  monto numeric,
  categoria text,                     -- insumos, combustible, servicios, etc.
  archivo_url text,
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,                 -- ingreso / egreso
  concepto text,
  campo text,
  categoria text,
  monto numeric not null,
  medio_pago text,
  observaciones text,
  created_at timestamptz not null default now()
);

create table if not exists retenciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null,                 -- IVA, Ganancias, IIBB, RG4310, etc.
  origen text,                        -- granos / hacienda / otro
  monto numeric not null,
  comprobante text,
  observaciones text,
  created_at timestamptz not null default now()
);

-- Balance mensual: se calcula de movimientos + liquidaciones + boletas.
-- Se "cierra" manualmente para dejar registro histórico inmutable.
create table if not exists balance_mensual (
  id uuid primary key default gen_random_uuid(),
  anio integer not null,
  mes integer not null,               -- 1-12
  ingresos numeric,
  egresos numeric,
  resultado numeric,
  cerrado boolean not null default false,
  notas text,
  created_at timestamptz not null default now(),
  unique(anio, mes)
);

-- ------------------------------------------------------------
-- ÍNDICES BÁSICOS
-- ------------------------------------------------------------
create index if not exists idx_eventos_fecha on eventos_ganaderos(fecha);
create index if not exists idx_pesadas_fecha on pesadas(fecha);
create index if not exists idx_trabajos_fecha on trabajos_agricolas(fecha);
create index if not exists idx_movimientos_fecha on movimientos(fecha);
create index if not exists idx_precios_producto_fecha on precios(producto, fecha);
