-- Ejecutar completo en el SQL Editor después de 05_permisos_empleados.sql.
-- Devuelve únicamente saldos del local y exige Ver arqueos y saldos.
-- Usa el mismo criterio del cierre: cobros menos gastos, sin fondo inicial.
begin;

create or replace function public.saldo_sistema_arqueo(p_arqueo_id uuid)
returns table(medio_pago_id uuid, medio_pago_nombre text, monto_sistema numeric)
language plpgsql stable security definer set search_path='' as $$
declare
  l uuid := private.mi_local();
  estado_arqueo text;
begin
  if not coalesce(private.tiene_permiso('ver_saldos_arqueo'), false) then
    raise exception using errcode='42501', message='No tenés permiso para ver saldos de arqueo.';
  end if;
  select a.estado into estado_arqueo
  from public.arqueos_caja a where a.id=p_arqueo_id and a.local_id=l;
  if not found then
    raise exception using errcode='42501', message='El arqueo no existe o no tenés acceso.';
  end if;

  if estado_arqueo='cerrado' then
    return query
      select d.medio_pago_id, coalesce(m.nombre,'Medio no disponible')::text, d.monto_sistema::numeric
      from public.arqueo_caja_medios_pago d
      left join public.medios_pago m on m.id=d.medio_pago_id and m.local_id=l
      where d.arqueo_caja_id=p_arqueo_id and d.local_id=l
      order by 2;
  else
    return query
      with movimientos as (
        select p.medio_pago_id, p.monto::numeric as importe
        from public.pedido_pagos p where p.arqueo_caja_id=p_arqueo_id and p.local_id=l
        union all
        select g.medio_pago_id, -g.importe::numeric
        from public.gastos g where g.arqueo_caja_id=p_arqueo_id and g.local_id=l
      )
      select m.id, m.nombre::text, coalesce(sum(v.importe),0)::numeric
      from public.medios_pago m
      left join movimientos v on v.medio_pago_id=m.id
      where m.local_id=l
      group by m.id,m.nombre
      order by m.nombre;
  end if;
end $$;

revoke all on function public.saldo_sistema_arqueo(uuid) from public, anon;
grant execute on function public.saldo_sistema_arqueo(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

-- Verificación: los tres valores deben ser true.
select jsonb_build_object(
  'consulta_instalada', to_regprocedure('public.saldo_sistema_arqueo(uuid)') is not null,
  'sin_acceso_anonimo', not has_function_privilege('anon','public.saldo_sistema_arqueo(uuid)','EXECUTE'),
  'disponible_para_autenticados', has_function_privilege('authenticated','public.saldo_sistema_arqueo(uuid)','EXECUTE')
) as verificacion;
