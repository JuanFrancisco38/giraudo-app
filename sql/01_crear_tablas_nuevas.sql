-- ============================================================
-- Módulo Trabajos — Grupo Giraudo
-- Fase 1: Crear tablas nuevas (trabajos_agricolas NO se toca)
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- PARTES: terceros (clientes, contratistas, propietarios de campo ajeno)
create table if not exists partes (
  id   uuid primary key default gen_random_uuid(),
  nombre text not null
);

-- LOTES: cada combinación establecimiento + número de lote
-- propietario_id null = campo propio del Grupo Giraudo
create table if not exists lotes (
  id              uuid primary key default gen_random_uuid(),
  establecimiento text not null,
  lote            text not null,
  propietario_id  uuid references partes(id),
  hectareas       numeric,
  cultivo_actual  text
);

-- EMPLEADOS: operarios propios
create table if not exists empleados (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  rol    text
);

-- TRABAJOS: tabla central, un registro por evento de campo
-- tipo_labor: siembra | pulverizacion | fertilizacion | cosecha |
--             corte | rastrillado | enrollado | recoleccion_rollos |
--             picado | movimiento_suelos
-- origen_id: id del registro original en trabajos_agricolas (trazabilidad)
create table if not exists trabajos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null,
  tipo_labor text not null,
  lote_id    uuid references lotes(id),
  hectareas  numeric,
  cultivo    text,
  campania   text,
  origen_id  text
);

-- TRABAJO_INSUMOS: semillas, agroquímicos, fertilizantes aplicados
create table if not exists trabajo_insumos (
  id          uuid primary key default gen_random_uuid(),
  trabajo_id  uuid references trabajos(id) on delete cascade,
  insumo      text,
  cantidad    text,
  costo_total numeric
);

-- TRABAJO_MAQUINARIA: cuando lo hace maquinaria/operario propio
create table if not exists trabajo_maquinaria (
  id           uuid primary key default gen_random_uuid(),
  trabajo_id   uuid references trabajos(id) on delete cascade,
  maquina_id   uuid references maquinaria(id),
  operario_id  uuid references empleados(id),
  horas        numeric,
  tarifa_gasoil numeric,
  costo        numeric
);

-- TRABAJO_CONTRATISTA: cuando lo hace un tercero contratado
create table if not exists trabajo_contratista (
  id              uuid primary key default gen_random_uuid(),
  trabajo_id      uuid references trabajos(id) on delete cascade,
  contratista_id  uuid references partes(id),
  costo           numeric
);

-- COBROS: cobranza a terceros (en litros de gasoil como unidad de cuenta)
create table if not exists cobros (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references partes(id),
  fecha             date not null,
  litros_gasoil     numeric,
  precio_gasoil_dia numeric,
  forma_pago        text  -- efectivo | cheque | gasoil | mixto
);

-- Políticas de acceso público (igual que el resto del esquema)
alter table partes              enable row level security;
alter table lotes               enable row level security;
alter table empleados           enable row level security;
alter table trabajos            enable row level security;
alter table trabajo_insumos     enable row level security;
alter table trabajo_maquinaria  enable row level security;
alter table trabajo_contratista enable row level security;
alter table cobros              enable row level security;

create policy "public_all" on partes              for all using (true) with check (true);
create policy "public_all" on lotes               for all using (true) with check (true);
create policy "public_all" on empleados           for all using (true) with check (true);
create policy "public_all" on trabajos            for all using (true) with check (true);
create policy "public_all" on trabajo_insumos     for all using (true) with check (true);
create policy "public_all" on trabajo_maquinaria  for all using (true) with check (true);
create policy "public_all" on trabajo_contratista for all using (true) with check (true);
create policy "public_all" on cobros              for all using (true) with check (true);
