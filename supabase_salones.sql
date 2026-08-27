create table if not exists public.salones (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists salones_nombre_normalizado_unique
on public.salones (lower(btrim(nombre)))
where activo = true;

insert into public.salones (id, nombre, activo)
values
  ('salon', 'Salon', true),
  ('deck', 'Deck', true)
on conflict (id) do update
set
  nombre = excluded.nombre,
  activo = true,
  updated_at = now();

alter table public.mesas
drop constraint if exists mesas_sector_check;

alter table public.salones enable row level security;

drop policy if exists salones_select_all on public.salones;
create policy salones_select_all
on public.salones
for select
using (true);

drop policy if exists salones_insert_all on public.salones;
create policy salones_insert_all
on public.salones
for insert
with check (true);

drop policy if exists salones_update_all on public.salones;
create policy salones_update_all
on public.salones
for update
using (true)
with check (true);
