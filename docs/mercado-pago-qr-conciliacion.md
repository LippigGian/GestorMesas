# QR de Mercado Pago: webhook y conciliacion

Este flujo sigue usando **credenciales de prueba**. No reemplazar el token por uno productivo hasta terminar las pruebas y crear una caja/QR productivos. El frontend puede continuar en localhost:5173; Mercado Pago llama a la URL HTTPS de la Edge Function, no al navegador.

## Activacion

1. Ejecutar `docs/sql/16_qr_webhook_conciliacion.sql` en el SQL Editor, despues de `15_confirmar_qr_antes_de_cerrar.sql`.
2. En Mercado Pago Developers, con la aplicacion del vendedor de prueba, configurar Webhooks en modo productivo de esa cuenta de prueba. URL: `https://czztkfhkzatsjzpoermq.supabase.co/functions/v1/mercado-pago-qr-webhook`. Activar **Order (Mercado Pago)**. Copiar la clave secreta generada, sin agregarla al repositorio.
3. En Supabase Edge Function Secrets, crear `MERCADO_PAGO_WEBHOOK_SECRET` con esa clave. Verificar que `MERCADO_PAGO_ACCESS_TOKEN` aun sea el token del vendedor de prueba.
4. Generar una clave aleatoria independiente de al menos 32 bytes. Guardarla como Edge secret `MERCADO_PAGO_QR_SYNC_KEY` y tambien en Supabase Vault, con nombre `mercado_pago_qr_sync_key`. Los valores deben coincidir. No usar el access token de Mercado Pago ni la service role key para esto.
5. Desplegar las funciones desde el directorio del proyecto:

   ```powershell
   npx supabase functions deploy mercado-pago-qr --no-verify-jwt
   npx supabase functions deploy mercado-pago-qr-webhook --no-verify-jwt
   npx supabase functions deploy mercado-pago-qr-sync --no-verify-jwt
   ```

6. Probar el webhook con **Simular notificacion** de Mercado Pago, usando el ID de una orden QR de prueba existente. Revisar el log de la Edge Function: no debe haber 401/503. La simulacion no debe crear un segundo pago.
7. Ejecutar `docs/sql/17_programar_qr_sync.sql` para conciliar hasta diez intentos por minuto. Revisar la ejecucion en Supabase Cron y el log de `mercado-pago-qr-sync`.
8. Crear un pedido de prueba nuevo, cargar el monto al QR, pagar con el comprador de prueba y **cerrar el dialogo solo antes de pagar si se cancela la orden**. Para probar el webhook sin mantener el dialogo abierto, se puede cerrar la pestana del navegador despues de generar el QR y antes de pagar. Volver a abrir la app: el intento debe figurar `registrado`, la mesa seguir abierta y los productos bloqueados hasta pulsar **Cerrar venta**. Confirmar que `pedido_pagos` tenga un solo asiento.

## Revision manual

`mercado_pago_qr_intentos.requiere_revision = true` indica que la orden no pudo asentarse automaticamente o cambio de estado inesperadamente. Consultar `motivo_revision`, `mp_order_id`, el arqueo original y la orden en Mercado Pago. No liberar la caja ni cobrar de nuevo hasta resolverla. Si el arqueo ya cambio, el sistema deja el pago acreditado **sin registrarlo** y requiere intervencion contable; no reasigna el cobro silenciosamente a otro turno.

El webhook autentica `x-signature`, busca el `mp_order_id` local y verifica directamente el estado, referencia, caja e importe en Mercado Pago. El cron usa la misma verificacion e intenta recuperar ordenes atascadas en `creando` con su clave de idempotencia original. Ninguna de estas rutas cierra automaticamente la mesa.

## Produccion

Repetir la configuracion del webhook en la cuenta real con su clave secreta productiva; crear sucursal, caja y QR nuevos con el token productivo. Probar una venta real pequena y verificar Mercado Pago, `pedido_pagos`, Ventas y arqueo. La configuracion actual usa un solo token y una sola caja para un unico `MERCADO_PAGO_LOCAL_ID`; para dos locales hacen falta credenciales y cajas por local.
