# Base De Datos En Español

Este proyecto ya usa Supabase con tablas en ingles porque asi se construyo la primera version y ya existen datos reales. Renombrar tablas fisicamente en una base con datos puede romper funciones, politicas RLS, exportaciones y la app desplegada.

Por ahora, este es el mapa recomendado para entender la base:

| Tabla Supabase | Nombre en español | Uso |
| --- | --- | --- |
| `organizations` | organizaciones | Instituciones o unidades academicas que administran eventos. |
| `profiles` | perfiles de usuarios | Usuarios del sistema: admin, organizador y scanner. |
| `events` | eventos | Seminarios, congresos, talleres, capacitaciones y eventos universitarios. |
| `participants` | participantes | Personas registradas desde QR o manualmente. |
| `registrations` | inscripciones | Union entre participante y evento; guarda QR personal y codigo de certificado. |
| `attendance_records` | asistencias principales | Primer registro de asistencia asociado a la inscripcion. |
| `attendance_daily_logs` | marcajes diarios | Llegadas por dia/hora para congresos o eventos de varios dias. |
| `certificate_issues` | certificados emitidos | Control de certificados PDF generados o descargados. |

## Campos Importantes

### `participants`

- `first_name`: nombre.
- `last_name`: apellido.
- `document_id`: cedula o documento.
- `email`: correo institucional.
- `institution`: institucion, si aplica.
- `metadata`: datos adicionales en formato JSON.

Para congresos, `metadata` guarda:

- `sex`: sexo.
- `category`: categoria.
- `personalEmail`: correo personal.
- `nationality`: nacionalidad.
- `otherNationality`: otra nacionalidad.
- `modality`: modalidad.
- `participationType`: tipo de participacion.

### `registrations`

- `event_id`: evento.
- `participant_id`: participante.
- `qr_token`: codigo QR personal del participante.
- `certificate_code`: codigo del certificado.
- `checked_in_at`: primera asistencia registrada.

### `attendance_daily_logs`

Se usa para registrar llegadas adicionales, especialmente en congresos de varios dias.

## Si Quieres Renombrar Tablas Fisicamente

Se puede hacer, pero debe ser una migracion planeada. Por ejemplo:

- `events` -> `eventos`
- `participants` -> `participantes`
- `registrations` -> `inscripciones`
- `attendance_records` -> `asistencias`

Antes de hacerlo hay que actualizar:

- funciones RPC;
- politicas RLS;
- servicios del frontend;
- exportaciones;
- scripts de Netlify;
- tipos Supabase.

Mi recomendacion: mantener nombres fisicos estables en Supabase y usar nombres en español en carpetas, componentes, servicios y documentacion.
