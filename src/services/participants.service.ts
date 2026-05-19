import { supabase } from '@/lib/supabase';
import { mockParticipants, mockRegistrations } from '@/data/mockData';
import { Participant, Registration } from '@/types/domain';

type RegistrationRow = {
  id: string;
  event_id: string;
  participant_id: string;
  qr_token: string;
  certificate_code: string;
  checked_in_at: string | null;
  created_at: string;
};

const mapParticipant = (row: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  document_id: string;
  institution: string;
  phone: string | null;
}): Participant => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  documentId: row.document_id,
  institution: row.institution,
  phone: row.phone ?? undefined,
});

export async function listParticipants(): Promise<Participant[]> {
  if (!supabase) return mockParticipants;

  const { data, error } = await supabase
    .from('participants')
    .select('id,first_name,last_name,email,document_id,institution,phone')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapParticipant);
}

export async function listRegistrations(): Promise<Registration[]> {
  if (!supabase) return mockRegistrations;

  const { data, error } = await supabase
    .from('registrations')
    .select('id,event_id,participant_id,qr_token,certificate_code,checked_in_at,created_at')
    .order('created_at', { ascending: false })
    .returns<RegistrationRow[]>();

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
