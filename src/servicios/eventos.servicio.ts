import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';
import { mockEvents } from '@/datos/datosPrueba';
import { EventoAcademico, FormularioPersonalizado } from '@/tipos/dominio';
import { getEstadoEventoPorFecha, isRegistroPermanenteEvento, normalizeEventStatusForSave } from '@/utilidades/estado-evento';

export type SaveEventInput = {
  title: string;
  eventType: EventoAcademico['eventType'];
  registrationFormType?: EventoAcademico['registrationFormType'];
  customFormSchema?: FormularioPersonalizado | null;
  isPermanent?: boolean;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  status: EventoAcademico['status'];
  organizerId: string;
  organizationId: string | null;
};

export type UpdateEventInput = Omit<SaveEventInput, 'organizerId' | 'organizationId'> & {
  id: string;
};

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  description: string;
  location: string;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number;
  status: string;
  organizer_id: string;
  registration_form_type?: string | null;
  custom_form_schema?: FormularioPersonalizado | null;
  is_permanent?: boolean | null;
};

const mapEvent = (row: EventRow): EventoAcademico => {
  const event = {
    id: row.id,
    title: row.title,
    eventType: row.event_type as EventoAcademico['eventType'],
    registrationFormType: (row.registration_form_type ?? null) as EventoAcademico['registrationFormType'],
    customFormSchema: row.custom_form_schema ?? null,
    isPermanent: Boolean(row.is_permanent),
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    status: row.status as EventoAcademico['status'],
    organizerId: row.organizer_id,
  };

  return {
    ...event,
    isPermanent: isRegistroPermanenteEvento(event),
    status: getEstadoEventoPorFecha(event),
  };
};

const eventColumnsBase =
  'id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id' as const;
const eventColumns =
  'id,title,event_type,registration_form_type,custom_form_schema,is_permanent,description,location,starts_at,ends_at,capacity,status,organizer_id' as const;

function isMissingOptionalEventColumn(error: { message?: string; code?: string }) {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    message.includes('registration_form_type') ||
    message.includes('custom_form_schema') ||
    message.includes('is_permanent')
  );
}

async function syncEventLifecycleStatuses() {
  if (!supabase) return;

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from('events')
      .update({ status: 'closed', updated_at: now })
      .lt('ends_at', now)
      .not('ends_at', 'is', null)
      .eq('is_permanent', false)
      .not('status', 'in', '(draft,archived,closed)'),
    supabase
      .from('events')
      .update({ status: 'active', updated_at: now })
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .eq('is_permanent', false)
      .in('status', ['published']),
    supabase
      .from('events')
      .update({ status: 'published', updated_at: now })
      .gt('starts_at', now)
      .eq('is_permanent', false)
      .eq('status', 'active'),
    supabase
      .from('events')
      .update({ status: 'published', updated_at: now })
      .eq('is_permanent', true)
      .eq('status', 'closed'),
  ]);
}

export async function listEvents(): Promise<EventoAcademico[]> {
  if (!supabase && isDemoMode()) return mockEvents;
  if (!supabase) return [];

  await syncEventLifecycleStatuses().catch(() => undefined);

  let { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .order('starts_at', { ascending: false })
    .returns<EventRow[]>();

  if (error && isMissingOptionalEventColumn(error)) {
    const fallback = await supabase
      .from('events')
      .select(eventColumnsBase)
      .order('starts_at', { ascending: false })
      .returns<EventRow[]>();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

/** Eventos visibles sin login (publicados o activos). */
export async function listPublicEvents(): Promise<EventoAcademico[]> {
  if (!supabase && isDemoMode()) {
    return mockEvents
      .map((event) => ({ ...event, status: getEstadoEventoPorFecha(event) }))
      .filter((event) => event.status === 'published' || event.status === 'active');
  }
  if (!supabase) return [];

  let { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .in('status', ['published', 'active'])
    .order('starts_at', { ascending: false })
    .returns<EventRow[]>();

  if (error && isMissingOptionalEventColumn(error)) {
    const fallback = await supabase
      .from('events')
      .select(eventColumnsBase)
      .in('status', ['published', 'active'])
      .order('starts_at', { ascending: false })
      .returns<EventRow[]>();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data ?? []).map(mapEvent).filter((event) => event.status === 'published' || event.status === 'active');
}

export async function getEvent(eventId: string): Promise<EventoAcademico | null> {
  if (!supabase && isDemoMode()) return mockEvents.find((event) => event.id === eventId) ?? null;
  if (!supabase) return null;

  let { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .eq('id', eventId)
    .maybeSingle()
    .returns<EventRow>();

  if (error && isMissingOptionalEventColumn(error)) {
    const fallback = await supabase
      .from('events')
      .select(eventColumnsBase)
      .eq('id', eventId)
      .maybeSingle()
      .returns<EventRow>();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) return null;
  return mapEvent(data);
}

export async function createEvent(input: SaveEventInput): Promise<EventoAcademico> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return {
      id: crypto.randomUUID(),
      title: input.title,
      eventType: input.eventType,
      registrationFormType: input.registrationFormType ?? null,
      customFormSchema: input.customFormSchema ?? null,
      isPermanent: input.isPermanent ?? false,
      description: input.description,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      status: normalizeEventStatusForSave(input),
      organizerId: input.organizerId,
    };
  }

  if (!input.organizationId) {
    throw new Error('Tu usuario no tiene organizacion asignada. Revisa la tabla profiles.');
  }

  const insertPayload = {
    organization_id: input.organizationId,
    organizer_id: input.organizerId,
    title: input.title,
    event_type: input.eventType,
    registration_form_type: input.eventType === 'seminario' ? input.registrationFormType ?? 'seminario_general' : null,
    custom_form_schema:
      input.registrationFormType === 'personalizado' || input.registrationFormType === 'educacion_continua'
        ? input.customFormSchema ?? { fields: [] }
        : null,
    is_permanent: input.isPermanent ?? false,
    description: input.description,
    location: input.location,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    capacity: input.capacity,
    status: normalizeEventStatusForSave(input),
  };

  let { data, error } = await supabase
    .from('events')
    .insert(insertPayload)
    .select(eventColumns)
    .single()
    .returns<EventRow>();

  if (error && isMissingOptionalEventColumn(error)) {
    const fallbackPayload: Record<string, unknown> = { ...insertPayload };
    delete fallbackPayload.registration_form_type;
    delete fallbackPayload.custom_form_schema;
    delete fallbackPayload.is_permanent;
    const fallback = await supabase
      .from('events')
      .insert(fallbackPayload)
      .select(eventColumnsBase)
      .single()
      .returns<EventRow>();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) throw new Error('No se pudo guardar el evento');
  return mapEvent(data);
}

export async function updateEvent(input: UpdateEventInput): Promise<EventoAcademico> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return {
      id: input.id,
      title: input.title,
      eventType: input.eventType,
      registrationFormType: input.registrationFormType ?? null,
      customFormSchema: input.customFormSchema ?? null,
      isPermanent: input.isPermanent ?? false,
      description: input.description,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      status: normalizeEventStatusForSave(input),
      organizerId: 'demo-admin',
    };
  }

  const updatePayload = {
    title: input.title,
    event_type: input.eventType,
    registration_form_type: input.eventType === 'seminario' ? input.registrationFormType ?? 'seminario_general' : null,
    custom_form_schema:
      input.registrationFormType === 'personalizado' || input.registrationFormType === 'educacion_continua'
        ? input.customFormSchema ?? { fields: [] }
        : null,
    is_permanent: input.isPermanent ?? false,
    description: input.description,
    location: input.location,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    capacity: input.capacity,
    status: normalizeEventStatusForSave(input),
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', input.id)
    .select(eventColumns)
    .single()
    .returns<EventRow>();

  if (error && isMissingOptionalEventColumn(error)) {
    const fallbackPayload: Record<string, unknown> = { ...updatePayload };
    delete fallbackPayload.registration_form_type;
    delete fallbackPayload.custom_form_schema;
    delete fallbackPayload.is_permanent;
    const fallback = await supabase
      .from('events')
      .update(fallbackPayload)
      .eq('id', input.id)
      .select(eventColumnsBase)
      .single()
      .returns<EventRow>();
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el evento');
  return mapEvent(data);
}

export async function deleteEvent(eventId: string): Promise<void> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return;
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

