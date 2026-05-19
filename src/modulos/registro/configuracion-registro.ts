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
  'entity',
] as const;

export type CongresoMetadataField = (typeof CONGRESO_METADATA_FIELDS)[number];

export const CONGRESO_MODALITY_OPTIONS = [
  {
    value: 'estudiante_plan_1',
    label: 'Estudiante-Plan 1: $20.00 (congreso presencial y virtual, talleres, refrigerios, certificados, otros)',
  },
  {
    value: 'estudiante_plan_2',
    label: 'Estudiante-Plan 2: $15.00 (congreso virtual, certificados, otros)',
  },
  {
    value: 'profesional_plan_1',
    label: 'Profesional-Plan 1: $40.00 (congreso presencial y virtual, talleres, refrigerios, certificados, otros)',
  },
  {
    value: 'profesional_plan_2',
    label: 'Profesional-Plan 2: $30.00 (congreso virtual, certificados, otros)',
  },
] as const;

