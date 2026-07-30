import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { RolAplicacion } from '@/tipos/dominio';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';

type GuardaRolProps = PropsWithChildren<{
  roles: RolAplicacion[];
}>;

export function GuardaRol({ roles, children }: GuardaRolProps) {
  const { profile } = useAutenticacion();

  if (!profile || !roles.includes(profile.role)) {
    const target =
      profile?.role === 'scanner' ? '/asistencia/escanear' : profile?.role === 'soporte' ? '/laboratorio' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
}

