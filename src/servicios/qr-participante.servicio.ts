import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { mockParticipantes, mockInscripcions } from '@/datos/datosPrueba';

export type ParticipanteQrLookup = {
  eventId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  qrToken: string;
  certificateCode: string;
};

export async function lookupParticipanteQr(eventId: string, documentId: string): Promise<ParticipanteQrLookup | null> {
  const normalizedDoc = documentId.trim();
  if (!normalizedDoc) return null;

  if (!supabase && isDemoMode()) {
    const registration = mockInscripcions.find((item) => {
      if (item.eventId !== eventId) return false;
      const participant = mockParticipantes.find((p) => p.id === item.participantId);
      return participant?.documentId === normalizedDoc;
    });
    if (!registration) return null;
    const participant = mockParticipantes.find((item) => item.id === registration.participantId);
    if (!participant) return null;
    return {
      eventId,
      firstName: participant.firstName,
      lastName: participant.lastName,
      documentId: participant.documentId,
      email: participant.email,
      qrToken: registration.qrToken,
      certificateCode: registration.certificateCode,
    };
  }
  if (!supabase) throw new Error('Supabase no esta configurado en este despliegue.');

  const { data, error } = await supabase.rpc('lookup_participant_registration', {
    p_event_id: eventId,
    p_document_id: normalizedDoc,
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  return {
    eventId,
    firstName: row.result_first_name,
    lastName: row.result_last_name,
    documentId: row.result_document_id,
    email: row.result_email,
    qrToken: row.result_qr_token,
    certificateCode: row.result_certificate_code,
  };
}

