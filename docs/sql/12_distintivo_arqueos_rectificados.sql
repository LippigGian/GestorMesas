-- Ejecutar una vez después de 10. Solo expone cantidades, no el contenido de la auditoría.
begin;
do $$ begin
 if to_regclass('private.rectificaciones_arqueo') is null then raise exception 'Falta instalar la migración de rectificaciones (10).'; end if;
end $$;
create function public.resumen_rectificaciones_arqueos(p_arqueos_ids uuid[])
returns table(arqueo_id uuid,cantidad integer)
language plpgsql stable security definer set search_path='' as $$
declare l uuid:=private.mi_local();
begin
 if l is null or not private.tiene_permiso('ver_saldos_arqueo') then
  raise exception using errcode='42501',message='No tenés permiso para consultar el historial de arqueos.';
 end if;
 if p_arqueos_ids is null or cardinality(p_arqueos_ids)>1000 then raise exception 'Lista de arqueos inválida.'; end if;
 return query select r.arqueo_id,count(*)::integer
 from private.rectificaciones_arqueo r join public.arqueos_caja a on a.id=r.arqueo_id and a.local_id=r.local_id
 where r.local_id=l and r.arqueo_id=any(p_arqueos_ids)
 group by r.arqueo_id;
end $$;
revoke all on function public.resumen_rectificaciones_arqueos(uuid[]) from public,anon;
grant execute on function public.resumen_rectificaciones_arqueos(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;

select jsonb_build_object(
 'distintivo_instalado',to_regprocedure('public.resumen_rectificaciones_arqueos(uuid[])') is not null,
 'sin_acceso_anonimo',not has_function_privilege('anon','public.resumen_rectificaciones_arqueos(uuid[])','EXECUTE')
) as verificacion;
