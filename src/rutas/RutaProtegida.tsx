import { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

export function RutaProtegida({ children }: PropsWithChildren) {
  const location = useLocation();
  const { isAuthenticated, isLoading, profile } = useAutenticacion();

  if (isLoading) {
    return <div className="screen-loader">Validando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profile?.role === 'recepcion' && location.pathname !== '/recepcion-prestamos') {
    return <Navigate to="/recepcion-prestamos" replace />;
  }
  return children;
}

