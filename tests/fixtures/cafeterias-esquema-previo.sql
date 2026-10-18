-- Estructura previa de las 19 tablas, basada en el diagnóstico. Sin datos reales.

create table public."arqueo_caja_medios_pago" (
  "id" uuid default gen_random_uuid() not null,
  "arqueo_caja_id" uuid not null,
  "medio_pago_id" uuid not null,
  "monto_sistema" numeric default 0 not null,
  "monto_declarado" numeric default 0 not null,
  "diferencia" numeric default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."arqueos_caja" (
  "id" uuid default gen_random_uuid() not null,
  "caja_id" uuid not null,
  "estado" text default 'abierto'::text not null,
  "monto_inicial" numeric default 0 not null,
  "monto_final_declarado" numeric,
  "total_ventas" numeric default 0 not null,
  "diferencia" numeric,
  "opened_at" timestamp with time zone default now() not null,
  "closed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."cajas" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."categorias" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."gastos" (
  "id" uuid default gen_random_uuid() not null,
  "arqueo_caja_id" uuid not null,
  "medio_pago_id" uuid not null,
  "fecha" timestamp with time zone default now() not null,
  "importe" numeric not null,
  "proveedor" text,
  "categoria" text,
  "comentario" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "proveedor_id" uuid,
  "local_id" uuid not null
);

create table public."locales" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."medios_pago" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."mesas" (
  "id" uuid default gen_random_uuid() not null,
  "numero" text not null,
  "tipo" text not null,
  "estado" text default 'libre'::text not null,
  "personas" integer default 0 not null,
  "sector" text not null,
  "x" integer not null,
  "y" integer not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid default '00000000-0000-0000-0000-000000000001'::uuid not null
);

create table public."pedido_item_cobros" (
  "id" uuid default gen_random_uuid() not null,
  "pedido_id" uuid not null,
  "pedido_item_id" uuid not null,
  "cantidad" integer not null,
  "monto" numeric not null,
  "created_at" timestamp with time zone default now() not null
);

create table public."pedido_items" (
  "id" uuid default gen_random_uuid() not null,
  "pedido_id" uuid not null,
  "producto_id" uuid,
  "nombre_producto" text not null,
  "precio_unitario" numeric not null,
  "cantidad" integer default 1 not null,
  "subtotal" numeric default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "comentario" text
);

create table public."pedido_pagos" (
  "id" uuid default gen_random_uuid() not null,
  "pedido_id" uuid not null,
  "medio_pago_id" uuid not null,
  "monto" numeric not null,
  "created_at" timestamp with time zone default now() not null,
  "arqueo_caja_id" uuid
);

create table public."pedidos" (
  "id" uuid default gen_random_uuid() not null,
  "tipo" text not null,
  "mesa_id" uuid,
  "estado" text default 'abierto'::text not null,
  "personas" integer default 0 not null,
  "cliente" text,
  "total" numeric default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "closed_at" timestamp with time zone,
  "updated_at" timestamp with time zone default now() not null,
  "turno_id" uuid,
  "arqueo_caja_id" uuid,
  "local_id" uuid
);

create table public."productos" (
  "id" uuid default gen_random_uuid() not null,
  "fudo_id" integer,
  "categoria_id" uuid,
  "nombre" text not null,
  "descripcion" text,
  "precio" numeric default 0 not null,
  "costo" numeric,
  "activo" boolean default true not null,
  "favorito" boolean default false not null,
  "controla_stock" boolean default false not null,
  "stock" numeric,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."proveedores" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "local_id" uuid not null
);

create table public."roles_usuarios" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "descripcion" text,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "permisos" jsonb default '[]'::jsonb not null
);

create table public."salones" (
  "id" text default (gen_random_uuid())::text not null,
  "nombre" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."turnos" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "hora_inicio" time without time zone not null,
  "hora_fin" time without time zone not null,
  "activo" boolean default true not null,
  "local_id" uuid not null
);

create table public."usuarios_locales" (
  "id" uuid default gen_random_uuid() not null,
  "local_id" uuid not null,
  "user_id" uuid not null,
  "email" text not null,
  "nombre" text,
  "rol" text not null,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table public."usuarios_sistema" (
  "id" uuid default gen_random_uuid() not null,
  "nombre" text not null,
  "email" text not null,
  "rol_id" uuid,
  "activo" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

alter table public."categorias" add constraint "categorias_pkey" PRIMARY KEY (id);

alter table public."categorias" add constraint "categorias_nombre_key" UNIQUE (nombre);

alter table public."productos" add constraint "productos_pkey" PRIMARY KEY (id);

alter table public."productos" add constraint "productos_fudo_id_key" UNIQUE (fudo_id);

alter table public."mesas" add constraint "mesas_tipo_check" CHECK ((tipo = ANY (ARRAY['cuadrada'::text, 'redonda'::text])));

alter table public."mesas" add constraint "mesas_estado_check" CHECK ((estado = ANY (ARRAY['libre'::text, 'ocupada'::text])));

alter table public."mesas" add constraint "mesas_pkey" PRIMARY KEY (id);

alter table public."mesas" add constraint "mesas_sector_x_y_key" UNIQUE (sector, x, y);

alter table public."pedidos" add constraint "pedidos_tipo_check" CHECK ((tipo = ANY (ARRAY['mesa'::text, 'mostrador'::text])));

alter table public."pedidos" add constraint "pedidos_estado_check" CHECK ((estado = ANY (ARRAY['abierto'::text, 'cerrado'::text, 'cancelado'::text])));

alter table public."pedidos" add constraint "pedidos_mesa_requiere_mesa_id" CHECK ((((tipo = 'mesa'::text) AND (mesa_id IS NOT NULL)) OR ((tipo = 'mostrador'::text) AND (mesa_id IS NULL))));

alter table public."pedidos" add constraint "pedidos_pkey" PRIMARY KEY (id);

alter table public."pedido_items" add constraint "pedido_items_cantidad_check" CHECK ((cantidad > 0));

alter table public."pedido_items" add constraint "pedido_items_pkey" PRIMARY KEY (id);

alter table public."medios_pago" add constraint "medios_pago_pkey" PRIMARY KEY (id);

alter table public."pedido_pagos" add constraint "pedido_pagos_monto_check" CHECK ((monto >= (0)::numeric));

alter table public."pedido_pagos" add constraint "pedido_pagos_pkey" PRIMARY KEY (id);

alter table public."cajas" add constraint "cajas_pkey" PRIMARY KEY (id);

alter table public."turnos" add constraint "turnos_pkey" PRIMARY KEY (id);

alter table public."arqueos_caja" add constraint "arqueos_caja_estado_check" CHECK ((estado = ANY (ARRAY['abierto'::text, 'cerrado'::text, 'cancelado'::text])));

alter table public."arqueos_caja" add constraint "arqueos_caja_monto_inicial_check" CHECK ((monto_inicial >= (0)::numeric));

alter table public."arqueos_caja" add constraint "arqueos_caja_pkey" PRIMARY KEY (id);

alter table public."arqueo_caja_medios_pago" add constraint "arqueo_caja_medios_pago_pkey" PRIMARY KEY (id);

alter table public."arqueo_caja_medios_pago" add constraint "arqueo_caja_medios_pago_arqueo_caja_id_medio_pago_id_key" UNIQUE (arqueo_caja_id, medio_pago_id);

alter table public."gastos" add constraint "gastos_importe_check" CHECK ((importe >= (0)::numeric));

alter table public."gastos" add constraint "gastos_pkey" PRIMARY KEY (id);

alter table public."proveedores" add constraint "proveedores_pkey" PRIMARY KEY (id);

alter table public."locales" add constraint "locales_pkey" PRIMARY KEY (id);

alter table public."usuarios_locales" add constraint "usuarios_locales_rol_check" CHECK ((rol = ANY (ARRAY['admin'::text, 'encargado'::text, 'cajero'::text, 'mozo'::text])));

alter table public."usuarios_locales" add constraint "usuarios_locales_pkey" PRIMARY KEY (id);

alter table public."usuarios_locales" add constraint "usuarios_locales_local_id_user_id_key" UNIQUE (local_id, user_id);

alter table public."usuarios_locales" add constraint "usuarios_locales_local_id_email_key" UNIQUE (local_id, email);

alter table public."roles_usuarios" add constraint "roles_usuarios_pkey" PRIMARY KEY (id);

alter table public."usuarios_sistema" add constraint "usuarios_sistema_pkey" PRIMARY KEY (id);

alter table public."salones" add constraint "salones_pkey" PRIMARY KEY (id);

alter table public."pedido_item_cobros" add constraint "pedido_item_cobros_cantidad_check" CHECK ((cantidad > 0));

alter table public."pedido_item_cobros" add constraint "pedido_item_cobros_monto_check" CHECK ((monto > (0)::numeric));

alter table public."pedido_item_cobros" add constraint "pedido_item_cobros_pkey" PRIMARY KEY (id);

alter table public."productos" add constraint "productos_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES categorias(id);

alter table public."pedidos" add constraint "pedidos_mesa_id_fkey" FOREIGN KEY (mesa_id) REFERENCES mesas(id);

alter table public."pedido_items" add constraint "pedido_items_pedido_id_fkey" FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

alter table public."pedido_items" add constraint "pedido_items_producto_id_fkey" FOREIGN KEY (producto_id) REFERENCES productos(id);

alter table public."pedido_pagos" add constraint "pedido_pagos_pedido_id_fkey" FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

alter table public."pedido_pagos" add constraint "pedido_pagos_medio_pago_id_fkey" FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(id);

alter table public."pedidos" add constraint "pedidos_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES turnos(id);

alter table public."arqueos_caja" add constraint "arqueos_caja_caja_id_fkey" FOREIGN KEY (caja_id) REFERENCES cajas(id);

alter table public."pedidos" add constraint "pedidos_arqueo_caja_id_fkey" FOREIGN KEY (arqueo_caja_id) REFERENCES arqueos_caja(id);

alter table public."arqueo_caja_medios_pago" add constraint "arqueo_caja_medios_pago_arqueo_caja_id_fkey" FOREIGN KEY (arqueo_caja_id) REFERENCES arqueos_caja(id) ON DELETE CASCADE;

alter table public."arqueo_caja_medios_pago" add constraint "arqueo_caja_medios_pago_medio_pago_id_fkey" FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(id);

alter table public."gastos" add constraint "gastos_arqueo_caja_id_fkey" FOREIGN KEY (arqueo_caja_id) REFERENCES arqueos_caja(id);

alter table public."gastos" add constraint "gastos_medio_pago_id_fkey" FOREIGN KEY (medio_pago_id) REFERENCES medios_pago(id);

alter table public."gastos" add constraint "gastos_proveedor_id_fkey" FOREIGN KEY (proveedor_id) REFERENCES proveedores(id);

alter table public."pedido_pagos" add constraint "pedido_pagos_arqueo_caja_id_fkey" FOREIGN KEY (arqueo_caja_id) REFERENCES arqueos_caja(id);

alter table public."usuarios_locales" add constraint "usuarios_locales_local_id_fkey" FOREIGN KEY (local_id) REFERENCES locales(id) ON DELETE CASCADE;

alter table public."usuarios_locales" add constraint "usuarios_locales_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public."usuarios_sistema" add constraint "usuarios_sistema_rol_id_fkey" FOREIGN KEY (rol_id) REFERENCES roles_usuarios(id) ON DELETE SET NULL;

alter table public."pedido_item_cobros" add constraint "pedido_item_cobros_pedido_id_fkey" FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE;

alter table public."pedido_item_cobros" add constraint "pedido_item_cobros_pedido_item_id_fkey" FOREIGN KEY (pedido_item_id) REFERENCES pedido_items(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX pedidos_un_pedido_abierto_por_mesa ON public.pedidos USING btree (mesa_id) WHERE ((estado = 'abierto'::text) AND (tipo = 'mesa'::text));

CREATE INDEX pedidos_turno_id_idx ON public.pedidos USING btree (turno_id);

CREATE INDEX pedidos_arqueo_caja_id_idx ON public.pedidos USING btree (arqueo_caja_id);

CREATE INDEX arqueos_caja_caja_id_idx ON public.arqueos_caja USING btree (caja_id);

CREATE INDEX arqueos_caja_estado_idx ON public.arqueos_caja USING btree (estado);

CREATE UNIQUE INDEX arqueos_caja_un_arqueo_abierto_por_caja ON public.arqueos_caja USING btree (caja_id) WHERE (estado = 'abierto'::text);

CREATE UNIQUE INDEX categorias_nombre_normalizado_unique ON public.categorias USING btree (lower(btrim(nombre)));

CREATE UNIQUE INDEX productos_categoria_nombre_normalizado_unique ON public.productos USING btree (categoria_id, lower(btrim(nombre)));

CREATE UNIQUE INDEX mesas_numero_normalizado_unique ON public.mesas USING btree (lower(btrim(numero)));

CREATE UNIQUE INDEX cajas_nombre_normalizado_unique ON public.cajas USING btree (lower(btrim(nombre)));

CREATE INDEX pedido_item_cobros_pedido_id_idx ON public.pedido_item_cobros USING btree (pedido_id);

CREATE INDEX pedido_item_cobros_pedido_item_id_idx ON public.pedido_item_cobros USING btree (pedido_item_id);

CREATE UNIQUE INDEX medios_pago_nombre_normalizado_unique ON public.medios_pago USING btree (lower(btrim(nombre)));

CREATE INDEX arqueo_caja_medios_pago_arqueo_idx ON public.arqueo_caja_medios_pago USING btree (arqueo_caja_id);

CREATE INDEX arqueo_caja_medios_pago_medio_idx ON public.arqueo_caja_medios_pago USING btree (medio_pago_id);

CREATE UNIQUE INDEX turnos_nombre_normalizado_unique ON public.turnos USING btree (lower(btrim(nombre)));

CREATE INDEX pedido_pagos_pedido_id_idx ON public.pedido_pagos USING btree (pedido_id);

CREATE INDEX pedido_pagos_medio_pago_id_idx ON public.pedido_pagos USING btree (medio_pago_id);

CREATE INDEX pedido_pagos_arqueo_caja_id_idx ON public.pedido_pagos USING btree (arqueo_caja_id);

CREATE INDEX gastos_arqueo_caja_id_idx ON public.gastos USING btree (arqueo_caja_id);

CREATE INDEX gastos_medio_pago_id_idx ON public.gastos USING btree (medio_pago_id);

CREATE INDEX gastos_fecha_idx ON public.gastos USING btree (fecha);

CREATE INDEX gastos_proveedor_id_idx ON public.gastos USING btree (proveedor_id);

CREATE UNIQUE INDEX proveedores_nombre_normalizado_unique ON public.proveedores USING btree (lower(btrim(nombre)));

CREATE UNIQUE INDEX roles_usuarios_nombre_normalizado_unique ON public.roles_usuarios USING btree (lower(regexp_replace(btrim(nombre), '\s+'::text, ''::text, 'g'::text)));

CREATE UNIQUE INDEX usuarios_sistema_email_unique ON public.usuarios_sistema USING btree (lower(btrim(email)));

CREATE UNIQUE INDEX salones_nombre_normalizado_unique ON public.salones USING btree (lower(btrim(nombre))) WHERE (activo = true);

CREATE OR REPLACE FUNCTION public.mover_pedido_mostrador_a_mesa(p_pedido_id uuid, p_mesa_id uuid, p_personas integer)
 RETURNS SETOF pedidos
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_mesa public.mesas%rowtype;
  v_pedido public.pedidos%rowtype;
begin
  if p_personas is null or p_personas < 1 then
    raise exception 'Ingresá una cantidad entera de personas mayor a cero.';
  end if;

  select * into v_mesa from public.mesas where id = p_mesa_id for update;
  if not found then
    raise exception 'La mesa no existe o no tenés acceso.';
  end if;
  if v_mesa.estado is distinct from 'libre' then
    raise exception 'La mesa ya no está libre. Seleccioná otra mesa.';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe o no tenés acceso.';
  end if;
  if v_pedido.estado is distinct from 'abierto' or v_pedido.tipo is distinct from 'mostrador' then
    raise exception 'Solo se pueden mover pedidos abiertos de mostrador.';
  end if;
  if exists (select 1 from public.pedidos where mesa_id = p_mesa_id and estado = 'abierto') then
    raise exception 'La mesa ya tiene un pedido abierto. Seleccioná otra mesa.';
  end if;

  update public.mesas
  set estado = 'ocupada', personas = p_personas, updated_at = now()
  where id = p_mesa_id;
  if not found then
    raise exception 'No tenés permiso para actualizar la mesa.';
  end if;

  return query update public.pedidos
  set tipo = 'mesa', mesa_id = p_mesa_id, personas = p_personas, updated_at = now()
  where id = p_pedido_id
  returning *;
  if not found then
    raise exception 'No tenés permiso para actualizar el pedido.';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cancelar_pedido(p_pedido_id uuid)
 RETURNS SETOF pedidos
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_pedido public.pedidos%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe o no tenés acceso.';
  end if;
  if v_pedido.estado is distinct from 'abierto' then
    raise exception 'Solo se pueden cancelar pedidos en curso.';
  end if;

  if v_pedido.mesa_id is not null then
    perform 1 from public.mesas where id = v_pedido.mesa_id for update;
    if not found then
      raise exception 'No se puede acceder a la mesa del pedido.';
    end if;
    if exists (select 1 from public.pedidos where mesa_id = v_pedido.mesa_id and estado = 'abierto' and id <> p_pedido_id) then
      raise exception 'La mesa tiene otro pedido abierto. Revisá sus pedidos antes de cancelar.';
    end if;
    update public.mesas set estado = 'libre', personas = 0, updated_at = now()
    where id = v_pedido.mesa_id;
    if not found then
      raise exception 'No tenés permiso para liberar la mesa.';
    end if;
  end if;

  return query update public.pedidos
  set estado = 'cancelado', closed_at = now(), updated_at = now()
  where id = p_pedido_id returning *;
  if not found then
    raise exception 'No tenés permiso para cancelar el pedido.';
  end if;
end;
$function$
;

create policy "Permitir lectura publica de categorias" on public."categorias" as PERMISSIVE for SELECT to public using (true);

create policy "Permitir lectura publica de productos" on public."productos" as PERMISSIVE for SELECT to public using (true);

create policy "Permitir crear categorias" on public."categorias" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir crear productos" on public."productos" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir eliminar categorias" on public."categorias" as PERMISSIVE for DELETE to anon,authenticated using (true);

create policy "Permitir editar productos" on public."productos" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "Permitir eliminar productos" on public."productos" as PERMISSIVE for DELETE to public using (true);

create policy "Permitir lectura publica de mesas" on public."mesas" as PERMISSIVE for SELECT to public using (true);

create policy "Permitir crear mesas" on public."mesas" as PERMISSIVE for INSERT to public with check (true);

create policy "Permitir editar mesas" on public."mesas" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "Permitir eliminar mesas" on public."mesas" as PERMISSIVE for DELETE to public using (true);

create policy "Permitir lectura publica de pedidos" on public."pedidos" as PERMISSIVE for SELECT to public using (true);

create policy "Permitir crear pedidos" on public."pedidos" as PERMISSIVE for INSERT to public with check (true);

create policy "Permitir editar pedidos" on public."pedidos" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "Permitir lectura publica de pedido_items" on public."pedido_items" as PERMISSIVE for SELECT to public using (true);

create policy "Permitir crear pedido_items" on public."pedido_items" as PERMISSIVE for INSERT to public with check (true);

create policy "Permitir editar pedido_items" on public."pedido_items" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "Permitir eliminar pedido_items" on public."pedido_items" as PERMISSIVE for DELETE to public using (true);

create policy "Permitir lectura cajas" on public."cajas" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar cajas" on public."cajas" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar cajas" on public."cajas" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir lectura turnos" on public."turnos" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar turnos" on public."turnos" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar turnos" on public."turnos" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir lectura arqueos caja" on public."arqueos_caja" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar arqueos caja" on public."arqueos_caja" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar arqueos caja" on public."arqueos_caja" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir lectura arqueo medios pago" on public."arqueo_caja_medios_pago" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar arqueo medios pago" on public."arqueo_caja_medios_pago" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar arqueo medios pago" on public."arqueo_caja_medios_pago" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir eliminar arqueo medios pago" on public."arqueo_caja_medios_pago" as PERMISSIVE for DELETE to anon,authenticated using (true);

create policy "Permitir lectura proveedores" on public."proveedores" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar proveedores" on public."proveedores" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar proveedores" on public."proveedores" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir lectura gastos" on public."gastos" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar gastos" on public."gastos" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar gastos" on public."gastos" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir eliminar gastos" on public."gastos" as PERMISSIVE for DELETE to anon,authenticated using (true);

create policy "Permitir lectura medios pago" on public."medios_pago" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar medios pago" on public."medios_pago" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar medios pago" on public."medios_pago" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir lectura pagos pedido" on public."pedido_pagos" as PERMISSIVE for SELECT to anon,authenticated using (true);

create policy "Permitir insertar pagos pedido" on public."pedido_pagos" as PERMISSIVE for INSERT to anon,authenticated with check (true);

create policy "Permitir actualizar pagos pedido" on public."pedido_pagos" as PERMISSIVE for UPDATE to anon,authenticated using (true) with check (true);

create policy "Permitir eliminar pagos pedido" on public."pedido_pagos" as PERMISSIVE for DELETE to anon,authenticated using (true);

create policy "Permitir leer locales activos temporalmente" on public."locales" as PERMISSIVE for SELECT to anon using ((activo = true));

create policy "Usuarios logueados leen usuarios_locales temporal" on public."usuarios_locales" as PERMISSIVE for SELECT to authenticated using (((user_id = auth.uid()) AND (activo = true)));

create policy "Usuarios logueados leen locales temporal" on public."locales" as PERMISSIVE for SELECT to authenticated using ((activo = true));

create policy "roles_usuarios_select_all" on public."roles_usuarios" as PERMISSIVE for SELECT to public using (true);

create policy "roles_usuarios_insert_all" on public."roles_usuarios" as PERMISSIVE for INSERT to public with check (true);

create policy "roles_usuarios_update_all" on public."roles_usuarios" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "usuarios_sistema_select_all" on public."usuarios_sistema" as PERMISSIVE for SELECT to public using (true);

create policy "usuarios_sistema_insert_all" on public."usuarios_sistema" as PERMISSIVE for INSERT to public with check (true);

create policy "usuarios_sistema_update_all" on public."usuarios_sistema" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "salones_select_all" on public."salones" as PERMISSIVE for SELECT to public using (true);

create policy "salones_insert_all" on public."salones" as PERMISSIVE for INSERT to public with check (true);

create policy "salones_update_all" on public."salones" as PERMISSIVE for UPDATE to public using (true) with check (true);

create policy "pedido_item_cobros_select_all" on public."pedido_item_cobros" as PERMISSIVE for SELECT to public using (true);

create policy "pedido_item_cobros_insert_all" on public."pedido_item_cobros" as PERMISSIVE for INSERT to public with check (true);

create policy "pedido_item_cobros_update_all" on public."pedido_item_cobros" as PERMISSIVE for UPDATE to public using (true) with check (true);

alter table public."pedidos" enable row level security;

alter table public."arqueos_caja" enable row level security;

alter table public."categorias" enable row level security;

alter table public."productos" enable row level security;

alter table public."mesas" enable row level security;

alter table public."cajas" enable row level security;

alter table public."pedido_item_cobros" enable row level security;

alter table public."pedido_items" enable row level security;

alter table public."medios_pago" enable row level security;

alter table public."arqueo_caja_medios_pago" enable row level security;

alter table public."turnos" enable row level security;

alter table public."pedido_pagos" enable row level security;

alter table public."gastos" enable row level security;

alter table public."proveedores" enable row level security;

alter table public."usuarios_locales" enable row level security;

alter table public."locales" enable row level security;

alter table public."roles_usuarios" enable row level security;

alter table public."usuarios_sistema" enable row level security;

alter table public."salones" enable row level security;
