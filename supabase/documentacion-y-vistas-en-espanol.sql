-- =============================================================================
-- Documentacion y vistas en espanol para entender la base de datos
-- Seguro de ejecutar: NO renombra tablas reales y NO borra datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Comentarios de tablas
-- -----------------------------------------------------------------------------
comment on table public.organizations is 'Organizaciones o instituciones academicas que administran eventos.';
comment on table public.profiles is 'Perfiles de usuarios del sistema vinculados a Supabase Auth.';
comment on table public.events is 'Eventos academicos: seminarios, congresos, talleres, capacitaciones y eventos universitarios.';
comment on table public.participants is 'Participantes registrados en eventos.';
comment on table public.registrations is 'Inscripciones: relacion entre un participante y un evento, con QR y codigo de certificado.';
comment on table public.attendance_records is 'Asistencia principal registrada al momento de inscripcion/check-in.';
comment on table public.certificate_issues is 'Certificados emitidos para participantes.';

-- Esta tabla existe si ejecutaste migration-v2-attendance-export-admin.sql.
comment on table public.attendance_daily_logs is 'Marcajes diarios de asistencia, util para congresos o eventos de varios dias.';

-- -----------------------------------------------------------------------------
-- Comentarios de columnas principales
-- -----------------------------------------------------------------------------
comment on column public.organizations.name is 'Nombre de la organizacion o institucion.';
comment on column public.organizations.slug is 'Identificador corto unico de la organizacion.';

comment on column public.profiles.full_name is 'Nombre completo del usuario.';
comment on column public.profiles.email is 'Correo del usuario.';
comment on column public.profiles.role is 'Rol del usuario: admin, organizador o scanner.';
comment on column public.profiles.organization_id is 'Organizacion a la que pertenece el usuario.';

comment on column public.events.title is 'Titulo del evento.';
comment on column public.events.event_type is 'Tipo de evento: seminario, congreso, taller, capacitacion o universitario.';
comment on column public.events.description is 'Descripcion del evento.';
comment on column public.events.location is 'Lugar del evento.';
comment on column public.events.starts_at is 'Fecha/hora de inicio, opcional.';
comment on column public.events.ends_at is 'Fecha/hora de cierre, opcional.';
comment on column public.events.capacity is 'Capacidad maxima.';
comment on column public.events.status is 'Estado: draft, published, active, closed o archived.';
comment on column public.events.organizer_id is 'Usuario organizador responsable.';

comment on column public.participants.first_name is 'Nombre del participante.';
comment on column public.participants.last_name is 'Apellido del participante.';
comment on column public.participants.document_id is 'Cedula o documento.';
comment on column public.participants.email is 'Correo institucional.';
comment on column public.participants.institution is 'Institucion del participante, si aplica.';
comment on column public.participants.metadata is 'Datos adicionales variables, por ejemplo campos de congreso.';

comment on column public.registrations.event_id is 'Evento al que se inscribio el participante.';
comment on column public.registrations.participant_id is 'Participante inscrito.';
comment on column public.registrations.qr_token is 'Token unico usado para QR personal.';
comment on column public.registrations.certificate_code is 'Codigo unico del certificado.';
comment on column public.registrations.checked_in_at is 'Primera fecha/hora de check-in.';

comment on column public.attendance_records.registration_id is 'Inscripcion asociada a la asistencia.';
comment on column public.attendance_records.scanned_by is 'Usuario que registro/escaneo la asistencia.';
comment on column public.attendance_records.status is 'Estado de asistencia.';
comment on column public.attendance_records.checked_in_at is 'Fecha/hora del registro de asistencia.';

-- -----------------------------------------------------------------------------
-- Vistas en espanol para consultar desde Supabase sin afectar la app
-- -----------------------------------------------------------------------------

create or replace view public.vista_organizaciones as
select
  id,
  name as nombre,
  slug as identificador,
  created_at as creado_en
from public.organizations;

create or replace view public.vista_usuarios as
select
  p.id,
  p.full_name as nombre_completo,
  p.email as correo,
  p.role as rol,
  o.name as organizacion,
  p.created_at as creado_en
from public.profiles p
left join public.organizations o on o.id = p.organization_id;

create or replace view public.vista_eventos as
select
  e.id,
  e.title as titulo,
  e.event_type as tipo_evento,
  e.description as descripcion,
  e.location as lugar,
  e.starts_at as inicia_en,
  e.ends_at as termina_en,
  e.capacity as capacidad,
  e.status as estado,
  o.name as organizacion,
  p.full_name as organizador,
  e.created_at as creado_en
from public.events e
left join public.organizations o on o.id = e.organization_id
left join public.profiles p on p.id = e.organizer_id;

create or replace view public.vista_participantes as
select
  p.id,
  p.first_name as nombre,
  p.last_name as apellido,
  p.document_id as cedula,
  p.email as correo_institucional,
  p.institution as institucion,
  p.metadata as datos_adicionales,
  p.metadata->>'sex' as sexo,
  p.metadata->>'category' as categoria,
  p.metadata->>'personalEmail' as correo_personal,
  p.metadata->>'nationality' as nacionalidad,
  p.metadata->>'otherNationality' as otra_nacionalidad,
  p.metadata->>'modality' as modalidad,
  p.metadata->>'participationType' as tipo_participacion,
  o.name as organizacion,
  p.created_at as creado_en
from public.participants p
left join public.organizations o on o.id = p.organization_id;

create or replace view public.vista_inscripciones as
select
  r.id,
  e.title as evento,
  e.event_type as tipo_evento,
  p.first_name as nombre,
  p.last_name as apellido,
  p.document_id as cedula,
  p.email as correo_institucional,
  r.qr_token as token_qr,
  r.certificate_code as codigo_certificado,
  r.checked_in_at as primera_asistencia,
  r.created_at as inscrito_en
from public.registrations r
join public.events e on e.id = r.event_id
join public.participants p on p.id = r.participant_id;

create or replace view public.vista_asistencias as
select
  a.id,
  e.title as evento,
  p.first_name as nombre,
  p.last_name as apellido,
  p.document_id as cedula,
  a.status as estado_asistencia,
  a.checked_in_at as registrado_en,
  scanner.full_name as registrado_por,
  a.device_meta as datos_dispositivo
from public.attendance_records a
join public.events e on e.id = a.event_id
join public.registrations r on r.id = a.registration_id
join public.participants p on p.id = r.participant_id
left join public.profiles scanner on scanner.id = a.scanned_by;

create or replace view public.vista_marcajes_diarios as
select
  l.id,
  e.title as evento,
  p.first_name as nombre,
  p.last_name as apellido,
  p.document_id as cedula,
  l.checked_in_at as marcado_en,
  scanner.full_name as registrado_por
from public.attendance_daily_logs l
join public.events e on e.id = l.event_id
join public.registrations r on r.id = l.registration_id
join public.participants p on p.id = r.participant_id
left join public.profiles scanner on scanner.id = l.scanned_by;

-- Permisos de lectura para vistas.
grant select on
  public.vista_organizaciones,
  public.vista_usuarios,
  public.vista_eventos,
  public.vista_participantes,
  public.vista_inscripciones,
  public.vista_asistencias,
  public.vista_marcajes_diarios
to authenticated;

