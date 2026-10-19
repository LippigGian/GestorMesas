-- Cambia únicamente el nombre del rol. Conserva IDs, permisos y asignaciones.
-- Ejecutar completo en SQL Editor para persistir el nombre en Supabase.
begin;
lock table public.roles_usuarios in share row exclusive mode;
do $$
begin
  if exists (
    select 1 from public.roles_usuarios m
    join public.roles_usuarios c on c.local_id=m.local_id and c.id<>m.id
    where lower(regexp_replace(btrim(m.nombre),'\s+','','g'))='mozo'
      and lower(regexp_replace(btrim(c.nombre),'\s+','','g'))='camarero'
  ) then
    raise exception 'Ya hay roles Mozo y Camarero en la misma cafetería. No se modificó ninguno; revisar sus asignaciones antes de unificarlos.';
  end if;
end $$;
update public.roles_usuarios
set nombre='Camarero',updated_at=now()
where lower(regexp_replace(btrim(nombre),'\s+','','g'))='mozo';
commit;
