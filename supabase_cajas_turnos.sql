create table if not exists public.cajas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cajas_nombre_normalizado_unique
on public.cajas (lower(btrim(nombre)));

alter table public.cajas enable row level security;

drop policy if exists "Permitir lectura cajas" on public.cajas;
create policy "Permitir lectura cajas"
on public.cajas
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar cajas" on public.cajas;
create policy "Permitir insertar cajas"
on public.cajas
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar cajas" on public.cajas;
create policy "Permitir actualizar cajas"
on public.cajas
for update
to anon, authenticated
using (true)
with check (true);

insert into public.cajas (nombre, activo)
values ('Caja principal', true)
on conflict do nothing;

drop index if exists turnos_un_turno_abierto_por_caja;

create table if not exists public.turnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  hora_inicio time not null,
  hora_fin time not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.turnos
drop column if exists caja_id cascade,
drop column if exists estado cascade,
drop column if exists monto_inicial cascade,
drop column if exists monto_final_declarado cascade,
drop column if exists total_ventas cascade,
drop column if exists diferencia cascade,
drop column if exists opened_at cascade,
drop column if exists closed_at cascade,
add column if not exists hora_inicio time,
add column if not exists hora_fin time,
add column if not exists activo boolean not null default true;

update public.turnos
set
  hora_inicio = coalesce(hora_inicio, '08:00'::time),
  hora_fin = coalesce(hora_fin, '14:30'::time),
  activo = coalesce(activo, true)
where hora_inicio is null or hora_fin is null or activo is null;

alter table public.turnos
alter column hora_inicio set not null,
alter column hora_fin set not null,
alter column activo set default true,
alter column activo set not null;

create unique index if not exists turnos_nombre_normalizado_unique
on public.turnos (lower(btrim(nombre)));

alter table public.turnos enable row level security;

drop policy if exists "Permitir lectura turnos" on public.turnos;
create policy "Permitir lectura turnos"
on public.turnos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar turnos" on public.turnos;
create policy "Permitir insertar turnos"
on public.turnos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar turnos" on public.turnos;
create policy "Permitir actualizar turnos"
on public.turnos
for update
to anon, authenticated
using (true)
with check (true);

insert into public.turnos (nombre, hora_inicio, hora_fin, activo)
values
  ('Mañana', '08:00', '14:30', true),
  ('Tarde', '14:30', '20:00', true)
on conflict do nothing;

create table if not exists public.arqueos_caja (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references public.cajas(id),
  estado text not null default 'abierto'
    check (estado in ('abierto', 'cerrado', 'cancelado')),
  monto_inicial numeric(12, 2) not null default 0 check (monto_inicial >= 0),
  monto_final_declarado numeric(12, 2),
  total_ventas numeric(12, 2) not null default 0,
  diferencia numeric(12, 2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists arqueos_caja_caja_id_idx
on public.arqueos_caja (caja_id);

create index if not exists arqueos_caja_estado_idx
on public.arqueos_caja (estado);

create unique index if not exists arqueos_caja_un_arqueo_abierto_por_caja
on public.arqueos_caja (caja_id)
where estado = 'abierto';

alter table public.arqueos_caja enable row level security;

drop policy if exists "Permitir lectura arqueos caja" on public.arqueos_caja;
create policy "Permitir lectura arqueos caja"
on public.arqueos_caja
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar arqueos caja" on public.arqueos_caja;
create policy "Permitir insertar arqueos caja"
on public.arqueos_caja
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar arqueos caja" on public.arqueos_caja;
create policy "Permitir actualizar arqueos caja"
on public.arqueos_caja
for update
to anon, authenticated
using (true)
with check (true);

alter table public.pedidos
add column if not exists turno_id uuid references public.turnos(id),
add column if not exists arqueo_caja_id uuid references public.arqueos_caja(id);

create index if not exists pedidos_turno_id_idx
on public.pedidos (turno_id);

create index if not exists pedidos_arqueo_caja_id_idx
on public.pedidos (arqueo_caja_id);
