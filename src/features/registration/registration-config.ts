import { AcademicEvent } from '@/types/domain';

export type RegistrationFormKind = 'simple' | 'congreso';

export function getRegistrationFormKind(
  eventType: AcademicEvent['eventType'] | undefined,
): RegistrationFormKind {
  if (eventType === 'congreso') return 'congreso';
  return 'simple';
}

export function getRegistrationFormHint(kind: RegistrationFormKind): string {
  if (kind === 'congreso') {
    return 'Formulario de congreso: datos extendidos para certificado y reportes.';
  }
  return 'Formulario simple: nombre, apellido, cédula y correo institucional.';
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
