-- Paso A — Columnas para ciclos reproductivos sólidos
-- Correr antes de la Fase 2 (cargas nuevas). La Fase 1 (solo lectura) no las necesita.

do $$
declare t_animal text; t_nov text;
begin
  select data_type into t_animal from information_schema.columns
    where table_schema='public' and table_name='animales_rodeo' and column_name='id';
  select data_type into t_nov from information_schema.columns
    where table_schema='public' and table_name='servicios_animal' and column_name='novedad_id';
  execute format('alter table public.animales_rodeo   add column if not exists madre_id   %s', t_animal);
  execute format('alter table public.animales_rodeo   add column if not exists novedad_id %s', t_nov);
  execute format('alter table public.servicios_animal add column if not exists cria_id    %s', t_animal);
  alter table public.servicios_animal add column if not exists meses_gestacion_tacto numeric;
  alter table public.servicios_animal add column if not exists fecha_cierre date;
  alter table public.servicios_animal add column if not exists motivo_cierre text;
end $$;
