import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { EventDetailPage } from '@/features/events/pages/EventDetailPage';
import { EventFormPage } from '@/features/events/pages/EventFormPage';
import { EventsPage } from '@/features/events/pages/EventsPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ParticipantsPage } from '@/features/participants/pages/ParticipantsPage';
import { RegisterParticipantPage } from '@/features/registration/pages/RegisterParticipantPage';
import { ScannerPage } from '@/features/attendance/pages/ScannerPage';
import { CertificatesPage } from '@/features/certificates/pages/CertificatesPage';
import { ExportsPage } from '@/features/exports/pages/ExportsPage';
import { HistoryPage } from '@/features/history/pages/HistoryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/eventos/:eventId/registro', element: <RegisterParticipantPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/eventos', element: <EventsPage /> },
      {
        path: '/eventos/nuevo',
        element: (
          <RoleGuard roles={['admin', 'organizador']}>
            <EventFormPage />
          </RoleGuard>
        ),
      },
      { path: '/eventos/:eventId', element: <EventDetailPage /> },
      {
        path: '/eventos/:eventId/editar',
        element: (
          <RoleGuard roles={['admin', 'organizador']}>
            <EventFormPage />
          </RoleGuard>
        ),
      },
      { path: '/participantes', element: <ParticipantsPage /> },
      {
        path: '/asistencia/escanear',
        element: (
          <RoleGuard roles={['admin', 'organizador', 'scanner']}>
            <ScannerPage />
          </RoleGuard>
        ),
      },
      { path: '/certificados', element: <CertificatesPage /> },
      { path: '/exportaciones', element: <ExportsPage /> },
      { path: '/historial', element: <HistoryPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
