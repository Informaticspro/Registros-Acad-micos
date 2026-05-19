import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';
import { mockParticipantes, mockInscripcions } from '@/datos/datosPrueba';
import { Participante, Inscripcion } from '@/tipos/dominio';

type InscripcionRow = {
  id: string;
  event_id: string;
  participant_id: string;
  qr_token: string;
  certificate_code: string;
  checked_in_at: string | null;
  created_at: string;
};

type ParticipanteRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  document_id: string;
  institution: string;
  phone: string | null;
  metadata: Record<string, string> | null;
};

const mapParticipante = (row: ParticipanteRow): Participante => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  documentId: row.document_id,
  institution: row.institution,
  phone: row.phone ?? undefined,
  metadata: row.metadata ?? undefined,
});

export type UpdateParticipanteInput = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentId: string;
  institution: string;
  phone?: string;
  metadata?: Record<string, string>;
};

export async function listParticipantes(): Promise<Participante[]> {
  if (!supabase && isDemoMode()) return mockParticipantes;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('participants')
    .select('id,first_name,last_name,email,document_id,institution,phone,metadata')
    .order('created_at', { ascending: false })
    .returns<ParticipanteRow[]>();

  if (error) throw error;
  return data.map(mapParticipante);
}

export async function listInscripcions(): Promise<Inscripcion[]> {
  if (!supabase && isDemoMode()) return mockInscripcions;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('registrations')
    .select('id,event_id,participant_id,qr_token,certificate_code,checked_in_at,created_at')
    .order('created_at', { ascending: false })
    .returns<InscripcionRow[]>();

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    participantId: row.participant_id,
    qrToken: row.qr_token,
    certificateCode: row.certificate_code,
    checkedInAt: row.checked_in_at,
    createdAt: row.created_at,
  }));
}

export async function updateParticipante(input: UpdateParticipanteInput): Promise<Participante> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return {
      id: input.id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      documentId: input.documentId,
      institution: input.institution,
      phone: input.phone,
      metadata: input.metadata,
    };
  }

  const { data, error } = await supabase
    .from('participants')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      document_id: input.documentId,
      institution: input.institution,
      phone: input.phone || null,
      metadata: input.metadata ?? {},
    })
    .eq('id', input.id)
    .select('id,first_name,last_name,email,document_id,institution,phone,metadata')
    .single()
    .returns<ParticipanteRow>();

  if (error) throw error;
  return mapParticipante(data);
}

export async function deleteInscripcion(registrationId: string): Promise<void> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return;
  }

  const { error } = await supabase.from('registrations').delete().eq('id', registrationId);
  if (error) throw error;
}

export async function deleteParticipante(participantId: string): Promise<void> {
  if (!supabase) {
    if (!isDemoMode()) throw new Error('Supabase no esta configurado en este despliegue.');
    return;
  }

  const { error } = await supabase.from('participants').delete().eq('id', participantId);
  if (error) throw error;
}

