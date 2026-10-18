// PostgreSQL real en WASM, aislado y en memoria: nunca conecta con Supabase.
// npm install --prefix .codex-tmp/pg-tests --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.3.14
const { PGlite } = require(process.env.PGLITE_MODULE ?? '../.codex-tmp/pg-tests/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const migration = fs.readFileSync('docs/sql/02_aislamiento_cafeterias.sql', 'utf8');
const schema = fs.readFileSync('tests/fixtures/cafeterias-esquema-previo.sql', 'utf8');
const A = '8ad72695-6d92-4de5-9895-449f1d1cab67';
const UA = '10000000-0000-4000-8000-000000000001';
const UB = '10000000-0000-4000-8000-000000000002';
const UC = '10000000-0000-4000-8000-000000000003';
const q = value => `'${String(value).replaceAll("'", "''")}'`;

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role supabase_auth_admin nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    grant all on auth.users to supabase_auth_admin;
    grant usage on schema auth to supabase_auth_admin;
  `);
  await db.exec(schema);
  await db.exec(`
    grant all on all tables in schema public to authenticated, anon, service_role;
    insert into auth.users(id,email) values('${UA}','a@example.invalid');
    insert into public.locales(id,nombre) values('${A}','Cafetería A');
    insert into public.usuarios_locales(user_id,local_id,email,rol) values('${UA}','${A}','a@example.invalid','admin');
    insert into public.categorias(id,local_id,nombre) values('20000000-0000-4000-8000-000000000001','${A}','Café');
    insert into public.productos(id,local_id,categoria_id,nombre,precio,fudo_id) values('30000000-0000-4000-8000-000000000001','${A}','20000000-0000-4000-8000-000000000001','Latte',2500,10);
    insert into public.mesas(id,local_id,numero,tipo,sector,x,y) values('40000000-0000-4000-8000-000000000001','${A}','1','cuadrada','salon',0,0);
    insert into public.pedidos(id,tipo,mesa_id,personas,total) values('50000000-0000-4000-8000-000000000001','mesa','40000000-0000-4000-8000-000000000001',2,2500);
    insert into public.pedido_items(id,pedido_id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal) values('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Latte',2500,1,2500);
    insert into public.salones(id,nombre) values('salon','Salón');
    insert into public.roles_usuarios(nombre) values('Camarero');
    insert into public.usuarios_sistema(nombre,email) values('Prueba','empleado@example.invalid');
  `);
  return db;
}

async function asUser(db, id, sql) {
  await db.exec(`set role authenticated; set "request.jwt.claim.sub" = ${q(id)};`);
  try { return await db.query(sql); }
  finally { await db.exec('reset role; reset "request.jwt.claim.sub";'); }
}

async function denied(db, id, sql, code) {
  await assert.rejects(asUser(db, id, sql), error => !code || error.code === code);
}

(async () => {
  const db = await fixture();
  try {
    await db.exec(migration);
    const verification = JSON.parse((await db.query(fs.readFileSync('docs/sql/03_verificar_aislamiento.sql', 'utf8'))).rows[0].resultado);
    assert.equal(verification.alta_automatica_instalada, true);
    assert.equal(verification.membresias_sin_escritura_desde_cliente, true);
    assert.equal(verification.tablas_sin_acceso_anonimo, true);
    for (const key of ['tablas_sin_rls', 'politicas_inesperadas', 'tablas_sin_guardia_restrictiva', 'restricciones_no_validadas', 'funciones_publicas_con_privilegios_elevados', 'rpc_con_acceso_anonimo']) assert.deepEqual(verification[key], [], key);
    // Una sola FK por relación mantiene los embeds actuales de PostgREST.
    assert.equal((await db.query(`select count(*) from (
      select conrelid,confrelid from pg_constraint
      where contype='f' and connamespace='public'::regnamespace
      group by conrelid,confrelid having count(*)>1
    ) c`)).rows[0].count, 0);
    assert.equal((await db.query('select total from public.pedidos')).rows[0].total, '2500');
    assert.equal((await db.query('select local_id from public.pedido_items')).rows[0].local_id, A);
    assert.equal((await db.query('select local_id from public.salones')).rows[0].local_id, A);

    // El rol que usa Supabase Auth ejecuta el trigger sin permisos sobre public.
    await db.exec(`set role supabase_auth_admin;
      insert into auth.users(id,email,raw_user_meta_data) values('${UB}','b@example.invalid',
        '{"nombre_local":"Cafetería B","local_id":"${A}","rol":"superadmin"}');
      reset role;`);
    const membershipB = (await db.query(`select * from public.usuarios_locales where user_id = '${UB}'`)).rows[0];
    const B = membershipB.local_id;
    assert.notEqual(B, A);
    assert.equal(membershipB.rol, 'admin');
    assert.equal((await asUser(db, UB, 'select * from public.cajas')).rows[0].nombre, 'Caja principal');
    assert.equal((await asUser(db, UB, 'select * from public.medios_pago')).rows[0].nombre, 'Efectivo');

    // Mismos nombres, IDs de importación y posiciones en dos cafeterías.
    await asUser(db, UB, `insert into public.categorias(id,nombre) values('20000000-0000-4000-8000-000000000002','Café')`);
    await asUser(db, UB, `insert into public.productos(id,categoria_id,nombre,precio,fudo_id) values('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Latte',3000,10)`);
    await asUser(db, UB, `insert into public.mesas(id,numero,tipo,sector,x,y) values('40000000-0000-4000-8000-000000000002','1','cuadrada','salon',0,0)`);
    await asUser(db, UB, `insert into public.pedidos(id,tipo) values('50000000-0000-4000-8000-000000000002','mostrador')`);
    await asUser(db, UB, `insert into public.pedido_items(pedido_id,producto_id,nombre_producto,precio_unitario,cantidad,subtotal) values('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Latte',3000,1,3000)`);
    const itemB = (await asUser(db, UB, 'select id from public.pedido_items')).rows[0].id;
    await denied(db, UB, `insert into public.pedido_item_cobros(pedido_id,pedido_item_id,cantidad,monto) values('50000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1,2500)`, '23503');
    await asUser(db, UB, `insert into public.pedidos(id,tipo) values('50000000-0000-4000-8000-000000000003','mostrador')`);
    await denied(db, UB, `insert into public.pedido_item_cobros(pedido_id,pedido_item_id,cantidad,monto) values('50000000-0000-4000-8000-000000000003','${itemB}',1,3000)`, '23503');
    assert.equal((await asUser(db, UA, 'select * from public.productos')).rows.length, 1);
    assert.equal((await asUser(db, UB, 'select * from public.productos')).rows[0].precio, '3000');
    assert.equal((await asUser(db, UB, `select * from public.pedido_items where pedido_id = '50000000-0000-4000-8000-000000000001'`)).rows.length, 0);
    assert.equal((await asUser(db, UB, `update public.productos set precio=1 where id='30000000-0000-4000-8000-000000000001' returning id`)).rows.length, 0);
    assert.equal((await asUser(db, UB, `delete from public.pedidos where id='50000000-0000-4000-8000-000000000001' returning id`)).rows.length, 0);
    assert.equal((await asUser(db, UB, `select * from public.locales`)).rows.length, 1);
    assert.equal((await asUser(db, UB, `select * from public.usuarios_locales`)).rows.length, 1);

    // Arqueos, gastos, pagos y cierres mantienen el flujo y el aislamiento.
    const cajaB = (await asUser(db, UB, 'select id from public.cajas')).rows[0].id;
    const medioB = (await asUser(db, UB, 'select id from public.medios_pago')).rows[0].id;
    const arqueoB = (await asUser(db, UB, `insert into public.arqueos_caja(caja_id) values('${cajaB}') returning id`)).rows[0].id;
    await asUser(db, UB, `insert into public.gastos(arqueo_caja_id,medio_pago_id,importe) values('${arqueoB}','${medioB}',100)`);
    await asUser(db, UB, `insert into public.pedido_pagos(pedido_id,medio_pago_id,arqueo_caja_id,monto) values('50000000-0000-4000-8000-000000000002','${medioB}','${arqueoB}',3000)`);
    await asUser(db, UB, `insert into public.arqueo_caja_medios_pago(arqueo_caja_id,medio_pago_id,monto_sistema,monto_declarado) values('${arqueoB}','${medioB}',2900,2900)`);
    for (const table of ['gastos', 'pedido_pagos', 'arqueo_caja_medios_pago', 'arqueos_caja']) {
      assert.equal((await asUser(db, UA, `select * from public.${table}`)).rows.length, 0, table);
      assert.equal((await asUser(db, UB, `select * from public.${table}`)).rows.length, 1, table);
    }
    await denied(db, UA, `insert into public.gastos(arqueo_caja_id,medio_pago_id,importe) values('${arqueoB}','${medioB}',100)`, '23503');
    const rolB = (await asUser(db, UB, `insert into public.roles_usuarios(nombre) values('Camarero') returning id`)).rows[0].id;
    await asUser(db, UB, `insert into public.usuarios_sistema(nombre,email,rol_id) values('Prueba B','empleado@example.invalid','${rolB}')`);
    await asUser(db, UB, `delete from public.roles_usuarios where id='${rolB}'`);
    assert.equal((await asUser(db, UB, `select rol_id,local_id from public.usuarios_sistema`)).rows[0].rol_id, null);

    await denied(db, UB, `insert into public.categorias(local_id,nombre) values('${A}','Intrusión')`, '42501');
    await denied(db, UB, `insert into public.productos(categoria_id,nombre) values('20000000-0000-4000-8000-000000000001','Intrusión')`, '23503');
    await denied(db, UB, `insert into public.pedido_items(pedido_id,nombre_producto,precio_unitario) values('50000000-0000-4000-8000-000000000001','Intrusión',1)`, '23503');
    await denied(db, UB, `update public.productos set local_id='${A}' where id='30000000-0000-4000-8000-000000000002'`, '23514');
    await denied(db, UB, `update public.usuarios_locales set local_id='${A}' where user_id='${UB}'`, '42501');
    await denied(db, UB, `insert into public.usuarios_locales(user_id,local_id,email,rol) values('${UB}','${A}','b@example.invalid','admin')`, '42501');
    await denied(db, UB, `insert into public.locales(nombre) values('Sin permiso')`, '42501');
    await asUser(db, UB, `update public.locales set nombre='Cafetería B nueva' where id='${B}'`);
    await denied(db, UB, `update public.locales set activo=false where id='${B}'`, '42501');

    // RPC existentes: no pueden mover ni cancelar pedidos ajenos.
    await denied(db, UB, `select * from public.cancelar_pedido('50000000-0000-4000-8000-000000000001')`);
    await denied(db, UB, `select * from public.mover_pedido_mostrador_a_mesa('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001',2)`);
    await asUser(db, UB, `select * from public.mover_pedido_mostrador_a_mesa('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',2)`);
    await asUser(db, UB, `select * from public.cancelar_pedido('50000000-0000-4000-8000-000000000002')`);
    assert.equal((await asUser(db, UB, `select estado from public.mesas`)).rows[0].estado, 'libre');

    // Un invitado sin membresía no crea local; los metadatos no dan permisos.
    await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values('${UC}','c@example.invalid','{"local_id":"${A}","rol":"admin"}')`);
    assert.equal((await asUser(db, UC, `select * from public.productos`)).rows.length, 0);
    await denied(db, UC, `insert into public.categorias(local_id,nombre) values('${A}','Intrusión')`, '42501');
    await db.exec(`update public.usuarios_locales set activo=false where user_id='${UB}'`);
    assert.equal((await asUser(db, UB, `select * from public.productos`)).rows.length, 0);
    await db.exec(`update public.usuarios_locales set activo=true where user_id='${UB}'`);
    await db.exec(`update public.locales set activo=false where id='${B}'`);
    assert.equal((await asUser(db, UB, `select * from public.productos`)).rows.length, 0);
    await db.exec(`update public.locales set activo=true where id='${B}'`);

    // Ni una política permisiva accidental abre el local B al usuario A.
    await db.exec('create policy politica_abierta_accidental on public.productos for all to authenticated using(true) with check(true)');
    assert.equal((await asUser(db, UA, 'select * from public.productos')).rows.length, 1);
    await denied(db, UA, `insert into public.productos(local_id,nombre) values('${B}','Intrusión')`, '42501');

    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.productos'), error => error.code === '42501');
    await assert.rejects(db.query('select * from public.cancelar_pedido(\'50000000-0000-4000-8000-000000000001\')'), error => error.code === '42501');
    await db.exec('reset role');
    // La confirmación por email y los cambios de metadatos no crean otro local.
    const totalAntes = (await db.query('select count(*) from public.locales')).rows[0].count;
    await db.exec(`update auth.users set raw_user_meta_data='{"nombre_local":"Otro nombre","rol":"admin","local_id":"${A}"}' where id='${UB}'`);
    assert.equal((await db.query('select count(*) from public.locales')).rows[0].count, totalAntes);
    assert.equal((await db.query(`select local_id from public.usuarios_locales where user_id='${UB}'`)).rows[0].local_id, B);
    // Fallo del trigger revierte también la cuenta y el local: no hay alta parcial.
    const count = (await db.query('select count(*) from public.locales')).rows[0].count;
    await assert.rejects(db.exec(`insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),'error@example.invalid',jsonb_build_object('nombre_local',repeat('a',101)))`));
    assert.equal((await db.query('select count(*) from public.locales')).rows[0].count, count);
    assert.equal((await db.query("select count(*) from auth.users where email='error@example.invalid'")).rows[0].count, 0);
    console.log('OK: alta atómica, dos cafeterías independientes, RLS, claves cruzadas, membresías protegidas, RPC, unicidad por local, cuentas inactivas y acceso anónimo.');
  } finally { await db.close(); }

  const incompatible = await fixture();
  try {
    await incompatible.exec("update public.mesas set local_id='00000000-0000-0000-0000-000000000001'");
    await assert.rejects(incompatible.exec(migration), /asignados a otro local/);
    await incompatible.exec('rollback');
    assert.equal((await incompatible.query('select local_id from public.mesas')).rows[0].local_id, '00000000-0000-0000-0000-000000000001');
    assert.equal((await incompatible.query("select count(*) from information_schema.columns where table_schema='public' and table_name='salones' and column_name='local_id'")).rows[0].count, 0);
    console.log('OK: una propiedad histórica dudosa aborta toda la migración, sin reasignar ni modificar el esquema.');
    // Corrección explícitamente autorizada para esta base que no está en uso.
    await incompatible.exec(fs.readFileSync('docs/sql/01c_unificar_datos_de_prueba.sql', 'utf8'));
    assert.equal((await incompatible.query('select local_id from public.mesas')).rows[0].local_id, A);
    assert.equal((await incompatible.query('select total from public.pedidos')).rows[0].total, '2500');
    await incompatible.exec(migration);
    assert.equal((await incompatible.query('select count(*) from public.mesas')).rows[0].count, 1);
    assert.equal((await incompatible.query('select count(*) from public.pedido_items')).rows[0].count, 1);
    await assert.rejects(incompatible.exec(fs.readFileSync('docs/sql/01c_unificar_datos_de_prueba.sql', 'utf8')), /aislamiento ya está instalado/);
    await incompatible.exec('rollback');
    console.log('OK: unificación autorizada conserva los registros y permite migrar; no puede ejecutarse después del aislamiento.');
  } finally { await incompatible.close(); }
})().catch(error => { console.error(error.message, error.code ?? ''); process.exitCode = 1; });
