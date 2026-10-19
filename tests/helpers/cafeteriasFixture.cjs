// PostgreSQL real en WASM, aislado y en memoria: nunca conecta con Supabase.
// npm install --prefix .codex-tmp/pg-tests --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.3.14
const { PGlite } = require(process.env.PGLITE_MODULE ?? '../../.codex-tmp/pg-tests/node_modules/@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');

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


module.exports = { fixture, asUser, denied, A, UA, UB, UC, q };
