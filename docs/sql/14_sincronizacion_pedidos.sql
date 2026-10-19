-- Ejecutar completo. Avisos privados sin productos, clientes, pagos ni importes.
-- Los clientes vuelven a consultar los datos con sus permisos normales.
begin;

-- Fallar antes de instalar triggers si el proyecto no soporta Broadcast privado.
do $$ begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then
    raise exception 'Este proyecto no tiene habilitado realtime.send para emitir avisos.';
  end if;
  if not (select relrowsecurity from pg_class where oid='realtime.messages'::regclass) then
    raise exception 'La tabla realtime.messages debe tener RLS habilitado.';
  end if;
end $$;

-- Permiso de lectura del canal correspondiente al local activo del usuario.
drop policy if exists pedidos_recibir_mi_local on realtime.messages;
create policy pedidos_recibir_mi_local on realtime.messages
  for select to authenticated using (
    extension='broadcast'
    and topic='pedidos:' || (select private.mi_local())::text
    and (select realtime.topic())=topic
  );
-- Una política permisiva preexistente nunca debe habilitar otros locales.
-- Los canales ajenos al prefijo pedidos: mantienen sus propias políticas.
drop policy if exists pedidos_guardia_local on realtime.messages;
create policy pedidos_guardia_local on realtime.messages as restrictive
  for select to authenticated using (
    topic not like 'pedidos:%' or (
      topic='pedidos:' || (select private.mi_local())::text
      and (select realtime.topic())=topic
    )
  );
-- Solo los triggers del servidor emiten estos avisos, no los dispositivos.
drop policy if exists pedidos_avisos_solo_servidor on realtime.messages;
create policy pedidos_avisos_solo_servidor on realtime.messages as restrictive
  for insert to authenticated with check (topic not like 'pedidos:%');

create or replace function private.avisar_cambio_pedidos()
returns trigger language plpgsql security definer set search_path='' as $$
declare l uuid;
begin
  l := case when tg_op='DELETE' then old.local_id else new.local_id end;
  if l is not null then
    perform realtime.send('{}'::jsonb,'pedidos_actualizados','pedidos:' || l::text,true);
  end if;
  return null;
end $$;
revoke all on function private.avisar_cambio_pedidos() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['mesas','pedidos','pedido_items','pedido_pagos','pedido_item_cobros'] loop
    execute format('drop trigger if exists avisar_sincronizacion_pedidos on public.%I',t);
    execute format('create trigger avisar_sincronizacion_pedidos after insert or update or delete on public.%I for each row execute function private.avisar_cambio_pedidos()',t);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;

-- Los cinco valores booleanos deben ser true y cantidad_triggers debe ser 5.
select jsonb_build_object(
  'rls_activo',(select relrowsecurity from pg_class where oid='realtime.messages'::regclass),
  'lectura_local_instalada',exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='pedidos_recibir_mi_local'),
  'guardia_restrictiva_instalada',exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='pedidos_guardia_local' and permissive='RESTRICTIVE'),
  'avisos_solo_servidor',exists(select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='pedidos_avisos_solo_servidor' and permissive='RESTRICTIVE'),
  'funcion_privada',not has_function_privilege('anon','private.avisar_cambio_pedidos()','EXECUTE') and not has_function_privilege('authenticated','private.avisar_cambio_pedidos()','EXECUTE'),
  'cantidad_triggers',(select count(*) from pg_trigger where tgname='avisar_sincronizacion_pedidos' and not tgisinternal)
) as verificacion;
