-- SOLO LECTURA. Ejecutar después de 02_aislamiento_cafeterias.sql.
-- Los tres indicadores iniciales deben ser true y las listas de errores vacías.
select jsonb_pretty(jsonb_build_object(
  'alta_automatica_instalada', exists (
    select 1 from pg_trigger where tgrelid='auth.users'::regclass
    and tgname='crear_cafeteria_al_registrar' and tgenabled='O'
  ),
  'membresias_sin_escritura_desde_cliente',
    not has_table_privilege('authenticated','public.usuarios_locales','INSERT')
    and not has_any_column_privilege('authenticated','public.usuarios_locales','UPDATE')
    and not has_table_privilege('authenticated','public.usuarios_locales','DELETE'),
  'tablas_sin_acceso_anonimo', not exists (
    select 1 from pg_class where relnamespace='public'::regnamespace
    and relkind in ('r','p') and has_any_column_privilege('anon',oid,'SELECT')
  ),
  'tablas_sin_rls', coalesce((
    select jsonb_agg(relname) from pg_class where relnamespace='public'::regnamespace
    and relkind in ('r','p') and (not relrowsecurity or not relforcerowsecurity)
  ),'[]'::jsonb),
  'politicas_inesperadas', coalesce((
    select jsonb_agg(jsonb_build_object('tabla',tablename,'politica',policyname))
    from pg_policies where schemaname='public' and policyname not in (
      'aislamiento_local','operar_mi_local','leer_mi_local','editar_nombre_mi_local',
      'aislamiento_membresias','leer_membresias')
  ),'[]'::jsonb),
  'tablas_sin_guardia_restrictiva', coalesce((
    select jsonb_agg(c.relname) from pg_class c
    where c.relnamespace='public'::regnamespace and c.relkind in ('r','p')
    and not exists (select 1 from pg_policy p where p.polrelid=c.oid and not p.polpermissive)
  ),'[]'::jsonb),
  'restricciones_no_validadas', coalesce((
    select jsonb_agg(conname) from pg_constraint
    where connamespace='public'::regnamespace and not convalidated
  ),'[]'::jsonb),
  'funciones_publicas_con_privilegios_elevados', coalesce((
    select jsonb_agg(p.oid::regprocedure::text)
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef
    and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
  ),'[]'::jsonb),
  'rpc_con_acceso_anonimo', coalesce((
    select jsonb_agg(p.oid::regprocedure::text) from pg_proc p
    where p.pronamespace='public'::regnamespace and p.proname in ('cancelar_pedido','mover_pedido_mostrador_a_mesa')
    and has_function_privilege('anon',p.oid,'EXECUTE')
  ),'[]'::jsonb),
  'membresias_por_local', (
    select jsonb_agg(to_jsonb(m)) from (
      select local_id,rol,activo,count(*) as cantidad
      from public.usuarios_locales group by local_id,rol,activo
    ) m
  )
)) as resultado;
