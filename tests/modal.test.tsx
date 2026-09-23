// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConfirmacionModal } from '../src/componentes/interfaz/ConfirmacionModal';
afterEach(cleanup);
test('dialog focuses, traps Tab, handles Escape and restores previous focus', () => {
  const trigger=document.createElement('button'); document.body.append(trigger); trigger.focus();
  const cancel=vi.fn();
  const {unmount}=render(<ConfirmacionModal isOpen title="Confirmar" message="Mensaje" onCancel={cancel} onConfirm={vi.fn()} />);
  const close=screen.getByRole('button',{name:'Cerrar'});
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(document,{key:'Tab',shiftKey:true});
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Confirmar'}));
  fireEvent.keyDown(document,{key:'Tab'});
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(document,{key:'Escape'}); expect(cancel).toHaveBeenCalledOnce();
  unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
});
