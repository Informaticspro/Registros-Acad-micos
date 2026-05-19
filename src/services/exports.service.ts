import { utils, writeFile } from 'xlsx';
import { isDemoMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { mockParticipants, mockRegistrations } from '@/data/mockData';
import { AcademicEvent } from '@/types/domain';
import { getRegistrationFormKind } from '@/features/registration/registration-config';
import { listEvents } from '@/services/events.service';
import { formatDateTime } from '@/utils/format';

export type ExportableEvent = AcademicEvent & {
  registrationCount: number;
};

type RegistrationBase = {
  id: string;
  participant_id: string;
  certificate_code: string;
  created_at: string;
};

type ParticipantBase = {
  id: string;
  first_name: string;
  last_name: string;
  document_id: string;
  email: string;
  metadata: Record<string, string> | null;
};

type DailyLog = {
  registration_id: string;
  checked_in_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getRegistrationCounts(): Promise<Record<string, number>> {
  if (!supabase && isDemoMode()) {
    return mockRegistrations.reduce<Record<string, number>>((acc, row) => {
      acc[row.eventId] = (acc[row.eventId] ?? 0) + 1;
      return acc;
    }, {});
  }
  if (!supabase) return {};

  const { data, error } = await supabase.from('registrations').select('event_id');
  if (error) throw error;

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const eventId = row.event_id as string;
    acc[eventId] = (acc[eventId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function listExportableEvents(): Promise<ExportableEvent[]> {
  const [events, counts] = await Promise.all([listEvents(), getRegistrationCounts()]);

  return events
    .filter(
      (event) =>
        event.status === 'active' ||
        event.status === 'published' ||
        (counts[event.id] ?? 0) > 0,
    )
    .map((event) => ({
      ...event,
      registrationCount: counts[event.id] ?? 0,
    }))
    .sort((a, b) => b.registrationCount - a.registrationCount);
}

async function fetchEventRegistrations(eventId: string) {
  if (!supabase && isDemoMode()) {
    return mockRegistrations
      .filter((registration) => registration.eventId === eventId)
      .map((registration) => {
        const participant = mockParticipants.find((item) => item.id === registration.participantId);
        if (!participant) return null;
        return {
          registration: {
            id: registration.id,
            participant_id: registration.participantId,
            certificate_code: registration.certificateCode,
            created_at: registration.createdAt,
          },
          participant: {
            id: participant.id,
            first_name: participant.firstName,
            last_name: participant.lastName,
            document_id: participant.documentId,
            email: participant.email,
            metadata: participant.metadata ?? null,
          },
          logs: registration.checkedInAt ? [{ checked_in_at: registration.checkedInAt }] : [],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }
  if (!supabase) return [];

  const { data: registrations, error: regError } = await supabase
    .from('registrations')
    .select('id, participant_id, certificate_code, created_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .returns<RegistrationBase[]>();

  if (regError) throw regError;
  if (!registrations?.length) return [];

  const participantIds = [...new Set(registrations.map((row) => row.participant_id))];
  const { data: participants, error: partError } = await supabase
    .from('participants')
    .select('id, first_name, last_name, document_id, email, metadata')
    .in('id', participantIds)
    .returns<ParticipantBase[]>();

  if (partError) throw partError;

  const participantMap = new Map((participants ?? []).map((row) => [row.id, row]));
  const registrationIds = registrations.map((row) => row.id);

  const { data: logs, error: logError } = await supabase
    .from('attendance_daily_logs')
    .select('registration_id, checked_in_at')
    .in('registration_id', registrationIds)
    .returns<DailyLog[]>();

  if (logError) {
    console.warn('No se pudieron cargar asistencias diarias:', logError.message);
  }

  const logsByRegistration = (logs ?? []).reduce<Record<string, string[]>>((acc, row) => {
    const list = acc[row.registration_id] ?? [];
    list.push(row.checked_in_at);
    acc[row.registration_id] = list;
    return acc;
  }, {});

  return registrations
    .map((registration) => {
      const participant = participantMap.get(registration.participant_id);
      if (!participant) return null;
      return {
        registration,
        participant,
        logs: (logsByRegistration[registration.id] ?? []).map((checked_in_at) => ({ checked_in_at })),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function buildExportRows(event: AcademicEvent, rows: Awaited<ReturnType<typeof fetchEventRegistrations>>) {
  const isCongreso = getRegistrationFormKind(event.eventType) === 'congreso';

  return rows.map(({ registration, participant, logs }) => {
    const metadata = participant.metadata ?? {};
    const attendance = logs
      .map((log) => formatDateTime(log.checked_in_at))
      .filter(Boolean)
      .join(' | ');

    const base = {
      Nombre: participant.first_name,
      Apellido: participant.last_name,
      Cédula: participant.document_id,
      'Correo institucional': participant.email,
      'Fecha registro': formatDateTime(registration.created_at),
      'Código certificado': registration.certificate_code,
      'Asistencias (fecha y hora)': attendance || 'Sin marcajes diarios',
    };

    if (!isCongreso) return base;

    return {
      ...base,
      Sexo: metadata.sex ?? '',
      Categoría: metadata.category ?? '',
      'Correo P.': metadata.personalEmail ?? '',
      Nacionalidad: metadata.nationality ?? '',
      'Otra Nacionalidad': metadata.otherNationality ?? '',
      Modalidad: metadata.modality ?? '',
      'Tipo Participación': metadata.participationType ?? '',
    };
  });
}

export async function exportEventExcel(event: ExportableEvent) {
  const rows = await fetchEventRegistrations(event.id);
  const sheetRows = buildExportRows(event, rows);

  if (sheetRows.length === 0) {
    throw new Error(
      `No hay participantes registrados en «${event.title}». Registre asistentes antes de exportar.`,
    );
  }

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.json_to_sheet(sheetRows), 'Participantes');
  const typeSlug = slugify(event.eventType);
  const fileName = `${typeSlug}-${slugify(event.title)}.xlsx`;
  writeFile(workbook, fileName);
}
