import { z } from 'zod';
import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export const publicCheckInSchema = z.object({
  eventId: z.string().min(1, 'Evento requerido'),
  firstName: z.string().min(2, 'Nombre requerido'),
  lastName: z.string().min(2, 'Apellido requerido'),
  documentId: z.string().min(4, 'Cédula requerida'),
  email: z.string().email('Correo inválido'),
});

export type PublicCheckInInput = z.infer<typeof publicCheckInSchema>;

export type PublicCheckInResult = {
  participantId: string;
  registrationId: string;
  attendanceId: string;
  certificateCode: string;
  alreadyCheckedIn: boolean;
};

export async function registerPublicCheckIn(input: PublicCheckInInput): Promise<PublicCheckInResult> {
  const parsed = publicCheckInSchema.parse(input);

  if (!supabase && isDemoMode()) {
    return {
      participantId: crypto.randomUUID(),
      registrationId: crypto.randomUUID(),
      attendanceId: crypto.randomUUID(),
      certificateCode: `CERT-DEMO-${parsed.documentId.replace(/\W/g, '').slice(-4)}`,
      alreadyCheckedIn: false,
    };
  }
  if (!supabase) throw new Error('Supabase no esta configurado en este despliegue.');

  const { data, error } = await supabase.rpc('public_event_check_in', {
    p_event_id: parsed.eventId,
    p_first_name: parsed.firstName,
    p_last_name: parsed.lastName,
    p_document_id: parsed.documentId,
    p_email: parsed.email,
  });

  if (error) throw error;
  const result = data?.[0];

  if (!result) {
    throw new Error('No se pudo registrar la asistencia');
  }

  return {
    participantId: result.participant_id,
    registrationId: result.registration_id,
    attendanceId: result.attendance_id,
    certificateCode: result.certificate_code,
    alreadyCheckedIn: result.already_checked_in,
  };
}
