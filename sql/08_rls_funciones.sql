-- Paso 2 — Funciones de ayuda para bloquear y abrir tablas
-- Correr DESPUÉS de que la app esté mandando el token (paso 1) y esté probada.

-- ¿El usuario logueado tiene este módulo (o es admin)?
create or replace function public.tiene_modulo(m text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from permisos_usuario
    where user_id = auth.uid() and ('admin' = any(modulos) or m = any(modulos))
  );
$$;
revoke all on function public.tiene_modulo(text) from public, anon;
grant execute on function public.tiene_modulo(text) to authenticated;

-- Bloquear una tabla: borra TODAS sus reglas, prende RLS, deja acceso solo al módulo.
-- Para tablas solo-admin usar módulo 'admin'.
create or replace function public.bloquear_tabla(t text, modulo text)
returns void language plpgsql set search_path = public as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
    execute format('drop policy %I on public.%I', p.policyname, t);
  end loop;
  execute format('alter table public.%I enable row level security', t);
  execute format(
    'create policy acceso_modulo on public.%I for all to authenticated
       using (public.tiene_modulo(%L)) with check (public.tiene_modulo(%L))', t, modulo, modulo);
end $$;

-- Marcha atrás: deja la tabla abierta a anon y authenticated (como estaba antes).
create or replace function public.abrir_tabla(t text)
returns void language plpgsql set search_path = public as $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
    execute format('drop policy %I on public.%I', p.policyname, t);
  end loop;
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy anon_all on public.%I for all to anon using (true) with check (true)', t);
  execute format('create policy puente_authenticated on public.%I for all to authenticated using (true) with check (true)', t);
end $$;

-- bloquear_tabla y abrir_tabla son solo para el SQL Editor, nunca desde la app
revoke all on function public.bloquear_tabla(text, text) from public, anon, authenticated;
revoke all on function public.abrir_tabla(text) from public, anon, authenticated;

-- ── Referencia: orden de bloqueo (paso 3) ────────────────────────────────────
-- Grupo L — Lluvias (probar con juanw y marcos):
--   select bloquear_tabla('lluvias', 'lluvias');
--
-- Grupo G — Ganadería (probar con maxi):
--   select bloquear_tabla('animales', 'ganaderia');
--   select bloquear_tabla('animales_rodeo', 'ganaderia');
--   select bloquear_tabla('campanias_rodeo', 'ganaderia');
--   select bloquear_tabla('eventos_ganaderos', 'ganaderia');
--   select bloquear_tabla('hoteleria', 'ganaderia');
--   select bloquear_tabla('indices_campania', 'ganaderia');
--   select bloquear_tabla('indices_manuales', 'ganaderia');
--   select bloquear_tabla('novedades_ganaderas', 'ganaderia');
--   select bloquear_tabla('pesadas', 'ganaderia');
--   select bloquear_tabla('pesadas_animal', 'ganaderia');
--   select bloquear_tabla('renspas', 'ganaderia');
--   select bloquear_tabla('rodeos', 'ganaderia');
--   select bloquear_tabla('sanidad_animal', 'ganaderia');
--   select bloquear_tabla('servicios_animal', 'ganaderia');
--   select bloquear_tabla('trabajos_manga', 'ganaderia');
--
-- Grupo S — Sueldos/finanzas internas (solo admin):
--   select bloquear_tabla('empleados', 'admin');
--   select bloquear_tabla('empleado_entrega', 'admin');
--   select bloquear_tabla('empleado_ficha_item', 'admin');
--   select bloquear_tabla('empleado_mes', 'admin');
--   select bloquear_tabla('empleado_prestamo', 'admin');
--   select bloquear_tabla('costos_fijos', 'admin');
--   select bloquear_tabla('creditos', 'admin');
--
-- Grupo C — Contabilidad (solo admin):
--   select bloquear_tabla('balance_mensual', 'admin');
--   select bloquear_tabla('boletas', 'admin');
--   select bloquear_tabla('certificaciones', 'admin');
--   select bloquear_tabla('cheques', 'admin');
--   select bloquear_tabla('cobros', 'admin');
--   select bloquear_tabla('liquidaciones_granos', 'admin');
--   select bloquear_tabla('liquidaciones_hacienda', 'admin');
--   select bloquear_tabla('movimientos', 'admin');
--   select bloquear_tabla('precios', 'admin');
--   select bloquear_tabla('retenciones', 'admin');
--   select bloquear_tabla('tabla_precios', 'admin');
--
-- Grupo A — Agronomía, maquinaria y resto (solo admin):
--   select bloquear_tabla('campos', 'admin');
--   select bloquear_tabla('comision_tipo_labor', 'admin');
--   select bloquear_tabla('jornadas', 'admin');
--   select bloquear_tabla('lotes', 'admin');
--   select bloquear_tabla('mantenimiento', 'admin');
--   select bloquear_tabla('mantenimiento_maquinaria', 'admin');
--   select bloquear_tabla('maquinaria', 'admin');
--   select bloquear_tabla('partes', 'admin');
--   select bloquear_tabla('tarifas_trabajos', 'admin');
--   select bloquear_tabla('trabajo_contratista', 'admin');
--   select bloquear_tabla('trabajo_factura', 'admin');
--   select bloquear_tabla('trabajo_insumos', 'admin');
--   select bloquear_tabla('trabajo_maquinaria', 'admin');
--   select bloquear_tabla('trabajos', 'admin');
--   select bloquear_tabla('trabajos_agricolas', 'admin');
--
-- Marcha atrás de cualquier tabla: select abrir_tabla('<tabla>');
