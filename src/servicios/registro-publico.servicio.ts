import { z } from 'zod';
import { getInscripcionFormKind } from '@/modulos/registro/configuracion-registro';
import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { getEvent } from '@/servicios/eventos.servicio';
import { EventoAcademico } from '@/tipos/dominio';
import { isPublicRegistrationOpen } from '@/utilidades/estado-evento';

const congresoMetadataSchema = z.object({
  sex: z.string().min(1, 'Sexo requerido'),
  category: z.string().min(1, 'Categoria requerida'),
  personalEmail: z.string().email('Correo personal invalido').optional().or(z.literal('')),
  nationality: z.string().min(1, 'Nacionalidad requerida'),
  otherNationality: z.string().optional(),
  modality: z.string().min(1, 'Modalidad requerida'),
  participationType: z.string().min(1, 'Tipo de participacion requerido'),
});

export const publicCheckInSchema = z
  .object({
    eventId: z.string().min(1, 'Evento requerido'),
    firstName: z.string().min(2, 'Nombre requerido'),
    lastName: z.string().min(2, 'Apellido requerido'),
    documentId: z.string().min(4, 'Cedula requerida'),
    email: z.string().email('Correo invalido'),
    eventType: z.enum(['seminario', 'congreso', 'taller', 'capacitacion', 'universitario']).optional(),
    metadata: z.record(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const kind = getInscripcionFormKind(data.eventType);
    if (kind !== 'congreso') return;

    const parsed = congresoMetadataSchema.safeParse(data.metadata ?? {});
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: issue.message,
          path: ['metadata', ...(issue.path as (string | number)[])],
        });
      }
    }
  });

export type PublicCheckInInput = z.infer<typeof publicCheckInSchema>;

export type PublicCheckInResult = {
  participantId: string;
  registrationId: string;
  attendanceId: string;
  certificateCode: string;
  qrToken: string;
  documentId: string;
  firstName: string;
  lastName: string;
  alreadyCheckedIn: boolean;
};

export async function registerPublicCheckIn(input: PublicCheckInInput): Promise<PublicCheckInResult> {
  const parsed = publicCheckInSchema.parse(input);
  const event = await getEvent(parsed.eventId);

  if (!event || !isPublicRegistrationOpen(event)) {
    throw new Error('Este evento no esta disponible para registro en este momento.');
  }

  const metadata =
    getInscripcionFormKind(parsed.eventType as EventoAcademico['eventType'] | undefined) === 'congreso'
      ? Object.fromEntries(
          Object.entries(parsed.metadata ?? {}).filter(([, value]) => value.trim().length > 0),
        )
      : {};

  if (!supabase && isDemoMode()) {
    const demoToken = `DEMO-${parsed.eventId.slice(0, 4)}-${parsed.documentId.replace(/\W/g, '')}`;
    return {
      participantId: crypto.randomUUID(),
      registrationId: crypto.randomUUID(),
      attendanceId: crypto.randomUUID(),
      certificateCode: `CERT-DEMO-${parsed.documentId.replace(/\W/g, '').slice(-4)}`,
      qrToken: demoToken,
      documentId: parsed.documentId,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
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
    p_metadata: metadata,
  });

  if (error) throw error;
  const result = data?.[0];

  if (!result) {
    throw new Error('No se pudo registrar la asistencia');
  }

  return {
    participantId: result.result_participant_id,
    registrationId: result.result_registration_id,
    attendanceId: result.result_attendance_id,
    certificateCode: result.result_certificate_code,
    qrToken: result.result_qr_token,
    documentId: parsed.documentId,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    alreadyCheckedIn: result.result_already_checked_in,
  };
}

