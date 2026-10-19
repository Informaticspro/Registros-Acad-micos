// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { validarImagen } from '../src/modulos/laboratorio/galeria.servicio';

test('gallery validates file type, nonempty content and maximum image size', () => {
  expect(() => validarImagen(new File(['image'], 'reference.png', { type: 'image/png' }))).not.toThrow();
  expect(() => validarImagen(new File(['<svg/>'], 'reference.svg', { type: 'image/svg+xml' }))).toThrow('JPG');
  expect(() => validarImagen(new File([], 'empty.png', { type: 'image/png' }))).toThrow('vacía');
  expect(() => validarImagen(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }))).toThrow('10 MB');
});
