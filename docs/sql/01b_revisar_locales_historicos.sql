-- SOLO LECTURA. Identifica propietarios históricos antes de corregirlos.
-- Ejecutar en SQL Editor y copiar la celda resultado. No modifica registros.
with conteos as (
  select 'mesas' as tabla, local_id, count(*) as cantidad from public.mesas group by local_id
  union all select 'categorias',local_id,count(*) from public.categorias group by local_id
  union all select 'productos',local_id,count(*) from public.productos group by local_id
  union all select 'cajas',local_id,count(*) from public.cajas group by local_id
  union all select 'turnos',local_id,count(*) from public.turnos group by local_id
  union all select 'medios_pago',local_id,count(*) from public.medios_pago group by local_id
  union all select 'proveedores',local_id,count(*) from public.proveedores group by local_id
  union all select 'arqueos_caja',local_id,count(*) from public.arqueos_caja group by local_id
  union all select 'pedidos',local_id,count(*) from public.pedidos group by local_id
  union all select 'gastos',local_id,count(*) from public.gastos group by local_id
), mesas_distintas as (
  select m.id,m.numero,m.tipo,m.estado,m.sector,m.x,m.y,m.local_id,m.created_at,m.updated_at,
    l.nombre as nombre_local,l.activo as local_activo,
    (select count(*) from public.usuarios_locales ul where ul.local_id=m.local_id) as membresias_del_local,
    (select count(*) from public.pedidos p where p.mesa_id=m.id) as pedidos_vinculados,
    (select jsonb_agg(to_jsonb(c)) from (
      select p.local_id,p.estado,count(*) as cantidad,sum(p.total) as total
      from public.pedidos p where p.mesa_id=m.id group by p.local_id,p.estado
    ) c) as pedidos_por_local_y_estado
  from public.mesas m left join public.locales l on l.id=m.local_id
  where m.local_id is distinct from '8ad72695-6d92-4de5-9895-449f1d1cab67'::uuid
)
select jsonb_pretty(jsonb_build_object(
  'local_actual','8ad72695-6d92-4de5-9895-449f1d1cab67',
  'locales', (select jsonb_agg(to_jsonb(l)) from (
    select id,nombre,activo,created_at from public.locales order by created_at
  ) l),
  'membresias_por_local', (select jsonb_agg(to_jsonb(u)) from (
    select local_id,rol,activo,count(*) as cantidad from public.usuarios_locales group by local_id,rol,activo
  ) u),
  'registros_por_tabla_y_local', (select jsonb_agg(to_jsonb(c) order by c.tabla,c.local_id) from conteos c),
  'mesas_con_otro_local',coalesce((select jsonb_agg(to_jsonb(m)) from mesas_distintas m),'[]'::jsonb),
  'valor_por_defecto_local_mesas', (select column_default from information_schema.columns
    where table_schema='public' and table_name='mesas' and column_name='local_id')
)) as resultado;
