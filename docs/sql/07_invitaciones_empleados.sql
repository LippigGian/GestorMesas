-- Después de 05. Ejecutar completo como postgres. No envía correos.
begin;
set local lock_timeout='10s';
select pg_advisory_xact_lock(hashtext('gestormesas_invitaciones_v1'));
do $$ begin
  if to_regprocedure('private.tiene_permiso(text)') is null then raise exception 'Falta instalar permisos (05).'; end if;
  if to_regclass('private.invitaciones_empleados') is not null then raise exception 'Las invitaciones ya están instaladas.'; end if;
end $$;
alter table public.usuarios_locales add column requiere_password boolean not null default false;
create table private.invitaciones_empleados(
  id uuid primary key default gen_random_uuid(),solicitud_id uuid unique not null,
  actor_id uuid not null references auth.users(id),local_id uuid not null references public.locales(id),
  rol_id uuid not null,nombre text not null,email text not null,
  estado text not null default 'preparada' check(estado in ('preparada','creada','enviada','fallida')),
  user_id uuid references auth.users(id),created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '10 minutes',
  foreign key(local_id,rol_id) references public.roles_usuarios(local_id,id)
);
create unique index invitaciones_email_pendiente on private.invitaciones_empleados(email) where estado='preparada';
alter table private.invitaciones_empleados enable row level security;
alter table private.invitaciones_empleados force row level security;
revoke all on private.invitaciones_empleados from public,anon,authenticated,service_role;

create function private.autorizar_invitacion(p_actor uuid,p_rol uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u public.usuarios_locales%rowtype; r public.roles_usuarios%rowtype; a public.roles_usuarios%rowtype;
begin
  select * into u from public.usuarios_locales where user_id=p_actor and activo and not requiere_password;
  if not found or not exists(select 1 from public.locales where id=u.local_id and activo) then
    raise exception using errcode='42501',message='No tenés acceso para invitar empleados.';
  end if;
  select * into r from public.roles_usuarios where id=p_rol and local_id=u.local_id and activo;
  if not found then raise exception using errcode='42501',message='Seleccioná un rol activo de tu cafetería.'; end if;
  if u.rol<>'admin' then
    select * into a from public.roles_usuarios where id=u.rol_id and local_id=u.local_id and activo;
    if not found or not a.permisos ? 'gestionar_usuarios' or not r.permisos <@ a.permisos then
      raise exception using errcode='42501',message='No podés conceder permisos superiores a los tuyos.';
    end if;
  end if;
  return u.local_id;
end $$;
revoke all on function private.autorizar_invitacion(uuid,uuid) from public,anon,authenticated;

-- Solo la Edge Function con service_role puede reservar o confirmar el envío.
-- p_actor_id SIEMPRE se obtiene de auth.getUser(jwt), nunca del cuerpo HTTP.
create function public.preparar_invitacion_empleado(p_actor_id uuid,p_rol_id uuid,p_nombre text,p_email text,p_solicitud_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare l uuid; i private.invitaciones_empleados%rowtype; correo text:=lower(btrim(p_email)); nombre text:=btrim(p_nombre);
begin
  l:=private.autorizar_invitacion(p_actor_id,p_rol_id);
  if correo is null or length(correo)>254 or correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nombre is null or length(nombre)<1 or length(nombre)>100 or p_solicitud_id is null then raise exception 'Revisá nombre, email y rol.'; end if;
  perform pg_advisory_xact_lock(hashtext(correo));
  select * into i from private.invitaciones_empleados where solicitud_id=p_solicitud_id for update;
  if found then
    if i.actor_id<>p_actor_id or i.local_id<>l or i.email<>correo or i.rol_id<>p_rol_id or i.nombre<>nombre then raise exception 'La solicitud no coincide con la invitación anterior.'; end if;
    if i.user_id is not null and i.estado in ('creada','enviada') then return jsonb_build_object('completada',true); end if;
    if i.estado='preparada' and i.expires_at>now() then raise exception 'La invitación se está procesando. Actualizá el listado antes de volver a intentar.'; end if;
    delete from private.invitaciones_empleados where id=i.id and user_id is null;
  end if;
  if exists(select 1 from auth.users where lower(email)=correo) then
    raise exception 'Ese correo ya tiene una cuenta. No se trasladan cuentas entre cafeterías; usá otro correo.';
  end if;
  update private.invitaciones_empleados set estado='fallida' where email=correo and estado='preparada' and expires_at<=now() and user_id is null;
  if exists(select 1 from private.invitaciones_empleados where email=correo and estado='preparada') then raise exception 'Ya se está procesando una invitación para ese correo.'; end if;
  insert into private.invitaciones_empleados(solicitud_id,actor_id,local_id,rol_id,nombre,email)
    values(p_solicitud_id,p_actor_id,l,p_rol_id,nombre,correo) returning * into i;
  return jsonb_build_object('completada',false,'invitacion_id',i.id);
end $$;
create function public.confirmar_invitacion_empleado(p_solicitud_id uuid,p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$ begin
  update private.invitaciones_empleados set estado='enviada'
    where solicitud_id=p_solicitud_id and user_id=p_user_id and estado in ('creada','enviada');
  if not found then raise exception 'No se pudo verificar la asociación del empleado. Actualizá el listado.'; end if;
end $$;
create function public.fallar_invitacion_empleado(p_solicitud_id uuid) returns void
language sql security definer set search_path='' as $$
  update private.invitaciones_empleados set estado='fallida' where solicitud_id=p_solicitud_id and user_id is null;
$$;
revoke all on function public.preparar_invitacion_empleado(uuid,uuid,text,text,uuid),public.confirmar_invitacion_empleado(uuid,uuid),public.fallar_invitacion_empleado(uuid) from public,anon,authenticated;
grant execute on function public.preparar_invitacion_empleado(uuid,uuid,text,text,uuid),public.confirmar_invitacion_empleado(uuid,uuid),public.fallar_invitacion_empleado(uuid) to service_role;

create or replace function private.crear_cafeteria_al_registrar() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_nombre text:=btrim(new.raw_user_meta_data->>'nombre_local'); l uuid; i private.invitaciones_empleados%rowtype;
begin
  if new.raw_user_meta_data ? 'empleado_invitacion_id' then
    -- El metadato solo identifica una reserva privada; local, rol y autoridad
    -- se comprueban de nuevo en la base y no provienen del cliente.
    select * into i from private.invitaciones_empleados
      where id=(new.raw_user_meta_data->>'empleado_invitacion_id')::uuid
      and email=lower(new.email) and estado='preparada' and expires_at>now() for update;
    if not found then raise exception 'La reserva de invitación no es válida o venció.'; end if;
    l:=private.autorizar_invitacion(i.actor_id,i.rol_id);
    if l<>i.local_id then raise exception 'La cafetería de la invitación ya no coincide.'; end if;
    insert into public.usuarios_locales(user_id,local_id,email,nombre,rol,rol_id,activo,requiere_password)
      values(new.id,l,new.email,i.nombre,'empleado',i.rol_id,true,true);
    update private.invitaciones_empleados set user_id=new.id,estado='creada' where id=i.id;
    return new;
  end if;
  if v_nombre is null then return new; end if;
  if length(v_nombre)<1 or length(v_nombre)>100 then raise exception 'El nombre del negocio debe tener entre 1 y 100 caracteres.'; end if;
  insert into public.locales(nombre,activo) values(v_nombre,true) returning id into l;
  insert into public.usuarios_locales(user_id,local_id,email,nombre,rol,activo) values(new.id,l,new.email,new.email,'admin',true);
  insert into public.cajas(local_id,nombre,activo) values(l,'Caja principal',true);
  insert into public.medios_pago(local_id,nombre,activo) values(l,'Efectivo',true);
  return new;
end $$;

create or replace function private.mi_local() returns uuid language sql stable security definer set search_path='' as $$
  select u.local_id from public.usuarios_locales u join public.locales l on l.id=u.local_id
  left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
  where u.user_id=(select auth.uid()) and u.activo and not u.requiere_password and l.activo and (u.rol='admin' or r.activo);
$$;
create or replace function private.tiene_permiso(p_codigo text) returns boolean language sql stable security definer set search_path='' as $$
  select p_codigo=any(private.catalogo_permisos()) and exists(select 1 from public.usuarios_locales u join public.locales l on l.id=u.local_id
  left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
  where u.user_id=(select auth.uid()) and u.activo and not u.requiere_password and l.activo and (u.rol='admin' or (r.activo and r.permisos ? p_codigo)));
$$;

create function public.estado_invitacion() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('pendiente',u.requiere_password,'nombre',u.nombre,'email',u.email,
    'password_establecida',exists(select 1 from auth.users a where a.id=u.user_id and coalesce(a.encrypted_password,'')<>''))
  from public.usuarios_locales u join public.locales l on l.id=u.local_id
  join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id
  where u.user_id=(select auth.uid()) and u.activo and l.activo and r.activo;
$$;
create function public.finalizar_invitacion() returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from auth.users where id=(select auth.uid()) and coalesce(encrypted_password,'')<>'') then raise exception 'Primero establecé tu contraseña.'; end if;
  update public.usuarios_locales u set requiere_password=false,updated_at=now()
    where u.user_id=(select auth.uid()) and u.activo and u.requiere_password
    and exists(select 1 from public.locales where id=u.local_id and activo)
    and exists(select 1 from public.roles_usuarios where id=u.rol_id and local_id=u.local_id and activo);
  if not found then raise exception 'No hay una invitación pendiente y activa para tu cuenta.'; end if;
end $$;
create function public.listar_empleados() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; begin
  if not private.tiene_permiso('gestionar_usuarios') then raise exception using errcode='42501',message='No podés administrar usuarios.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'user_id',u.user_id,'nombre',coalesce(u.nombre,u.email),'email',u.email,
    'rol_id',u.rol_id,'rol_nombre',case when u.rol='admin' then 'Administrador' else r.nombre end,
    'administrador',u.rol='admin','activo',u.activo,'pendiente',u.requiere_password,
    'editable',u.rol<>'admin' and u.user_id<>auth.uid() and (private.soy_admin() or not exists(
      select 1 from jsonb_array_elements_text(coalesce(r.permisos,'[]')) p where not private.tiene_permiso(p)))
  ) order by u.nombre,u.email),'[]') into resultado from public.usuarios_locales u
  left join public.roles_usuarios r on r.id=u.rol_id and r.local_id=u.local_id where u.local_id=private.mi_local();
  return resultado;
end $$;
create function public.actualizar_empleado(p_usuario_id uuid,p_nombre text,p_rol_id uuid,p_activo boolean) returns void
language plpgsql security definer set search_path='' as $$ begin
  if p_nombre is null or length(btrim(p_nombre))<1 or length(btrim(p_nombre))>100 then raise exception 'Revisá el nombre del empleado.'; end if;
  perform public.asignar_rol_empleado(p_usuario_id,p_rol_id,p_activo);
  update public.usuarios_locales set nombre=btrim(p_nombre),updated_at=now() where user_id=p_usuario_id and local_id=private.mi_local();
end $$;
revoke all on function public.estado_invitacion(),public.finalizar_invitacion(),public.listar_empleados(),public.actualizar_empleado(uuid,text,uuid,boolean) from public,anon;
grant execute on function public.estado_invitacion(),public.finalizar_invitacion(),public.listar_empleados(),public.actualizar_empleado(uuid,text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
