-- SOLO LECTURA. Ejecutar en SQL Editor de Supabase y copiar la celda resultado.
-- No consulta emails, contraseñas, tokens ni nombres de clientes.
select jsonb_pretty(jsonb_build_object(
  'columnas', (select jsonb_agg(to_jsonb(c)) from (
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns where table_schema = 'public'
    order by table_name, ordinal_position
  ) c),
  'politicas', (select jsonb_agg(to_jsonb(p)) from (
    select tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies where schemaname = 'public'
  ) p),
  'restricciones', (select jsonb_agg(to_jsonb(c)) from (
    select conrelid::regclass::text as tabla, conname,
      pg_get_constraintdef(oid) as definicion
    from pg_constraint where connamespace = 'public'::regnamespace
  ) c),
  'indices', (select jsonb_agg(to_jsonb(i)) from (
    select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'
  ) i),
  'triggers', (select jsonb_agg(to_jsonb(t)) from (
    select t.tgrelid::regclass::text as tabla, t.tgname,
      pg_get_triggerdef(t.oid) as definicion,
      pg_get_functiondef(t.tgfoid) as funcion
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and (n.nspname = 'public' or t.tgrelid = 'auth.users'::regclass)
  ) t),
  'funciones_expuestas', (select jsonb_agg(to_jsonb(f)) from (
    select p.oid::regprocedure::text as nombre, p.prosecdef as security_definer,
      p.proacl::text as permisos, pg_get_functiondef(p.oid) as definicion
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  ) f),
  'vistas', (select jsonb_agg(to_jsonb(v)) from (
    select c.relname, c.relkind, c.reloptions, pg_get_viewdef(c.oid, true) as definicion
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v','m')
  ) v),
  'rls', (select jsonb_agg(to_jsonb(t)) from (
    select relname, relrowsecurity, relforcerowsecurity from pg_class
    where relnamespace = 'public'::regnamespace and relkind in ('r','p')
  ) t),
  'membresias', (select jsonb_agg(to_jsonb(m)) from (
    select local_id, rol, activo, count(*) as cantidad
    from public.usuarios_locales group by local_id, rol, activo
  ) m),
  'usuarios_en_varios_locales', (select count(*) from (
    select user_id from public.usuarios_locales group by user_id
    having count(distinct local_id) > 1
  ) m)
)) as resultado;
