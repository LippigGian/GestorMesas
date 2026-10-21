# QR impreso de Mercado Pago (prueba)

Esta rama agrega el modo `static` de Orders API. El QR fijo pertenece a la caja/POS de Mercado Pago; el importe se carga desde el cierre de la mesa o del pedido de mostrador. El modo `dynamic` anterior sigue disponible como plan B.

## Activación

1. Ejecutar **solo** `docs/sql/14_qr_impreso_mercado_pago.sql` en Supabase, después de `13_cobros_qr_mercado_pago.sql`.
2. Desplegar la versión de esta rama: `npx supabase functions deploy mercado-pago-qr --project-ref czztkfhkzatsjzpoermq --no-verify-jwt`.
3. Mantener los secretos `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_POS_ID`, `MERCADO_PAGO_LOCAL_ID` y `MERCADO_PAGO_QR_APP_URL`. La caja/POS debe estar activa y tener `config.qr.operating_mode = pdv`.
4. En el cierre del pedido, elegir el medio Mercado Pago y `QR impreso`. `Ver QR de la caja` abre una plantilla de Mercado Pago para imprimir. La plantilla de la caja de prueba **no sirve para cobrar en producción**.
5. Pulsar `Cargar monto al QR`, esperar a que Mercado Pago confirme y comprobar venta y arqueo. Probar con la cuenta Comprador de prueba. No usar dinero real con la caja de prueba.

## Reglas operativas

- Una sola orden QR pendiente puede ocupar el POS configurado, incluso si otra PC intenta usar el QR en pantalla. La base de datos impide dos órdenes activas para ese POS.
- Si el cliente no paga, usar `Cancelar orden QR` y esperar su confirmación. Cerrar el modal **no cancela** la orden. Si la caja figura ocupada, consultar el pedido anterior y conciliarlo antes de crear otro cobro.
- El QR estático es permanente; las órdenes con importe vencen a los 15 minutos. El QR en pantalla es exclusivo de cada orden y no debe imprimirse.
- Por ahora se consulta el estado cada 2,5 segundos mientras el diálogo permanece abierto. Falta el webhook de órdenes, una recuperación automática de órdenes pendientes y pruebas reales de concurrencia antes de usar esto para cobros de producción.
- Los intentos dinámicos creados **antes** de esta migración no tienen `pos_external_id`. Esperar a que venzan o conciliarlos antes de usar el mismo POS impreso.
