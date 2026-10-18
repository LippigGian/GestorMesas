-- Ejecutar una vez en el SQL Editor. Conserva productos, importes y pagos.
create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns setof public.pedidos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pedido public.pedidos%rowtype;
begin
  select * into v_pedido from public.pedidos where id = p_pedido_id for update;
  if not found then
    raise exception 'El pedido no existe o no tenés acceso.';
  end if;
  if v_pedido.estado is distinct from 'abierto' then
    raise exception 'Solo se pueden cancelar pedidos en curso.';
  end if;

  if v_pedido.mesa_id is not null then
    perform 1 from public.mesas where id = v_pedido.mesa_id for update;
    if not found then
      raise exception 'No se puede acceder a la mesa del pedido.';
    end if;
    if exists (select 1 from public.pedidos where mesa_id = v_pedido.mesa_id and estado = 'abierto' and id <> p_pedido_id) then
      raise exception 'La mesa tiene otro pedido abierto. Revisá sus pedidos antes de cancelar.';
    end if;
    update public.mesas set estado = 'libre', personas = 0, updated_at = now()
    where id = v_pedido.mesa_id;
    if not found then
      raise exception 'No tenés permiso para liberar la mesa.';
    end if;
  end if;

  return query update public.pedidos
  set estado = 'cancelado', closed_at = now(), updated_at = now()
  where id = p_pedido_id returning *;
  if not found then
    raise exception 'No tenés permiso para cancelar el pedido.';
  end if;
end;
$$;
