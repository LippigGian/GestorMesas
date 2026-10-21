-- Ejecutar una sola vez, después de 05_permisos_empleados.sql.
-- Las credenciales de Mercado Pago no se guardan en esta tabla.
begin;
set local lock_timeout = '10s';

create table public.mercado_pago_qr_intentos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locales(id),
  pedido_id uuid not null references public.pedidos(id),
  medio_pago_id uuid not null references public.medios_pago(id),
  arqueo_caja_id uuid not null references public.arqueos_caja(id),
  creado_por uuid not null references auth.users(id),
  monto numeric(12,2) not null check (monto > 0),
  estado text not null default 'creando' check (estado in ('creando','pendiente','verificado','registrado','vencido','cancelado','fallido')),
  idempotency_key uuid not null default gen_random_uuid(),
  mp_order_id text unique,
  qr_data text,
  vence_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);
create unique index mercado_pago_qr_un_activo_por_pedido
  on public.mercado_pago_qr_intentos(pedido_id)
  where estado in ('creando','pendiente','verificado');
create index mercado_pago_qr_local_pedido_idx on public.mercado_pago_qr_intentos(local_id,pedido_id);

alter table public.mercado_pago_qr_intentos enable row level security;
revoke all on public.mercado_pago_qr_intentos from public,anon,authenticated;
grant select on public.mercado_pago_qr_intentos to authenticated;
create policy mercado_pago_qr_leer_local on public.mercado_pago_qr_intentos
  for select to authenticated using (local_id = private.mi_local());

create function private.bloquear_cambios_durante_qr() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pedido uuid := case when tg_op='DELETE' then old.pedido_id else new.pedido_id end;
begin
  if exists (select 1 from public.mercado_pago_qr_intentos i
    where i.pedido_id=pedido and i.estado in ('creando','pendiente','verificado')
      and (tg_table_name='pedido_items' or
        coalesce(current_setting('app.registrando_qr_id',true),'')<>i.id::text)) then
    raise exception 'Este pedido tiene un QR activo. Consultá su estado antes de modificarlo o cobrarlo por otro medio.';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.bloquear_cambios_durante_qr() from public,anon,authenticated;
create trigger bloquear_items_durante_qr before insert or update or delete on public.pedido_items
  for each row execute function private.bloquear_cambios_durante_qr();
create trigger bloquear_pagos_durante_qr before insert or update or delete on public.pedido_pagos
  for each row execute function private.bloquear_cambios_durante_qr();

create function public.registrar_cobro_qr_mercado_pago(p_intento_id uuid)
returns numeric language plpgsql security definer set search_path = '' as $$
declare intento public.mercado_pago_qr_intentos%rowtype; caja_actual uuid; total_cobrado numeric;
begin
  select * into intento from public.mercado_pago_qr_intentos
    where id=p_intento_id and local_id=private.mi_local() for update;
  if not found then raise exception 'Cobro QR no encontrado en tu cafetería.'; end if;
  if intento.estado='registrado' then return intento.monto; end if;
  if intento.estado<>'verificado' then raise exception 'Mercado Pago todavía no acreditó este cobro.'; end if;
  select id into caja_actual from public.arqueos_caja
    where local_id=intento.local_id and estado='abierto' for update;
  if caja_actual is distinct from intento.arqueo_caja_id then
    raise exception 'Mercado Pago acreditó el pago, pero cambió el arqueo. Requiere conciliación manual.';
  end if;
  perform set_config('app.registrando_qr_id',intento.id::text,true);
  total_cobrado := public.cobrar_pedido(
    intento.pedido_id,
    jsonb_build_array(jsonb_build_object('medioPagoId',intento.medio_pago_id,'monto',intento.monto)),
    true,
    '[]'::jsonb
  );
  update public.mercado_pago_qr_intentos set estado='registrado',updated_at=now() where id=intento.id;
  return total_cobrado;
end $$;
revoke all on function public.registrar_cobro_qr_mercado_pago(uuid) from public,anon;
grant execute on function public.registrar_cobro_qr_mercado_pago(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
