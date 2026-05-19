import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LayoutAplicacion } from '@/componentes/estructura/LayoutAplicacion';
import { LayoutAutenticacion } from '@/componentes/estructura/LayoutAutenticacion';
import { RutaProtegida } from '@/rutas/RutaProtegida';
import { GuardaRol } from '@/rutas/GuardaRol';
import { RedireccionRegistroEvento } from '@/rutas/RedireccionRegistroEvento';
import { PaginaPanel } from '@/modulos/panel/paginas/PaginaPanel';
import { PaginaDetalleEvento } from '@/modulos/eventos/paginas/PaginaDetalleEvento';
import { PaginaFormularioEvento } from '@/modulos/eventos/paginas/PaginaFormularioEvento';
import { PaginaEventos } from '@/modulos/eventos/paginas/PaginaEventos';
import { PaginaLogin } from '@/modulos/autenticacion/paginas/PaginaLogin';
import { PaginaParticipantes } from '@/modulos/participantes/paginas/PaginaParticipantes';
import { PaginaRegistroParticipante } from '@/modulos/registro/paginas/PaginaRegistroParticipante';
import { PaginaConsultaQrParticipante } from '@/modulos/registro/paginas/PaginaConsultaQrParticipante';
import { PaginaEscaner } from '@/modulos/asistencia/paginas/PaginaEscaner';
import { PaginaCertificados } from '@/modulos/certificados/paginas/PaginaCertificados';
import { PaginaExportaciones } from '@/modulos/exportaciones/paginas/PaginaExportaciones';
import { PaginaHistorial } from '@/modulos/historial/paginas/PaginaHistorial';
import { PaginaUsuarios } from '@/modulos/administracion/paginas/PaginaUsuarios';
import { PaginaNoEncontrada } from '@/paginas/PaginaNoEncontrada';

export const enrutador = createBrowserRouter([
  {
    element: <LayoutAutenticacion />,
    children: [
      { path: '/login', element: <PaginaLogin /> },
      { path: '/eventos/:eventId/registr', element: <RedireccionRegistroEvento /> },
      { path: '/eventos/:eventId/register', element: <RedireccionRegistroEvento /> },
      { path: '/eventos/:eventId/registro', element: <PaginaRegistroParticipante /> },
      { path: '/mi-codigo', element: <PaginaConsultaQrParticipante /> },
      { path: '/eventos/:eventId/mi-codigo', element: <PaginaConsultaQrParticipante /> },
    ],
  },
  {
    element: (
      <RutaProtegida>
        <LayoutAplicacion />
      </RutaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <PaginaPanel /> },
      { path: '/eventos', element: <PaginaEventos /> },
      {
        path: '/eventos/nuevo',
        element: (
          <GuardaRol roles={['admin', 'organizador']}>
            <PaginaFormularioEvento />
          </GuardaRol>
        ),
      },
      { path: '/eventos/:eventId', element: <PaginaDetalleEvento /> },
      {
        path: '/eventos/:eventId/editar',
        element: (
          <GuardaRol roles={['admin', 'organizador']}>
            <PaginaFormularioEvento />
          </GuardaRol>
        ),
      },
      { path: '/participantes', element: <PaginaParticipantes /> },
      {
        path: '/asistencia/escanear',
        element: (
          <GuardaRol roles={['admin', 'organizador', 'scanner']}>
            <PaginaEscaner />
          </GuardaRol>
        ),
      },
      { path: '/certificados', element: <PaginaCertificados /> },
      { path: '/exportaciones', element: <PaginaExportaciones /> },
      {
        path: '/usuarios',
        element: (
          <GuardaRol roles={['admin']}>
            <PaginaUsuarios />
          </GuardaRol>
        ),
      },
      { path: '/historial', element: <PaginaHistorial /> },
    ],
  },
  { path: '*', element: <PaginaNoEncontrada /> },
]);

