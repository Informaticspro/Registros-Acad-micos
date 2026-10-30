-- El registro documenta longitudes de cables ya reemplazados, no una avería pendiente.
-- Se conserva el contenido original y se deja constancia de la corrección.
begin;
with closed as (
  update public.laboratory_logs
  set status = 'cerrado', description = description || E'\n\nCorrección v34: medición de longitudes finalizada. Los cables de reemplazo están operativos; este registro no representa una reparación pendiente.'
  where id = '3b83c66a-0101-4102-8941-89d6d9a2f528'
    and organization_id = '5cfef193-6c1c-47e6-9a9c-7f9f6ab09fe5'
    and status = 'en_proceso' and work_type = 'Diagnostico'
    and description like 'Longitud de cables:%'
  returning equipment_id, organization_id
), corrected as (
  update public.laboratory_equipment e set status = 'operativo', updated_at = now()
  from closed c where e.id = c.equipment_id and e.organization_id = c.organization_id
    and e.status = 'en_reparacion' and e.updated_at = '2026-10-30T23:25:20.708Z'::timestamptz
  returning e.*
)
insert into public.laboratory_logs(organization_id,equipment_id,work_type,title,description,responsible,priority,status,entry_type,source_equipment,target_equipment,location)
select organization_id,id,'Corrección de estado','Cierre de medición de cables HDMI',
  'Se cierra el diagnóstico de longitudes y se restaura Operativo. El diagnóstico antiguo había vuelto a marcar el cable En reparación. No se registra una nueva instalación.',
  'Corrección autorizada por propietario','media','cerrado','mantenimiento','Corrección de estado v34',code || ' - ' || name,location
from corrected;
commit;
