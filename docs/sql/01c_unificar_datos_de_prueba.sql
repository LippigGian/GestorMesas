-- SOLO PARA ESTA BASE DE PRUEBAS, que todavía no se utiliza en producción.
-- El usuario autorizó unificar los datos existentes en su cafetería actual.
-- Conserva IDs, productos, mesas, pedidos, importes y estados.
-- Sobrescribe únicamente local_id de las 10 tablas que ya tienen esa columna.
-- Ejecutar COMPLETO, antes de 02_aislamiento_cafeterias.sql.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(hashtext('gestormesas_aislamiento_v1'));

do $$
declare
  v_local uuid := '8ad72695-6d92-4de5-9895-449f1d1cab67';
  t text;
  v_cantidad bigint;
begin
  if to_regprocedure('private.crear_cafeteria_al_registrar()') is not null then
    raise exception 'El aislamiento ya está instalado. No ejecutar esta corrección histórica.';
  end if;
  lock table public.locales, public.usuarios_locales,
    public.categorias, public.productos, public.mesas, public.cajas,
    public.turnos, public.medios_pago, public.proveedores, public.arqueos_caja,
    public.pedidos, public.gastos in access exclusive mode;

  if not exists (select 1 from public.locales where id=v_local and activo)
    or (select count(*) from public.usuarios_locales where local_id=v_local and activo and rol='admin') <> 1
    or exists (select 1 from public.usuarios_locales where local_id<>v_local) then
    raise exception 'Las cuentas no coinciden con la base de prueba revisada. No se modificó ningún dato.';
  end if;

  foreach t in array array['categorias','productos','mesas','cajas','turnos',
    'medios_pago','proveedores','arqueos_caja','pedidos','gastos'] loop
    execute format('update public.%I set local_id=$1 where local_id is distinct from $1',t) using v_local;
    get diagnostics v_cantidad = row_count;
    raise notice '%: % registros asociados a la cafetería actual.',t,v_cantidad;
  end loop;
end $$;
commit;

select 'Datos de prueba unificados. Ahora ejecutar 02_aislamiento_cafeterias.sql completo.' as resultado;
