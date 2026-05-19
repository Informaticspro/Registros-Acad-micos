import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { AppRole } from '@/types/domain';
import { useAuth } from '@/features/auth/hooks/useAuth';

type RoleGuardProps = PropsWithChildren<{
  roles: AppRole[];
}>;

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { profile } = useAuth();

  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
