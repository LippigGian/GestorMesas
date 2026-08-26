create table if not exists public.roles_usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  permisos jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.roles_usuarios
add column if not exists permisos jsonb not null default '[]'::jsonb;

create unique index if not exists roles_usuarios_nombre_normalizado_unique
on public.roles_usuarios (lower(regexp_replace(btrim(nombre), '\s+', '', 'g')));

alter table public.roles_usuarios enable row level security;

drop policy if exists "roles_usuarios_select_all" on public.roles_usuarios;
create policy "roles_usuarios_select_all"
on public.roles_usuarios
for select
using (true);

drop policy if exists "roles_usuarios_insert_all" on public.roles_usuarios;
create policy "roles_usuarios_insert_all"
on public.roles_usuarios
for insert
with check (true);

drop policy if exists "roles_usuarios_update_all" on public.roles_usuarios;
create policy "roles_usuarios_update_all"
on public.roles_usuarios
for update
using (true)
with check (true);

insert into public.roles_usuarios (nombre, descripcion)
values
  ('Administrador', 'Acceso completo al sistema'),
  ('Cajero', 'Gestion de caja, cobros y ventas'),
  ('Mozo', 'Carga y seguimiento de pedidos')
on conflict do nothing;

update public.roles_usuarios
set permisos = '[
  "editar_precios",
  "ver_saldos_arqueo",
  "abrir_cerrar_caja",
  "aplicar_descuentos",
  "editar_productos",
  "editar_mesas",
  "ver_ventas",
  "gestionar_gastos",
  "gestionar_usuarios"
]'::jsonb
where lower(regexp_replace(btrim(nombre), '\s+', '', 'g')) = 'administrador'
  and permisos = '[]'::jsonb;

update public.roles_usuarios
set permisos = '[
  "ver_saldos_arqueo",
  "abrir_cerrar_caja",
  "aplicar_descuentos",
  "ver_ventas",
  "gestionar_gastos"
]'::jsonb
where lower(regexp_replace(btrim(nombre), '\s+', '', 'g')) = 'cajero'
  and permisos = '[]'::jsonb;

update public.roles_usuarios
set permisos = '["aplicar_descuentos"]'::jsonb
where lower(regexp_replace(btrim(nombre), '\s+', '', 'g')) = 'mozo'
  and permisos = '[]'::jsonb;

create table if not exists public.usuarios_sistema (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  rol_id uuid references public.roles_usuarios(id) on delete set null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists usuarios_sistema_email_unique
on public.usuarios_sistema (lower(btrim(email)));

alter table public.usuarios_sistema enable row level security;

drop policy if exists "usuarios_sistema_select_all" on public.usuarios_sistema;
create policy "usuarios_sistema_select_all"
on public.usuarios_sistema
for select
using (true);

drop policy if exists "usuarios_sistema_insert_all" on public.usuarios_sistema;
create policy "usuarios_sistema_insert_all"
on public.usuarios_sistema
for insert
with check (true);

drop policy if exists "usuarios_sistema_update_all" on public.usuarios_sistema;
create policy "usuarios_sistema_update_all"
on public.usuarios_sistema
for update
using (true)
with check (true);
