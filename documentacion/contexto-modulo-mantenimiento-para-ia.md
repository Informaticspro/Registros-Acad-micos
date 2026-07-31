# Contexto para IA: Modulo de Mantenimiento Tecnico

Este documento resume el modulo de mantenimiento tecnico del sistema **Registros Academicos - Facultad de Economia**. Sirve para que otra IA o desarrollador pueda entender rapidamente lo construido, ayudar con errores y proponer mejoras sin romper la estructura actual.

## Objetivo del modulo

El modulo de mantenimiento tecnico es un area exclusiva para administradores, propietario y personal de soporte. Su proposito es llevar control del trabajo diario del laboratorio de informatica:

- Inventario de equipos.
- Bitacoras de mantenimiento e incidencias.
- Fichas tecnicas por equipo.
- Prestamos de equipos o dispositivos.
- Informes tecnicos para seguimiento interno y jefatura.
- Actividad reciente del area tecnica.

La idea principal es que todo trabajo realizado quede registrado para poder generar informes por fecha, equipo, ubicacion o estado.

## Archivos principales

- `src/modulos/laboratorio/paginas/PaginaLaboratorio.tsx`
  - Pantalla principal del modulo tecnico.
  - Controla pestañas: inicio, ficha tecnica, bitacoras, inventario, prestamos e informes.
  - Maneja cambios rapidos de estado desde inventario.
  - Muestra actividad reciente.
  - Sincroniza bitacoras con el estado del inventario.

- `src/servicios/laboratorio.servicio.ts`
  - Servicio principal del modulo.
  - Lee y guarda datos en Supabase.
  - Tiene fallback local con `localStorage` si Supabase no esta configurado.
  - Genera reportes Excel y textos de resumen.
  - Importa inventario desde Excel.

- `src/tipos/dominio.ts`
  - Define tipos del dominio: equipos, fichas tecnicas, bitacoras, prestamos, estados, roles, etc.

- `src/tipos/supabase.ts`
  - Tipos aproximados de tablas Supabase usadas por el sistema.

- `supabase/migration-v8-laboratorio-soporte.sql`
  - Migracion base del modulo laboratorio.

- `supabase/migration-v9-fichas-tecnicas-laboratorio.sql`
  - Fichas tecnicas del laboratorio.

- `supabase/migration-v12-secciones-laboratorio.sql`
  - Catalogo administrable de secciones/ubicaciones.

- `supabase/migration-v13-catalogos-equipo-laboratorio.sql`
  - Catalogos administrables de categorias y estados de equipos.

- `supabase/migration-v14-mantenimiento-e-incidencias.sql`
  - Agrega campos para asociar bitacoras con equipos:
    - `entry_type`
    - `equipment_id`

## Tablas principales en Supabase

Las tablas usan nombres en ingles porque el proyecto inicio asi. Nuevas tablas futuras pueden crearse en español si se decide.

### `laboratory_equipment`

Inventario de equipos.

Campos relevantes:

- `id`
- `organization_id`
- `code`: numero de inventario o codigo interno.
- `name`: nombre del equipo, por ejemplo `PC 1`.
- `category`: computadora, laptop, monitor, impresora, redes, accesorio.
- `brand_model`: actualmente guarda marca y modelo juntos a nivel de app; los reportes los separan.
- `serial_number`
- `location`: ubicacion/seccion, por ejemplo Laboratorio 1, Biblioteca, Decanato.
- `status`: operativo, mantenimiento, en_reparacion, prestado, pendiente_revision, baja.
- `notes`
- `created_by`
- `created_at`
- `updated_at`

### `laboratory_logs`

Bitacoras de mantenimiento, incidencias y cambios de estado.

Campos relevantes:

- `id`
- `organization_id`
- `work_date`
- `work_type`: Mantenimiento preventivo, Mantenimiento correctivo, Incidencia, Reparacion, Cambio de pieza, Diagnostico, etc.
- `title`
- `description`
- `responsible`
- `priority`: baja, media, alta, critica.
- `status`: pendiente, en_proceso, resuelto, cerrado.
- `entry_type`: mantenimiento o incidencia.
- `equipment_id`: relacion opcional con `laboratory_equipment.id`.
- `source_equipment`: se usa tambien para guardar estado anterior en cambios automaticos.
- `target_equipment`: equipo atendido en texto legible.
- `location`
- `evidence_title`
- `evidence_url`
- `created_by`
- `created_at`

### `laboratory_sheets`

Fichas tecnicas de equipo.

Sirve para registrar una hoja tipo formato tecnico: datos de PC, ubicacion, responsable, aplicaciones, caracteristicas, inventario relacionado y acciones.

### `laboratory_loans`

Prestamos de equipos o dispositivos.

Campos esperados:

- Equipo prestado.
- Beneficiario.
- Documento.
- Responsable de entrega.
- Fecha de prestamo.
- Fecha de devolucion.
- Estado: activo, devuelto, vencido.
- Observaciones.

### `laboratory_sections`

Catalogo de ubicaciones/secciones.

Ejemplos:

- Laboratorio 1
- Laboratorio 2
- Biblioteca
- Decanato
- ORD
- Deposito
- Reparacion
- Seccion de Tecnologia

### `laboratory_catalogs`

Catalogos administrables de:

- Categorias de equipo.
- Estados de equipo.

## Reglas de negocio actuales

### Estados del inventario

Estados principales:

- `operativo`: equipo disponible y funcionando.
- `mantenimiento`: equipo en mantenimiento tecnico o preventivo.
- `en_reparacion`: equipo con incidencia, dano o reparacion activa.
- `prestado`: equipo entregado temporalmente.
- `pendiente_revision`: equipo pendiente de diagnostico.
- `baja`: equipo descartado o fuera de servicio.

Cuando un equipo pasa a `baja`, la app lo mueve automaticamente a `Deposito`.

### Cambio rapido de estado desde inventario

Desde la tabla de inventario, el estado se puede cambiar directamente.

Al cambiar estado:

1. Se actualiza `laboratory_equipment.status`.
2. Se intenta crear una bitacora automatica en `laboratory_logs`.
3. Si falla la bitacora por columnas nuevas no refrescadas, el sistema intenta guardar una version compatible sin `entry_type` ni `equipment_id`.
4. Si aun asi falla, el estado no debe bloquearse; se muestra advertencia de historial.

Cuando se intenta devolver un equipo a `operativo` desde un estado no operativo, la app pide un detalle obligatorio. Ese detalle queda en la descripcion de la bitacora automatica.

### Sincronizacion desde bitacoras hacia inventario

Si se crea una bitacora manual:

- `Mantenimiento preventivo` cambia el equipo a `mantenimiento`.
- `Mantenimiento correctivo`, `Incidencia`, `Reparacion`, `Cambio de pieza` o `Diagnostico` cambian el equipo a `en_reparacion`.
- Si la bitacora queda `resuelto` o `cerrado`, la app pregunta si se desea devolver el equipo a `operativo`.

Esto permite trabajar de dos maneras:

- Cambiar estado desde inventario y generar historial automatico.
- Registrar bitacora y sincronizar el inventario.

### Auditoria de cambios

La auditoria se guarda dentro de la descripcion de la bitacora con texto del tipo:

`Auditoria de inventario: Operativo -> Mantenimiento.`

O en cambios automaticos:

`Cambio de estado tecnico: Operativo -> Mantenimiento.`

Los informes detectan esos textos para construir una hoja de auditoria con:

- Fecha.
- Equipo.
- Estado anterior.
- Estado nuevo.
- Responsable.
- Detalle.

## Actividad reciente

La seccion de inicio tecnico muestra maximo 8 registros recientes.

Incluye:

- Bitacoras.
- Fichas tecnicas.
- Prestamos.
- Equipos registrados o actualizados.

Para equipos:

- Si `createdAt` y `updatedAt` son casi iguales, se muestra como `Equipo registrado`.
- Si son distintos, se muestra como `Equipo actualizado`.
- Si `created_by` es UUID, el componente intenta resolverlo contra `profiles`.
- Si encuentra el perfil, muestra el nombre real, por ejemplo `Alex Amaya`.
- Si no puede resolverlo, muestra `Usuario del sistema` para no mostrar codigos largos.

## Informes actuales

### Informe de mantenimiento por rango

Funcion:

`exportInformeMantenimientoPorRangoExcel`

Genera Excel con hojas:

- `Resumen`
- `Detalle`
- `Auditoria`
- `Por ubicacion`
- `Estados actuales`
- `Pendientes actuales`
- `Conclusiones`

Debe incluir todo movimiento tecnico dentro del rango:

- Mantenimiento.
- Incidencias.
- Cierres.
- Cambios de estado.
- Reparaciones.

### Informe mensual

Funcion:

`exportInformeMensualMantenimientoExcel`

Incluye:

- Resumen mensual.
- Bitacoras del mes.
- Auditoria de cambios de estado.
- Fichas tecnicas del mes.

### Informe de inventario

Funcion:

`exportInventarioLaboratorioExcel`

Genera inventario formal de la facultad con:

- Encabezado institucional.
- Inventario completo.
- Resumen por ubicacion.
- Resumen por estado.

### Informe por ubicacion

Funcion:

`exportInformeUbicacionLaboratorioExcel`

Filtra equipos y bitacoras por ubicacion.

### Informe de pendientes

Funcion:

`exportInformePendientesLaboratorioExcel`

Incluye:

- Equipos no operativos.
- Trabajos abiertos.
- Prestamos activos o vencidos.

### Historial por equipo

Funcion:

`exportHistorialEquipoLaboratorioExcel`

Busca historial por:

- `equipment_id` si existe.
- Texto relacionado si el registro es antiguo y no tiene `equipment_id`.

## Consideraciones importantes

1. Si no se ejecuta `migration-v14-mantenimiento-e-incidencias.sql`, el historial puede guardarse sin `entry_type` ni `equipment_id`, pero igual debe aparecer en informes.

2. Si los nombres de usuarios no aparecen y sale `Usuario del sistema`, revisar politicas RLS sobre `profiles`. El frontend intenta consultar:

```ts
supabase.from('profiles').select('id, full_name').in('id', ids)
```

3. No mostrar UUID largos al usuario final.

4. No eliminar archivos temporales o adjuntos creados por Codex:

- `.codex-remote-attachments/`
- `outputs/inventario_app/*.inspect.ndjson`
- `outputs/inventario_app/*preview.png`

5. El usuario trabaja en Netlify y suele pedir git despues de cambios. Actualmente pidio que se haga git siempre mientras prueba en celular.

## Prompt recomendado para otra IA

Usa este prompt si necesitas pedir ayuda urgente a otra IA:

```text
Estoy trabajando en una app React + Supabase llamada "Registros Academicos - Facultad de Economia".

Necesito ayuda especificamente con el modulo de mantenimiento tecnico del laboratorio.

Contexto:
- El modulo esta en src/modulos/laboratorio/paginas/PaginaLaboratorio.tsx.
- La logica de Supabase, localStorage e informes esta en src/servicios/laboratorio.servicio.ts.
- Los tipos estan en src/tipos/dominio.ts.
- Las migraciones del modulo estan en supabase/migration-v8, v9, v12, v13 y v14.

Objetivo del modulo:
- Controlar inventario de equipos.
- Registrar bitacoras de mantenimiento/incidencias.
- Crear fichas tecnicas.
- Registrar prestamos.
- Generar informes Excel para jefatura y seguimiento tecnico.

Reglas importantes:
- Cambiar un equipo a mantenimiento/reparacion/baja debe guardar historial.
- Volver un equipo a operativo debe pedir detalle obligatorio.
- Crear bitacora debe sincronizar estado del inventario.
- Todo movimiento tecnico debe aparecer en informes.
- No mostrar UUID al usuario; mostrar nombre del perfil cuando sea posible.
- Los informes deben ser formales, claros y utiles para jefatura.

No hagas una app simple ni reestructures todo. Revisa el codigo actual, respeta los patrones existentes y aplica cambios pequenos, seguros y verificables.
```

## Proximas mejoras recomendadas

- Carga real de evidencias con Supabase Storage.
- PDF ejecutivo para jefatura.
- Firma o validacion de recibido/revisado.
- Alertas por equipos con muchos dias en reparacion.
- Historial mas formal en tabla separada si el modulo crece mucho.
