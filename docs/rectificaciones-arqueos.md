# Rectificación de arqueos cerrados

Permite al administrador corregir los importes declarados por medio de pago,
con motivo obligatorio y registro de quién hizo cada cambio y cuándo.
No reabre el arqueo ni modifica monto inicial, fechas, cobros, ventas o gastos.
Tampoco reasigna movimientos ni recalcula los importes del sistema con movimientos
posteriores: conserva la fotografía del cierre y recalcula la diferencia contra ella.

## Instalación en Supabase

1. Ejecutar completo `docs/sql/10_rectificar_arqueos_cerrados.sql` una sola vez.
   Requiere el aislamiento 02 y los permisos 05 ya instalados. Es compatible con
   las invitaciones 07 y el historial 09. No repetir las migraciones anteriores.
2. Ejecutar `docs/sql/11_verificar_rectificaciones.sql`. Los indicadores deben ser
   `true` y las listas de errores vacías. La cantidad de rectificaciones es informativa.
3. No requiere cambiar la Edge Function ni SMTP. El frontend incorpora las acciones
   y la nueva RPC funciona dentro de la misma base.

La migración agrega una tabla de auditoría privada y las funciones de consulta y
rectificación; conserva todos los arqueos existentes. No añade permisos nuevos:
requiere la membresía interna de administrador de la cafetería, no un rol personalizado
que se llame Administrador o tenga todos los permisos seleccionados.

## Uso

En **Ventas → Arqueos de Caja**, seleccionar un arqueo cerrado y pulsar
**Rectificar importes** en su detalle. Se muestran el sistema al cierre y los importes
actualmente declarados. Cambiar el importe equivocado, escribir el motivo y pulsar
**Guardar rectificación**. El listado, el detalle y las diferencias se actualizan.

**Ver rectificaciones** permite consultar el cierre original, los valores anteriores
y corregidos por medio, motivo, autor y fecha de cada rectificación. Las modificaciones
sucesivas conservan todas las anteriores. El historial se carga solo al abrir esta
ventana. Los empleados no pueden consultar esta auditoría ni rectificar aunque tengan
Ver arqueos y saldos o permisos de gestión de usuarios.

Se conserva el listado de medios del cierre original, incluidos los actualmente
inactivos. No se pueden agregar ni quitar medios desde la rectificación. Un cierre
antiguo sin declaraciones por medio no puede rectificarse con este flujo; se informa
sin reconstruir automáticamente importes históricos.

## Integridad

- Transacción única: detalle, totales y auditoría se guardan juntos o no se guarda nada.
- Bloqueo de la caja y control de revisión: si otra pestaña corrige antes, se rechaza
  la versión vieja y se solicita actualizar datos. No se sobrescribe silenciosamente.
- Rechaza importes negativos, más de dos decimales, medios repetidos/ajenos/faltantes,
  motivos vacíos y guardados sin cambios.
- El cierre original queda en la primera fotografía anterior y las siguientes quedan
  encadenadas por número de revisión. El historial no permite editar ni borrar registros.
- Las escrituras directas del cliente sobre importes de un cierre se rechazan para
  exigir la RPC auditada; los cierres de arqueos abiertos mantienen su funcionamiento.
- Los actores se guardan como identificador y copia de nombre/correo del momento,
  de modo que un cambio posterior de nombre no altera la autoría histórica.

## Validación local

- `node --test tests/rectificacionesArqueo.test.cjs`
- `node tests/rectificaciones-db.cjs` (PGlite temporal ya documentado).
- `node tests/rectificaciones-ui.cjs` (Vite iniciado, Edge y Playwright del runtime).
- `npm.cmd run build`

Todas las pruebas usan datos ficticios. No modifican arqueos reales ni envían correos.

## Distintivo y filtros (12)

Ejecutar una vez `docs/sql/12_distintivo_arqueos_rectificados.sql`, después de 10.
No repetir 10. La consulta final debe devolver ambos indicadores en true.

Los listados del administrador y del empleado con Ver arqueos y saldos muestran
**Rectificado**, o **Rectificado (N)** si hubo varias correcciones. El estado del
arqueo se mantiene cerrado. Se puede filtrar por Todos los arqueos, Solo rectificados
o Sin rectificar. El distintivo se actualiza al guardar y se conserva al recargar.

El conteo se consulta en un lote para los arqueos ya cargados; no se descarga la
auditoría ni se ejecuta una consulta por fila. Respeta el permiso y el aislamiento
por local. Motivos y autores siguen siendo exclusivos del administrador.
Si todavía no está instalada 12, el listado sigue funcionando y el filtro aparece
inhabilitado, sin clasificar como no rectificados los datos que no se pudieron consultar.
