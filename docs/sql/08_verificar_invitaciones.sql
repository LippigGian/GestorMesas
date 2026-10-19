-- Solo lectura. Ejecutar después de 07_invitaciones_empleados.sql.
select jsonb_pretty(jsonb_build_object(
 'invitaciones_instaladas',to_regclass('private.invitaciones_empleados') is not null,
 'reservas_privadas',not has_table_privilege('authenticated','private.invitaciones_empleados','SELECT')
   and not has_table_privilege('anon','private.invitaciones_empleados','SELECT')
   and not has_table_privilege('service_role','private.invitaciones_empleados','SELECT'),
 'reservas_con_rls',(select relrowsecurity and relforcerowsecurity from pg_class where oid='private.invitaciones_empleados'::regclass),
 'activacion_password_instalada',exists(select 1 from information_schema.columns where table_schema='public' and table_name='usuarios_locales' and column_name='requiere_password' and is_nullable='NO'),
 'rpc_con_acceso_anonimo',coalesce((select jsonb_agg(p.proname) from pg_proc p where p.pronamespace='public'::regnamespace
   and p.proname in ('preparar_invitacion_empleado','confirmar_invitacion_empleado','fallar_invitacion_empleado','estado_invitacion','finalizar_invitacion','listar_empleados','actualizar_empleado') and has_function_privilege('anon',p.oid,'EXECUTE')),'[]'),
 'rpc_de_servidor_accesibles_al_cliente',coalesce((select jsonb_agg(p.proname) from pg_proc p where p.pronamespace='public'::regnamespace
   and p.proname in ('preparar_invitacion_empleado','confirmar_invitacion_empleado','fallar_invitacion_empleado') and has_function_privilege('authenticated',p.oid,'EXECUTE')),'[]'),
 'administradores_preservados',not exists(select 1 from public.usuarios_locales where rol='admin' and (rol_id is not null or requiere_password)),
 'empleados_pendientes',(select count(*) from public.usuarios_locales where requiere_password),
 'membresias_sin_escritura_cliente',not has_table_privilege('authenticated','public.usuarios_locales','INSERT')
   and not has_any_column_privilege('authenticated','public.usuarios_locales','UPDATE')
   and not has_table_privilege('authenticated','public.usuarios_locales','DELETE')
)) as resultado;
