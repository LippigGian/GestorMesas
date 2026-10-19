# Sincronización de Mesas y Mostrador

## Activar

Ejecutar completo `sql/14_sincronizacion_pedidos.sql` en el SQL Editor de Supabase.
La consulta final debe devolver cinco valores `true` y `cantidad_triggers: 5`.
Recargar las dos sesiones después de aplicar el SQL.

Los cambios en mesas, pedidos, productos del pedido, pagos y cantidades cobradas
emiten avisos privados desde los triggers de la base hacia el canal `pedidos:<local>`.
El aviso no contiene datos: cada dispositivo vuelve a consultar con sus permisos.
Se usan políticas de Realtime para limitar la recepción al local activo y bloquear
la emisión desde clientes. Esto incluye eliminaciones sin publicar datos antiguos.
Los mensajes usan la retención administrada de Supabase Broadcast; no se agrega una
tabla de historial propia ni una fila compartida que bloquee escrituras concurrentes.

Los avisos se agrupan durante 300 ms y las lecturas se serializan. Una escritura local
invalida lecturas anteriores. Al reconectar, volver a la pestaña o presionar Actualizar,
se vuelve a consultar; también hay una consulta de respaldo cada 30 segundos mientras
la página está visible. Una conexión activa no sustituye la verificación del SQL.

Los listados se actualizan en segundo plano. Si hay productos pendientes, una búsqueda,
un comentario, un cambio de cliente o un diálogo de cobro/edición, se conserva ese
trabajo y se posterga la actualización del detalle hasta terminar. En Editar plano
se posterga la actualización del plano hasta salir de ese modo. Las validaciones
del servidor siguen determinando si se puede confirmar una operación.

## Verificar con dos dispositivos

Usar dos sesiones del mismo local, idealmente con usuarios distintos:

1. Abrir Mesas en ambas. Ocupar una mesa: la otra sesión debe mostrar Ocupada.
2. Seleccionar la mesa en ambas. Confirmar y eliminar un producto: el detalle debe
   actualizarse cuando la otra sesión no está editando.
3. Dejar un producto pendiente con comentario en una sesión y confirmar otro desde
   la segunda. El borrador debe conservarse. Al confirmar/cancelar la carga pendiente,
   el detalle debe recuperar los cambios del otro dispositivo.
4. Repetir con pedidos de Mostrador, incluida creación, traslado a mesa y cancelación.
5. Desconectar un dispositivo, cambiar datos desde el otro y reconectar. Deben
   recuperarse los cambios, incluso si el dispositivo se suspendió.
6. Cambiar rápidamente de mesa/pedido durante una actualización. Ninguna respuesta
   debe terminar en el detalle de la selección anterior.
7. Con un usuario de otra cafetería, comprobar que no se ven pedidos ni mesas del
   primer local. Verificar con cada rol que se conservan sus permisos.

Para probar desde un celular, usar una dirección accesible de la PC o un despliegue
de prueba; localhost en el celular apunta al propio celular.

## Validación local realizada

- `npm run build` y ESLint sobre los archivos modificados.
- `node --test tests/sincronizacion.test.cjs`: agrupación de avisos, descarte de
  lecturas antiguas, recuperación tras errores y limpieza al salir.
- Dos sesiones de navegador con respuestas y avisos simulados: pedidos actualizados,
  productos eliminados, borradores/comentarios conservados, reconexión, cierre remoto,
  estados de mesas y detalle. Sin modificar datos reales de Supabase.

Las políticas privadas y los triggers deben verificarse en Supabase después
de ejecutar el SQL; las pruebas simuladas no validan esa configuración remota.

Referencia: https://supabase.com/docs/guides/realtime/broadcast
