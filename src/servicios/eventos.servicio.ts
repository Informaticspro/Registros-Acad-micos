import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';
import { mockEvents } from '@/datos/datosPrueba';
import { EventoAcademico } from '@/tipos/dominio';
import { getEstadoEventoPorFecha, normalizeEventStatusForSave } from '@/utilidades/estado-evento';

export type SaveEventInput = {
  title: string;
  eventType: EventoAcademico['eventType'];
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

const mapEvent = (row: {
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
}): EventoAcademico => {
  const event = {
    id: row.id,
    title: row.title,
    eventType: row.event_type as EventoAcademico['eventType'],
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
    status: getEstadoEventoPorFecha(event),
  };
};

const eventColumns =
  'id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id' as const;

async function syncEventLifecycleStatuses() {
  if (!supabase) return;

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from('events')
      .update({ status: 'closed', updated_at: now })
      .lt('ends_at', now)
      .not('ends_at', 'is', null)
      .not('status', 'in', '(draft,archived,closed)'),
    supabase
      .from('events')
      .update({ status: 'active', updated_at: now })
      .lte('starts_at', now)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .in('status', ['published']),
    supabase
      .from('events')
      .update({ status: 'published', updated_at: now })
      .gt('starts_at', now)
      .eq('status', 'active'),
  ]);
}

export async function listEvents(): Promise<EventoAcademico[]> {
  if (!supabase && isDemoMode()) return mockEvents;
  if (!supabase) return [];

  await syncEventLifecycleStatuses().catch(() => undefined);

  const { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data.map(mapEvent);
}

/** Eventos visibles sin login (publicados o activos). */
export async function listPublicEvents(): Promise<EventoAcademico[]> {
  if (!supabase && isDemoMode()) {
    return mockEvents
      .map((event) => ({ ...event, status: getEstadoEventoPorFecha(event) }))
      .filter((event) => event.status === 'published' || event.status === 'active');
  }
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .in('status', ['published', 'active'])
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data.map(mapEvent).filter((event) => event.status === 'published' || event.status === 'active');
}

export async function getEvent(eventId: string): Promise<EventoAcademico | null> {
  if (!supabase && isDemoMode()) return mockEvents.find((event) => event.id === eventId) ?? null;
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('events')
    .select(eventColumns)
    .eq('id', eventId)
    .maybeSingle();

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

  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: input.organizationId,
      organizer_id: input.organizerId,
      title: input.title,
      event_type: input.eventType,
      description: input.description,
      location: input.location,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      capacity: input.capacity,
      status: normalizeEventStatusForSave(input),
    })
    .select('id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id')
    .single();

  if (error) throw error;
  return mapEvent(data);
}

export async function updateEvent(input: UpdateEventInput): Promise<EventoAcademico> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return {
      id: input.id,
      title: input.title,
      eventType: input.eventType,
      description: input.description,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      status: normalizeEventStatusForSave(input),
      organizerId: 'demo-admin',
    };
  }

  const { data, error } = await supabase
    .from('events')
    .update({
      title: input.title,
      event_type: input.eventType,
      description: input.description,
      location: input.location,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      capacity: input.capacity,
      status: normalizeEventStatusForSave(input),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select(eventColumns)
    .single();

  if (error) throw error;
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

