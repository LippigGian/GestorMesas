create table if not exists public.medios_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists medios_pago_nombre_normalizado_unique
on public.medios_pago (lower(btrim(nombre)));

alter table public.medios_pago enable row level security;

drop policy if exists "Permitir lectura medios pago" on public.medios_pago;
create policy "Permitir lectura medios pago"
on public.medios_pago
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar medios pago" on public.medios_pago;
create policy "Permitir insertar medios pago"
on public.medios_pago
for insert
to anon, authenticated
with check (true);

drop policy if exists "Permitir actualizar medios pago" on public.medios_pago;
create policy "Permitir actualizar medios pago"
on public.medios_pago
for update
to anon, authenticated
using (true)
with check (true);

insert into public.medios_pago (nombre, activo)
values
  ('Efectivo', true),
  ('Tarjeta de debito', true),
  ('Tarjeta de credito', true),
  ('Transferencia', true)
on conflict do nothing;

create table if not exists public.pedido_pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  medio_pago_id uuid not null references public.medios_pago(id),
  monto numeric(12, 2) not null check (monto >= 0),
  created_at timestamptz not null default now()
);

create index if not exists pedido_pagos_pedido_id_idx
on public.pedido_pagos (pedido_id);

create index if not exists pedido_pagos_medio_pago_id_idx
on public.pedido_pagos (medio_pago_id);

alter table public.pedido_pagos enable row level security;

drop policy if exists "Permitir lectura pagos pedido" on public.pedido_pagos;
create policy "Permitir lectura pagos pedido"
on public.pedido_pagos
for select
to anon, authenticated
using (true);

drop policy if exists "Permitir insertar pagos pedido" on public.pedido_pagos;
create policy "Permitir insertar pagos pedido"
on public.pedido_pagos
for insert
to anon, authenticated
with check (true);
