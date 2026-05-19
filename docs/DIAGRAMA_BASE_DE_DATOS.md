# Diagrama De Base De Datos

```mermaid
erDiagram
  organizations ||--o{ profiles : "tiene usuarios"
  organizations ||--o{ events : "administra eventos"
  organizations ||--o{ participants : "registra participantes"

  profiles ||--o{ events : "organiza"
  events ||--o{ registrations : "recibe inscripciones"
  participants ||--o{ registrations : "se inscribe"

  registrations ||--o| attendance_records : "genera asistencia principal"
  registrations ||--o{ attendance_daily_logs : "genera marcajes diarios"
  registrations ||--o| certificate_issues : "emite certificado"

  profiles ||--o{ attendance_records : "escanea"
  profiles ||--o{ attendance_daily_logs : "marca"
```

## Flujo Principal

1. `organizations`: representa la institucion.
2. `profiles`: usuarios internos del sistema.
3. `events`: eventos creados por admin u organizador.
4. `participants`: personas que llenan el formulario.
5. `registrations`: inscripcion del participante en un evento.
6. `attendance_records`: asistencia inicial o principal.
7. `attendance_daily_logs`: marcajes adicionales por dia/hora.
8. `certificate_issues`: certificados emitidos.

## Como Leerlo En Supabase

Ejecuta:

```sql
select * from public.vista_eventos;
select * from public.vista_participantes;
select * from public.vista_inscripciones;
select * from public.vista_asistencias;
```

Estas vistas no reemplazan las tablas reales. Solo son una capa de lectura en español.
