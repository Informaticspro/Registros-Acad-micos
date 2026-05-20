import { utils, writeFile } from 'xlsx-js-style';
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
  scanned_by: string | null;
  attendance_period: string | null;
};

type ExportRowBundle = {
  registration: InscripcionBase;
  participant: ParticipanteBase;
  logs: Array<{
    checked_in_at: string;
    scanned_by: string | null;
    attendance_period?: string | null;
    scanner_name?: string;
  }>;
};

const INSTITUTION_HEADER = ['UNIVERSIDAD AUTÓNOMA DE CHIRIQUÍ', 'FACULTAD DE ECONOMÍA'] as const;

const borderStyle = {
  top: { style: 'thin', color: { rgb: 'D9E2EC' } },
  right: { style: 'thin', color: { rgb: 'D9E2EC' } },
  bottom: { style: 'thin', color: { rgb: 'D9E2EC' } },
  left: { style: 'thin', color: { rgb: 'D9E2EC' } },
};

const titleStyle = {
  font: { bold: true, sz: 15, color: { rgb: '102A43' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const subtitleStyle = {
  font: { bold: true, sz: 12, color: { rgb: '334E68' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const eventTitleStyle = {
  font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  fill: { fgColor: { rgb: '0F5132' } },
};

const generatedAtStyle = {
  font: { italic: true, sz: 10, color: { rgb: '486581' } },
  alignment: { horizontal: 'center', vertical: 'center' },
};

const tableHeaderStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  fill: { fgColor: { rgb: '1F2937' } },
  border: borderStyle,
};

const tableCellStyle = {
  alignment: { vertical: 'center', wrapText: true },
  border: borderStyle,
};

const alternateCellStyle = {
  ...tableCellStyle,
  fill: { fgColor: { rgb: 'F8FAFC' } },
};

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

function applyExcelStyles(worksheet: ReturnType<typeof utils.aoa_to_sheet>, rowCount: number, columnCount: number) {
  const tableHeaderRow = 6;
  const lastColumn = columnCount - 1;

  worksheet['A1'].s = titleStyle;
  worksheet['A2'].s = subtitleStyle;
  worksheet['A4'].s = eventTitleStyle;
  worksheet['A5'].s = generatedAtStyle;

  for (let column = 0; column <= lastColumn; column += 1) {
    const headerCell = utils.encode_cell({ r: tableHeaderRow, c: column });
    if (worksheet[headerCell]) worksheet[headerCell].s = tableHeaderStyle;
  }

  for (let row = tableHeaderRow + 1; row < tableHeaderRow + 1 + rowCount; row += 1) {
    const rowStyle = (row - tableHeaderRow) % 2 === 0 ? alternateCellStyle : tableCellStyle;
    for (let column = 0; column <= lastColumn; column += 1) {
      const cell = utils.encode_cell({ r: row, c: column });
      if (worksheet[cell]) worksheet[cell].s = rowStyle;
    }
  }
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
    }));
}

async function fetchEventInscripcions(eventId: string): Promise<ExportRowBundle[]> {
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
          logs: registration.checkedInAt
            ? [{ checked_in_at: registration.checkedInAt, scanned_by: 'demo-admin', attendance_period: 'matutina' }]
            : [],
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
    .select('registration_id, checked_in_at, scanned_by, attendance_period')
    .in('registration_id', registrationIds)
    .returns<DailyLog[]>();

  if (logError) {
    console.warn('No se pudieron cargar asistencias diarias:', logError.message);
  }

  const scannerIds = [...new Set((logs ?? []).map((row) => row.scanned_by).filter(Boolean))] as string[];
  const { data: scanners } =
    scannerIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', scannerIds)
      : { data: [] };
  const scannerMap = new Map((scanners ?? []).map((row) => [row.id as string, row.full_name as string]));

  const logsByInscripcion = (logs ?? []).reduce<Record<string, ExportRowBundle['logs']>>((acc, row) => {
    const list = acc[row.registration_id] ?? [];
    list.push({
      checked_in_at: row.checked_in_at,
      scanned_by: row.scanned_by,
      attendance_period: row.attendance_period,
      scanner_name: row.scanned_by ? scannerMap.get(row.scanned_by) : undefined,
    });
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
        logs: logsByInscripcion[registration.id] ?? [],
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

function buildExportRows(event: EventoAcademico, rows: ExportRowBundle[]) {
  const isCongreso = getInscripcionFormKind(event.eventType) === 'congreso';

  return rows.map(({ registration, participant, logs }) => {
    const metadata = participant.metadata ?? {};
    const attendance = logs
      .map((log) => `${log.attendance_period ?? 'matutina'} - ${formatDateTime(log.checked_in_at)}`)
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

function buildAttendanceRows(rows: ExportRowBundle[]) {
  return rows.flatMap(({ participant, logs }) =>
    logs.map((log) => {
      const date = new Date(log.checked_in_at);
      return {
        Nombre: participant.first_name,
        Apellido: participant.last_name,
        Cedula: participant.document_id,
        Fecha: date.toLocaleDateString('es-PA'),
        Jornada: log.attendance_period ?? 'matutina',
        Hora: date.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }),
        'Fecha y hora': formatDateTime(log.checked_in_at),
        'Registrado por': log.scanner_name ?? log.scanned_by ?? '',
      };
    }),
  );
}

function buildStyledWorksheet(event: EventoAcademico, sheetRows: Record<string, unknown>[], subtitle = '') {
  const tableHeaders = Object.keys(sheetRows[0]);
  const columnCount = Math.max(tableHeaders.length, 1);
  const eventTitle = `${eventTypeLabels[event.eventType]}: ${event.title}${subtitle ? ` - ${subtitle}` : ''}`;
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
  worksheet['!rows'] = [
    { hpt: 24 },
    { hpt: 21 },
    { hpt: 8 },
    { hpt: 26 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 24 },
  ];
  worksheet['!freeze'] = { xSplit: 0, ySplit: headerRows.length + 1 };
  applyExcelStyles(worksheet, sheetRows.length, columnCount);
  return worksheet;
}

export async function exportEventExcel(event: ExportableEvent) {
  const rows = await fetchEventInscripcions(event.id);
  const sheetRows = buildExportRows(event, rows);
  const attendanceRows = buildAttendanceRows(rows);

  if (sheetRows.length === 0) {
    throw new Error(
      `No hay participantes registrados en "${event.title}". Registre asistentes antes de exportar.`,
    );
  }

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, buildStyledWorksheet(event, sheetRows), 'Participantes');
  if (attendanceRows.length > 0) {
    utils.book_append_sheet(workbook, buildStyledWorksheet(event, attendanceRows, 'ASISTENCIA'), 'Asistencia');
  }
  const typeSlug = slugify(event.eventType);
  const fileName = `${typeSlug}-${slugify(event.title)}.xlsx`;
  writeFile(workbook, fileName);
}

