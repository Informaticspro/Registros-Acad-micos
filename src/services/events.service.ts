import { supabase } from '@/lib/supabase';
import { mockEvents } from '@/data/mockData';
import { AcademicEvent } from '@/types/domain';

export type SaveEventInput = {
  title: string;
  eventType: AcademicEvent['eventType'];
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number;
  status: AcademicEvent['status'];
  organizerId: string;
  organizationId: string | null;
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
}): AcademicEvent => ({
  id: row.id,
  title: row.title,
  eventType: row.event_type as AcademicEvent['eventType'],
  description: row.description,
  location: row.location,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  capacity: row.capacity,
  status: row.status as AcademicEvent['status'],
  organizerId: row.organizer_id,
});

export async function listEvents(): Promise<AcademicEvent[]> {
  if (!supabase) return mockEvents;

  const { data, error } = await supabase
    .from('events')
    .select('id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id')
    .order('starts_at', { ascending: false });

  if (error) throw error;
  return data.map(mapEvent);
}

export async function getEvent(eventId: string): Promise<AcademicEvent | null> {
  if (!supabase) return mockEvents.find((event) => event.id === eventId) ?? null;

  const { data, error } = await supabase
    .from('events')
    .select('id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id')
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return mapEvent(data);
}

export async function createEvent(input: SaveEventInput): Promise<AcademicEvent> {
  if (!supabase) {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      eventType: input.eventType,
      description: input.description,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      capacity: input.capacity,
      status: input.status,
      organizerId: input.organizerId,
    };
  }

  if (!input.organizationId) {
    throw new Error('Tu usuario no tiene organización asignada. Revisa la tabla profiles.');
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
      status: input.status,
    })
    .select('id,title,event_type,description,location,starts_at,ends_at,capacity,status,organizer_id')
    .single();

  if (error) throw error;
  return mapEvent(data);
}
