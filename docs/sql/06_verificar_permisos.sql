-- SOLO LECTURA. Ejecutar después de 05_permisos_empleados.sql.
-- Indicadores true, listas de errores vacías. Las membresías sin rol son
-- informativas: quedan sin acceso y requieren asignación explícita, nunca automática.
select jsonb_pretty(jsonb_build_object(
  'catalogo_fijo_instalado',exists(select 1 from pg_constraint where conrelid='public.roles_usuarios'::regclass and conname='roles_catalogo_fijo' and convalidated),
  'roles_vinculados_por_local',exists(select 1 from pg_constraint where conrelid='public.usuarios_locales'::regclass and conname='usuarios_locales_rol_del_local_fkey' and convalidated),
  'administradores_preservados',not exists(select 1 from public.usuarios_locales where rol='admin' and rol_id is not null),
  'membresias_sin_escritura_cliente',not has_table_privilege('authenticated','public.usuarios_locales','INSERT')
    and not has_any_column_privilege('authenticated','public.usuarios_locales','UPDATE')
    and not has_table_privilege('authenticated','public.usuarios_locales','DELETE'),
  'tablas_sin_acceso_anonimo',not exists(select 1 from pg_class where relnamespace='public'::regnamespace
    and relkind in ('r','p') and has_any_column_privilege('anon',oid,'SELECT')),
  'tablas_sin_rls',coalesce((select jsonb_agg(relname) from pg_class where relnamespace='public'::regnamespace and relkind in ('r','p') and (not relrowsecurity or not relforcerowsecurity)),'[]'),
  'tablas_sin_guardia_local',coalesce((select jsonb_agg(c.relname) from pg_class c where c.relnamespace='public'::regnamespace and c.relkind in ('r','p') and not exists(select 1 from pg_policy p where p.polrelid=c.oid and not p.polpermissive and p.polname in ('aislamiento_local','aislamiento_membresias'))),'[]'),
  'restricciones_no_validadas',coalesce((select jsonb_agg(conname) from pg_constraint where connamespace='public'::regnamespace and not convalidated),'[]'),
  'roles_con_permisos_invalidos',coalesce((select jsonb_agg(id) from public.roles_usuarios where not private.permisos_validos(permisos)),'[]'),
  'empleados_sin_rol_asignado',(select count(*) from public.usuarios_locales where rol<>'admin' and rol_id is null),
  'rpc_nuevas_con_acceso_anonimo',coalesce((select jsonb_agg(p.oid::regprocedure::text) from pg_proc p where p.pronamespace='public'::regnamespace
    and p.proname in ('mis_permisos','asignar_rol_empleado','listar_arqueos_operativos','cobrar_pedido','cancelar_pedido','abrir_caja','cerrar_caja','resumen_metricas') and has_function_privilege('anon',p.oid,'EXECUTE')),'[]'),
  'administradores_por_local',(select jsonb_agg(to_jsonb(a)) from (select local_id,count(*) cantidad from public.usuarios_locales where rol='admin' and activo group by local_id) a)
)) as resultado;
