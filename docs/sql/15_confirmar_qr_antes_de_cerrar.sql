-- Ejecutar despues de 13_cobros_qr_mercado_pago.sql y 14_qr_impreso_mercado_pago.sql.
begin;
set local lock_timeout = '10s';

create or replace function public.registrar_cobro_qr_mercado_pago(p_intento_id uuid)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  intento public.mercado_pago_qr_intentos%rowtype;
  pedido public.pedidos%rowtype;
  caja_actual uuid;
  total_pedido numeric;
  pagado numeric;
begin
  select * into intento from public.mercado_pago_qr_intentos
    where id = p_intento_id and local_id = private.mi_local() for update;
  if not found then raise exception 'Cobro QR no encontrado en tu cafeteria.'; end if;
  if intento.estado = 'registrado' then return intento.monto; end if;
  if intento.estado <> 'verificado' then raise exception 'Mercado Pago todavia no acredito este cobro.'; end if;

  perform pg_advisory_xact_lock(hashtext(intento.local_id::text));
  select * into pedido from public.pedidos
    where id = intento.pedido_id and local_id = intento.local_id for update;
  if not found or pedido.estado <> 'abierto' then raise exception 'El pedido ya no esta abierto.'; end if;
  select id into caja_actual from public.arqueos_caja
    where local_id = intento.local_id and estado = 'abierto' for update;
  if caja_actual is distinct from intento.arqueo_caja_id then
    raise exception 'Mercado Pago acredito el pago, pero cambio el arqueo. Requiere conciliacion manual.';
  end if;
  select coalesce(sum(subtotal), 0) into total_pedido from public.pedido_items where pedido_id = pedido.id;
  select coalesce(sum(monto), 0) into pagado from public.pedido_pagos where pedido_id = pedido.id;
  if abs(total_pedido - pagado - intento.monto) > 0.01 then
    raise exception 'El importe acreditado no coincide con el saldo del pedido. Requiere conciliacion manual.';
  end if;

  perform set_config('app.registrando_qr_id', intento.id::text, true);
  insert into public.pedido_pagos(local_id, pedido_id, medio_pago_id, arqueo_caja_id, monto)
    values(intento.local_id, pedido.id, intento.medio_pago_id, caja_actual, intento.monto);
  update public.pedidos set total = total_pedido, arqueo_caja_id = caja_actual, updated_at = now()
    where id = pedido.id;
  update public.arqueos_caja set total_ventas = (
    select coalesce(sum(monto), 0) from public.pedido_pagos where arqueo_caja_id = caja_actual
  ), updated_at = now() where id = caja_actual;
  update public.mercado_pago_qr_intentos set estado = 'registrado', updated_at = now()
    where id = intento.id;
  return intento.monto;
end $$;

create or replace function private.bloquear_cambios_durante_qr() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pedido uuid := case when tg_op = 'DELETE' then old.pedido_id else new.pedido_id end;
begin
  if exists (select 1 from public.mercado_pago_qr_intentos i
    where i.pedido_id = pedido and (
      (tg_table_name = 'pedido_items' and i.estado in ('creando', 'pendiente', 'verificado', 'registrado'))
      or (tg_table_name = 'pedido_pagos' and i.estado in ('creando', 'pendiente', 'verificado')
        and coalesce(current_setting('app.registrando_qr_id', true), '') <> i.id::text)
    )) then
    raise exception 'Este pedido tiene un QR activo o ya fue pagado. No se pueden modificar sus productos ni cobrarlo otra vez.';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

create function private.bloquear_cancelacion_qr_pagado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'abierto' and new.estado = 'cancelado' and exists (
    select 1 from public.mercado_pago_qr_intentos
    where pedido_id = old.id and estado = 'registrado'
  ) then
    raise exception 'El pedido ya tiene un pago QR confirmado y no se puede cancelar.';
  end if;
  return new;
end $$;
revoke all on function private.bloquear_cancelacion_qr_pagado() from public, anon, authenticated;
create trigger bloquear_cancelacion_qr_pagado before update of estado on public.pedidos
  for each row execute function private.bloquear_cancelacion_qr_pagado();

create function public.cerrar_pedido_pagado_qr(p_pedido_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  local_actual uuid := private.mi_local();
  pedido public.pedidos%rowtype;
  total_pedido numeric;
  pagado numeric;
  turno_actual uuid;
  ahora timestamptz := now();
begin
  if local_actual is null then raise exception using errcode = '42501', message = 'No tenes un rol activo.'; end if;
  perform pg_advisory_xact_lock(hashtext(local_actual::text));
  select * into pedido from public.pedidos
    where id = p_pedido_id and local_id = local_actual for update;
  if not found or pedido.estado <> 'abierto' then raise exception 'El pedido ya no esta abierto.'; end if;
  if not exists (select 1 from public.mercado_pago_qr_intentos
    where pedido_id = pedido.id and local_id = local_actual and estado = 'registrado') then
    raise exception 'Este pedido no tiene un cobro QR confirmado.';
  end if;
  if exists (select 1 from public.mercado_pago_qr_intentos
    where pedido_id = pedido.id and estado in ('creando', 'pendiente', 'verificado')) then
    raise exception 'Todavia hay un QR pendiente.';
  end if;
  select coalesce(sum(subtotal), 0) into total_pedido from public.pedido_items where pedido_id = pedido.id;
  select coalesce(sum(monto), 0) into pagado from public.pedido_pagos where pedido_id = pedido.id;
  if total_pedido <= 0 or abs(total_pedido - pagado) > 0.01 then
    raise exception 'El total pagado no coincide con la venta.';
  end if;
  select t.id into turno_actual from public.turnos t where t.local_id = local_actual and t.activo and (
    (t.hora_inicio < t.hora_fin and (ahora at time zone 'America/Argentina/Buenos_Aires')::time >= t.hora_inicio and (ahora at time zone 'America/Argentina/Buenos_Aires')::time < t.hora_fin)
    or (t.hora_inicio >= t.hora_fin and ((ahora at time zone 'America/Argentina/Buenos_Aires')::time >= t.hora_inicio or (ahora at time zone 'America/Argentina/Buenos_Aires')::time < t.hora_fin))
  ) order by t.nombre limit 1;
  update public.pedidos set estado = 'cerrado', total = total_pedido, turno_id = turno_actual,
    closed_at = ahora, updated_at = ahora where id = pedido.id;
  if pedido.mesa_id is not null then
    update public.mesas set estado = 'libre', personas = 0, updated_at = ahora
      where id = pedido.mesa_id and local_id = local_actual;
  end if;
end $$;

revoke all on function public.cerrar_pedido_pagado_qr(uuid) from public, anon;
grant execute on function public.cerrar_pedido_pagado_qr(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
