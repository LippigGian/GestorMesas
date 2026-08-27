-- Solucion temporal para branches sin login/multi-local.
-- Usamos un local fijo hasta implementar seleccion real de local por usuario.

alter table public.mesas
alter column local_id set default '00000000-0000-0000-0000-000000000001'::uuid;

update public.mesas
set local_id = '00000000-0000-0000-0000-000000000001'::uuid
where local_id is null;
