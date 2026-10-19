// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { VisorImagen } from '../src/modulos/laboratorio/componentes/VisorImagen';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('image viewer shows the selected image, closes on cancel and restores focus', () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const trigger = document.createElement('button');
  document.body.append(trigger); trigger.focus();
  const close = vi.fn();
  const view = render(<VisorImagen imagen={{ name: 'photo', title: 'Referencia.png', url: 'https://example.test/reference.png', createdAt: '' }} onClose={close} />);
  const dialog = screen.getByRole('dialog', { name: 'Referencia.png' });
  expect(screen.getByAltText('Referencia.png').getAttribute('src')).toBe('https://example.test/reference.png');
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
