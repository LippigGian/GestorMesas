-- Ejecutar completo DESPUÉS del aislamiento 02. No vuelve a asignar locales.
-- Conserva administradores y roles existentes. No crea/invita empleados.
-- Los empleados necesitan una membresía con rol_id explícito de su propio local.
begin;
set local lock_timeout='10s';
select pg_advisory_xact_lock(hashtext('gestormesas_permisos_v1'));
do $$ begin
  if to_regprocedure('private.mi_local()') is null then raise exception 'Falta aplicar el aislamiento de cafeterías.'; end if;
  if to_regprocedure('private.tiene_permiso(text)') is not null then raise exception 'La migración de permisos ya está instalada.'; end if;
end $$;
lock table public.usuarios_locales,public.roles_usuarios in access exclusive mode;

create function private.catalogo_permisos() returns text[]
language sql immutable set search_path='' as $$ select array[
  'editar_precios','ver_saldos_arqueo','abrir_cerrar_caja','aplicar_descuentos',
  'editar_productos','editar_mesas','ver_ventas','ver_metricas','gestionar_gastos',
  'gestionar_usuarios','modificar_configuracion_general']::text[] $$;
create function private.permisos_validos(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare x jsonb; vistos text[]:=array[]::text[];
begin
  if p is null or jsonb_typeof(p)<>'array' then return false; end if;
  for x in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(x)<>'string' or not (x #>> '{}'=any(private.catalogo_permisos()))
      or (x #>> '{}')=any(vistos) then return false; end if;
    vistos:=array_append(vistos,x #>> '{}');
  end loop;
  return true;
end $$;
revoke all on function private.catalogo_permisos(),private.permisos_validos(jsonb) from public,anon;
grant execute on function private.catalogo_permisos(),private.permisos_validos(jsonb) to authenticated,service_role;
-- Si hubiera códigos desconocidos, falla sin borrarlos ni conceder permisos.
alter table public.roles_usuarios add constraint roles_catalogo_fijo check(private.permisos_validos(permisos));
alter table public.usuarios_locales add column rol_id uuid;
alter table public.usuarios_locales add constraint usuarios_locales_rol_del_local_fkey
  foreign key(local_id,rol_id) references public.roles_usuarios(local_id,id) on delete restrict;
alter table public.usuarios_locales drop constraint usuarios_locales_rol_check;
alter table public.usuarios_locales add constraint usuarios_locales_rol_check
  check(rol in ('admin','encargado','cajero','mozo','camarero','empleado'));
-- No se adivinan roles por nombre/email para cuentas anteriores.
-- Sin rol_id, cualquier membresía no administradora queda sin acceso.
alter table public.usuarios_locales add constraint administrador_sin_rol_personalizado check(rol<>'admin' or rol_id is null);
create index usuarios_locales_rol_id_idx on public.usuarios_locales(local_id,rol_id);

create or replace function private.mi_local() returns uuid
language sql stable security definer set search_path='' as $$
  select u.local_id from public.usuarios_locales u join public.locales l on l.id=u.local_id
  left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
  where u.user_id=(select auth.uid()) and u.activo and l.activo
    and (u.rol='admin' or r.activo);
$$;
create function private.tiene_permiso(p_codigo text) returns boolean
language sql stable security definer set search_path='' as $$
  select p_codigo=any(private.catalogo_permisos()) and exists(
    select 1 from public.usuarios_locales u join public.locales l on l.id=u.local_id
    left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
    where u.user_id=(select auth.uid()) and u.activo and l.activo
      and (u.rol='admin' or (r.activo and r.permisos ? p_codigo)));
$$;
create function private.pedido_visible(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.pedidos p where p.id=p_id and p.local_id=private.mi_local()
    and (p.estado='abierto' or private.tiene_permiso('ver_ventas')));
$$;
create function private.pedido_abierto(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.pedidos p where p.id=p_id and p.local_id=private.mi_local() and p.estado='abierto');
$$;
revoke all on function private.tiene_permiso(text),private.pedido_visible(uuid),private.pedido_abierto(uuid) from public,anon;
grant execute on function private.tiene_permiso(text),private.pedido_visible(uuid),private.pedido_abierto(uuid) to authenticated,service_role;

create function private.validar_delegacion_rol() returns trigger
language plpgsql security invoker set search_path='' as $$
declare permisos_actor jsonb;
begin
  if current_user in ('postgres','service_role','supabase_admin') or private.soy_admin() then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if not private.tiene_permiso('gestionar_usuarios') then raise exception using errcode='42501',message='No podés administrar roles.'; end if;
  select coalesce(jsonb_agg(p),'[]'::jsonb) into permisos_actor
    from unnest(private.catalogo_permisos()) p where private.tiene_permiso(p);
  if (tg_op<>'INSERT' and not old.permisos <@ permisos_actor)
    or (tg_op<>'DELETE' and not new.permisos <@ permisos_actor) then
    raise exception using errcode='42501',message='No podés administrar ni conceder permisos superiores a los tuyos.';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger validar_delegacion_rol before insert or update or delete on public.roles_usuarios
  for each row execute function private.validar_delegacion_rol();

-- Reemplazar políticas permisivas antiguas, conservar guardia de local y añadir
-- guardias restrictivas por acción. Un USING(true) futuro no abre las acciones.
do $$
declare t text; op text; regla text; lectura text; escritura text; p record;
begin
  foreach t in array array['categorias','productos','mesas','salones','cajas','turnos',
    'medios_pago','proveedores','roles_usuarios','usuarios_sistema','pedidos',
    'pedido_items','pedido_pagos','pedido_item_cobros','gastos','arqueos_caja','arqueo_caja_medios_pago'] loop
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I',p.policyname,t);
    end loop;
    execute format('create policy aislamiento_local on public.%I as restrictive for all to public using(local_id=(select private.mi_local())) with check(local_id=(select private.mi_local()))',t);
    lectura:='true'; escritura:='false';
    case
      when t in ('categorias','productos') then escritura:='(select private.tiene_permiso(''editar_productos''))';
      when t in ('mesas','salones') then escritura:='(select private.tiene_permiso(''editar_mesas''))';
      when t in ('cajas','turnos','medios_pago') then escritura:='(select private.tiene_permiso(''modificar_configuracion_general''))';
      when t='proveedores' then escritura:='(select private.tiene_permiso(''gestionar_gastos''))';
      when t in ('roles_usuarios','usuarios_sistema') then
        lectura:='(select private.tiene_permiso(''gestionar_usuarios''))'; escritura:=lectura;
      when t='gastos' then lectura:='(select private.tiene_permiso(''gestionar_gastos''))'; escritura:=lectura;
      when t in ('arqueos_caja','arqueo_caja_medios_pago') then
        lectura:='(select private.tiene_permiso(''ver_saldos_arqueo''))'; escritura:='(select private.soy_admin())';
      when t='pedidos' then lectura:='(estado=''abierto'' or (select private.tiene_permiso(''ver_ventas'')))'; escritura:='true';
      when t in ('pedido_items','pedido_pagos','pedido_item_cobros') then
        lectura:='private.pedido_visible(pedido_id)'; escritura:='private.pedido_abierto(pedido_id)';
      else raise exception 'Tabla no contemplada: %',t;
    end case;
    foreach op in array array['select','insert','update','delete'] loop
      regla:=case when op='select' then lectura else escritura end;
      if op='update' and t in ('mesas','productos') then regla:='true'; end if; -- Trigger: columnas operativas/favoritos.
      if t in ('pedido_pagos','pedido_item_cobros') and op<>'select' then regla:='false'; end if; -- Cobro atómico por RPC.
      if t='pedidos' and op='delete' then regla:='false'; end if; -- Cancelar, no borrar.
      regla:='((select private.soy_admin()) or ('||regla||'))';
      execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
        'permiso_'||op,t,op,case when op='insert' then 'with check('||regla||')' when op='update' then 'using('||regla||') with check('||regla||')' else 'using('||regla||')' end);
      execute format('create policy %I on public.%I for %s to authenticated %s',
        'autorizar_'||op,t,op,case when op='insert' then 'with check(true)' when op='update' then 'using(true) with check(true)' else 'using(true)' end);
    end loop;
  end loop;
end $$;

drop policy editar_nombre_mi_local on public.locales;
create policy editar_nombre_mi_local on public.locales for update to authenticated
  using((select private.tiene_permiso('modificar_configuracion_general')))
  with check((select private.tiene_permiso('modificar_configuracion_general')));
create policy permiso_update on public.locales as restrictive for update to authenticated
  using((select private.tiene_permiso('modificar_configuracion_general')))
  with check((select private.tiene_permiso('modificar_configuracion_general')));
drop policy leer_membresias on public.usuarios_locales;
create policy leer_membresias on public.usuarios_locales for select to authenticated
  using(user_id=(select auth.uid()) or (select private.tiene_permiso('gestionar_usuarios')));

create function private.arqueo_abierto(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.arqueos_caja a where a.id=p_id and a.local_id=private.mi_local() and a.estado='abierto');
$$;
revoke all on function private.arqueo_abierto(uuid) from public,anon;
grant execute on function private.arqueo_abierto(uuid) to authenticated,service_role;

create function private.validar_operacion() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v public.pedidos%rowtype; precio numeric; total_real numeric; cobrados integer;
begin
  -- Solo los canales privilegiados y el administrador conservan acceso completo.
  -- Las RPC SECURITY DEFINER validan actor/local/parámetros antes de escribir.
  if current_user in ('postgres','service_role','supabase_admin') or private.soy_admin() then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if private.mi_local() is null then raise exception using errcode='42501',message='No tenés un rol activo en esta cafetería.'; end if;
  if tg_table_name='mesas' then
    if (to_jsonb(new)-array['estado','personas','updated_at']) is distinct from (to_jsonb(old)-array['estado','personas','updated_at'])
      and not private.tiene_permiso('editar_mesas') then
      raise exception using errcode='42501',message='No tenés permiso para administrar mesas y salones.';
    end if;
  elsif tg_table_name='productos' then
    if (to_jsonb(new)-array['favorito','updated_at']) is distinct from (to_jsonb(old)-array['favorito','updated_at'])
      and not private.tiene_permiso('editar_productos') then
      raise exception using errcode='42501',message='No tenés permiso para modificar el catálogo.';
    end if;
  elsif tg_table_name='pedidos' then
    if tg_op='INSERT' then
      if new.estado<>'abierto' or new.total<>0 or new.arqueo_caja_id is not null or new.closed_at is not null then
        raise exception using errcode='42501',message='El pedido debe iniciarse abierto y sin cobros.';
      end if;
    else
      if old.estado<>'abierto' or new.id<>old.id or new.created_at<>old.created_at then
        raise exception using errcode='42501',message='No podés modificar pedidos históricos ni sus identificadores.';
      end if;
      if new.arqueo_caja_id is distinct from old.arqueo_caja_id or new.turno_id is distinct from old.turno_id then
        raise exception using errcode='42501',message='Las asociaciones de caja y turno se actualizan al cobrar.';
      end if;
      select coalesce(sum(subtotal),0) into total_real from public.pedido_items where pedido_id=old.id;
      if new.total is distinct from total_real then
        raise exception using errcode='42501',message='El total debe coincidir con los productos del pedido.';
      end if;
      if new.estado='cerrado' and abs(new.total-(select coalesce(sum(monto),0) from public.pedido_pagos where pedido_id=old.id))>0.01 then
        raise exception using errcode='42501',message='El pedido no está completamente cobrado.';
      end if;
    end if;
  elsif tg_table_name='gastos' then
    if tg_op<>'INSERT' and not private.arqueo_abierto(old.arqueo_caja_id) then raise exception 'No podés modificar gastos de una caja cerrada.'; end if;
    if tg_op<>'DELETE' and not private.arqueo_abierto(new.arqueo_caja_id) then raise exception 'La caja del gasto no está abierta.'; end if;
    if tg_op='DELETE' then return old; end if;
  elsif tg_table_name='pedido_items' then
    -- Serializar adición/edición con el cobro y la cancelación del pedido.
    if tg_op<>'INSERT' then
      select * into v from public.pedidos where id=old.pedido_id for update;
      if not found or v.estado<>'abierto' then raise exception using errcode='42501',message='El pedido no está abierto.'; end if;
      if old.producto_id is null and not private.tiene_permiso('aplicar_descuentos') then
        raise exception using errcode='42501',message='No tenés permiso para modificar descuentos.';
      end if;
      select coalesce(sum(cantidad),0) into cobrados from public.pedido_item_cobros where pedido_item_id=old.id;
      if (tg_op='DELETE' and cobrados>0) or (tg_op='UPDATE' and new.cantidad<cobrados) then
        raise exception 'No podés quitar cantidades ya cobradas.';
      end if;
      if tg_op='DELETE' then return old; end if;
      if new.producto_id is distinct from old.producto_id or new.id<>old.id then raise exception 'No podés reemplazar el producto de un ítem confirmado.'; end if;
    end if;
    select * into v from public.pedidos where id=new.pedido_id for update;
    if not found or v.estado<>'abierto' then raise exception using errcode='42501',message='El pedido no está abierto.'; end if;
    if new.producto_id is null then
      if not private.tiene_permiso('aplicar_descuentos') or new.nombre_producto<>'Descuento' or new.cantidad<>1 or new.precio_unitario>=0 then
        raise exception using errcode='42501',message='No tenés permiso para aplicar ese descuento.';
      end if;
    else
      if new.precio_unitario<0 then raise exception 'El precio de un producto no puede ser negativo.'; end if;
      if tg_op='INSERT' then
        select p.precio into precio from public.productos p where p.id=new.producto_id and p.local_id=new.local_id;
        if not found then raise exception 'Producto no disponible.'; end if;
      else precio:=old.precio_unitario; end if;
      if new.precio_unitario is distinct from precio and not private.tiene_permiso('editar_precios') then
        raise exception using errcode='42501',message='No tenés permiso para editar el precio al adicionar.';
      end if;
    end if;
    if new.subtotal is distinct from round(new.precio_unitario*new.cantidad,2) then
      raise exception using errcode='42501',message='El subtotal debe coincidir con el precio y la cantidad.';
    end if;
  end if;
  return new;
end $$;
create trigger validar_operacion before update on public.mesas for each row execute function private.validar_operacion();
create trigger validar_operacion before update on public.productos for each row execute function private.validar_operacion();
create trigger validar_operacion before insert or update on public.pedidos for each row execute function private.validar_operacion();
create trigger validar_operacion before insert or update or delete on public.pedido_items for each row execute function private.validar_operacion();
create trigger validar_operacion before insert or update or delete on public.gastos for each row execute function private.validar_operacion();
revoke all on function private.validar_operacion(),private.validar_delegacion_rol() from public,anon,authenticated;

create function public.mis_permisos() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('local_id',u.local_id,'administrador',u.rol='admin','rol_id',u.rol_id,
    'rol_nombre',case when u.rol='admin' then 'Administrador' else r.nombre end,
    'permisos',case when u.rol='admin' then to_jsonb(private.catalogo_permisos()) else r.permisos end)
  from public.usuarios_locales u left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
  where u.user_id=(select auth.uid()) and u.local_id=private.mi_local() and u.activo;
$$;

create function public.asignar_rol_empleado(p_usuario_id uuid,p_rol_id uuid,p_activo boolean default true) returns void
language plpgsql security definer set search_path='' as $$
declare u public.usuarios_locales%rowtype; r public.roles_usuarios%rowtype; propios jsonb;
begin
  if not private.tiene_permiso('gestionar_usuarios') then raise exception using errcode='42501',message='No podés administrar usuarios y roles.'; end if;
  select * into u from public.usuarios_locales where user_id=p_usuario_id and local_id=private.mi_local() for update;
  if not found or u.rol='admin' or u.user_id=auth.uid() then
    raise exception using errcode='42501',message='No podés modificar esa membresía ni la cuenta administradora.';
  end if;
  select * into r from public.roles_usuarios where id=p_rol_id and local_id=u.local_id and activo;
  if not found then raise exception 'Seleccioná un rol activo de tu cafetería.'; end if;
  if not private.soy_admin() then
    select coalesce(jsonb_agg(p),'[]'::jsonb) into propios from unnest(private.catalogo_permisos()) p where private.tiene_permiso(p);
    if not r.permisos <@ propios or exists(select 1 from public.roles_usuarios a where a.id=u.rol_id and not a.permisos <@ propios) then
      raise exception using errcode='42501',message='No podés asignar ni administrar permisos superiores a los tuyos.';
    end if;
  end if;
  update public.usuarios_locales set rol='empleado',rol_id=r.id,activo=coalesce(p_activo,false),updated_at=now() where id=u.id;
end $$;

-- Las RPC financieras y de métricas se definen a continuación.
create function public.listar_arqueos_operativos()
returns table(id uuid,local_id uuid,caja_id uuid,estado text,opened_at timestamptz,closed_at timestamptz)
language sql stable security definer set search_path='' as $$
  select a.id,a.local_id,a.caja_id,a.estado,a.opened_at,a.closed_at
  from public.arqueos_caja a where a.local_id=private.mi_local() order by a.opened_at desc;
$$;

create function public.cobrar_pedido(p_pedido_id uuid,p_pagos jsonb,p_cerrar boolean default false,p_items jsonb default '[]')
returns numeric language plpgsql security definer set search_path='' as $$
declare
  l uuid:=private.mi_local(); p public.pedidos%rowtype; a public.arqueos_caja%rowtype;
  x jsonb; importe numeric; v_total numeric; previo numeric; nuevo numeric:=0;
  item public.pedido_items%rowtype; cantidad integer; ya integer; suma_items numeric:=0;
  ids uuid[]:=array[]::uuid[]; ahora timestamptz:=now(); turno uuid;
begin
  if l is null then raise exception using errcode='42501',message='No tenés un rol activo.'; end if;
  perform pg_advisory_xact_lock(hashtext(l::text));
  select * into p from public.pedidos where id=p_pedido_id and local_id=l for update;
  if not found or p.estado<>'abierto' then raise exception 'El pedido no está abierto o no tenés acceso.'; end if;
  if p_cerrar is null or p_pagos is null or jsonb_typeof(p_pagos)<>'array'
    or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Formato de cobro inválido.'; end if;
  if jsonb_array_length(p_pagos)=0 then raise exception 'Agregá al menos un pago.'; end if;
  if (select count(*) from public.arqueos_caja where local_id=l and estado='abierto')<>1 then
    raise exception 'Debe haber exactamente una caja abierta para cobrar.';
  end if;
  select * into a from public.arqueos_caja where local_id=l and estado='abierto' for update;
  if not found then raise exception 'La caja ya no está abierta.'; end if;
  select coalesce(sum(subtotal),0) into v_total from public.pedido_items where pedido_id=p.id;
  select coalesce(sum(monto),0) into previo from public.pedido_pagos where pedido_id=p.id;
  for x in select value from jsonb_array_elements(p_pagos) loop
    importe:=(x->>'monto')::numeric;
    if importe is null or importe<=0 or importe<>round(importe,2) or importe::text in ('NaN','Infinity','-Infinity') then raise exception 'Monto inválido.'; end if;
    if not exists(select 1 from public.medios_pago where id=(x->>'medioPagoId')::uuid and local_id=l and activo) then raise exception 'Medio de pago no disponible en tu cafetería.'; end if;
    nuevo:=nuevo+importe;
  end loop;
  if p_cerrar and abs(previo+nuevo-v_total)>0.01 then raise exception 'Los pagos deben coincidir con el v_total de la venta.'; end if;
  if not p_cerrar and previo+nuevo>=v_total-0.01 then raise exception 'Para cobrar el v_total usá Cerrar venta.'; end if;
  for x in select value from jsonb_array_elements(p_items) loop
    if (x->>'pedidoItemId')::uuid=any(ids) then raise exception 'Ítem repetido.'; end if;
    ids:=array_append(ids,(x->>'pedidoItemId')::uuid);
    select * into item from public.pedido_items where id=(x->>'pedidoItemId')::uuid and pedido_id=p.id and local_id=l;
    cantidad:=(x->>'cantidad')::integer;
    if not found or cantidad is null or cantidad<=0 or item.subtotal<=0 then raise exception 'Ítem de cobro inválido.'; end if;
    select coalesce(sum(c.cantidad),0) into ya from public.pedido_item_cobros c where c.pedido_item_id=item.id;
    if cantidad+ya>item.cantidad then raise exception 'La cantidad supera lo que falta cobrar.'; end if;
    importe:=(x->>'monto')::numeric;
    if importe is null or abs(importe-round(item.subtotal/item.cantidad*cantidad,2))>0.01 then raise exception 'El importe del ítem no coincide con su precio.'; end if;
    suma_items:=suma_items+importe;
  end loop;
  if jsonb_array_length(p_items)>0 and abs(suma_items-nuevo)>0.01 then raise exception 'Los cobros deben coincidir con los ítems seleccionados.'; end if;
  for x in select value from jsonb_array_elements(p_pagos) loop
    insert into public.pedido_pagos(local_id,pedido_id,medio_pago_id,arqueo_caja_id,monto)
      values(l,p.id,(x->>'medioPagoId')::uuid,a.id,(x->>'monto')::numeric);
  end loop;
  for x in select value from jsonb_array_elements(p_items) loop
    insert into public.pedido_item_cobros(local_id,pedido_id,pedido_item_id,cantidad,monto)
      values(l,p.id,(x->>'pedidoItemId')::uuid,(x->>'cantidad')::integer,(x->>'monto')::numeric);
  end loop;
  if p_cerrar then
    select t.id into turno from public.turnos t where t.local_id=l and t.activo and (
      (t.hora_inicio<t.hora_fin and (ahora at time zone 'America/Argentina/Buenos_Aires')::time>=t.hora_inicio and (ahora at time zone 'America/Argentina/Buenos_Aires')::time<t.hora_fin)
      or (t.hora_inicio>=t.hora_fin and ((ahora at time zone 'America/Argentina/Buenos_Aires')::time>=t.hora_inicio or (ahora at time zone 'America/Argentina/Buenos_Aires')::time<t.hora_fin))) order by t.nombre limit 1;
  end if;
  update public.pedidos set total=v_total,arqueo_caja_id=a.id,estado=case when p_cerrar then 'cerrado' else estado end,
    closed_at=case when p_cerrar then ahora else closed_at end,turno_id=case when p_cerrar then turno else turno_id end,updated_at=ahora where id=p.id;
  if p_cerrar and p.mesa_id is not null then
    update public.mesas set estado='libre',personas=0,updated_at=ahora where id=p.mesa_id and local_id=l;
  end if;
  update public.arqueos_caja set total_ventas=(select coalesce(sum(monto),0) from public.pedido_pagos where arqueo_caja_id=a.id),updated_at=ahora where id=a.id;
  return previo+nuevo;
end $$;

-- La RPC devuelve solamente el pedido que el actor acaba de cancelar: no abre
-- SELECT del historial a quien no tiene ver_ventas.
create or replace function public.cancelar_pedido(p_pedido_id uuid) returns setof public.pedidos
language plpgsql security definer set search_path='' as $$
declare p public.pedidos%rowtype; l uuid:=private.mi_local();
begin
  if l is null then raise exception using errcode='42501',message='No tenés un rol activo.'; end if;
  select * into p from public.pedidos where id=p_pedido_id and local_id=l for update;
  if not found or p.estado<>'abierto' then raise exception 'Solo podés cancelar pedidos abiertos de tu cafetería.'; end if;
  if p.mesa_id is not null then
    perform 1 from public.mesas where id=p.mesa_id and local_id=l for update;
    if not found or exists(select 1 from public.pedidos where mesa_id=p.mesa_id and estado='abierto' and id<>p.id) then raise exception 'No se puede liberar la mesa de este pedido.'; end if;
    update public.mesas set estado='libre',personas=0,updated_at=now() where id=p.mesa_id and local_id=l;
  end if;
  return query update public.pedidos set estado='cancelado',closed_at=now(),updated_at=now() where id=p.id and local_id=l returning *;
end $$;

create function public.abrir_caja(p_caja_id uuid,p_monto_inicial numeric,p_apertura timestamptz default now()) returns uuid
language plpgsql security definer set search_path='' as $$
declare l uuid:=private.mi_local(); id_nuevo uuid;
begin
  if not private.tiene_permiso('abrir_cerrar_caja') then raise exception using errcode='42501',message='No podés abrir ni cerrar caja.'; end if;
  perform pg_advisory_xact_lock(hashtext(l::text));
  if not exists(select 1 from public.cajas where id=p_caja_id and local_id=l and activo) then raise exception 'Caja no disponible.'; end if;
  if p_monto_inicial is null or p_monto_inicial<0 or p_monto_inicial<>round(p_monto_inicial,2) or p_monto_inicial::text in ('NaN','Infinity','-Infinity') or p_apertura is null then raise exception 'Datos de apertura inválidos.'; end if;
  insert into public.arqueos_caja(local_id,caja_id,monto_inicial,opened_at) values(l,p_caja_id,p_monto_inicial,p_apertura) returning id into id_nuevo;
  return id_nuevo;
end $$;

create function public.cerrar_caja(p_arqueo_id uuid,p_declaraciones jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  l uuid:=private.mi_local(); a public.arqueos_caja%rowtype; x jsonb;
  medio uuid; declaracion numeric; sistema numeric; final_declarado numeric:=0;
  total_sistema numeric; ids uuid[]:=array[]::uuid[];
begin
  if not private.tiene_permiso('abrir_cerrar_caja') then raise exception using errcode='42501',message='No podés abrir ni cerrar caja.'; end if;
  perform pg_advisory_xact_lock(hashtext(l::text));
  select * into a from public.arqueos_caja where id=p_arqueo_id and local_id=l for update;
  if not found or a.estado<>'abierto' then raise exception 'El arqueo no está abierto o no tenés acceso.'; end if;
  if p_declaraciones is null or jsonb_typeof(p_declaraciones)<>'array' then raise exception 'Declaraciones inválidas.'; end if;
  total_sistema:=(select coalesce(sum(monto),0) from public.pedido_pagos where arqueo_caja_id=a.id)
    -(select coalesce(sum(importe),0) from public.gastos where arqueo_caja_id=a.id);
  delete from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id;
  for x in select value from jsonb_array_elements(p_declaraciones) loop
    medio:=(x->>'medioPagoId')::uuid; declaracion:=(x->>'montoDeclarado')::numeric;
    if medio=any(ids) or declaracion is null or declaracion<0 or declaracion<>round(declaracion,2) or declaracion::text in ('NaN','Infinity','-Infinity') then raise exception 'Declaración inválida o repetida.'; end if;
    if not exists(select 1 from public.medios_pago where id=medio and local_id=l) then raise exception 'Medio de pago ajeno al local.'; end if;
    ids:=array_append(ids,medio);
    sistema:=(select coalesce(sum(monto),0) from public.pedido_pagos where arqueo_caja_id=a.id and medio_pago_id=medio)
      -(select coalesce(sum(importe),0) from public.gastos where arqueo_caja_id=a.id and medio_pago_id=medio);
    insert into public.arqueo_caja_medios_pago(local_id,arqueo_caja_id,medio_pago_id,monto_sistema,monto_declarado,diferencia)
      values(l,a.id,medio,sistema,declaracion,declaracion-sistema);
    final_declarado:=final_declarado+declaracion;
  end loop;
  if exists(select 1 from public.pedido_pagos where arqueo_caja_id=a.id and not medio_pago_id=any(ids))
    or exists(select 1 from public.gastos where arqueo_caja_id=a.id and not medio_pago_id=any(ids)) then raise exception 'Faltan declaraciones para medios con movimientos.'; end if;
  update public.arqueos_caja set estado='cerrado',monto_final_declarado=final_declarado,diferencia=final_declarado-total_sistema,closed_at=now(),updated_at=now() where id=a.id;
  -- Sin saldo esperado ni diferencia en el cierre ciego.
  return jsonb_build_object('id',a.id,'estado','cerrado','monto_declarado',final_declarado);
end $$;

-- Métricas agregadas, independientes del permiso para consultar ventas detalladas.
create function public.resumen_metricas(p_desde date,p_hasta date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare l uuid:=private.mi_local(); desde timestamptz; hasta timestamptz; resultado jsonb;
begin
  if not private.tiene_permiso('ver_metricas') then raise exception using errcode='42501',message='No podés ver métricas.'; end if;
  if p_desde is null or p_hasta is null or p_hasta<p_desde or p_hasta-p_desde>365 then raise exception 'Elegí un período válido de hasta 366 días.'; end if;
  desde:=p_desde::timestamp at time zone 'America/Argentina/Buenos_Aires';
  hasta:=(p_hasta+1)::timestamp at time zone 'America/Argentina/Buenos_Aires';
  with ventas as(select * from public.pedidos where local_id=l and estado='cerrado' and closed_at>=desde and closed_at<hasta),
  dias as(select (closed_at at time zone 'America/Argentina/Buenos_Aires')::date as fecha,count(*) cantidad,sum(total) importe from ventas group by 1),
  productos as(select coalesce(i.producto_id::text,'nombre:'||lower(btrim(i.nombre_producto))) id,
    min(i.nombre_producto) nombre,sum(i.cantidad) cantidad,sum(i.subtotal) importe
    from public.pedido_items i join ventas v on v.id=i.pedido_id and v.local_id=i.local_id
    where i.subtotal>=0 and i.cantidad>0 group by 1),
  medios as(select p.medio_pago_id id,min(m.nombre) nombre,count(*) cantidad,sum(p.monto) importe
    from public.pedido_pagos p join public.medios_pago m on m.id=p.medio_pago_id and m.local_id=p.local_id
    where p.local_id=l and p.created_at>=desde and p.created_at<hasta group by 1),
  gastos as(select lower(coalesce(nullif(btrim(categoria),''),'Sin categoría')) id,
    min(coalesce(nullif(btrim(categoria),''),'Sin categoría')) nombre,count(*) cantidad,sum(importe) importe
    from public.gastos where local_id=l and fecha>=desde and fecha<hasta group by 1)
  select jsonb_build_object('totalVentas',(select coalesce(sum(total),0) from ventas),'cantidadVentas',(select count(*) from ventas),
    'totalCobros',(select coalesce(sum(importe),0) from medios),'totalGastos',(select coalesce(sum(importe),0) from gastos),
    'cantidadGastos',(select coalesce(sum(cantidad),0) from gastos),
    'dias',coalesce((select jsonb_agg(to_jsonb(d) order by fecha) from dias d),'[]'),
    'productos',coalesce((select jsonb_agg(to_jsonb(p) order by cantidad desc,importe desc,nombre) from productos p),'[]'),
    'medios',coalesce((select jsonb_agg(to_jsonb(m) order by importe desc) from medios m),'[]'),
    'categorias',coalesce((select jsonb_agg(to_jsonb(g) order by importe desc) from gastos g),'[]')) into resultado;
  return resultado;
end $$;

revoke all on function public.mis_permisos(),public.asignar_rol_empleado(uuid,uuid,boolean),public.listar_arqueos_operativos(),
  public.cobrar_pedido(uuid,jsonb,boolean,jsonb),public.cancelar_pedido(uuid),public.abrir_caja(uuid,numeric,timestamptz),
  public.cerrar_caja(uuid,jsonb),public.resumen_metricas(date,date) from public,anon;
grant execute on function public.mis_permisos(),public.asignar_rol_empleado(uuid,uuid,boolean),public.listar_arqueos_operativos(),
  public.cobrar_pedido(uuid,jsonb,boolean,jsonb),public.cancelar_pedido(uuid),public.abrir_caja(uuid,numeric,timestamptz),
  public.cerrar_caja(uuid,jsonb),public.resumen_metricas(date,date) to authenticated;
notify pgrst,'reload schema';
commit;
