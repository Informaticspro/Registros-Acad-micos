import { EventoAcademico } from '@/tipos/dominio';

export type InscripcionFormKind = 'simple' | 'congreso' | 'seminario' | 'seminario_general';

export type TipoFormularioSeminario = NonNullable<EventoAcademico['registrationFormType']>;

export const SEMINARIO_INFORMATICA_INTERMEDIA_TITULO =
  'Seminario de Informatica Intermedia como requisito de Posgrado y Maestria';

export function getInscripcionFormKind(
  eventOrType: EventoAcademico | EventoAcademico['eventType'] | undefined,
): InscripcionFormKind {
  const eventType = typeof eventOrType === 'string' ? eventOrType : eventOrType?.eventType;
  if (eventType === 'congreso') return 'congreso';
  if (eventType === 'seminario') {
    const registrationFormType = typeof eventOrType === 'string' ? null : eventOrType?.registrationFormType;
    return registrationFormType === 'educacion_continua' ? 'seminario' : 'seminario_general';
  }
  return 'simple';
}

export function getInscripcionFormHint(kind: InscripcionFormKind): string {
  if (kind === 'congreso') {
    return 'Formulario de congreso: datos extendidos para certificado y reportes.';
  }
  if (kind === 'seminario') {
    return 'Formulario de seminario de educacion continua: datos academicos, contacto, fecha disponible y motivo de participacion.';
  }
  if (kind === 'seminario_general') {
    return 'Formulario de seminario general: datos de contacto, facultad, centro universitario y tipo de participante.';
  }
  return 'Formulario simple: nombre, apellido, cedula y correo institucional.';
}

export const CONGRESO_METADATA_FIELDS = [
  'sex',
  'category',
  'personalEmail',
  'nationality',
  'otherNationality',
  'modality',
  'participationType',
] as const;

export type CongresoMetadataField = (typeof CONGRESO_METADATA_FIELDS)[number];

export const CONGRESO_MODALITY_OPTIONS = [
  {
    value: 'estudiante_plan_1',
    label: 'Estudiante-Plan 1: $15.00 (congreso presencial y virtual, talleres, refrigerios, certificados, otros)',
  },
  {
    value: 'estudiante_plan_2',
    label: 'Estudiante-Plan 2: $25.00 (congreso todo incluido + cena)',
  },
  {
    value: 'administrativo',
    label: 'Administrativo: $30.00',
  },
  {
    value: 'estudiante_postgrado',
    label: 'Estudiante de postgrado: $25.00',
  },
  {
    value: 'docente_plan_1',
    label: 'Docente-Plan 1: $60.00 (TC)',
  },
  {
    value: 'docente_plan_2',
    label: 'Docente-Plan 2: $50.00 (TM)',
  },
  {
    value: 'docente_plan_3',
    label: 'Docente-Plan 3: $40.00 (EVE)',
  },
  {
    value: 'publico_general',
    label: 'Publico en general: $50.00',
  },
] as const;

export const CONGRESO_SEX_OPTIONS = ['Hombre', 'Mujer'] as const;

export const CONGRESO_NATIONALITY_OPTIONS = ['Panamena', 'Otra'] as const;

export const CONGRESO_CATEGORY_OPTIONS = ['Estudiante', 'Docente', 'Funcionario', 'Invitado', 'Egresado'] as const;

export const CONGRESO_PARTICIPATION_TYPE_OPTIONS = ['Interno a la universidad', 'Externo a la universidad'] as const;

export const SEMINARIO_METADATA_FIELDS = [
  'institutionalEmail',
  'personalEmail',
  'sex',
  'hasDisability',
  'disabilityDetail',
  'phone',
  'virtualClassEmail',
  'faculty',
  'regionalCenter',
  'participantType',
  'seminarDate',
  'seminarPurpose',
] as const;

export type SeminarioMetadataField = (typeof SEMINARIO_METADATA_FIELDS)[number];

export const SEMINARIO_SEX_OPTIONS = ['Mujer', 'Hombre'] as const;

export const SEMINARIO_DISABILITY_OPTIONS = ['SI', 'NO'] as const;

export const SEMINARIO_FACULTY_OPTIONS = [
  'Economia',
  'Adm. Publica',
  'Ciencias de la Educacion',
  'Adm. de Empresas y Contabilidad',
  'Derecho y Ciencias Politicas',
  'Comunicacion Social',
  'Humanidades',
  'Enfermeria',
  'Medicina',
  'Arquitectura',
  'VIP',
] as const;

export const SEMINARIO_REGIONAL_CENTER_OPTIONS = [
  'Campus Central',
  'CRUTA',
  'CRUBA',
  'CRUCHIO',
  'BOQUETE',
] as const;

export const SEMINARIO_PARTICIPANT_TYPE_OPTIONS = ['Docente', 'Estudiante'] as const;

export const SEMINARIO_GENERAL_REGIONAL_CENTER_OPTIONS = [
  ...SEMINARIO_REGIONAL_CENTER_OPTIONS,
  'Otra universidad / fuera de la UNACHI',
] as const;

export const SEMINARIO_GENERAL_PARTICIPANT_TYPE_OPTIONS = [
  'Docente',
  'Estudiante',
  'Administrativo',
  'Otros',
] as const;

export const SEMINARIO_DATE_OPTIONS = [
  'Del 10 al 14 de Agosto',
  'Del 24 al 28 de Agosto',
  'Del 07 al 11 de Septiembre',
  'Del 21 al 25 de Septiembre',
  'Del 12 al 16 de Octubre',
  'Del 26 al 30 de Octubre',
  'Del 09 al 13 de Noviembre',
  'Del 23 al 27 de Noviembre',
] as const;

export const SEMINARIO_PURPOSE_OPTIONS = [
  'Requisito de ingreso a posgrado y maestria',
  'Actualizacion de informatica',
  'Requisito para terminar posgrado o maestria',
] as const;

