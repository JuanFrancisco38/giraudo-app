-- Políticas RLS permisivas para acceso anónimo
-- Correr en Supabase SQL Editor

-- Habilitar RLS y agregar política de acceso total anon en cada tabla

do $$
declare
  tablas text[] := array[
    'animales','eventos_ganaderos','pesadas','hoteleria',
    'trabajos_agricolas','lotes','certificaciones',
    'maquinaria','mantenimiento','precios',
    'liquidaciones_hacienda','liquidaciones_granos',
    'boletas','movimientos','retenciones','balance_mensual'
  ];
  t text;
begin
  foreach t in array tablas loop
    execute format('alter table %I enable row level security', t);
    execute format('
      drop policy if exists "anon_all" on %I;
      create policy "anon_all" on %I for all to anon using (true) with check (true);
    ', t, t, t);
  end loop;
end $$;
