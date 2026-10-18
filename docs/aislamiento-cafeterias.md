# Cafeterías independientes

Cada usuario pertenece a una cafetería. Cada registro de una cuenta principal
debe crear una cafetería nueva y una membresía `admin` para ese usuario.
No se debe asociar automáticamente al primer local existente, ni permitir que
el navegador elija su rol o escriba membresías.

La creación de empleados y los permisos específicos de camarero, cajero y
encargado se implementarán después. La tabla `usuarios_locales` será la fuente
de pertenencia; los metadatos modificables del usuario no autorizan acceso.

## Cambios en la aplicación

- El registro usa Supabase Auth y envía únicamente el nombre del negocio como
  metadato descriptivo. **Requiere la migración de alta del lado de Supabase**:
  retirar las escrituras del cliente no crea por sí solo el local.
- El nombre se valida entre 1 y 100 caracteres.
- Se contempla la confirmación por correo antes de iniciar sesión.
- La carga de membresías no elige arbitrariamente la primera si hay varias.
- Las páginas operativas se bloquean cuando falta la cafetería o falla la carga.
- Cambiar de usuario desmonta los estados y consultas de la cuenta anterior.
- Los proveedores se consultan y crean con `local_id`, como el resto del catálogo.

## Migración de Supabase

Preparada contra el diagnóstico real del 18/10/2026. El usuario confirmó su
ejecución en Supabase y compartió la verificación sin errores. También confirmó
que una cuenta nueva ve su cafetería vacía y la anterior conserva sus datos.
No volver a ejecutar la migración en ese proyecto.

Antes de aplicarla se ejecutó `docs/sql/01c_unificar_datos_de_prueba.sql`, con
autorización explícita del usuario porque la aplicación todavía no estaba en
uso. Ese SQL unifica asociaciones históricas y no debe utilizarse después de
crear cafeterías independientes.

Secuencia de aplicación utilizada (como referencia, no para repetirla):

1. En SQL Editor, ejecutar **completo** `docs/sql/02_aislamiento_cafeterias.sql`
   como `postgres`. Es una sola transacción, con bloqueo de escrituras mientras
   comprueba y modifica el esquema.
2. Ejecutar `docs/sql/03_verificar_aislamiento.sql`. Los tres indicadores iniciales
   deben ser `true` y las listas de errores deben quedar vacías.
3. Volver a ingresar con la cuenta existente. Comprobar mesas, pedidos, productos,
   gastos y configuración. Para probar el registro real, usar una segunda cuenta:
   debe recibir una cafetería nueva sin los datos de la anterior.

La migración conserva IDs, nombres, importes, estados y la membresía actual. El
UUID configurado al principio corresponde al único local con administrador del
diagnóstico. Completa propietarios faltantes de los registros históricos con
ese local: el usuario indicó que la base se viene utilizando para una sola
cafetería. Los detalles de pedidos y arqueos heredan el local de sus padres.

**Si encuentra otra membresía o un registro que ya tenga otro `local_id`, aborta
todo sin reasignarlo.** Tampoco elimina cafeterías antiguas ni reclama usuarios
sin membresía. Ante un error, conservar el mensaje y revisar la propiedad real;
no reemplazar todos los `local_id` ni quitar comprobaciones para forzar el SQL.
Un segundo intento después de una ejecución exitosa se rechaza expresamente.

## Garantías implementadas

- Un trigger privado de `auth.users` crea el local, su administrador, una caja
  principal y Efectivo en la misma transacción. Si falla, no queda un alta parcial.
  La confirmación por email ocurre después y no vuelve a crear la cafetería.
- El nombre enviado en metadatos es descriptivo. Se ignoran supuestos roles,
  IDs de local o de usuario enviados por el cliente. Una cuenta sin nombre de
  negocio no recibe local ni privilegios automáticamente.
- Una identidad Auth solo puede tener una membresía. Las membresías no admiten
  escrituras desde el navegador; el alta de empleados queda para otro paso.
- Las 19 tablas usan RLS. Se retiran las políticas abiertas y los permisos de
  `anon`. Cada tabla tiene además una política restrictiva para su local.
- Las funciones privadas de las políticas consultan `auth.uid()` y la membresía
  activa real, con `search_path` vacío. No agregar `private` a los esquemas
  expuestos por la Data API. No colocar una clave `service_role` en el frontend.
- Las claves foráneas incluyen `local_id`, de modo que ni siquiera un ID conocido
  permite vincular productos, mesas, pedidos, cobros o arqueos de otro negocio.
  Se reemplaza la FK anterior para conservar una sola relación por embed.
- No se puede cambiar el propietario de un registro operativo desde la API.
- La unicidad de nombres, números de mesa, posiciones e IDs de importación se
  aplica por cafetería. Dos negocios pueden tener una mesa 1 o un proveedor igual.
- Las RPC de mover y cancelar pedidos mantienen `SECURITY INVOKER`, respetan RLS
  y dejan de ser ejecutables por usuarios anónimos.
- Solo un administrador puede modificar el nombre de su local y acceder a las
  tablas administrativas heredadas `roles_usuarios` y `usuarios_sistema`.

Los permisos específicos de camarero, cajero y encargado **todavía no están
implementados**. Por ahora los miembros activos acceden a las operaciones de su
propia cafetería; los roles/usuarios heredados no crean identidades Auth ni
membresías por sí mismos. Las identidades sin membresía o desactivadas y los
locales inactivos no tienen acceso operativo.

Los accesos privilegiados de `postgres` y `service_role` son de administración y
omiten RLS. Desde esos canales, las inserciones deben informar `local_id` si no
hay un usuario autenticado. No usar SQL Editor como evidencia de aislamiento de
un usuario: las pruebas deben cambiar al rol `authenticated`.

No volver a ejecutar los scripts SQL históricos con políticas abiertas. Las
futuras tablas, vistas, funciones y migraciones deben mantener este aislamiento.

## Verificaciones locales

Desde la raíz del repositorio:

```powershell
npm.cmd run build
node --test tests/recuperacionPassword.test.cjs
# Solo para pruebas locales de PostgreSQL en memoria; no cambia package.json:
npm.cmd install --prefix .codex-tmp/pg-tests --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.3.14
node tests/cafeterias-db.cjs
# Con Vite iniciado y Playwright disponible:
node tests/cafeterias-ui.cjs
```

La prueba de navegador intercepta todas las llamadas a Supabase. La prueba de
base ejecuta el esquema previo, la migración y las políticas en PostgreSQL WASM
(PGlite), sin conexión externa, con identidades y registros ficticios. Comprueba
lecturas y escrituras cruzadas, relaciones, RPC propias/ajenas, cuentas y locales
inactivos, acceso anónimo, atomicidad del alta, nombres repetidos entre locales y
rollback ante propiedad histórica dudosa. También ejecuta el SQL de verificación.
Ninguna prueba crea cuentas reales ni envía correos. La comprobación final en
Supabase se realiza después de aplicar la migración.
