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
import { PaginaActualizarContrasena } from '@/modulos/autenticacion/paginas/PaginaActualizarContrasena';
import { PaginaRecuperarContrasena } from '@/modulos/autenticacion/paginas/PaginaRecuperarContrasena';
import { PaginaParticipantes } from '@/modulos/participantes/paginas/PaginaParticipantes';
import { PaginaRegistroParticipante } from '@/modulos/registro/paginas/PaginaRegistroParticipante';
import { PaginaConsultaQrParticipante } from '@/modulos/registro/paginas/PaginaConsultaQrParticipante';
import { PaginaEscaner } from '@/modulos/asistencia/paginas/PaginaEscaner';
import { PaginaCertificados } from '@/modulos/certificados/paginas/PaginaCertificados';
import { PaginaExportaciones } from '@/modulos/exportaciones/paginas/PaginaExportaciones';
import { PaginaHistorial } from '@/modulos/historial/paginas/PaginaHistorial';
import { PaginaUsuarios } from '@/modulos/administracion/paginas/PaginaUsuarios';
import { PaginaMiCuenta } from '@/modulos/autenticacion/paginas/PaginaMiCuenta';
import { PaginaNoEncontrada } from '@/paginas/PaginaNoEncontrada';

export const enrutador = createBrowserRouter([
  {
    element: <LayoutAutenticacion />,
    children: [
      { path: '/login', element: <PaginaLogin /> },
      { path: '/recuperar-contrasena', element: <PaginaRecuperarContrasena /> },
      { path: '/actualizar-contrasena', element: <PaginaActualizarContrasena /> },
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
      {
        path: '/dashboard',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaPanel />
          </GuardaRol>
        ),
      },
      {
        path: '/eventos',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaEventos />
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/nuevo',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaFormularioEvento />
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/:eventId',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaDetalleEvento />
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/:eventId/editar',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaFormularioEvento />
          </GuardaRol>
        ),
      },
      {
        path: '/participantes',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaParticipantes />
          </GuardaRol>
        ),
      },
      {
        path: '/asistencia/escanear',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador', 'scanner']}>
            <PaginaEscaner />
          </GuardaRol>
        ),
      },
      {
        path: '/certificados',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaCertificados />
          </GuardaRol>
        ),
      },
      {
        path: '/exportaciones',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaExportaciones />
          </GuardaRol>
        ),
      },
      {
        path: '/usuarios',
        element: (
          <GuardaRol roles={['propietario', 'admin']}>
            <PaginaUsuarios />
          </GuardaRol>
        ),
      },
      {
        path: '/mi-cuenta',
        element: <PaginaMiCuenta />,
      },
      {
        path: '/historial',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <PaginaHistorial />
          </GuardaRol>
        ),
      },
    ],
  },
  { path: '*', element: <PaginaNoEncontrada /> },
]);

