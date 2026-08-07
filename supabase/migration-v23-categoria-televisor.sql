-- Agrega la categoria Televisor al catalogo administrable de equipos.
-- Es idempotente: si ya existe, no crea duplicados.

insert into public.laboratory_catalogs (organization_id, catalog_type, name, description)
select distinct organization_id, 'categoria_equipo', 'Televisor', ''
from public.laboratory_catalogs
where catalog_type = 'categoria_equipo'
on conflict (organization_id, catalog_type, name) do nothing;
