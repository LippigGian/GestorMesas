-- Ejecutar completo después de las migraciones de aislamiento y permisos (02/05).
-- No modifica arqueos existentes ni mueve ventas/gastos. Requiere administrador.
begin;
set local lock_timeout='10s';
create table private.rectificaciones_arqueo (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null,
  arqueo_id uuid not null,
  revision integer not null check(revision>0),
  actor_id uuid not null,
  actor_nombre text not null,
  actor_email text not null,
  motivo text not null check(length(btrim(motivo)) between 1 and 500),
  anterior jsonb not null,
  posterior jsonb not null,
  created_at timestamptz not null default now(),
  unique(local_id,arqueo_id,revision),
  foreign key(local_id,arqueo_id) references public.arqueos_caja(local_id,id) on delete restrict
);
alter table private.rectificaciones_arqueo enable row level security;
alter table private.rectificaciones_arqueo force row level security;
revoke all on private.rectificaciones_arqueo from public,anon,authenticated,service_role;

create function private.conservar_rectificacion() returns trigger
language plpgsql set search_path='' as $$ begin
  raise exception 'El historial de rectificaciones es inmutable.';
end $$;
create trigger conservar_rectificacion before update or delete on private.rectificaciones_arqueo
for each row execute function private.conservar_rectificacion();
revoke all on function private.conservar_rectificacion() from public,anon,authenticated;

create function private.foto_arqueo_rectificacion(p_id uuid,p_local uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('totalDeclarado',a.monto_final_declarado,'diferencia',a.diferencia,
  'montoInicial',a.monto_inicial,'totalVentas',a.total_ventas,'apertura',a.opened_at,'cierre',a.closed_at,
  'medios',coalesce((select jsonb_agg(jsonb_build_object('medioPagoId',d.medio_pago_id,
    'nombre',coalesce(m.nombre,'Medio no disponible'),'sistema',d.monto_sistema,'declarado',d.monto_declarado,'diferencia',d.diferencia)
    order by d.medio_pago_id)
   from public.arqueo_caja_medios_pago d left join public.medios_pago m on m.id=d.medio_pago_id and m.local_id=d.local_id
   where d.arqueo_caja_id=a.id and d.local_id=a.local_id),'[]'::jsonb))
 from public.arqueos_caja a where a.id=p_id and a.local_id=p_local;
$$;
revoke all on function private.foto_arqueo_rectificacion(uuid,uuid) from public,anon,authenticated,service_role;

create function public.consultar_rectificacion_arqueo(p_arqueo_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare l uuid:=private.mi_local(); a public.arqueos_caja%rowtype;
begin
 if l is null or not private.soy_admin() then raise exception using errcode='42501',message='Solo el administrador puede consultar rectificaciones.'; end if;
 select * into a from public.arqueos_caja where id=p_arqueo_id and local_id=l;
 if not found or a.estado<>'cerrado' then raise exception 'Seleccioná un arqueo cerrado de tu cafetería.'; end if;
 return jsonb_build_object('arqueoId',a.id,
  'revision',coalesce((select max(revision) from private.rectificaciones_arqueo where local_id=l and arqueo_id=a.id),0),
  'actual',private.foto_arqueo_rectificacion(a.id,l),
  'historial',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'revision',r.revision,'fecha',r.created_at,
    'autor',r.actor_nombre,'email',r.actor_email,'motivo',r.motivo,'anterior',r.anterior,'posterior',r.posterior) order by r.revision desc)
    from private.rectificaciones_arqueo r where r.local_id=l and r.arqueo_id=a.id),'[]'::jsonb));
end $$;

create function public.rectificar_arqueo_cerrado(p_arqueo_id uuid,p_declaraciones jsonb,p_motivo text,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 l uuid:=private.mi_local(); a public.arqueos_caja%rowtype; x jsonb; medio uuid; importe numeric;
 ids uuid[]:=array[]::uuid[]; revision_actual integer; foto_anterior jsonb; foto_posterior jsonb;
 total_declarado numeric:=0; total_sistema numeric; hubo_cambios boolean:=false;
 responsable public.usuarios_locales%rowtype; motivo text:=btrim(p_motivo);
begin
 if l is null or not private.soy_admin() then raise exception using errcode='42501',message='Solo el administrador puede rectificar un arqueo.'; end if;
 if motivo is null or length(motivo) not between 1 and 500 then raise exception 'Ingresá un motivo de entre 1 y 500 caracteres.'; end if;
 if p_revision is null or p_revision<0 then raise exception 'Actualizá el arqueo antes de rectificar.'; end if;
 perform pg_advisory_xact_lock(hashtext(l::text));
 select * into a from public.arqueos_caja where id=p_arqueo_id and local_id=l for update;
 if not found or a.estado<>'cerrado' then raise exception 'Solo se puede rectificar un arqueo cerrado de tu cafetería.'; end if;
 select coalesce(max(revision),0) into revision_actual from private.rectificaciones_arqueo where local_id=l and arqueo_id=a.id;
 if p_revision<>revision_actual then raise exception using errcode='40001',message='Otro administrador rectificó este arqueo. Actualizá los valores antes de continuar.'; end if;
 perform 1 from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id and local_id=l order by id for update;
 if p_declaraciones is null or jsonb_typeof(p_declaraciones)<>'array' or jsonb_array_length(p_declaraciones)=0 then raise exception 'El arqueo debe tener importes declarados para rectificar.'; end if;
 foto_anterior:=private.foto_arqueo_rectificacion(a.id,l);
 for x in select value from jsonb_array_elements(p_declaraciones) loop
   if jsonb_typeof(x)<>'object' or jsonb_typeof(x->'montoDeclarado') is distinct from 'number' then raise exception 'Los importes declarados deben ser números válidos.'; end if;
   medio:=(x->>'medioPagoId')::uuid; importe:=(x->>'montoDeclarado')::numeric;
   if medio is null or medio=any(ids) or importe is null or importe<0 or importe<>round(importe,2) or importe::text in ('NaN','Infinity','-Infinity') then raise exception 'Hay medios repetidos o importes inválidos. Usá hasta dos decimales.'; end if;
   if not exists(select 1 from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id and local_id=l and medio_pago_id=medio) then raise exception 'No se pueden agregar medios ni modificar medios de otro arqueo.'; end if;
   hubo_cambios:=hubo_cambios or exists(select 1 from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id and local_id=l and medio_pago_id=medio and monto_declarado<>importe);
   update public.arqueo_caja_medios_pago set monto_declarado=importe,diferencia=importe-monto_sistema,updated_at=now()
    where arqueo_caja_id=a.id and local_id=l and medio_pago_id=medio;
   ids:=array_append(ids,medio);total_declarado:=total_declarado+importe;
 end loop;
 if exists(select 1 from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id and local_id=l and not medio_pago_id=any(ids)) then raise exception 'Faltan declaraciones de medios del cierre original.'; end if;
 if not hubo_cambios then raise exception 'No hay cambios en los importes declarados.'; end if;
 select coalesce(sum(monto_sistema),0) into total_sistema from public.arqueo_caja_medios_pago where arqueo_caja_id=a.id and local_id=l;
 update public.arqueos_caja set monto_final_declarado=total_declarado,diferencia=total_declarado-total_sistema,updated_at=now() where id=a.id;
 foto_posterior:=private.foto_arqueo_rectificacion(a.id,l);
 select * into responsable from public.usuarios_locales where user_id=(select auth.uid()) and local_id=l;
 insert into private.rectificaciones_arqueo(local_id,arqueo_id,revision,actor_id,actor_nombre,actor_email,motivo,anterior,posterior)
 values(l,a.id,revision_actual+1,auth.uid(),coalesce(nullif(responsable.nombre,''),responsable.email,'Administrador'),coalesce(responsable.email,''),motivo,foto_anterior,foto_posterior);
 return public.consultar_rectificacion_arqueo(a.id);
end $$;

-- Impedir que el cliente omita la rectificación mediante UPDATE directo.
-- Las funciones SQL autorizadas se ejecutan como su propietario.
create function private.proteger_cierre_rectificado() returns trigger
language plpgsql set search_path='' as $$ begin
 if current_user in ('postgres','supabase_admin','service_role') then return new; end if;
 if old.estado='cerrado' and row(new.estado,new.monto_inicial,new.opened_at,new.closed_at,new.monto_final_declarado,new.diferencia)
   is distinct from row(old.estado,old.monto_inicial,old.opened_at,old.closed_at,old.monto_final_declarado,old.diferencia) then
   raise exception using errcode='42501',message='Para corregir un cierre usá Rectificar importes. El cierre original debe conservarse en el historial.';
 end if;
 return new;
end $$;
create trigger proteger_cierre_rectificado before update on public.arqueos_caja
for each row execute function private.proteger_cierre_rectificado();
revoke all on function private.proteger_cierre_rectificado() from public,anon,authenticated;
create function private.proteger_detalle_cierre() returns trigger
language plpgsql set search_path='' as $$
declare arqueo uuid;
begin
 if current_user in ('postgres','supabase_admin','service_role') then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op<>'INSERT' and exists(select 1 from public.arqueos_caja where id=old.arqueo_caja_id and estado='cerrado') then
  raise exception using errcode='42501',message='El detalle cerrado solo puede cambiar mediante una rectificación auditada.';
 end if;
 if tg_op<>'DELETE' and exists(select 1 from public.arqueos_caja where id=new.arqueo_caja_id and estado='cerrado') then
  raise exception using errcode='42501',message='El detalle cerrado solo puede cambiar mediante una rectificación auditada.';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger proteger_detalle_cierre before insert or update or delete on public.arqueo_caja_medios_pago
for each row execute function private.proteger_detalle_cierre();
revoke all on function private.proteger_detalle_cierre() from public,anon,authenticated;
revoke all on function public.consultar_rectificacion_arqueo(uuid),public.rectificar_arqueo_cerrado(uuid,jsonb,text,integer) from public,anon;
grant execute on function public.consultar_rectificacion_arqueo(uuid),public.rectificar_arqueo_cerrado(uuid,jsonb,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
