# Arquitectura

## Objetivo

Base profesional para registro y control de asistencia de eventos académicos con React, Supabase, autenticación por roles, QR, certificados PDF y exportaciones.

## Capas

- `src/routes`: definición de rutas, protección de sesión y guardas por rol.
- `src/components`: layout y componentes reutilizables de interfaz.
- `src/features`: módulos funcionales por dominio.
- `src/services`: acceso a Supabase y contratos de datos.
- `src/lib`: clientes compartidos, configuración y utilidades de infraestructura.
- `src/types`: tipos de dominio y tipos de Supabase.
- `supabase`: migraciones SQL, funciones y políticas RLS.

## Rutas principales

- `/login`: acceso administrativo.
- `/dashboard`: métricas operativas.
- `/eventos`: listado y CRUD de eventos.
- `/eventos/nuevo`: creación de evento.
- `/eventos/:eventId`: detalle operativo.
- `/eventos/:eventId/registro`: registro público del participante.
- `/participantes`: CRUD de participantes.
- `/asistencia/escanear`: validación QR.
- `/certificados`: emisión PDF.
- `/exportaciones`: Excel/PDF.
- `/historial`: archivo de eventos.

## Supabase

Tablas principales:

- `organizations`
- `profiles`
- `events`
- `participants`
- `registrations`
- `attendance_records`
- `certificate_issues`

Las políticas RLS están en `supabase/schema.sql`. El modelo está pensado para multi-evento y multi-organización, con control por roles `admin`, `organizador` y `scanner`.

## Conexión

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL editor.
3. Copiar `.env.example` a `.env`.
4. Definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
5. Crear usuarios en Supabase Auth.
6. Insertar cada usuario en `profiles` con su rol.
7. Ejecutar `npm install` y `npm run dev`.

## Preparación APK

La app está preparada para empaquetarse más adelante con Capacitor. La capa web no depende de APIs exclusivas de escritorio y el flujo de escaneo está aislado para poder cambiarlo por cámara nativa cuando se haga el build móvil.
