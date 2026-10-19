# Catálogo de permisos acordado

Los permisos los define la aplicación. Cada administrador podrá crear roles
para su cafetería y seleccionar permisos de este catálogo fijo; no creará
permisos nuevos desde la interfaz.

| Código | Nombre y alcance |
| --- | --- |
| `editar_precios` | Editar precios al adicionar productos a un pedido. No modifica el catálogo. |
| `ver_saldos_arqueo` | Ver saldos de arqueo. |
| `abrir_cerrar_caja` | Abrir y cerrar caja; se mantiene como un único permiso. |
| `aplicar_descuentos` | Aplicar descuentos. |
| `editar_productos` | Crear y editar productos del catálogo, incluidos sus precios. |
| `editar_mesas` | Administrar mesas y salones. Conserva el código existente. |
| `ver_ventas` | Ver ventas. |
| `ver_metricas` | Ver métricas, independiente del acceso a ventas. |
| `gestionar_gastos` | Gestionar gastos. |
| `gestionar_usuarios` | Gestionar usuarios y roles; se mantiene combinado. |
| `modificar_configuracion_general` | Modificar configuración general. |

Los dos permisos nuevos no se asignan automáticamente a roles existentes. Se
pueden seleccionar al crear o editar un rol y se guardan en su campo JSON de
permisos. Este cambio no requiere modificar el esquema de Supabase.

## Migración de permisos (pendiente de ejecutar en Supabase)

1. Ejecutar completo `docs/sql/05_permisos_empleados.sql`. Requiere el aislamiento
   02 ya instalado. No volver a ejecutar 02 ni la unificación de datos históricos.
   El renombrado 04 es independiente y opcional para persistir Camarero.
2. Ejecutar `docs/sql/06_verificar_permisos.sql` y revisar los indicadores y listas
   de errores. Sustituye la verificación 03 para este nuevo esquema.
3. Comprobar con las cuentas administradoras existentes que se conservan mesas,
   productos, pedidos, ventas, métricas y configuración de su propia cafetería.

Los administradores existentes conservan el acceso completo; su autoridad es la
membresía interna `rol='admin'`, no un nombre de rol ni metadatos del navegador.
No se modifica ni se elimina ninguna cuenta o registro comercial. Los códigos
desconocidos en roles existentes hacen abortar la migración, sin borrarlos.

La columna `usuarios_locales.rol_id` vincula un empleado con un rol de su propio
local mediante una FK compuesta. El estado de la cuenta, del local y del rol se
consulta en la base en cada operación. Un empleado sin rol, con rol desactivado
o con membresía desactivada no obtiene acceso. No se asignan roles por coincidencia
de correo ni por el nombre que tenga un registro de `usuarios_sistema`.

## Reglas aplicadas en SQL

- Todos los empleados con membresía y rol activos pueden consultar el catálogo,
  operar mesas y mostrador, adicionar productos, cobrar y cancelar pedidos abiertos.
  Esto fue confirmado expresamente por el usuario. No hay permisos nuevos de cobro
  ni cancelación. No se permite borrar pedidos desde la API: se cancelan.
- `editar_precios` controla el precio del renglón del pedido. Sin él se respeta
  el precio del catálogo al adicionar y el precio ya confirmado al editar cantidades.
  Los subtotales y totales se validan en la base para evitar cambios indirectos.
- `aplicar_descuentos` controla renglones de descuento; `editar_productos` controla
  el catálogo. Marcar favoritos sigue siendo parte de la operación básica.
- `editar_mesas` controla el plano y los salones; actualizar estado/personas de
  una mesa sigue permitido para operar pedidos.
- `ver_ventas` habilita el historial detallado, sin dar permiso para modificarlo.
  Los pedidos abiertos siguen visibles para la operación básica.
- `ver_metricas` habilita una RPC de agregados; no abre el SELECT de ventas,
  cobros históricos ni gastos individuales. Devuelve días y productos/medios/
  categorías agrupados, sin IDs de pedidos o clientes.
- `ver_saldos_arqueo` habilita consultar balances y diferencias. Sin ese permiso,
  las tablas de arqueos y sus desgloses no exponen filas. Los datos operativos
  necesarios para cobrar se consultan por una RPC que solo da IDs, estados y fechas.
- `abrir_cerrar_caja` habilita las RPC de apertura/cierre. El cierre calcula los
  saldos en el servidor y devuelve solo la declaración del empleado, sin revelar
  el saldo esperado ni la diferencia. No concede edición directa de balances.
- `gestionar_gastos` controla gastos y proveedores; los gastos solo se modifican
  con su arqueo abierto.
- `gestionar_usuarios` controla roles y usuarios. Un gestor delegado no puede
  conceder permisos superiores a los suyos, editar un rol superior ni modificar
  al administrador o su propia membresía. El administrador sí puede gestionar
  los roles de su local. No se otorgan escrituras directas a `usuarios_locales`.
- `modificar_configuracion_general` controla el nombre del local en la base y la
  configuración de cajas, turnos y medios de pago. No concede abrir/cerrar caja.

Ver ventas, métricas o gastos permite conocer sus importes y, por tanto, deducir
algunos totales. La separación de saldos protege los balances de caja; no intenta
ocultar información que otro permiso haya autorizado expresamente.

## API preparada para la siguiente etapa

| RPC | Uso |
| --- | --- |
| `mis_permisos()` | Local, rol y permisos efectivos del usuario autenticado. |
| `asignar_rol_empleado(usuario_id, rol_id, activo)` | Cambiar el rol/estado de una membresía de empleado existente, con validación de delegación. No crea cuentas ni invita. |
| `listar_arqueos_operativos()` | Estado de caja sin importes ni saldos. |
| `cobrar_pedido(pedido_id, pagos, cerrar, items)` | Cobro total o parcial atómico, todos los empleados activos. |
| `cancelar_pedido(pedido_id)` | Cancelación validada del pedido abierto y liberación de mesa. |
| `abrir_caja(caja_id, monto_inicial, apertura)` | Apertura autorizada; retorna el identificador. |
| `cerrar_caja(arqueo_id, declaraciones)` | Cierre autorizado calculado por el servidor, compatible con cierre ciego. |
| `resumen_metricas(desde, hasta)` | Agregados de hasta 366 días según fechas de Argentina. |

Las RPC elevadas tienen `search_path` vacío, comprueban el actor y su local y no
son ejecutables por `anon`. Los cobros bloquean el pedido y validan pagos, caja,
medios de pago y cantidades antes de escribir, todo en la misma transacción.

La interfaz ahora usa membresías reales de Auth: invita, lista, edita nombre/rol y
activa o desactiva empleados de la cafetería. Los registros de `usuarios_sistema`
se conservan como datos heredados; no se convierten automáticamente en cuentas.
La navegación, las rutas, los precios al adicionar, los descuentos y la edición
del plano respetan los permisos efectivos. Los cobros usan la RPC atómica, y
las métricas consultan agregados autorizados. Los empleados abren/cierran caja
por RPC; sin `ver_saldos_arqueo` no se consultan ni muestran los saldos.

Para habilitar las invitaciones faltan instalar 07 y desplegar la función;
ver [invitaciones-empleados.md](invitaciones-empleados.md).
El nombre personalizado del navbar aún es una preferencia local del navegador;
su sincronización y control en la interfaz se conectarán al nombre autorizado del local.

## Pruebas locales

`node --test tests/*.test.cjs` valida el catálogo y las regresiones del proyecto.
`node tests/permisos-db.cjs` ejecuta esquema, aislamiento y permisos en PostgreSQL
WASM con cuentas ficticias. Comprueba los once permisos, FK entre locales,
escalamiento de privilegios, cobros parciales, rollback, cierre ciego, separación
entre ventas/métricas/saldos y desactivación inmediata. También ejecuta la
verificación 06 y compara el catálogo SQL con el del frontend. No se conecta a
Supabase ni envía invitaciones. Requiere el PGlite temporal documentado en
`docs/aislamiento-cafeterias.md`.

## Historial de arqueos (09)

El permiso interno `ver_saldos_arqueo` se muestra como **Ver arqueos y saldos**.
Controla el listado/historial y los saldos. Sin él, Caja operativa muestra solo el
estado actual y los controles de abrir/cerrar si están autorizados. `ver_ventas`
no concede acceso al historial. No cambia la selección de permisos de los roles.

Ejecutar `docs/sql/09_historial_arqueos_por_permiso.sql` una vez para restringir
además la RPC `listar_arqueos_operativos`: sin ese permiso devuelve únicamente
arqueos abiertos del local actual. Conserva la información operativa necesaria
para pedidos y gastos. No volver a ejecutar las migraciones anteriores.
