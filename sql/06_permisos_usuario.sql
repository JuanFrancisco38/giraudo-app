-- Fase 1: tabla de permisos por usuario
-- Ejecutar DESPUÉS de crear los 5 usuarios en Authentication (con Auto Confirm User)

create table if not exists permisos_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique,          -- 'juanw'
  nombre text not null,                  -- 'Juan Wilhelm'
  modulos text[] not null default '{}',  -- {'lluvias'} | {'ganaderia'} | {'admin'}
  landing text not null default 'dashboard',
  campo_default text,                    -- solo para el formulario de Lluvias
  created_at timestamptz default now()
);

alter table permisos_usuario enable row level security;

-- Cada usuario logueado puede leer SOLO su propia fila.
drop policy if exists "leer_propio" on permisos_usuario;
create policy "leer_propio" on permisos_usuario
  for select to authenticated using (user_id = auth.uid());

-- Carga inicial (correr DESPUÉS de crear los 5 usuarios en Authentication)
insert into permisos_usuario (user_id, usuario, nombre, modulos, landing, campo_default)
select id, 'juan', 'Juan Giraudo', array['admin'], 'dashboard', null
  from auth.users where email = 'juan@giraudo.app'
union all
select id, 'francisco', 'Francisco Giraudo', array['admin'], 'dashboard', null
  from auth.users where email = 'francisco@giraudo.app'
union all
select id, 'maxi', 'Maxi (Veterinario)', array['ganaderia'], 'manga', null
  from auth.users where email = 'maxi@giraudo.app'
union all
select id, 'juanw', 'Juan Wilhelm', array['lluvias'], 'lluvias', 'Doña Vica'
  from auth.users where email = 'juanw@giraudo.app'
union all
select id, 'marcos', 'Marcos', array['lluvias'], 'lluvias', 'Don Alfredo (Azcona)'
  from auth.users where email = 'marcos@giraudo.app'
on conflict (user_id) do nothing;
