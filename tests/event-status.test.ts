import { expect, test } from 'vitest';
import { getEstadoEventoPorFecha, isRegistroPermanenteEvento } from '../src/utilidades/estado-evento';

test('closed events remain closed even when permanent', () => {
  expect(getEstadoEventoPorFecha({ status: 'closed', isPermanent: true, startsAt: null, endsAt: null })).toBe('closed');
});
test('an explicit nonpermanent setting takes precedence over the title', () => {
  expect(isRegistroPermanenteEvento({ isPermanent: false, eventType: 'seminario', title: 'Maestría en informática intermedia' })).toBe(false);
});
test('an expired published event is unavailable while a permanent draft stays a draft', () => {
  expect(getEstadoEventoPorFecha({ status: 'published', isPermanent: false, startsAt: null, endsAt: '2026-01-01T00:00:00Z' }, new Date('2026-09-23'))).toBe('closed');
  expect(getEstadoEventoPorFecha({ status: 'draft', isPermanent: true, startsAt: null, endsAt: null })).toBe('draft');
});
