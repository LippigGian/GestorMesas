// PostgreSQL en memoria. Sin conexión, cuentas ni cambios en Supabase.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { fixture, asUser, denied, A, UA, UB, UC, q } = require('./helpers/cafeteriasFixture.cjs');
const employee = '10000000-0000-4000-8000-000000000004';
const missingRole = '10000000-0000-4000-8000-000000000005';
const roleId = '70000000-0000-4000-8000-000000000001';
const product = '30000000-0000-4000-8000-000000000001';
const order = '50000000-0000-4000-8000-000000000001';
const item = '60000000-0000-4000-8000-000000000001';

(async () => {
  const db = await fixture();
  try {
    await db.exec(fs.readFileSync('docs/sql/02_aislamiento_cafeterias.sql', 'utf8'));
    await db.exec(fs.readFileSync('docs/sql/05_permisos_empleados.sql', 'utf8'));
    await db.exec(fs.readFileSync('docs/sql/09_historial_arqueos_por_permiso.sql', 'utf8'));
    await db.exec(fs.readFileSync('docs/sql/10_rectificar_arqueos_cerrados.sql', 'utf8'));
    const ts = require('typescript');
    const catalogo = {};
    new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/permisos.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(catalogo);
    assert.deepEqual((await db.query('select private.catalogo_permisos() as permisos')).rows[0].permisos, catalogo.permisosDisponibles.map(p=>p.id));
    await db.exec(`
      insert into auth.users(id,email,raw_user_meta_data) values('${UB}','b@example.invalid','{"nombre_local":"B"}');
      insert into auth.users(id,email,raw_user_meta_data) values('${employee}','empleado@example.invalid','{"rol":"admin","local_id":"${A}"}');
      insert into auth.users(id,email) values('${missingRole}','sin-rol@example.invalid');
      insert into public.roles_usuarios(id,local_id,nombre,permisos) values('${roleId}','${A}','Camarero 2','[]');
      insert into public.usuarios_locales(user_id,local_id,email,rol,rol_id) values('${employee}','${A}','empleado@example.invalid','empleado','${roleId}');
      insert into public.usuarios_locales(user_id,local_id,email,rol) values('${missingRole}','${A}','sin-rol@example.invalid','mozo');
    `);
    const BRole = (await asUser(db, UB, `insert into public.roles_usuarios(nombre) values('Rol B') returning id`)).rows[0].id;
    assert.equal((await asUser(db, employee, 'select public.mis_permisos() as p')).rows[0].p.administrador, false);
    assert.equal((await asUser(db, missingRole, 'select * from public.productos')).rows.length, 0);
    assert.equal((await asUser(db, employee, 'select * from public.productos')).rows.length, 1);
    assert.equal((await asUser(db, UB, 'select * from public.productos')).rows.length, 0);
    await denied(db, employee, `insert into public.categorias(nombre) values('No permitido')`, '42501');
    await denied(db, employee, `update public.productos set precio=1 where id='${product}'`, '42501');
    await asUser(db, employee, `update public.productos set favorito=true where id='${product}'`);
    await denied(db, employee, `update public.mesas set x=1`, '42501');
    await asUser(db, employee, `update public.mesas set estado='ocupada',personas=2`);
    await denied(db, employee, `insert into public.pedido_items(pedido_id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal) values('${order}','${product}','Latte',1,1,1)`, '42501');
    await denied(db, employee, `update public.pedido_items set subtotal=1 where id='${item}'`, '42501');
    await denied(db, employee, `update public.pedidos set total=1 where id='${order}'`, '42501');
    await denied(db, employee, `insert into public.pedido_items(pedido_id,nombre_producto,precio_unitario,subtotal) values('${order}','Descuento',-1,-1)`, '42501');
    await denied(db, employee, `update public.usuarios_locales set rol='admin' where user_id='${employee}'`, '42501');
    await denied(db, employee, `select public.asignar_rol_empleado('${employee}','${roleId}')`, '42501');
    await denied(db, UA, `select public.asignar_rol_empleado('${employee}','${BRole}')`);
    for (const permissions of ["[\"inventar_permiso\"]", "[\"ver_ventas\",\"ver_ventas\"]", '{}', '[3]']) {
      await denied(db, UA, `insert into public.roles_usuarios(nombre,permisos) values('Inválido',${q(permissions)}::jsonb)`, '23514');
    }
    // Permiso especial de precio modifica el pedido, nunca el catálogo.
    await asUser(db, UA, `update public.roles_usuarios set permisos='["editar_precios"]' where id='${roleId}'`);
    await asUser(db, employee, `update public.pedido_items set precio_unitario=2000,subtotal=2000 where id='${item}'`);
    await denied(db, employee, `update public.productos set precio=2000 where id='${product}'`, '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["aplicar_descuentos"]' where id='${roleId}'`);
    await asUser(db, employee, `insert into public.pedido_items(pedido_id,nombre_producto,precio_unitario,subtotal) values('${order}','Descuento',-100,-100)`);
    await asUser(db, employee, `update public.pedidos set total=1900 where id='${order}'`);
    // Nadie recibe permisos desde el nombre del rol o los metadatos.
    await asUser(db, UA, `update public.roles_usuarios set nombre='Administrador',permisos='[]' where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select public.mis_permisos() as p')).rows[0].p.administrador, false);
    assert.equal((await asUser(db, employee, 'select * from public.arqueos_caja')).rows.length, 0);
    await denied(db, employee, `select public.abrir_caja(gen_random_uuid(),0)`, '42501');

    const cajaA = (await asUser(db, UA, `insert into public.cajas(nombre) values('Caja principal') returning id`)).rows[0].id;
    const medioA = (await asUser(db, UA, `insert into public.medios_pago(nombre) values('Efectivo') returning id`)).rows[0].id;
    await asUser(db, UA, `update public.roles_usuarios set permisos='["abrir_cerrar_caja"]' where id='${roleId}'`);
    const arqueo = (await asUser(db, employee, `select public.abrir_caja('${cajaA}',100) as id`)).rows[0].id;
    assert.equal((await asUser(db, employee, 'select * from public.arqueos_caja')).rows.length, 0, 'Abrir caja no revela saldos');
    assert.equal((await asUser(db, employee, 'select * from public.listar_arqueos_operativos()')).rows.length, 1);
    // Catálogo, plano y configuración tienen permisos distintos del precio de un pedido.
    await asUser(db, UA, `update public.roles_usuarios set permisos='["editar_productos"]' where id='${roleId}'`);
    await asUser(db, employee, `update public.productos set precio=2600 where id='${product}'`);
    await asUser(db, employee, `insert into public.categorias(nombre) values('Nueva categoría')`);
    await denied(db, employee, `insert into public.salones(nombre) values('Terraza')`, '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["editar_mesas"]' where id='${roleId}'`);
    await asUser(db, employee, `insert into public.salones(nombre) values('Terraza')`);
    await asUser(db, employee, `update public.mesas set x=1`);
    assert.equal((await asUser(db, employee, `update public.locales set nombre='Cambio sin permiso' where id='${A}' returning id`)).rows.length, 0);
    await asUser(db, UA, `update public.roles_usuarios set permisos='["modificar_configuracion_general"]' where id='${roleId}'`);
    await asUser(db, employee, `update public.locales set nombre='Local actualizado' where id='${A}'`);
    await asUser(db, employee, `insert into public.turnos(nombre,hora_inicio,hora_fin) values('Mañana','08:00','16:00')`);
    await denied(db, employee, `select public.abrir_caja('${cajaA}',0)`, '42501');
    await denied(db, employee, `insert into public.gastos(arqueo_caja_id,medio_pago_id,importe) values('${arqueo}','${medioA}',100)`, '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["gestionar_gastos"]' where id='${roleId}'`);
    const gasto = (await asUser(db, employee, `insert into public.gastos(arqueo_caja_id,medio_pago_id,importe) values('${arqueo}','${medioA}',100) returning id`)).rows[0].id;
    await asUser(db, employee, `delete from public.gastos where id='${gasto}'`);
    // Todos pueden cobrar y cancelar, aun sin abrir/cerrar caja.
    await asUser(db, UA, `update public.roles_usuarios set permisos='[]' where id='${roleId}'`);
    await denied(db, employee, `insert into public.pedido_pagos(pedido_id,medio_pago_id,arqueo_caja_id,monto) values('${order}','${medioA}','${arqueo}',10)`, '42501');
    const pagos = [{ medioPagoId: medioA, monto: 1900 }];
    await denied(db, UB, `select public.cobrar_pedido('${order}',${q(JSON.stringify(pagos))}::jsonb,true)`);
    const pagado = (await asUser(db, employee, `select public.cobrar_pedido('${order}',${q(JSON.stringify(pagos))}::jsonb,true) as total`)).rows[0].total;
    assert.equal(Number(pagado), 1900);
    assert.equal((await asUser(db, employee, 'select estado from public.mesas')).rows[0].estado, 'libre');
    assert.equal((await asUser(db, employee, 'select * from public.pedidos')).rows.length, 0, 'Cobrar no habilita historial');
    assert.equal((await asUser(db, employee, `update public.arqueos_caja set total_ventas=0 where id='${arqueo}' returning id`)).rows.length, 0);
    assert.equal(Number((await asUser(db, UA, `select total_ventas from public.arqueos_caja where id='${arqueo}'`)).rows[0].total_ventas), 1900);
    assert.equal((await asUser(db, employee, `select * from public.pedido_pagos`)).rows.length, 0);
    await denied(db, employee, `select public.resumen_metricas((now() at time zone $$America/Argentina/Buenos_Aires$$)::date,(now() at time zone $$America/Argentina/Buenos_Aires$$)::date)`, '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["ver_metricas"]' where id='${roleId}'`);
    const metricas = (await asUser(db, employee, 'select public.resumen_metricas((now() at time zone $$America/Argentina/Buenos_Aires$$)::date,(now() at time zone $$America/Argentina/Buenos_Aires$$)::date) as m')).rows[0].m;
    assert.equal(metricas.cantidadVentas, 1);
    assert.equal(Number(metricas.totalVentas), 1900);
    assert.equal((await asUser(db, employee, 'select * from public.pedidos')).rows.length, 0, 'Métricas no habilita ventas detalladas');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["ver_ventas"]' where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select * from public.pedidos')).rows.length, 1);
    await denied(db, employee, 'select public.resumen_metricas((now() at time zone $$America/Argentina/Buenos_Aires$$)::date,(now() at time zone $$America/Argentina/Buenos_Aires$$)::date)', '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["ver_saldos_arqueo"]' where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select * from public.arqueos_caja')).rows.length, 1);
    await denied(db, employee, `select public.cerrar_caja('${arqueo}','[]')`, '42501');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["abrir_cerrar_caja"]' where id='${roleId}'`);
    const cierre = (await asUser(db, employee, `select public.cerrar_caja('${arqueo}',${q(JSON.stringify([{ medioPagoId: medioA, montoDeclarado: 1900 }]))}::jsonb) as c`)).rows[0].c;
    assert.equal(cierre.estado, 'cerrado');
    assert.equal(cierre.diferencia, undefined);
    assert.equal(cierre.total_ventas, undefined);
    assert.equal((await asUser(db, employee, 'select * from public.arqueo_caja_medios_pago')).rows.length, 0);

    assert.equal((await asUser(db, employee, 'select * from public.listar_arqueos_operativos()')).rows.length, 0, 'Abrir/cerrar caja no permite consultar arqueos cerrados');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["ver_ventas"]' where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select * from public.listar_arqueos_operativos()')).rows.length, 0, 'Ver ventas no concede historial de arqueos');
    await asUser(db, UA, `update public.roles_usuarios set permisos='["ver_saldos_arqueo"]' where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select * from public.listar_arqueos_operativos()')).rows.length, 1, 'Ver arqueos y saldos concede historial');
    assert.equal((await asUser(db, UA, 'select * from public.listar_arqueos_operativos()')).rows.length, 1, 'Administrador conserva historial');
    assert.equal((await asUser(db, UB, 'select * from public.listar_arqueos_operativos()')).rows.length, 0, 'Otro local no accede al historial');

    // Gestión delegada: crear roles no permite escalar privilegios ni tocar al dueño.
    await asUser(db, UA, `update public.roles_usuarios set permisos='["gestionar_usuarios"]' where id='${roleId}'`);
    const subrol = (await asUser(db, employee, `insert into public.roles_usuarios(nombre,permisos) values('Auxiliar','[]') returning id`)).rows[0].id;
    await denied(db, employee, `insert into public.roles_usuarios(nombre,permisos) values('Escalar','["ver_ventas"]')`, '42501');
    await denied(db, employee, `update public.roles_usuarios set permisos='["gestionar_usuarios","ver_metricas"]' where id='${roleId}'`, '42501');
    await denied(db, employee, `select public.asignar_rol_empleado('${UA}','${subrol}',false)`, '42501');
    await db.exec(`insert into auth.users(id,email) values('${UC}','auxiliar@example.invalid');
      insert into public.usuarios_locales(user_id,local_id,email,rol,rol_id) values('${UC}','${A}','auxiliar@example.invalid','empleado','${subrol}')`);
    await asUser(db, employee, `select public.asignar_rol_empleado('${UC}','${subrol}',false)`);
    assert.equal((await asUser(db, UC, 'select * from public.productos')).rows.length, 0);
    await asUser(db, employee, `select public.asignar_rol_empleado('${UC}','${subrol}',true)`);
    await asUser(db, UA, `update public.roles_usuarios set permisos='["gestionar_usuarios","ver_metricas"]' where id='${subrol}'`);
    await denied(db, employee, `update public.roles_usuarios set nombre='Rol superior' where id='${subrol}'`, '42501');
    await denied(db, employee, `select public.asignar_rol_empleado('${UC}','${roleId}')`, '42501');

    // Cobro parcial atómico, anulación y rechazo de un segundo cobro inválido.
    await asUser(db, UA, `update public.roles_usuarios set permisos='[]' where id='${roleId}'`);
    await asUser(db, UA, `select public.abrir_caja('${cajaA}',0)`);
    const pedido2 = (await asUser(db, employee, `insert into public.pedidos(tipo) values('mostrador') returning id`)).rows[0].id;
    const item2 = (await asUser(db, employee, `insert into public.pedido_items(pedido_id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal) values('${pedido2}','${product}','Latte',2600,2,5200) returning id`)).rows[0].id;
    const parcial = [{ medioPagoId: medioA, monto: 2600 }];
    const itemsParcial = [{ pedidoItemId: item2, cantidad: 1, monto: 2600 }];
    await asUser(db, employee, `select public.cobrar_pedido('${pedido2}',${q(JSON.stringify(parcial))}::jsonb,false,${q(JSON.stringify(itemsParcial))}::jsonb)`);
    await denied(db, employee, `select public.cobrar_pedido('${pedido2}',${q(JSON.stringify(parcial))}::jsonb,false,${q(JSON.stringify(itemsParcial))}::jsonb)`);
    assert.equal(Number((await asUser(db, UA, `select sum(monto) total from public.pedido_pagos where pedido_id='${pedido2}'`)).rows[0].total), 2600);
    await denied(db, employee, `delete from public.pedido_items where id='${item2}'`);
    await asUser(db, employee, `select * from public.cancelar_pedido('${pedido2}')`);
    assert.equal((await asUser(db, UA, `select estado from public.pedidos where id='${pedido2}'`)).rows[0].estado, 'cancelado');
    await denied(db, UB, `select * from public.cancelar_pedido('${pedido2}')`);

    // La desactivación del rol o de la membresía corta el acceso en la siguiente consulta.
    await asUser(db, UA, `update public.roles_usuarios set activo=false where id='${roleId}'`);
    assert.equal((await asUser(db, employee, 'select * from public.productos')).rows.length, 0);
    await asUser(db, UA, `update public.roles_usuarios set activo=true where id='${roleId}'`);
    await asUser(db, UA, `select public.asignar_rol_empleado('${employee}','${roleId}',false)`);
    assert.equal((await asUser(db, employee, 'select * from public.productos')).rows.length, 0);
    await asUser(db, UA, `select public.asignar_rol_empleado('${employee}','${roleId}',true)`);
    assert.equal((await asUser(db, employee, 'select * from public.productos')).rows.length, 1);
    await denied(db, UA, `select public.asignar_rol_empleado('${UA}','${roleId}')`, '42501');
    await db.exec('set role anon');
    await assert.rejects(db.query('select public.mis_permisos()'), error => error.code === '42501');
    await db.exec('reset role');
    const verification = JSON.parse((await db.query(fs.readFileSync('docs/sql/06_verificar_permisos.sql', 'utf8'))).rows[0].resultado);
    for (const key of ['catalogo_fijo_instalado','roles_vinculados_por_local','administradores_preservados','membresias_sin_escritura_cliente','tablas_sin_acceso_anonimo']) assert.equal(verification[key], true, key);
    for (const key of ['tablas_sin_rls','tablas_sin_guardia_local','restricciones_no_validadas','roles_con_permisos_invalidos','rpc_nuevas_con_acceso_anonimo']) assert.deepEqual(verification[key], [], key);
    console.log('OK: catálogo fijo, roles por cafetería, administrador protegido, precios/descuentos, cobro sin saldos, cierre ciego, métricas/ventas independientes y desactivación inmediata.');
  } finally { await db.close(); }
})().catch(error => { console.error(error.stack, error.code ?? '', error.where ?? ''); process.exitCode = 1; });
