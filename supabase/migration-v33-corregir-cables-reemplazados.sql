-- Corrección autorizada: el propietario confirma que los nueve cables de reemplazo funcionan.
-- No registra una nueva instalación ni elimina los trabajos anteriores.
begin;
with corrected as (
 update public.laboratory_equipment set status='operativo',updated_at=now()
 where organization_id='5cfef193-6c1c-47e6-9a9c-7f9f6ab09fe5'
 and id in (
 '6343822b-6428-4e91-beb7-c269d4af0cd0','895c50af-0f82-4dbe-9a78-19904cc613d9',
 '2d3911d0-e2d3-4e11-bc98-1d6d7e9709b5','e023304e-d7fc-451f-9fa5-b572b3113fad',
 '2d70f158-36f7-4e60-ae69-42931db77974','83e35859-4b01-43bf-9b56-6916ccbd2adf',
 '85de1587-6390-4653-a635-a077b8bc4630','f7a30e95-b107-4428-a601-b8006a060678',
 'c5e68595-1ed0-40e4-9696-280b80f1cf4c')
 and status='en_reparacion' and updated_at < '2026-10-09T00:00:00Z'::timestamptz
 returning *
)
insert into public.laboratory_logs(organization_id,equipment_id,work_date,work_type,title,description,responsible,priority,status,entry_type,source_equipment,target_equipment,location)
select organization_id,id,now(),'Corrección de estado','Corrección de inventario: cable de reemplazo operativo',
 'El propietario confirma que el cable fue reemplazado y funciona correctamente. Se corrige el estado previo en reparación; no corresponde a una nueva instalación. Auditoria de inventario: En reparacion -> Operativo.',
 'Corrección autorizada por propietario','media','cerrado','mantenimiento','Corrección de estado v33',code||' - '||name,location
from corrected;
commit;
