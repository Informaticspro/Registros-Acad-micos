// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AvisoActualizacion } from '../src/componentes/estructura/AvisoActualizacion';

test('a new service worker offers a deliberate update instead of interrupting an edited form', async () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  const worker = Object.assign(new EventTarget(), { controller: {}, ready: Promise.resolve({ update: vi.fn(async () => {}) }) });
  Object.defineProperty(navigator, 'serviceWorker', { value: worker, configurable: true });
  try {
    await act(async () => { render(<AvisoActualizacion />); });
    expect(screen.queryByRole('status')).toBeNull();
    act(() => worker.dispatchEvent(new Event('controllerchange')));
    expect(screen.getByRole('status').textContent).toContain('Guarde lo que esté editando');
    expect(screen.getByRole('button', { name: 'Actualizar aplicación' })).toBeTruthy();
  } finally {
    cleanup();
    if (previous) Object.defineProperty(navigator, 'serviceWorker', previous);
    else Reflect.deleteProperty(navigator, 'serviceWorker');
  }
});
