-- Propuesta futura: formularios dinamicos por evento.
-- No es obligatorio ejecutarlo ahora. Sirve para separar campos de taller, congreso, seminario, etc.

create table if not exists public.formularios_evento (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (event_id)
);

create table if not exists public.campos_formulario_evento (
  id uuid primary key default gen_random_uuid(),
  formulario_id uuid not null references public.formularios_evento(id) on delete cascade,
  clave text not null,
  etiqueta text not null,
  tipo text not null check (tipo in ('texto', 'correo', 'numero', 'seleccion', 'fecha', 'booleano')),
  requerido boolean not null default false,
  orden integer not null default 0,
  opciones jsonb not null default '[]'::jsonb,
  ayuda text,
  creado_en timestamptz not null default now(),
  unique (formulario_id, clave)
);

create table if not exists public.respuestas_formulario_evento (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  campo_id uuid not null references public.campos_formulario_evento(id) on delete cascade,
  valor text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (registration_id, campo_id)
);

create index if not exists formularios_evento_event_idx
  on public.formularios_evento (event_id);

create index if not exists campos_formulario_evento_formulario_idx
  on public.campos_formulario_evento (formulario_id, orden);

create index if not exists respuestas_formulario_evento_registration_idx
  on public.respuestas_formulario_evento (registration_id);

alter table public.formularios_evento enable row level security;
alter table public.campos_formulario_evento enable row level security;
alter table public.respuestas_formulario_evento enable row level security;

-- Ejemplo de opciones para el campo modalidad de un congreso:
-- [
--   {"valor":"estudiante_plan_1","etiqueta":"Estudiante-Plan 1: $20.00 (congreso presencial y virtual, talleres, refrigerios, certificados, otros)"},
--   {"valor":"estudiante_plan_2","etiqueta":"Estudiante-Plan 2: $15.00 (congreso virtual, certificados, otros)"}
-- ]
