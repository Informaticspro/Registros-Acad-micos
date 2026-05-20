import { EventoAcademico } from '@/tipos/dominio';

export type InscripcionFormKind = 'simple' | 'congreso';

export function getInscripcionFormKind(
  eventType: EventoAcademico['eventType'] | undefined,
): InscripcionFormKind {
  if (eventType === 'congreso') return 'congreso';
  return 'simple';
}

export function getInscripcionFormHint(kind: InscripcionFormKind): string {
  if (kind === 'congreso') {
    return 'Formulario de congreso: datos extendidos para certificado y reportes.';
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

