-- Paso 0 — Puente para usuarios con sesión iniciada
-- Agrega una regla que permite todo a usuarios autenticados en todas las tablas
-- con RLS prendido (excepto permisos_usuario, que ya tiene su regla propia).
-- Es ADITIVO: no quita nada de lo que ya existe.
-- Correr ANTES de que la app empiece a mandar el token del usuario.

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity and tablename <> 'permisos_usuario'
  loop
    execute format('drop policy if exists puente_authenticated on public.%I', t);
    execute format(
      'create policy puente_authenticated on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
