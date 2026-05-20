import { supabase } from '@/infraestructura/supabase';
import { isDemoMode } from '@/infraestructura/entorno';
import { mockAttendance, mockParticipantes, mockInscripcions } from '@/datos/datosPrueba';
import { JornadaAsistencia, RegistroAsistencia } from '@/tipos/dominio';
import { extractQrLookupValue } from '@/utilidades/qr';

type InscripcionRow = {
  id: string;
  event_id: string;
  participant_id: string;
  qr_token: string;
  certificate_code: string;
  checked_in_at: string | null;
  created_at: string;
};

type AttendanceRow = {
  id: string;
  event_id: string;
  registration_id: string;
  scanned_by: string;
  status: string;
  checked_in_at: string;
};

type DailyLogRow = {
  id: string;
  event_id: string;
  registration_id: string;
  scanned_by: string | null;
  checked_in_at: string;
  attendance_period: JornadaAsistencia | null;
  registrations: {
    participants: {
      first_name: string;
      last_name: string;
      document_id: string;
      metadata: Record<string, string> | null;
    } | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
};

export type DailyAttendanceResult = {
  participantName: string;
  documentId: string;
  checkedInAt: string;
  certificateCode: string;
  attendancePeriod: JornadaAsistencia;
  alreadyLoggedToday: boolean;
};

export type EventDailyAttendance = {
  id: string;
  participantName: string;
  documentId: string;
  category: string;
  attendancePeriod: JornadaAsistencia;
  checkedInAt: string;
  scannedByName: string;
};

function getCurrentDayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function normalizeAttendancePeriod(value?: string | null): JornadaAsistencia {
  return value === 'vespertina' ? 'vespertina' : 'matutina';
}

function getMetadataValue(metadata: Record<string, string> | null | undefined, key: string) {
  return metadata?.[key]?.trim() ?? '';
}

export async function verifyQrToken(qrToken: string) {
  const lookup = extractQrLookupValue(qrToken);
  if (!supabase && isDemoMode()) {
    const registration = mockInscripcions.find((item) => item.qrToken === lookup);
    return registration ? { valid: true, registration } : { valid: false, registration: null };
  }
  if (!supabase) return { valid: false, registration: null };

  const { data, error } = await supabase
    .from('registrations')
    .select('id,event_id,participant_id,qr_token,certificate_code,checked_in_at,created_at')
    .eq('qr_token', lookup)
    .single<InscripcionRow>();

  if (error) return { valid: false, registration: null };

  return {
    valid: true,
    registration: {
      id: data.id,
      eventId: data.event_id,
      participantId: data.participant_id,
      qrToken: data.qr_token,
      certificateCode: data.certificate_code,
      checkedInAt: data.checked_in_at,
      createdAt: data.created_at,
    },
  };
}

export async function recordDailyAttendance(
  eventId: string,
  qrOrDocument: string,
  attendancePeriod: JornadaAsistencia,
): Promise<DailyAttendanceResult> {
  const lookup = extractQrLookupValue(qrOrDocument).trim();

  if (!supabase && isDemoMode()) {
    const registration =
      mockInscripcions.find((item) => item.qrToken === lookup && item.eventId === eventId) ??
      mockInscripcions.find((item) => {
        if (item.eventId !== eventId) return false;
        const participant = mockParticipantes.find((p) => p.id === item.participantId);
        return participant?.documentId === lookup;
      });

    if (!registration) throw new Error('Participante no inscrito en este evento');

    const participant = mockParticipantes.find((item) => item.id === registration.participantId);
    const checkedInAt = new Date().toISOString();
    return {
      participantName: `${participant?.firstName ?? ''} ${participant?.lastName ?? ''}`.trim(),
      documentId: participant?.documentId ?? lookup,
      checkedInAt,
      certificateCode: registration.certificateCode,
      attendancePeriod,
      alreadyLoggedToday: false,
    };
  }
  if (!supabase) throw new Error('Supabase no esta configurado en este despliegue.');

  const { data, error } = await supabase.rpc('record_daily_attendance', {
    p_event_id: eventId,
    p_lookup: lookup,
    p_attendance_period: attendancePeriod,
  });

  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('No se pudo registrar la asistencia del dia');

  return {
    participantName: row.result_participant_name,
    documentId: row.result_document_id,
    checkedInAt: row.result_checked_in_at,
    certificateCode: row.result_certificate_code,
    attendancePeriod: normalizeAttendancePeriod(row.result_attendance_period),
    alreadyLoggedToday: row.result_already_logged_today,
  };
}

export async function listEventDailyAttendance(
  eventId: string,
  attendancePeriod: JornadaAsistencia,
): Promise<EventDailyAttendance[]> {
  if (!supabase && isDemoMode()) return [];
  if (!supabase) return [];

  const { start, end } = getCurrentDayRange();
  const { data, error } = await supabase
    .from('attendance_daily_logs')
    .select(
      `
      id,
      event_id,
      registration_id,
      scanned_by,
      checked_in_at,
      attendance_period,
      registrations (
        participants (
          first_name,
          last_name,
          document_id,
          metadata
        )
      ),
      profiles (
        full_name
      )
    `,
    )
    .eq('event_id', eventId)
    .eq('attendance_period', attendancePeriod)
    .gte('checked_in_at', start)
    .lt('checked_in_at', end)
    .order('checked_in_at', { ascending: false })
    .returns<DailyLogRow[]>();

  if (error) throw error;

  return data.map((row) => {
    const participant = row.registrations?.participants;
    const category = getMetadataValue(participant?.metadata, 'category') || 'Sin categoria';

    return {
      id: row.id,
      participantName: `${participant?.first_name ?? ''} ${participant?.last_name ?? ''}`.trim() || 'Participante',
      documentId: participant?.document_id ?? '',
      category,
      attendancePeriod: normalizeAttendancePeriod(row.attendance_period),
      checkedInAt: row.checked_in_at,
      scannedByName: row.profiles?.full_name ?? 'Scanner',
    };
  });
}

export async function listAttendance(): Promise<RegistroAsistencia[]> {
  if (!supabase && isDemoMode()) return mockAttendance;
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id,event_id,registration_id,scanned_by,status,checked_in_at')
    .order('checked_in_at', { ascending: false })
    .returns<AttendanceRow[]>();

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    registrationId: row.registration_id,
    scannedBy: row.scanned_by,
    status: row.status as RegistroAsistencia['status'],
    checkedInAt: row.checked_in_at,
  }));
}

