// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { ProveedorAutenticacion } from '../src/modulos/autenticacion/hooks/ProveedorAutenticacion';
import { useAutenticacion } from '../src/modulos/autenticacion/hooks/useAutenticacion';

const mock = vi.hoisted(() => ({ getUser: vi.fn(), signIn: vi.fn(), profile: vi.fn(), onChange: vi.fn() }));
vi.mock('../src/infraestructura/entorno', () => ({ isDemoMode: () => false }));
vi.mock('../src/infraestructura/supabase', () => ({ supabase: {
  auth: { getUser: mock.getUser, signInWithPassword: mock.signIn, onAuthStateChange: mock.onChange },
  from: () => ({ select: () => ({ eq: () => ({ single: mock.profile }) }) }),
} }));
let auth: ReturnType<typeof useAutenticacion>;
function Consumer() {
  auth = useAutenticacion();
  return <span>{auth.isLoading ? 'loading' : auth.profile?.fullName ?? 'signed-out'}</span>;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mock.onChange.mockReturnValue({ data: { listener: null, subscription: { unsubscribe: vi.fn() } } });
});
afterEach(cleanup);

test('failed session request releases the loading screen', async () => {
  mock.getUser.mockRejectedValue(new Error('offline'));
  render(<ProveedorAutenticacion><Consumer /></ProveedorAutenticacion>);
  await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
});

test('failed sign-in network request always clears loading', async () => {
  render(<ProveedorAutenticacion><Consumer /></ProveedorAutenticacion>);
  await screen.findByText('signed-out');
  mock.signIn.mockRejectedValue(new Error('offline'));
  await act(async () => { await expect(auth.signIn('demo@example.test', 'test-only')).rejects.toThrow('offline'); });
  expect(screen.getByText('signed-out')).toBeTruthy();
});

test('a profile response arriving after sign-out cannot restore the session', async () => {
  mock.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null });
  let resolveProfile!: (value: unknown) => void;
  mock.profile.mockReturnValue(new Promise(resolve => { resolveProfile = resolve; }));
  render(<ProveedorAutenticacion><Consumer /></ProveedorAutenticacion>);
  await waitFor(() => expect(mock.profile).toHaveBeenCalled());
  await act(async () => {
    mock.onChange.mock.calls[0][0]('SIGNED_OUT', null);
    resolveProfile({ data: { id: 'test-user', full_name: 'Old session', email: 'test@example.test', role: 'admin' }, error: null });
  });
  expect(screen.getByText('signed-out')).toBeTruthy();
});
