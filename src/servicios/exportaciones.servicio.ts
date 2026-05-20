import { utils, writeFile } from 'xlsx';
import { isDemoMode } from '@/infraestructura/entorno';
import { supabase } from '@/infraestructura/supabase';
import { mockParticipantes, mockInscripcions } from '@/datos/datosPrueba';
import { EventoAcademico } from '@/tipos/dominio';
import { getInscripcionFormKind } from '@/modulos/registro/configuracion-registro';
import { listEvents } from '@/servicios/eventos.servicio';
import { formatDateTime } from '@/utilidades/formato';

export type ExportableEvent = EventoAcademico & {
  registrationCount: number;
};

type InscripcionBase = {
  id: string;
  participant_id: string;
  certificate_code: string;
  created_at: string;
};

type ParticipanteBase = {
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

const INSTITUTION_HEADER = ['UNIVERSIDAD AUTÓNOMA DE CHIRIQUÍ', 'FACULTAD DE ECONOMÍA'] as const;

const eventTypeLabels: Record<EventoAcademico['eventType'], string> = {
  seminario: 'SEMINARIO',
  congreso: 'CONGRESO',
  taller: 'TALLER',
  capacitacion: 'CAPACITACIÓN',
  universitario: 'EVENTO UNIVERSITARIO',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getInscripcionCounts(): Promise<Record<string, number>> {
  if (!supabase && isDemoMode()) {
    return mockInscripcions.reduce<Record<string, number>>((acc, row) => {
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
  const [events, counts] = await Promise.all([listEvents(), getInscripcionCounts()]);

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

async function fetchEventInscripcions(eventId: string) {
  if (!supabase && isDemoMode()) {
    return mockInscripcions
      .filter((registration) => registration.eventId === eventId)
      .map((registration) => {
        const participant = mockParticipantes.find((item) => item.id === registration.participantId);
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
    .returns<InscripcionBase[]>();

  if (regError) throw regError;
  if (!registrations?.length) return [];

  const participantIds = [...new Set(registrations.map((row) => row.participant_id))];
  const { data: participants, error: partError } = await supabase
    .from('participants')
    .select('id, first_name, last_name, document_id, email, metadata')
    .in('id', participantIds)
    .returns<ParticipanteBase[]>();

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

  const logsByInscripcion = (logs ?? []).reduce<Record<string, string[]>>((acc, row) => {
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
        logs: (logsByInscripcion[registration.id] ?? []).map((checked_in_at) => ({ checked_in_at })),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function buildExportRows(event: EventoAcademico, rows: Awaited<ReturnType<typeof fetchEventInscripcions>>) {
  const isCongreso = getInscripcionFormKind(event.eventType) === 'congreso';

  return rows.map(({ registration, participant, logs }) => {
    const metadata = participant.metadata ?? {};
    const attendance = logs
      .map((log) => formatDateTime(log.checked_in_at))
      .filter(Boolean)
      .join(' | ');

    const base = {
      Nombre: participant.first_name,
      Apellido: participant.last_name,
      'Cedula': participant.document_id,
      'Correo institucional': participant.email,
      'Fecha registro': formatDateTime(registration.created_at),
      'Codigo certificado': registration.certificate_code,
      'Asistencias (fecha y hora)': attendance || 'Sin marcajes diarios',
    };

    if (!isCongreso) return base;

    return {
      ...base,
      Sexo: metadata.sex ?? '',
      'Categoria': metadata.category ?? '',
      'Correo P.': metadata.personalEmail ?? '',
      Nacionalidad: metadata.nationality ?? '',
      'Otra Nacionalidad': metadata.otherNationality ?? '',
      Modalidad: metadata.modality ?? '',
      'Tipo Participacion': metadata.participationType ?? '',
      Entidad: metadata.entity ?? '',
    };
  });
}

export async function exportEventExcel(event: ExportableEvent) {
  const rows = await fetchEventInscripcions(event.id);
  const sheetRows = buildExportRows(event, rows);

  if (sheetRows.length === 0) {
    throw new Error(
      `No hay participantes registrados en "${event.title}". Registre asistentes antes de exportar.`,
    );
  }

  const tableHeaders = Object.keys(sheetRows[0]);
  const columnCount = Math.max(tableHeaders.length, 1);
  const eventTitle = `${eventTypeLabels[event.eventType]}: ${event.title}`;
  const generatedAt = `Generado: ${formatDateTime(new Date().toISOString())}`;
  const headerRows = [
    [INSTITUTION_HEADER[0]],
    [INSTITUTION_HEADER[1]],
    [],
    [eventTitle],
    [generatedAt],
    [],
  ];
  const worksheet = utils.aoa_to_sheet(headerRows);
  utils.sheet_add_json(worksheet, sheetRows, { origin: `A${headerRows.length + 1}` });

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: columnCount - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: columnCount - 1 } },
  ];
  worksheet['!cols'] = tableHeaders.map((header) => ({
    wch: Math.max(18, Math.min(42, header.length + 8)),
  }));

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Participantes');
  const typeSlug = slugify(event.eventType);
  const fileName = `${typeSlug}-${slugify(event.title)}.xlsx`;
  writeFile(workbook, fileName);
}

