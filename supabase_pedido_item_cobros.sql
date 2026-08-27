create table if not exists public.pedido_item_cobros (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  pedido_item_id uuid not null references public.pedido_items(id) on delete cascade,
  cantidad integer not null check (cantidad > 0),
  monto numeric(12, 2) not null check (monto > 0),
  created_at timestamptz not null default now()
);

create index if not exists pedido_item_cobros_pedido_id_idx
on public.pedido_item_cobros (pedido_id);

create index if not exists pedido_item_cobros_pedido_item_id_idx
on public.pedido_item_cobros (pedido_item_id);

alter table public.pedido_item_cobros enable row level security;

drop policy if exists pedido_item_cobros_select_all on public.pedido_item_cobros;
create policy pedido_item_cobros_select_all
on public.pedido_item_cobros
for select
using (true);

drop policy if exists pedido_item_cobros_insert_all on public.pedido_item_cobros;
create policy pedido_item_cobros_insert_all
on public.pedido_item_cobros
for insert
with check (true);

drop policy if exists pedido_item_cobros_update_all on public.pedido_item_cobros;
create policy pedido_item_cobros_update_all
on public.pedido_item_cobros
for update
using (true)
with check (true);
