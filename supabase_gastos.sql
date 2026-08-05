create table if not exists public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists proveedores_nombre_normalizado_unique
on public.proveedores (lower(btrim(nombre)));

alter table public.proveedores enable row level security;

drop policy if exists "Permitir lectura proveedores" on public.proveedores;
create policy "Permitir lectura proveedores"
on public.proveedores
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar proveedores" on public.proveedores;
create policy "Permitir insertar proveedores"
on public.proveedores
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar proveedores" on public.proveedores;
create policy "Permitir actualizar proveedores"
on public.proveedores
for update
to anon, authenticated
using (true)
with check (true);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  arqueo_caja_id uuid not null references public.arqueos_caja(id),
  medio_pago_id uuid not null references public.medios_pago(id),
  proveedor_id uuid references public.proveedores(id),
  fecha timestamptz not null default now(),
  importe numeric(12, 2) not null check (importe >= 0),
  proveedor text,
  categoria text,
  comentario text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gastos_arqueo_caja_id_idx
on public.gastos (arqueo_caja_id);

create index if not exists gastos_medio_pago_id_idx
on public.gastos (medio_pago_id);

alter table public.gastos
add column if not exists proveedor_id uuid references public.proveedores(id);

create index if not exists gastos_proveedor_id_idx
on public.gastos (proveedor_id);

create index if not exists gastos_fecha_idx
on public.gastos (fecha);

alter table public.gastos enable row level security;

drop policy if exists "Permitir lectura gastos" on public.gastos;
create policy "Permitir lectura gastos"
on public.gastos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar gastos" on public.gastos;
create policy "Permitir insertar gastos"
on public.gastos
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar gastos" on public.gastos;
create policy "Permitir actualizar gastos"
on public.gastos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Permitir eliminar gastos" on public.gastos;
create policy "Permitir eliminar gastos"
on public.gastos
for delete
to anon, authenticated
using (true);
