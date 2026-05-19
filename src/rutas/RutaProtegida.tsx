import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

export function RutaProtegida({ children }: PropsWithChildren) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAutenticacion();

  if (isLoading) {
    return <div className="screen-loader">Validando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

