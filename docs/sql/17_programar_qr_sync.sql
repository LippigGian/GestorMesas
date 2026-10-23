-- Ejecutar solo despues de desplegar mercado-pago-qr-sync y guardar en Vault
-- un secreto llamado mercado_pago_qr_sync_key, identico al Edge secret
-- MERCADO_PAGO_QR_SYNC_KEY. No pegar el valor del secreto en este archivo.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'gestormesas-qr-sync',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://czztkfhkzatsjzpoermq.supabase.co/functions/v1/mercado-pago-qr-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-qr-sync-key', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'mercado_pago_qr_sync_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
