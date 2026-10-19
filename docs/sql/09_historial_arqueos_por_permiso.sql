-- Ejecutar completo después de 05 (compatible con 07 ya instalado).
-- Conserva el código ver_saldos_arqueo y los permisos de los roles existentes.
-- Sin ese permiso se expone solo la caja abierta necesaria para operar pedidos/caja.
begin;
create or replace function public.listar_arqueos_operativos()
returns table(id uuid,local_id uuid,caja_id uuid,estado text,opened_at timestamptz,closed_at timestamptz)
language sql stable security definer set search_path='' as $$
  select a.id,a.local_id,a.caja_id,a.estado,a.opened_at,a.closed_at
  from public.arqueos_caja a
  where a.local_id=private.mi_local()
    and (a.estado='abierto' or private.tiene_permiso('ver_saldos_arqueo'))
  order by a.opened_at desc;
$$;
revoke all on function public.listar_arqueos_operativos() from public,anon;
grant execute on function public.listar_arqueos_operativos() to authenticated;
notify pgrst,'reload schema';
commit;
