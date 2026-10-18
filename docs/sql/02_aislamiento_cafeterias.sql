-- Ejecutar COMPLETO en SQL Editor como postgres, una sola vez.
-- Esquema contrastado con el diagnóstico del 18/10/2026.
-- Conserva IDs, pedidos, importes, productos, cuentas y membresías existentes.
-- Solo completa local_id faltantes con la cafetería actual indicada abajo.
-- Si ya hay datos o membresías de otro local, ABORTA sin aplicar cambios.
-- No volver a ejecutar los scripts SQL históricos con políticas abiertas.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('gestormesas_aislamiento_v1'));

-- Único local con administrador en el diagnóstico entregado por el usuario.
select set_config('app.migracion_local_legacy', '8ad72695-6d92-4de5-9895-449f1d1cab67', true);

do $$
declare
  v_local uuid := current_setting('app.migracion_local_legacy')::uuid;
  t text;
  v_cantidad bigint;
begin
  if to_regprocedure('private.crear_cafeteria_al_registrar()') is not null then
    raise exception 'Esta migración ya fue aplicada. No repetirla: podría haber cafeterías nuevas.';
  end if;
  -- Las escrituras quedan bloqueadas hasta COMMIT: nadie puede registrarse o
  -- cambiar datos entre la comprobación y la instalación de las restricciones.
  lock table auth.users in share row exclusive mode;
  lock table public.locales, public.usuarios_locales,
    public.categorias, public.productos, public.mesas, public.cajas,
    public.turnos, public.medios_pago, public.proveedores, public.salones,
    public.roles_usuarios, public.usuarios_sistema, public.arqueos_caja,
    public.pedidos, public.gastos, public.pedido_items, public.pedido_pagos,
    public.pedido_item_cobros, public.arqueo_caja_medios_pago in access exclusive mode;

  if not exists (select 1 from public.locales where id = v_local and activo)
    or (select count(*) from public.usuarios_locales where local_id = v_local and activo and rol = 'admin') <> 1
    or exists (select 1 from public.usuarios_locales where local_id <> v_local)
    or exists (select 1 from public.usuarios_locales group by user_id having count(*) > 1) then
    raise exception 'Las membresías no coinciden con el diagnóstico. Revisar antes de migrar; no se reasignó ningún usuario.';
  end if;

  if exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal) then
    raise exception 'Hay triggers nuevos en auth.users. Revisarlos antes de instalar el alta de cafeterías.';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) then
    raise exception 'Hay funciones SECURITY DEFINER públicas no contempladas. Revisar sus permisos antes de migrar.';
  end if;
  if exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind in ('v','m')) then
    raise exception 'Hay vistas públicas nuevas. Revisar su aislamiento antes de migrar.';
  end if;
  if exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace
    and c.relkind in ('r','p') and c.relname <> all(array[
      'locales','usuarios_locales','categorias','productos','mesas','cajas','turnos',
      'medios_pago','proveedores','salones','roles_usuarios','usuarios_sistema',
      'arqueos_caja','pedidos','gastos','pedido_items','pedido_pagos',
      'pedido_item_cobros','arqueo_caja_medios_pago'])) then
    raise exception 'Hay tablas públicas nuevas no contempladas. Actualizar el diagnóstico antes de migrar.';
  end if;

  foreach t in array array['categorias','productos','mesas','cajas','turnos',
    'medios_pago','proveedores','arqueos_caja','pedidos','gastos'] loop
    execute format('select count(*) from public.%I where local_id is not null and local_id <> $1', t)
      into v_cantidad using v_local;
    if v_cantidad > 0 then
      raise exception 'La tabla % tiene % registros asignados a otro local. Se canceló todo; revisar sus local_id.', t, v_cantidad;
    end if;
  end loop;
end $$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

-- Una identidad Auth pertenece a una sola cafetería, aun si fue desactivada.
create unique index usuarios_locales_un_local_por_usuario on public.usuarios_locales(user_id);

create or replace function private.mi_local()
returns uuid language sql stable security definer set search_path = ''
as $$
  select ul.local_id from public.usuarios_locales ul
  join public.locales l on l.id = ul.local_id
  where ul.user_id = (select auth.uid()) and ul.activo and l.activo;
$$;

create or replace function private.soy_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.usuarios_locales ul
    join public.locales l on l.id = ul.local_id
    where ul.user_id = (select auth.uid()) and ul.activo and l.activo and ul.rol = 'admin');
$$;
revoke all on function private.mi_local(), private.soy_admin() from public, anon;
grant execute on function private.mi_local(), private.soy_admin() to authenticated, service_role;

-- Todas las tablas operativas tienen un propietario explícito. Para las cuatro
-- tablas de detalle se deriva del pedido/arqueo, nunca de metadatos del cliente.
do $$
declare t text; v_local uuid := current_setting('app.migracion_local_legacy')::uuid;
begin
  foreach t in array array['roles_usuarios','usuarios_sistema','salones',
    'pedido_items','pedido_pagos','pedido_item_cobros','arqueo_caja_medios_pago'] loop
    execute format('alter table public.%I add column local_id uuid', t);
  end loop;
  foreach t in array array['categorias','productos','mesas','cajas','turnos',
    'medios_pago','proveedores','salones','roles_usuarios','usuarios_sistema',
    'arqueos_caja','pedidos','gastos'] loop
    execute format('update public.%I set local_id = $1 where local_id is null', t) using v_local;
  end loop;
end $$;
update public.pedido_items i set local_id = p.local_id from public.pedidos p where p.id = i.pedido_id;
update public.pedido_pagos i set local_id = p.local_id from public.pedidos p where p.id = i.pedido_id;
update public.pedido_item_cobros i set local_id = p.local_id from public.pedidos p where p.id = i.pedido_id;
update public.arqueo_caja_medios_pago i set local_id = a.local_id from public.arqueos_caja a where a.id = i.arqueo_caja_id;

create or replace function private.impedir_cambio_local()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.local_id is distinct from old.local_id then
    raise exception using errcode = '23514', message = 'No se puede cambiar la cafetería de un registro.';
  end if;
  return new;
end $$;
revoke all on function private.impedir_cambio_local() from public, anon, authenticated;

do $$
declare t text; p record; v_guard text;
begin
  foreach t in array array['categorias','productos','mesas','cajas','turnos',
    'medios_pago','proveedores','salones','roles_usuarios','usuarios_sistema',
    'arqueos_caja','pedidos','gastos','pedido_items','pedido_pagos',
    'pedido_item_cobros','arqueo_caja_medios_pago'] loop
    execute format('alter table public.%I alter column local_id set not null, alter column local_id set default private.mi_local()', t);
    execute format('alter table public.%I add constraint %I foreign key(local_id) references public.locales(id)', t, t || '_local_id_fkey');
    execute format('create unique index %I on public.%I(local_id,id)', t || '_local_id_id_unique', t);
    execute format('create trigger impedir_cambio_local before update of local_id on public.%I for each row execute function private.impedir_cambio_local()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    v_guard := 'local_id = (select private.mi_local())';
    if t in ('roles_usuarios','usuarios_sistema') then
      v_guard := v_guard || ' and (select private.soy_admin())';
    end if;
    -- AND restrictivo: una futura política permisiva no abre otros locales.
    execute format('create policy aislamiento_local on public.%I as restrictive for all to public using (%s) with check (%s)', t, v_guard, v_guard);
    execute format('create policy operar_mi_local on public.%I for all to authenticated using (%s) with check (%s)', t, v_guard, v_guard);
  end loop;
end $$;

-- Reemplazar, no duplicar, las FK existentes: mantiene una sola relación para
-- los embeds de PostgREST y hace imposible enlazar datos de dos cafeterías.
do $$
declare r record;
begin
  for r in select * from (values
    ('productos','productos_categoria_id_fkey','categoria_id','categorias','NO ACTION'),
    ('pedidos','pedidos_mesa_id_fkey','mesa_id','mesas','NO ACTION'),
    ('pedidos','pedidos_turno_id_fkey','turno_id','turnos','NO ACTION'),
    ('pedidos','pedidos_arqueo_caja_id_fkey','arqueo_caja_id','arqueos_caja','NO ACTION'),
    ('arqueos_caja','arqueos_caja_caja_id_fkey','caja_id','cajas','NO ACTION'),
    ('pedido_items','pedido_items_pedido_id_fkey','pedido_id','pedidos','CASCADE'),
    ('pedido_items','pedido_items_producto_id_fkey','producto_id','productos','NO ACTION'),
    ('pedido_pagos','pedido_pagos_pedido_id_fkey','pedido_id','pedidos','CASCADE'),
    ('pedido_pagos','pedido_pagos_medio_pago_id_fkey','medio_pago_id','medios_pago','NO ACTION'),
    ('pedido_pagos','pedido_pagos_arqueo_caja_id_fkey','arqueo_caja_id','arqueos_caja','NO ACTION'),
    ('gastos','gastos_arqueo_caja_id_fkey','arqueo_caja_id','arqueos_caja','NO ACTION'),
    ('gastos','gastos_medio_pago_id_fkey','medio_pago_id','medios_pago','NO ACTION'),
    ('gastos','gastos_proveedor_id_fkey','proveedor_id','proveedores','NO ACTION'),
    ('arqueo_caja_medios_pago','arqueo_caja_medios_pago_arqueo_caja_id_fkey','arqueo_caja_id','arqueos_caja','CASCADE'),
    ('arqueo_caja_medios_pago','arqueo_caja_medios_pago_medio_pago_id_fkey','medio_pago_id','medios_pago','NO ACTION'),
    ('pedido_item_cobros','pedido_item_cobros_pedido_id_fkey','pedido_id','pedidos','CASCADE'),
    ('usuarios_sistema','usuarios_sistema_rol_id_fkey','rol_id','roles_usuarios','SET NULL (rol_id)')
  ) as f(tabla,nombre,columna,padre,accion) loop
    execute format('alter table public.%I drop constraint %I', r.tabla, r.nombre);
    execute format('alter table public.%I add constraint %I foreign key(local_id,%I) references public.%I(local_id,id) on delete %s', r.tabla, r.nombre, r.columna, r.padre, r.accion);
  end loop;
end $$;
-- Un cobro de ítem tampoco puede apuntar a otro pedido de la misma cafetería.
create unique index pedido_items_local_pedido_id_unique on public.pedido_items(local_id,pedido_id,id);
alter table public.pedido_item_cobros drop constraint pedido_item_cobros_pedido_item_id_fkey;
alter table public.pedido_item_cobros add constraint pedido_item_cobros_pedido_item_id_fkey
  foreign key(local_id,pedido_id,pedido_item_id) references public.pedido_items(local_id,pedido_id,id) on delete cascade;

-- Unicidad por cafetería: ambos negocios pueden tener una mesa 1, caja principal,
-- categoría Café o un proveedor con el mismo nombre.
alter table public.categorias drop constraint categorias_nombre_key;
alter table public.productos drop constraint productos_fudo_id_key;
alter table public.mesas drop constraint mesas_sector_x_y_key;
drop index public.categorias_nombre_normalizado_unique;
drop index public.productos_categoria_nombre_normalizado_unique;
drop index public.mesas_numero_normalizado_unique;
drop index public.cajas_nombre_normalizado_unique;
drop index public.turnos_nombre_normalizado_unique;
drop index public.medios_pago_nombre_normalizado_unique;
drop index public.proveedores_nombre_normalizado_unique;
drop index public.roles_usuarios_nombre_normalizado_unique;
drop index public.usuarios_sistema_email_unique;
drop index public.salones_nombre_normalizado_unique;
create unique index categorias_nombre_normalizado_unique on public.categorias(local_id,lower(btrim(nombre)));
create unique index productos_fudo_id_unique on public.productos(local_id,fudo_id);
create unique index productos_categoria_nombre_normalizado_unique on public.productos(local_id,categoria_id,lower(btrim(nombre)));
create unique index mesas_sector_x_y_unique on public.mesas(local_id,sector,x,y);
create unique index mesas_numero_normalizado_unique on public.mesas(local_id,lower(btrim(numero)));
create unique index cajas_nombre_normalizado_unique on public.cajas(local_id,lower(btrim(nombre)));
create unique index turnos_nombre_normalizado_unique on public.turnos(local_id,lower(btrim(nombre)));
create unique index medios_pago_nombre_normalizado_unique on public.medios_pago(local_id,lower(btrim(nombre)));
create unique index proveedores_nombre_normalizado_unique on public.proveedores(local_id,lower(btrim(nombre)));
create unique index roles_usuarios_nombre_normalizado_unique on public.roles_usuarios(local_id,lower(regexp_replace(btrim(nombre),'\s+','','g')));
create unique index usuarios_sistema_email_unique on public.usuarios_sistema(local_id,lower(btrim(email)));
create unique index salones_nombre_normalizado_unique on public.salones(local_id,lower(btrim(nombre))) where activo;

do $$
declare t text; p record;
begin
  foreach t in array array['locales','usuarios_locales'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
grant update(nombre,updated_at) on public.locales to authenticated;
create policy aislamiento_local on public.locales as restrictive for all to public
  using (id = (select private.mi_local())) with check (id = (select private.mi_local()));
create policy leer_mi_local on public.locales for select to authenticated
  using (id = (select private.mi_local()));
create policy editar_nombre_mi_local on public.locales for update to authenticated
  using ((select private.soy_admin())) with check ((select private.soy_admin()));
create policy aislamiento_membresias on public.usuarios_locales as restrictive for all to public
  using (local_id = (select private.mi_local())) with check (false);
create policy leer_membresias on public.usuarios_locales for select to authenticated
  using (user_id = (select auth.uid()) or (select private.soy_admin()));
-- No INSERT/UPDATE/DELETE de membresías desde el navegador, ni para admin.

-- Las dos RPC del diagnóstico respetan RLS (SECURITY INVOKER).
alter function public.mover_pedido_mostrador_a_mesa(uuid,uuid,integer) security invoker;
alter function public.cancelar_pedido(uuid) security invoker;
revoke all on function public.mover_pedido_mostrador_a_mesa(uuid,uuid,integer), public.cancelar_pedido(uuid) from public, anon;
grant execute on function public.mover_pedido_mostrador_a_mesa(uuid,uuid,integer), public.cancelar_pedido(uuid) to authenticated, service_role;

create or replace function private.crear_cafeteria_al_registrar()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_nombre text := btrim(new.raw_user_meta_data ->> 'nombre_local');
  v_local uuid;
begin
  -- Usuarios invitados o creados sin nombre_local no reciben privilegios.
  -- Su incorporación se implementará por un canal de administración separado.
  if v_nombre is null then return new; end if;
  if char_length(v_nombre) < 1 or char_length(v_nombre) > 100 then
    raise exception 'El nombre del negocio debe tener entre 1 y 100 caracteres.';
  end if;
  insert into public.locales(nombre,activo) values(v_nombre,true) returning id into v_local;
  insert into public.usuarios_locales(user_id,local_id,email,nombre,rol,activo)
    values(new.id,v_local,new.email,new.email,'admin',true);
  insert into public.cajas(local_id,nombre,activo) values(v_local,'Caja principal',true);
  insert into public.medios_pago(local_id,nombre,activo) values(v_local,'Efectivo',true);
  return new;
end $$;
revoke all on function private.crear_cafeteria_al_registrar() from public, anon, authenticated;
create trigger crear_cafeteria_al_registrar after insert on auth.users
  for each row execute function private.crear_cafeteria_al_registrar();

notify pgrst, 'reload schema';
commit;
