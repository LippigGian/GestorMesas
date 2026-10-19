# Activar invitaciones de empleados

Implementación local preparada y probada con datos ficticios. El código no despliega
funciones ni cambia automáticamente la base de Supabase. La migración 05 ya debe
estar instalada; no volver a ejecutar 02, 05 ni los scripts de unificación antiguos.

## 1. Base de datos

En SQL Editor, ejecutar completo `docs/sql/07_invitaciones_empleados.sql` una vez.
Conserva las cuentas y los administradores existentes. Agrega reservas privadas,
el alta del empleado en el local del invitador y la activación tras establecer contraseña.
Luego ejecutar `docs/sql/08_verificar_invitaciones.sql`: indicadores `true`, listas
vacías; `empleados_pendientes` es un contador informativo, inicialmente 0.

## 2. Función de servidor (desde Dashboard, sin instalar CLI)

1. En el proyecto correcto, abrir **Edge Functions** y crear una función con el editor
   del Dashboard. Nombre exacto: `invitar-empleado`.
2. Copiar completo `supabase/functions/invitar-empleado/index.ts` en su archivo
   `index.ts` y desplegarla.
3. En los secretos de Edge Functions agregar `APP_URL` con valor
   `http://localhost:5173`. Usar el origen exacto del navegador: `127.0.0.1` y otro
   puerto son orígenes diferentes. En producción será la dirección HTTPS real.
4. Para esta función desactivar **Verify JWT with legacy secret** en su configuración.
   La función valida obligatoriamente el Bearer token con `auth.getUser(token)` y
   después comprueba permisos y local en SQL. El gateway legado puede rechazar
   claves actuales antes de que el código valide la sesión. La función sigue
   rechazando llamadas sin sesión. La misma configuración está en `supabase/config.toml`.
5. Supabase proporciona `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` al entorno del servidor. No copiar la clave de servicio
   al frontend, a variables `VITE_`, a Git ni a mensajes.

Alternativa con Supabase CLI ya instalada y autenticada, desde la raíz del proyecto:

```powershell
supabase functions deploy invitar-empleado --project-ref czztkfhkzatsjzpoermq
supabase secrets set APP_URL=http://localhost:5173 --project-ref czztkfhkzatsjzpoermq
```

## 3. Enlace de invitación

En **Authentication → URL Configuration → Redirect URLs**, agregar:

```
http://localhost:5173/aceptar-invitacion
```

Conservar la ruta de recuperación existente. En producción agregar su equivalente
HTTPS y actualizar APP_URL. Un enlace de localhost solo funciona en la PC que corre
la aplicación; para abrirlo desde otro dispositivo se necesita una dirección accesible.

## 4. Prueba manual

1. Entrar con el administrador → Configuración → Roles de usuarios. Crear o activar
   Camarero con los permisos deseados; sin permisos adicionales puede operar pedidos,
   cobrar y cancelar, pero no administrar el catálogo ni editar precios/descuentos.
2. En Usuarios, completar nombre, correo nuevo y rol; pulsar **Invitar empleado**.
3. Abrir el enlace del correo en una ventana privada para no reemplazar la sesión
   del administrador. Establecer contraseña (6 caracteres y una mayúscula), confirmar
   y activar el acceso. Debe entrar únicamente en la cafetería que lo invitó.
4. Probar las secciones permitidas y un acceso directo a otra sección. Luego desactivar
   el empleado desde el administrador: las operaciones SQL se rechazan inmediatamente;
   la interfaz actualiza permisos al recuperar foco y, como máximo, cada 60 segundos.
5. Verificar que la cuenta administradora y los datos de la otra cafetería permanecen.

Un correo que ya tiene una cuenta no se reutiliza ni se traslada. Usar uno nuevo.
No se borran usuarios ni pedidos al desactivar un acceso. Editar no cambia el correo.
Un rol inactivo deja a sus empleados sin acceso; para reactivarlos, asignar un rol activo.
Las invitaciones pendientes no tienen acceso operativo hasta completar la activación.
Si la contraseña se guardó y falló la activación, la pantalla permite reintentar sin
volver a cambiarla. Si el enlace venció, puede recuperarse la contraseña mediante el
login y luego abrir `/aceptar-invitacion` con esa sesión para completar la activación.

## Envío de correos

Se usa Auth de Supabase con el proveedor que tenga configurado el proyecto.
El servicio predeterminado actualmente restringe los destinatarios a los correos
preautorizados del equipo del proyecto y tiene límites bajos. Para invitar correos
externos puede requerirse SMTP propio. El mensaje de error se muestra en el formulario;
un fallo de correo no debe mostrarse como invitación enviada. No se instaló ningún
proveedor nuevo. No se enviaron invitaciones reales durante las pruebas.

Fuentes oficiales consultadas:
- https://supabase.com/docs/guides/functions/quickstart-dashboard
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail

## Validación local

- `npm.cmd run build`: TypeScript y compilación de producción.
- `node --test tests/*.test.cjs`: regresiones y transformación de métricas agregadas.
- `node tests/permisos-db.cjs`: permisos SQL y operaciones financieras.
- `node tests/invitaciones-db.cjs`: 07/08, enlace seguro, aislamiento, contraseña,
  protección de administrador, desactivación, rollback y reintentos.
- `node tests/invitaciones-edge.cjs`: handler con Auth y correo simulados.
- Con Vite iniciado: `node tests/empleados-ui.cjs` y
  `node tests/integracion-login-metricas.cjs`: navegador con Supabase simulado,
  invitaciones, errores, restricciones, métricas, caja ciega y activación.

Las pruebas de PostgreSQL usan el PGlite temporal documentado en
`docs/aislamiento-cafeterias.md`. Las pruebas de navegador usan Playwright del runtime
de Codex y Edge. No se agregaron dependencias de ejecución al proyecto.
