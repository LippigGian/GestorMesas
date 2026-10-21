-- Ejecutar después de 13_cobros_qr_mercado_pago.sql.
-- Una sola orden pendiente puede ocupar cada POS, incluso si se usa el QR en pantalla.
begin;
set local lock_timeout = '10s';

alter table public.mercado_pago_qr_intentos
  add column modo text not null default 'dynamic' check (modo in ('dynamic', 'static')),
  add column pos_external_id text,
  add column cancel_idempotency_key uuid not null default gen_random_uuid();

create unique index mercado_pago_qr_un_activo_por_pos
  on public.mercado_pago_qr_intentos (local_id, pos_external_id)
  where pos_external_id is not null and estado in ('creando', 'pendiente', 'verificado');

notify pgrst, 'reload schema';
commit;
