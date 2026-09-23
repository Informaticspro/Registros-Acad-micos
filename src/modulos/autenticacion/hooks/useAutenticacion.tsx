import { useContext } from 'react';
import { AuthContext } from './contexto-autenticacion';
export function useAutenticacion() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAutenticacion debe usarse dentro de ProveedorAutenticacion');
  }
  return value;
}

