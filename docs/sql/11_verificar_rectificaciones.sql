-- Solo lectura. Ejecutar después de 10_rectificar_arqueos_cerrados.sql.
select jsonb_pretty(jsonb_build_object(
 'rectificacion_instalada',to_regprocedure('public.rectificar_arqueo_cerrado(uuid,jsonb,text,integer)') is not null,
 'historial_privado',not has_table_privilege('authenticated','private.rectificaciones_arqueo','SELECT')
   and not has_table_privilege('authenticated','private.rectificaciones_arqueo','INSERT')
   and not has_table_privilege('authenticated','private.rectificaciones_arqueo','UPDATE')
   and not has_table_privilege('authenticated','private.rectificaciones_arqueo','DELETE'),
 'historial_sin_acceso_anonimo',not has_table_privilege('anon','private.rectificaciones_arqueo','SELECT'),
 'historial_con_rls',(select relrowsecurity and relforcerowsecurity from pg_class where oid='private.rectificaciones_arqueo'::regclass),
 'historial_inmutable',exists(select 1 from pg_trigger where tgrelid='private.rectificaciones_arqueo'::regclass and tgname='conservar_rectificacion' and tgenabled='O'),
 'cierre_protegido',exists(select 1 from pg_trigger where tgrelid='public.arqueos_caja'::regclass and tgname='proteger_cierre_rectificado' and tgenabled='O'),
 'detalle_protegido',exists(select 1 from pg_trigger where tgrelid='public.arqueo_caja_medios_pago'::regclass and tgname='proteger_detalle_cierre' and tgenabled='O'),
 'rpc_con_acceso_anonimo',coalesce((select jsonb_agg(p.proname) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('consultar_rectificacion_arqueo','rectificar_arqueo_cerrado') and has_function_privilege('anon',p.oid,'EXECUTE')),'[]'::jsonb),
 'secuencias_invalidas',coalesce((select jsonb_agg(to_jsonb(s)) from (select local_id,arqueo_id from private.rectificaciones_arqueo group by local_id,arqueo_id having min(revision)<>1 or max(revision)<>count(*)) s),'[]'::jsonb),
 'cantidad_rectificaciones',(select count(*) from private.rectificaciones_arqueo)
)) as resultado;
