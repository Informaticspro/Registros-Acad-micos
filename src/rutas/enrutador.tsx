import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LayoutAplicacion } from '@/componentes/estructura/LayoutAplicacion';
import { LayoutAutenticacion } from '@/componentes/estructura/LayoutAutenticacion';
import { RutaProtegida } from '@/rutas/RutaProtegida';
import { GuardaRol } from '@/rutas/GuardaRol';
import { RedireccionRegistroEvento } from '@/rutas/RedireccionRegistroEvento';
const PaginaPanel = lazy(() => import('@/modulos/panel/paginas/PaginaPanel').then(module => ({ default: module.PaginaPanel })));
const PaginaDetalleEvento = lazy(() => import('@/modulos/eventos/paginas/PaginaDetalleEvento').then(module => ({ default: module.PaginaDetalleEvento })));
const PaginaFormularioEvento = lazy(() => import('@/modulos/eventos/paginas/PaginaFormularioEvento').then(module => ({ default: module.PaginaFormularioEvento })));
const PaginaEventos = lazy(() => import('@/modulos/eventos/paginas/PaginaEventos').then(module => ({ default: module.PaginaEventos })));
const PaginaLogin = lazy(() => import('@/modulos/autenticacion/paginas/PaginaLogin').then(module => ({ default: module.PaginaLogin })));
const PaginaActualizarContrasena = lazy(() => import('@/modulos/autenticacion/paginas/PaginaActualizarContrasena').then(module => ({ default: module.PaginaActualizarContrasena })));
const PaginaRecuperarContrasena = lazy(() => import('@/modulos/autenticacion/paginas/PaginaRecuperarContrasena').then(module => ({ default: module.PaginaRecuperarContrasena })));
const PaginaParticipantes = lazy(() => import('@/modulos/participantes/paginas/PaginaParticipantes').then(module => ({ default: module.PaginaParticipantes })));
const PaginaRegistroParticipante = lazy(() => import('@/modulos/registro/paginas/PaginaRegistroParticipante').then(module => ({ default: module.PaginaRegistroParticipante })));
const PaginaConsultaQrParticipante = lazy(() => import('@/modulos/registro/paginas/PaginaConsultaQrParticipante').then(module => ({ default: module.PaginaConsultaQrParticipante })));
const PaginaEscaner = lazy(() => import('@/modulos/asistencia/paginas/PaginaEscaner').then(module => ({ default: module.PaginaEscaner })));
const PaginaCertificados = lazy(() => import('@/modulos/certificados/paginas/PaginaCertificados').then(module => ({ default: module.PaginaCertificados })));
const PaginaExportaciones = lazy(() => import('@/modulos/exportaciones/paginas/PaginaExportaciones').then(module => ({ default: module.PaginaExportaciones })));
const PaginaHistorial = lazy(() => import('@/modulos/historial/paginas/PaginaHistorial').then(module => ({ default: module.PaginaHistorial })));
const PaginaUsuarios = lazy(() => import('@/modulos/administracion/paginas/PaginaUsuarios').then(module => ({ default: module.PaginaUsuarios })));
const PaginaMiCuenta = lazy(() => import('@/modulos/autenticacion/paginas/PaginaMiCuenta').then(module => ({ default: module.PaginaMiCuenta })));
const PaginaLaboratorio = lazy(() => import('@/modulos/laboratorio/paginas/PaginaLaboratorio').then(module => ({ default: module.PaginaLaboratorio })));
const PaginaEquipoLaboratorio = lazy(() => import('@/modulos/laboratorio/paginas/PaginaEquipoLaboratorio').then(module => ({ default: module.PaginaEquipoLaboratorio })));
const PaginaNoEncontrada = lazy(() => import('@/paginas/PaginaNoEncontrada').then(module => ({ default: module.PaginaNoEncontrada })));

export const enrutador = createBrowserRouter([
  {
    element: <LayoutAutenticacion />,
    children: [
      { path: '/login', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaLogin /></Suspense> },
      { path: '/recuperar-contrasena', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaRecuperarContrasena /></Suspense> },
      { path: '/actualizar-contrasena', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaActualizarContrasena /></Suspense> },
      { path: '/eventos/:eventId/registr', element: <RedireccionRegistroEvento /> },
      { path: '/eventos/:eventId/register', element: <RedireccionRegistroEvento /> },
      { path: '/eventos/:eventId/registro', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaRegistroParticipante /></Suspense> },
      { path: '/mi-codigo', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaConsultaQrParticipante /></Suspense> },
      { path: '/eventos/:eventId/mi-codigo', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaConsultaQrParticipante /></Suspense> },
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
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaPanel /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/eventos',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaEventos /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/nuevo',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaFormularioEvento /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/:eventId',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaDetalleEvento /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/eventos/:eventId/editar',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaFormularioEvento /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/participantes',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaParticipantes /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/laboratorio',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'soporte']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaLaboratorio /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/laboratorio/equipos/:equipoId',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'soporte']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaEquipoLaboratorio /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/asistencia/escanear',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador', 'scanner']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaEscaner /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/certificados',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaCertificados /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/exportaciones',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaExportaciones /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/usuarios',
        element: (
          <GuardaRol roles={['propietario', 'admin']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaUsuarios /></Suspense>
          </GuardaRol>
        ),
      },
      {
        path: '/mi-cuenta',
        element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaMiCuenta /></Suspense>,
      },
      {
        path: '/historial',
        element: (
          <GuardaRol roles={['propietario', 'admin', 'organizador']}>
            <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaHistorial /></Suspense>
          </GuardaRol>
        ),
      },
    ],
  },
  { path: '*', element: <Suspense fallback={<p role="status">Cargando página...</p>}><PaginaNoEncontrada /></Suspense> },
]);

