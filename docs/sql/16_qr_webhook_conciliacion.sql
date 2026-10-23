-- Ejecutar despues de 15_confirmar_qr_antes_de_cerrar.sql.
begin;
set local lock_timeout = '10s';

alter table public.mercado_pago_qr_intentos
  add column ultima_consulta_at timestamptz,
  add column requiere_revision boolean not null default false,
  add column motivo_revision text;

-- La misma operacion atomica sirve al cajero y al servidor. Ningun cliente puede
-- poner un intento en estado verificado: solo la Edge Function con service role.
create or replace function public.registrar_cobro_qr_mercado_pago(p_intento_id uuid)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  intento public.mercado_pago_qr_intentos%rowtype;
  pedido public.pedidos%rowtype;
  caja_actual uuid;
  total_pedido numeric;
  pagado numeric;
  local_actual uuid := private.mi_local();
begin
  if auth.role() <> 'service_role' and local_actual is null then
    raise exception using errcode = '42501', message = 'No tenes acceso a este cobro.';
  end if;
  select * into intento from public.mercado_pago_qr_intentos
    where id = p_intento_id and (auth.role() = 'service_role' or local_id = local_actual) for update;
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
  update public.mercado_pago_qr_intentos set estado = 'registrado', updated_at = now(),
    ultima_consulta_at = now(), requiere_revision = false, motivo_revision = null
    where id = intento.id;
  return intento.monto;
end $$;

revoke all on function public.registrar_cobro_qr_mercado_pago(uuid) from public, anon;
grant execute on function public.registrar_cobro_qr_mercado_pago(uuid) to authenticated, service_role;

create function private.bloquear_cierre_qr_en_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'abierto' and new.estado = 'cerrado' and exists (
    select 1 from public.mercado_pago_qr_intentos
    where pedido_id = old.id and requiere_revision
  ) then
    raise exception 'El QR requiere conciliacion manual antes de cerrar la venta.';
  end if;
  return new;
end $$;
revoke all on function private.bloquear_cierre_qr_en_revision() from public, anon, authenticated;
create trigger bloquear_cierre_qr_en_revision before update of estado on public.pedidos
  for each row execute function private.bloquear_cierre_qr_en_revision();

notify pgrst, 'reload schema';
commit;
