create extension if not exists pgcrypto;

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  fudo_id integer unique,
  categoria_id uuid references public.categorias(id),
  nombre text not null,
  descripcion text,
  precio numeric(12, 2) not null default 0,
  costo numeric(12, 2),
  activo boolean not null default true,
  favorito boolean not null default false,
  controla_stock boolean not null default false,
  stock numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  tipo text not null check (tipo in ('cuadrada', 'redonda')),
  estado text not null default 'libre' check (estado in ('libre', 'ocupada')),
  personas integer not null default 0,
  sector text not null check (sector in ('salon', 'deck')),
  x integer not null,
  y integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sector, numero),
  unique (sector, x, y)
);

create unique index if not exists categorias_nombre_normalizado_unique
on public.categorias (lower(btrim(nombre)));

create unique index if not exists productos_categoria_nombre_normalizado_unique
on public.productos (categoria_id, lower(btrim(nombre)));

alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.mesas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categorias'
      and policyname = 'Permitir lectura publica de categorias'
  ) then
    create policy "Permitir lectura publica de categorias"
    on public.categorias
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'productos'
      and policyname = 'Permitir lectura publica de productos'
  ) then
    create policy "Permitir lectura publica de productos"
    on public.productos
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mesas'
      and policyname = 'Permitir lectura publica de mesas'
  ) then
    create policy "Permitir lectura publica de mesas"
    on public.mesas
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categorias'
      and policyname = 'Permitir crear categorias'
  ) then
    create policy "Permitir crear categorias"
    on public.categorias
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'categorias'
      and policyname = 'Permitir eliminar categorias'
  ) then
    create policy "Permitir eliminar categorias"
    on public.categorias
    for delete
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'productos'
      and policyname = 'Permitir crear productos'
  ) then
    create policy "Permitir crear productos"
    on public.productos
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'productos'
      and policyname = 'Permitir editar productos'
  ) then
    create policy "Permitir editar productos"
    on public.productos
    for update
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'productos'
      and policyname = 'Permitir eliminar productos'
  ) then
    create policy "Permitir eliminar productos"
    on public.productos
    for delete
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mesas'
      and policyname = 'Permitir crear mesas'
  ) then
    create policy "Permitir crear mesas"
    on public.mesas
    for insert
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mesas'
      and policyname = 'Permitir editar mesas'
  ) then
    create policy "Permitir editar mesas"
    on public.mesas
    for update
    using (true)
    with check (true);
  end if;
end $$;

insert into public.mesas (numero, tipo, sector, x, y)
select *
from (
  values
    ('1', 'cuadrada', 'salon', 0, 0),
    ('2', 'redonda', 'salon', 1, 0),
    ('3', 'cuadrada', 'salon', 2, 1),
    ('101', 'redonda', 'deck', 0, 0),
    ('102', 'cuadrada', 'deck', 1, 0),
    ('103', 'redonda', 'deck', 2, 1)
) as mesas_iniciales(numero, tipo, sector, x, y)
where not exists (select 1 from public.mesas);

insert into public.categorias (nombre)
values
  ('Adicionales'),
  ('Alfajores'),
  ('Bebidas'),
  ('Cafe en grano'),
  ('Cafetería'),
  ('Cafés especiales'),
  ('Capuchinos Saborizados'),
  ('Empanadas'),
  ('Jugos / Batidos'),
  ('Llevar'),
  ('Pasteleria'),
  ('Postres'),
  ('Promocion cafe'),
  ('Promociones'),
  ('Sandwich'),
  ('Sin tacc'),
  ('Tartas')
on conflict (nombre) do nothing;

insert into public.productos (fudo_id, categoria_id, nombre, descripcion, precio, costo, activo, favorito, controla_stock, stock)
values
  (58, (select id from public.categorias where nombre = 'Adicionales'), 'Adicional crema', null, 400, null, true, false, false, null),
  (149, (select id from public.categorias where nombre = 'Adicionales'), 'Descafeinado', null, 20, null, true, false, false, null),
  (134, (select id from public.categorias where nombre = 'Adicionales'), 'Jamon', null, 300, null, true, false, false, null),
  (171, (select id from public.categorias where nombre = 'Adicionales'), 'Jamon crudo', null, 250, null, true, false, false, null),
  (235, (select id from public.categorias where nombre = 'Adicionales'), 'Lasaña', null, 9000, null, true, false, false, null),
  (143, (select id from public.categorias where nombre = 'Adicionales'), 'Lechuga', null, 300, null, true, false, false, null),
  (136, (select id from public.categorias where nombre = 'Adicionales'), 'Limón', null, 200, null, true, false, false, null),
  (150, (select id from public.categorias where nombre = 'Adicionales'), 'Mermelada', null, 300, null, true, false, false, null),
  (234, (select id from public.categorias where nombre = 'Adicionales'), 'PROPINA', null, 0, null, true, true, false, null),
  (133, (select id from public.categorias where nombre = 'Adicionales'), 'Queso', null, 300, null, true, false, false, null),
  (155, (select id from public.categorias where nombre = 'Adicionales'), 'Rollito jamon', null, 300, null, true, false, false, null),
  (156, (select id from public.categorias where nombre = 'Adicionales'), 'Rollito queso', null, 300, null, true, false, false, null),
  (220, (select id from public.categorias where nombre = 'Adicionales'), 'Tazon diferencia', null, 600, null, true, false, false, null),
  (81, (select id from public.categorias where nombre = 'Adicionales'), 'Tomate', null, 400, null, true, false, false, null),
  (223, (select id from public.categorias where nombre = 'Alfajores'), 'Alfajor triple', null, 2600, null, true, false, false, null),
  (224, (select id from public.categorias where nombre = 'Alfajores'), 'Conito', null, 1800, null, true, false, false, null),
  (20, (select id from public.categorias where nombre = 'Bebidas'), 'Agua con gas', null, 2600, null, true, false, true, null),
  (191, (select id from public.categorias where nombre = 'Bebidas'), 'Agua Ser', null, 16, null, false, false, false, null),
  (6, (select id from public.categorias where nombre = 'Bebidas'), 'Agua sin gas', null, 2600, null, true, false, true, -2790),
  (38, (select id from public.categorias where nombre = 'Bebidas'), 'Agua tonica lata', null, 60, null, false, false, true, null),
  (152, (select id from public.categorias where nombre = 'Bebidas'), 'Cepita', null, 60, null, false, false, false, null),
  (187, (select id from public.categorias where nombre = 'Bebidas'), 'Cepita / Baggio', null, 1000, null, true, false, false, null),
  (76, (select id from public.categorias where nombre = 'Bebidas'), 'Cerveza litro', null, 350, null, false, false, true, null),
  (74, (select id from public.categorias where nombre = 'Bebidas'), 'Cerveza quilmes porron', null, 3500, null, true, false, true, null),
  (144, (select id from public.categorias where nombre = 'Bebidas'), 'Cunnington agua tonica', null, 2600, null, true, false, true, null),
  (145, (select id from public.categorias where nombre = 'Bebidas'), 'Cunnington pomelo', null, 90, null, false, false, true, null),
  (68, (select id from public.categorias where nombre = 'Bebidas'), 'Gatorade', null, 120, null, false, false, true, null),
  (71, (select id from public.categorias where nombre = 'Bebidas'), 'Gatorade limon', null, 120, null, false, false, true, null),
  (69, (select id from public.categorias where nombre = 'Bebidas'), 'Gatorade Manzana', null, 120, null, false, false, true, null),
  (70, (select id from public.categorias where nombre = 'Bebidas'), 'Gatorade Naranja', null, 120, null, false, false, true, null),
  (72, (select id from public.categorias where nombre = 'Bebidas'), 'H2O Citrus', null, 90, null, false, false, false, null),
  (73, (select id from public.categorias where nombre = 'Bebidas'), 'H2O Limoneto', null, 90, null, false, false, false, null),
  (202, (select id from public.categorias where nombre = 'Bebidas'), 'Levite mango', null, 1100, null, false, false, false, null),
  (34, (select id from public.categorias where nombre = 'Bebidas'), 'Levite manzana', null, 2600, null, true, false, true, null),
  (36, (select id from public.categorias where nombre = 'Bebidas'), 'Levite naranja', null, 2600, null, true, false, true, null),
  (205, (select id from public.categorias where nombre = 'Bebidas'), 'Levite pera', null, 900, null, false, false, false, null),
  (35, (select id from public.categorias where nombre = 'Bebidas'), 'Levite pomelo', null, 2600, null, true, false, true, null),
  (39, (select id from public.categorias where nombre = 'Bebidas'), 'Mirinda', null, 2000, null, false, false, true, null),
  (37, (select id from public.categorias where nombre = 'Bebidas'), 'Paso de los toros pomelo', null, 2600, null, true, false, true, null),
  (1, (select id from public.categorias where nombre = 'Bebidas'), 'Pepsi', null, 2600, null, true, true, true, -3903),
  (33, (select id from public.categorias where nombre = 'Bebidas'), 'Pepsi black', null, 2600, null, true, false, true, null),
  (185, (select id from public.categorias where nombre = 'Bebidas'), 'Pepsi black LATA', null, 90, null, false, false, false, null),
  (75, (select id from public.categorias where nombre = 'Bebidas'), 'Quilmes lata 473cc', null, 450, null, false, false, true, null),
  (10, (select id from public.categorias where nombre = 'Bebidas'), 'Seven up', null, 2600, null, true, false, true, null),
  (22, (select id from public.categorias where nombre = 'Bebidas'), 'Seven up free', null, 2600, null, true, false, true, null),
  (112, (select id from public.categorias where nombre = 'Cafe en grano'), 'Cinta azul 1/4 kg', null, 7000, null, true, false, false, null),
  (113, (select id from public.categorias where nombre = 'Cafe en grano'), 'Express 1/4', null, 12000, null, true, false, false, null),
  (111, (select id from public.categorias where nombre = 'Cafe en grano'), 'Franja blanca 1/4 kg', null, 6000, null, true, false, false, null),
  (114, (select id from public.categorias where nombre = 'Cafe en grano'), 'Superior 1/4', null, 10500, null, true, false, false, null),
  (67, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe Baileys', null, 1000, null, true, false, false, null),
  (62, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe calipso', null, 1000, null, true, false, false, null),
  (65, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe cubano', null, 1000, null, true, false, false, null),
  (66, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe Ingles', null, 1000, null, true, false, false, null),
  (64, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe irlandes', null, 1000, null, true, false, false, null),
  (63, (select id from public.categorias where nombre = 'Cafés especiales'), 'Cafe Mediterraneo', null, 1000, null, true, false, false, null),
  (3, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe Chico', null, 2800, null, true, true, false, null),
  (59, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe con crema Jarrito', null, 110, null, false, false, false, null),
  (60, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe con crema pocillo', null, 100, null, false, false, false, null),
  (16, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe con leche', null, 3500, null, true, true, false, null),
  (42, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe doble', null, 3500, null, true, false, false, null),
  (61, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe doble con crema', null, 130, null, false, false, false, null),
  (4, (select id from public.categorias where nombre = 'Cafetería'), 'Cafe Jarrito', null, 3000, null, true, true, false, null),
  (11, (select id from public.categorias where nombre = 'Cafetería'), 'Capuccino', null, 4700, null, true, true, false, null),
  (52, (select id from public.categorias where nombre = 'Cafetería'), 'Chocolatada', null, 3000, null, true, false, false, null),
  (40, (select id from public.categorias where nombre = 'Cafetería'), 'Cortado chico', null, 2800, null, true, false, false, null),
  (41, (select id from public.categorias where nombre = 'Cafetería'), 'Cortado doble', null, 3500, null, true, false, false, null),
  (17, (select id from public.categorias where nombre = 'Cafetería'), 'Cortado Jarrito', null, 3000, null, true, false, false, null),
  (228, (select id from public.categorias where nombre = 'Cafetería'), 'Factura membrillo', null, 900, null, true, false, false, null),
  (57, (select id from public.categorias where nombre = 'Cafetería'), 'Frappe', null, 3500, null, true, false, false, null),
  (30, (select id from public.categorias where nombre = 'Cafetería'), 'Lagrima chica', null, 2800, null, true, false, false, null),
  (49, (select id from public.categorias where nombre = 'Cafetería'), 'Lagrima doble', null, 3500, null, true, false, false, null),
  (48, (select id from public.categorias where nombre = 'Cafetería'), 'Lagrima jarrito', null, 3000, null, true, false, false, null),
  (161, (select id from public.categorias where nombre = 'Cafetería'), 'Librito / criollito', null, 300, null, false, false, false, null),
  (165, (select id from public.categorias where nombre = 'Cafetería'), 'Librito / Cuadradito grasa', null, 1200, null, true, false, false, null),
  (13, (select id from public.categorias where nombre = 'Cafetería'), 'Medialuna grasa', null, 1200, null, true, false, true, null),
  (12, (select id from public.categorias where nombre = 'Cafetería'), 'Medialuna manteca', null, 1200, null, true, true, true, null),
  (226, (select id from public.categorias where nombre = 'Cafetería'), 'Scon dulce', null, 1500, null, true, false, false, null),
  (227, (select id from public.categorias where nombre = 'Cafetería'), 'Scon queso salado', null, 900, 500, true, false, false, null),
  (50, (select id from public.categorias where nombre = 'Cafetería'), 'Submarino', null, 3200, null, true, false, false, null),
  (51, (select id from public.categorias where nombre = 'Cafetería'), 'Taza de leche', null, 3000, null, true, false, false, null),
  (27, (select id from public.categorias where nombre = 'Cafetería'), 'Te / mate cocido', null, 2800, null, true, false, false, null),
  (28, (select id from public.categorias where nombre = 'Cafetería'), 'Te / Mate cocido con leche', null, 3000, null, true, false, false, null),
  (154, (select id from public.categorias where nombre = 'Cafetería'), 'Tostada unidad', null, 1100, null, true, false, false, null),
  (53, (select id from public.categorias where nombre = 'Cafetería'), 'Yogurt', null, 1500, null, true, false, false, null),
  (55, (select id from public.categorias where nombre = 'Capuchinos Saborizados'), 'Capu Capuchino', null, 4700, null, true, false, false, null),
  (54, (select id from public.categorias where nombre = 'Capuchinos Saborizados'), 'Capu Caramelo', null, 4700, null, true, false, false, null),
  (219, (select id from public.categorias where nombre = 'Capuchinos Saborizados'), 'Capuchino avellana', null, 4700, null, true, false, false, null),
  (56, (select id from public.categorias where nombre = 'Capuchinos Saborizados'), 'Capuchino Vainilla Latte', null, 4700, null, true, false, false, null),
  (21, (select id from public.categorias where nombre = 'Empanadas'), 'Albondigas', null, 4500, null, false, false, true, null),
  (146, (select id from public.categorias where nombre = 'Empanadas'), 'Bife a la criolla', null, 260, null, false, false, true, null),
  (203, (select id from public.categorias where nombre = 'Empanadas'), 'canelones', null, 2000, null, false, false, false, null),
  (230, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada caprese', null, 2000, null, true, false, false, null),
  (124, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada carne', null, 2000, null, true, false, true, null),
  (225, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada fatay', null, 2000, null, true, false, false, null),
  (126, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada jamon y queso', null, 2000, null, true, false, true, null),
  (125, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada pollo', null, 2000, null, true, false, true, null),
  (127, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada Roquefort', null, 70, null, false, false, true, null),
  (128, (select id from public.categorias where nombre = 'Empanadas'), 'Empanada Verdura', null, 2000, null, true, false, true, null),
  (88, (select id from public.categorias where nombre = 'Empanadas'), 'Ensalada completa', null, 200, null, false, false, false, null),
  (163, (select id from public.categorias where nombre = 'Empanadas'), 'Lasagna', null, 3000, null, false, false, true, -73),
  (8, (select id from public.categorias where nombre = 'Empanadas'), 'Milanesa Napolitana', null, 45, null, false, false, false, null),
  (173, (select id from public.categorias where nombre = 'Empanadas'), 'Milanesa pollo', null, 220, null, false, false, false, null),
  (9, (select id from public.categorias where nombre = 'Empanadas'), 'Papas Fritas', null, 45, null, false, false, false, null),
  (170, (select id from public.categorias where nombre = 'Empanadas'), 'Pastel de papa', null, 4500, null, false, false, true, -104),
  (158, (select id from public.categorias where nombre = 'Empanadas'), 'Pechuga grille con vegetales', null, 600, null, false, false, true, -5),
  (2, (select id from public.categorias where nombre = 'Empanadas'), 'Pizza Muzarella', null, 38, null, false, false, false, null),
  (199, (select id from public.categorias where nombre = 'Empanadas'), 'Pïzzeta (2 UN)', null, 500, null, false, false, false, null),
  (214, (select id from public.categorias where nombre = 'Empanadas'), 'Plato + bebida + café', null, 1800, null, false, false, false, null),
  (215, (select id from public.categorias where nombre = 'Empanadas'), 'Plato solo', null, 1300, null, false, false, false, null),
  (47, (select id from public.categorias where nombre = 'Empanadas'), 'Pollo al verdeo', null, 600, null, false, false, true, null),
  (186, (select id from public.categorias where nombre = 'Empanadas'), 'Risoto de calabaza', null, 450, null, false, false, true, 4),
  (197, (select id from public.categorias where nombre = 'Empanadas'), 'Risotto con champiñon', null, 600, null, false, false, false, null),
  (157, (select id from public.categorias where nombre = 'Empanadas'), 'Risotto de brocoli', null, 280, null, false, false, false, null),
  (216, (select id from public.categorias where nombre = 'Empanadas'), 'Sandwich de milanesa', null, 6000, null, true, false, false, null),
  (23, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Exprimido de Naranja', null, 4500, null, true, false, false, null),
  (45, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado anana', null, 120, null, false, false, false, null),
  (43, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado banana', null, 120, null, false, false, false, null),
  (46, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado durazno', null, 120, null, false, false, false, null),
  (116, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado frutal', null, 4500, null, true, false, false, null),
  (44, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado frutilla', null, 120, null, false, false, false, null),
  (180, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Licuado multifruta', null, 4500, null, false, false, false, null),
  (148, (select id from public.categorias where nombre = 'Jugos / Batidos'), 'Medio exprimido', null, 2300, null, true, false, false, null),
  (222, (select id from public.categorias where nombre = 'Llevar'), 'Termico $2.000 (XL)', null, 2000, null, false, false, false, null),
  (162, (select id from public.categorias where nombre = 'Llevar'), 'Termico $240', null, 240, null, false, false, false, null),
  (138, (select id from public.categorias where nombre = 'Llevar'), 'Termico $2800 (chico)', null, 2800, null, true, false, false, null),
  (137, (select id from public.categorias where nombre = 'Llevar'), 'Termico $3000 (mediano)', null, 3000, null, true, false, false, null),
  (139, (select id from public.categorias where nombre = 'Llevar'), 'Termico $3500 (grande)', null, 3500, null, true, false, false, null),
  (140, (select id from public.categorias where nombre = 'Llevar'), 'Termico $700 (polipapel)', null, 700, null, false, false, false, null),
  (179, (select id from public.categorias where nombre = 'Pasteleria'), 'Alfajor chocolate', null, 1400, null, false, false, false, null),
  (115, (select id from public.categorias where nombre = 'Pasteleria'), 'Alfajor de maicena', null, 2600, null, true, false, false, null),
  (221, (select id from public.categorias where nombre = 'Pasteleria'), 'Alfajor nuevo', null, 1900, null, false, false, false, null),
  (174, (select id from public.categorias where nombre = 'Pasteleria'), 'Brownie', null, 4000, null, true, false, false, null),
  (92, (select id from public.categorias where nombre = 'Pasteleria'), 'Brownie con dulce de leche', null, 4000, null, true, false, false, null),
  (26, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin de limon', null, 100, null, false, false, false, null),
  (104, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin de manzana', null, 120, null, false, false, false, null),
  (105, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin de Naranja', null, 100, null, false, false, false, null),
  (153, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin entero zanahoria', null, 500, null, false, false, false, null),
  (151, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin limon', null, 4000, null, true, false, false, null),
  (106, (select id from public.categorias where nombre = 'Pasteleria'), 'Budin marmolado', null, 4000, null, true, false, false, null),
  (236, (select id from public.categorias where nombre = 'Pasteleria'), 'Chipa', null, 500, null, true, false, false, null),
  (206, (select id from public.categorias where nombre = 'Pasteleria'), 'Chocoarroz', null, 2000, null, true, false, false, null),
  (90, (select id from public.categorias where nombre = 'Pasteleria'), 'Chocotorta', null, 130, null, false, false, false, null),
  (160, (select id from public.categorias where nombre = 'Pasteleria'), 'Cookie', null, 30, null, false, false, false, null),
  (204, (select id from public.categorias where nombre = 'Pasteleria'), 'Cuadrado de coco', null, 600, null, false, false, false, null),
  (94, (select id from public.categorias where nombre = 'Pasteleria'), 'Cuadrado de limon', null, 4000, null, true, false, false, null),
  (93, (select id from public.categorias where nombre = 'Pasteleria'), 'Cuadrado de manzana', null, 4000, null, true, false, false, null),
  (107, (select id from public.categorias where nombre = 'Pasteleria'), 'Cuadrado de zanahoria', null, 100, null, false, false, false, null),
  (188, (select id from public.categorias where nombre = 'Pasteleria'), 'Docena medialuna', null, 10000, null, true, false, false, null),
  (89, (select id from public.categorias where nombre = 'Pasteleria'), 'Donas', null, 1300, null, true, false, true, null),
  (193, (select id from public.categorias where nombre = 'Pasteleria'), 'Media docena medialunas', null, 5000, null, true, false, false, null),
  (182, (select id from public.categorias where nombre = 'Pasteleria'), 'Mini alfajor maicena', null, 50, null, false, false, false, null),
  (129, (select id from public.categorias where nombre = 'Pasteleria'), 'Muffin', null, 2000, null, false, false, true, null),
  (147, (select id from public.categorias where nombre = 'Pasteleria'), 'Pastafrola', null, 4000, null, true, false, false, null),
  (109, (select id from public.categorias where nombre = 'Pasteleria'), 'Pastafrola batata', null, 100, null, false, false, false, null),
  (110, (select id from public.categorias where nombre = 'Pasteleria'), 'Pastafrola dulce de leche', null, 100, null, false, false, false, null),
  (108, (select id from public.categorias where nombre = 'Pasteleria'), 'Pastafrola membrillo', null, 100, null, false, false, false, null),
  (176, (select id from public.categorias where nombre = 'Pasteleria'), 'Pastelitos', null, 60, null, false, false, false, null),
  (201, (select id from public.categorias where nombre = 'Pasteleria'), 'Pochoclo', null, 300, null, false, false, false, null),
  (229, (select id from public.categorias where nombre = 'Pasteleria'), 'Porcion budin', null, 4000, null, true, false, false, null),
  (178, (select id from public.categorias where nombre = 'Pasteleria'), 'Roll canela', null, 800, null, false, false, false, null),
  (117, (select id from public.categorias where nombre = 'Pasteleria'), 'Scones', null, 1500, null, true, false, true, null),
  (91, (select id from public.categorias where nombre = 'Pasteleria'), 'Tiramisu', null, 130, null, false, false, false, null),
  (167, (select id from public.categorias where nombre = 'Pasteleria'), 'Tiramisuu', null, 600, null, false, false, false, null),
  (184, (select id from public.categorias where nombre = 'Pasteleria'), 'Torta chocolate', null, 120, null, false, false, false, null),
  (175, (select id from public.categorias where nombre = 'Pasteleria'), 'Torta coco y dulce de leche', null, 120, null, false, false, false, null),
  (166, (select id from public.categorias where nombre = 'Pasteleria'), 'Torta de ricota', null, 4000, null, true, false, false, null),
  (168, (select id from public.categorias where nombre = 'Postres'), 'Chocotortaa', null, 4000, null, true, false, false, null),
  (7, (select id from public.categorias where nombre = 'Postres'), 'Ensalada de Frutas', null, 25, null, false, true, false, null),
  (200, (select id from public.categorias where nombre = 'Postres'), 'Torta porción', null, 4000, null, true, false, false, null),
  (195, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche + 2 medialuna de j y q', null, 6000, null, true, false, false, null),
  (122, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche + 2 Medialunas', null, 5000, null, true, true, false, null),
  (142, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche + Budin', null, 190, null, false, false, false, null),
  (103, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche + cuadrado', null, 6500, null, true, false, false, null),
  (101, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche y med. J / Q', null, 4800, null, false, false, false, null),
  (217, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche y torta', null, 8000, null, false, false, false, null),
  (95, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche y tostadas', null, 6000, null, true, true, false, null),
  (31, (select id from public.categorias where nombre = 'Promocion cafe'), 'Cafe con leche y tostado', null, 7600, null, true, true, false, null),
  (121, (select id from public.categorias where nombre = 'Promocion cafe'), 'Jarrito + 2 Medialunas', null, 4500, null, true, true, false, null),
  (120, (select id from public.categorias where nombre = 'Promocion cafe'), 'Pocillo + 2 Medialunas', null, 140, null, false, false, false, null),
  (123, (select id from public.categorias where nombre = 'Promociones'), '3 Empanadas + bebida', null, 7000, null, true, false, false, null),
  (99, (select id from public.categorias where nombre = 'Promociones'), 'Capuccino y 2 medialunas', null, 6000, null, true, false, false, null),
  (32, (select id from public.categorias where nombre = 'Promociones'), 'Promo almuerzo', null, 360, null, false, false, false, null),
  (80, (select id from public.categorias where nombre = 'Promociones'), 'Promo panini', null, 300, null, false, false, false, null),
  (100, (select id from public.categorias where nombre = 'Promociones'), 'Submarino y 2 medialunas', null, 4700, null, true, false, false, null),
  (196, (select id from public.categorias where nombre = 'Promociones'), 'Tarta + bebida + cafe', null, 3000, null, false, false, false, null),
  (29, (select id from public.categorias where nombre = 'Promociones'), 'Tostado + Exprimido Naranja', null, 8000, null, true, false, false, null),
  (118, (select id from public.categorias where nombre = 'Promociones'), 'Tostado + Gaseosa', null, 250, null, false, false, false, null),
  (119, (select id from public.categorias where nombre = 'Promociones'), 'Tostado + Licuado', null, 8000, null, true, false, false, null),
  (172, (select id from public.categorias where nombre = 'Promociones'), 'Tostado y gaseosa', null, 6000, null, true, false, false, null),
  (169, (select id from public.categorias where nombre = 'Sandwich'), 'Arabe crudo', null, 3100, null, false, false, false, null),
  (177, (select id from public.categorias where nombre = 'Sandwich'), 'Baguette crudo', null, 260, null, false, false, false, null),
  (79, (select id from public.categorias where nombre = 'Sandwich'), 'Baguette Jamon y queso', null, 800, null, false, false, false, null),
  (183, (select id from public.categorias where nombre = 'Sandwich'), 'Ciabata', null, 160, null, false, false, false, null),
  (212, (select id from public.categorias where nombre = 'Sandwich'), 'Croissant', null, 4600, null, true, false, false, null),
  (24, (select id from public.categorias where nombre = 'Sandwich'), 'Medialuna de jamon y queso', null, 2000, null, true, false, false, null),
  (132, (select id from public.categorias where nombre = 'Sandwich'), 'Medio tostado', null, 2600, null, true, false, false, null),
  (78, (select id from public.categorias where nombre = 'Sandwich'), 'Panini Napolitano', null, 210, null, false, false, false, null),
  (14, (select id from public.categorias where nombre = 'Sandwich'), 'Panini Peceto', null, 220, null, false, false, true, null),
  (77, (select id from public.categorias where nombre = 'Sandwich'), 'Panini Pollo', null, 180, null, false, false, true, null),
  (213, (select id from public.categorias where nombre = 'Sandwich'), 'Pan parmesano', null, 600, null, false, false, false, null),
  (131, (select id from public.categorias where nombre = 'Sandwich'), 'Pebete', null, 4000, null, true, false, true, null),
  (141, (select id from public.categorias where nombre = 'Sandwich'), 'Pebete crudo', null, 180, null, false, false, false, null),
  (218, (select id from public.categorias where nombre = 'Sandwich'), 'Roll capresse', null, 4000, null, false, false, false, null),
  (164, (select id from public.categorias where nombre = 'Sandwich'), 'Roll peceto', null, 4000, null, false, false, false, null),
  (159, (select id from public.categorias where nombre = 'Sandwich'), 'Roll pollo', null, 4000, null, false, false, false, null),
  (135, (select id from public.categorias where nombre = 'Sandwich'), 'Sandwich milanesa', null, 4000, null, false, false, false, null),
  (181, (select id from public.categorias where nombre = 'Sandwich'), 'Sandwich pan casero / caserito', null, 140, null, false, false, false, null),
  (233, (select id from public.categorias where nombre = 'Sandwich'), 'Sandwich relleno', null, 9000, null, true, false, false, null),
  (15, (select id from public.categorias where nombre = 'Sandwich'), 'Tostadas pan blanco', null, 3000, null, true, false, false, null),
  (98, (select id from public.categorias where nombre = 'Sandwich'), 'Tostadas pan blancoo', null, 150, null, false, false, false, null),
  (97, (select id from public.categorias where nombre = 'Sandwich'), 'Tostadas pan negro', null, 3000, null, true, false, false, null),
  (18, (select id from public.categorias where nombre = 'Sandwich'), 'Tostado miga', null, 5000, null, true, false, false, null),
  (19, (select id from public.categorias where nombre = 'Sandwich'), 'Tostado pan arabe', null, 4600, null, true, false, false, null),
  (130, (select id from public.categorias where nombre = 'Sandwich'), 'Trenzado / brioche', null, 4600, null, true, false, true, null),
  (207, (select id from public.categorias where nombre = 'Sin tacc'), 'Chalitas', null, 600, null, true, false, false, null),
  (211, (select id from public.categorias where nombre = 'Sin tacc'), 'Galletitas sin tacc', null, 600, null, true, false, false, null),
  (208, (select id from public.categorias where nombre = 'Sin tacc'), 'Mini scones', null, 600, null, false, false, false, null),
  (210, (select id from public.categorias where nombre = 'Sin tacc'), 'Stick garbanzos', null, 600, null, true, false, false, null),
  (209, (select id from public.categorias where nombre = 'Sin tacc'), 'Sticks tomate', null, 600, null, false, false, false, null),
  (189, (select id from public.categorias where nombre = 'Tartas'), 'Tarta atun', null, 7500, 2900, true, false, false, null),
  (25, (select id from public.categorias where nombre = 'Tartas'), 'Tarta bicolor', null, 3200, null, false, false, true, -37),
  (192, (select id from public.categorias where nombre = 'Tartas'), 'Tarta calabaza', null, 7500, 2900, true, false, false, null),
  (232, (select id from public.categorias where nombre = 'Tartas'), 'Tarta caprese', null, 6000, 2900, false, false, false, null),
  (231, (select id from public.categorias where nombre = 'Tartas'), 'Tarta carpese', null, 6000, 2900, false, false, false, null),
  (194, (select id from public.categorias where nombre = 'Tartas'), 'Tarta cebolla', null, 250, null, false, false, false, null),
  (83, (select id from public.categorias where nombre = 'Tartas'), 'Tarta jamon queso y puerro', null, 180, null, false, false, false, null),
  (82, (select id from public.categorias where nombre = 'Tartas'), 'Tarta jamon y queso', null, 7500, 2900, true, false, true, -969),
  (86, (select id from public.categorias where nombre = 'Tartas'), 'Tarta pollo', null, 7500, 2900, true, false, true, -543),
  (87, (select id from public.categorias where nombre = 'Tartas'), 'Tarta pollo verdeo', null, 180, null, false, false, false, null),
  (84, (select id from public.categorias where nombre = 'Tartas'), 'Tarta queso y cebolla', null, 180, null, false, false, false, null),
  (198, (select id from public.categorias where nombre = 'Tartas'), 'Tarta verdura', null, 7500, 2900, true, false, false, null),
  (190, (select id from public.categorias where nombre = 'Tartas'), 'Tarta zapallito', null, 7500, 2900, true, false, false, null)
on conflict (fudo_id) do update set
  categoria_id = excluded.categoria_id,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  precio = excluded.precio,
  costo = excluded.costo,
  activo = excluded.activo,
  favorito = excluded.favorito,
  controla_stock = excluded.controla_stock,
  stock = excluded.stock,
  updated_at = now();
