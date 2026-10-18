-- Ejecutar una vez en el SQL Editor del proyecto Supabase.
-- Conserva el pedido y sus relaciones; ambas actualizaciones son atómicas.
-- SECURITY INVOKER respeta las políticas RLS del usuario que llama.
create or replace function public.mover_pedido_mostrador_a_mesa(
  p_pedido_id uuid,
  p_mesa_id uuid,
  p_personas integer
)
returns setof public.pedidos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mesa public.mesas%rowtype;
  v_pedido public.pedidos%rowtype;
begin
  if p_personas is null or p_personas < 1 then
    raise exception 'Ingresá una cantidad entera de personas mayor a cero.';
  end if;

  select * into v_mesa from public.mesas where id = p_mesa_id for update;
  if not found then
    raise exception 'La mesa no existe o no tenés acceso.';
  end if;
  if v_mesa.estado is distinct from 'libre' then
    raise exception 'La mesa ya no está libre. Seleccioná otra mesa.';
  end if;

  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe o no tenés acceso.';
  end if;
  if v_pedido.estado is distinct from 'abierto' or v_pedido.tipo is distinct from 'mostrador' then
    raise exception 'Solo se pueden mover pedidos abiertos de mostrador.';
  end if;
  if exists (select 1 from public.pedidos where mesa_id = p_mesa_id and estado = 'abierto') then
    raise exception 'La mesa ya tiene un pedido abierto. Seleccioná otra mesa.';
  end if;

  update public.mesas
  set estado = 'ocupada', personas = p_personas, updated_at = now()
  where id = p_mesa_id;
  if not found then
    raise exception 'No tenés permiso para actualizar la mesa.';
  end if;

  return query update public.pedidos
  set tipo = 'mesa', mesa_id = p_mesa_id, personas = p_personas, updated_at = now()
  where id = p_pedido_id
  returning *;
  if not found then
    raise exception 'No tenés permiso para actualizar el pedido.';
  end if;
end;
$$;
