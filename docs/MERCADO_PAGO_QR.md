# QR dinámico de Mercado Pago (versión inicial)

Esta integración usa la [Orders API de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing). Por ahora admite **un único medio QR por el saldo completo** de una mesa o pedido de mostrador. No procesa cobros parciales ni mezclas de medios. La pantalla consulta la orden cada 2,5 segundos mientras el modal está abierto. No hay webhook todavía.

## Activación

1. Crear una sucursal y una caja/POS de QR en Mercado Pago siguiendo [Crear sucursal y caja](https://www.mercadopago.com.ar/developers/es/docs/qr-code/create-store-and-pos). Anotar el `external_id` del POS. No confundirlo con la caja/arqueo de GestorMesas.
2. Ejecutar **solo** `docs/sql/13_cobros_qr_mercado_pago.sql` en SQL Editor. No volver a correr migraciones históricas.
3. Configurar los secretos de la Edge Function en Supabase: `MERCADO_PAGO_ACCESS_TOKEN` (token privado de la aplicación QR), `MERCADO_PAGO_POS_ID` (external_id del POS), `MERCADO_PAGO_LOCAL_ID` (UUID del local de esta cuenta), `MERCADO_PAGO_QR_APP_URL` (origen exacto del frontend, por ejemplo `http://127.0.0.1:5174`; sin barra final). No modificar `APP_URL`, que también se usa para las invitaciones de empleados. No exponer el token en `.env` del navegador. Esta versión conecta **un solo local a una sola cuenta** de Mercado Pago; no usarla para otros locales sin OAuth por local.
4. Desplegar `mercado-pago-qr` como Edge Function. El handler valida el JWT por `auth.getUser()`; la configuración `verify_jwt=false` evita una segunda verificación del gateway y se limita a esta función.
5. Crear o conservar un medio de pago activo llamado `QR` o `Mercado Pago QR` en Configuración. Tener una caja abierta en GestorMesas.
6. Probar con [credenciales y cuentas de prueba](https://www.mercadopago.com.ar/developers/es/docs/qr-code/test-integration/test-purchase) antes de activar el token de producción. Validar monto, estado de la mesa, venta y arqueo.

## Seguridad y límites

- La Edge Function calcula el saldo desde la BD; no confía en el importe del navegador. Cada orden tiene referencia e idempotencia únicas.
- Solo `processed/processed` en la orden y `processed/accredited` en su transacción, con el importe exacto, permite registrar el cobro. La RPC registra venta y arqueo una sola vez.
- Si Mercado Pago acredita pero cambió el pedido o el arqueo, la app **no marca la venta como cerrada** y muestra una alerta para conciliar. Nunca vuelvas a cobrar esa orden sin revisarla.
- Cerrar el modal detiene la consulta; al abrirlo de nuevo y generar QR se recupera el intento activo. Para confirmar órdenes pagadas aunque nadie tenga la pantalla abierta hará falta agregar un webhook verificado y procesamiento en segundo plano.
- La migración bloquea cambios en ítems y pagos del pedido mientras tenga un QR activo, incluso desde otra PC. No cambies el arqueo durante el cobro: si se cierra, un pago ya acreditado requiere conciliación manual.
