# Correcciones de la auditoría — 23 de septiembre de 2026

## Resultado

Se corrigieron los riesgos prioritarios de permisos y exactitud del registro, junto con errores de sesión, informes y presentación móvil. La migración v24 se aplicó en Supabase el 21 de septiembre y la función `admin-restablecer-contrasena` se actualizó el 23 de septiembre. Este documento complementa la auditoría original; no implica que todos los pendientes operativos estén resueltos.

## Cambios entregados

| Hallazgos | Corrección |
| --- | --- |
| A01 | El endpoint antiguo de Netlify devuelve 410 y no modifica cuentas. La administración usa la función de Supabase con autorización previa del destino. |
| A02 | El registro público no sobrescribe identidades existentes. Una coincidencia parcial de documento/correo se rechaza. Los datos propios de una inscripción se guardan en `registration_metadata`; el histórico mantiene su respaldo en metadata del participante. |
| A03–A04 | La marcación valida rol, organización, estado y fechas. Políticas restrictivas protegen inscripciones y ambas tablas de asistencia. La asignación de perfiles no puede trasladar usuarios de otra organización. |
| A05 | Recuperar QR requiere documento y código individual de recuperación. La versión anterior de la función quedó sin permiso de ejecución público. |
| A06 | Dependencias actualizadas, incluido jsPDF, Router, Vite y SheetJS. Auditoría del 21 de septiembre: cero avisos conocidos. Esto no es una garantía de ausencia de vulnerabilidades. |
| A07–A10 | Inscripción y presencia quedan separadas. El panel lee las marcaciones diarias. El servidor comprueba cupos bajo bloqueo transaccional y deduplica por jornada usando la fecha de Panamá. |
| A11–A12 | Listados y exportaciones paginan; filtros grandes de identificadores se dividen en lotes. Una consulta fallida interrumpe el informe en vez de generar resultados incompletos. |
| A13 | Editar el perfil sincroniza el correo de Auth. Si falla el guardado del perfil, se intenta restaurar Auth y se informa explícitamente si la compensación falla. No existe transacción distribuida entre Auth y perfiles. |
| A14 | La descarga de certificado está identificada como ejemplo, sin afirmar que acredita asistencia. |
| A15–A17 | Consultar eventos ya no modifica su estado en la base. Los cerrados no se reabren por heurísticas del navegador. Se respeta el indicador explícito de permanencia. Panel con carga/error/reintento; sesión con limpieza de carga y protección contra respuestas antiguas. |
| A18–A19 | La importación informa cuántas filas se guardaron antes de un fallo. Los errores de catálogos/tablas ya no se convierten silenciosamente en listas vacías. La importación todavía no es atómica. |
| A20 | QR, marcación diaria, detalle y hoja de asistencia disponibles para seminarios y otros tipos de evento. Los registros históricos automáticos se etiquetan como presencia no verificada. |
| A21–A22 | Modal con foco inicial, Tab confinado, Escape y restauración del foco. Páginas cargadas por demanda. Las notificaciones consultan solamente los avisos necesarios y no cargan el motor Excel. |
| A23–A25 | Ajustes de desbordamiento en pantallas estrechas; pruebas y CI incorporados. La migración registra versión y definiciones previas en `app_migrations.history`, privado y con RLS. |

El paquete JavaScript principal pasó aproximadamente de 2,28 MB a 0,51 MB sin comprimir (de 794 KB a 152 KB gzip). Los módulos de Excel siguen siendo grandes; la PWA todavía precarga aproximadamente 6,9 MiB. No confundir la reducción del paquete principal con la descarga total de instalación.

## Verificación

- `npm run check`: tipos, ESLint sin advertencias, 23 pruebas y compilación de producción.
- Pruebas SQL en PostgreSQL embebido (PGlite): permisos, aislamiento entre organizaciones, duplicados, capacidad, estados y QR. La preparación de prueba sustituye los generadores de pgcrypto; no representa una réplica completa de Supabase ni una prueba de carga concurrente.
- Pruebas de función administrativa con cliente simulado: autorización antes de mutar Auth, actualización de correo y compensación de errores.
- Pruebas de sesión, paginación por encima de 1.000 filas, lotes de identificadores, estados de evento y teclado del modal.
- Supabase: verificados registro de migración, RLS del registro privado, acceso anónimo denegado al registro, consulta QR antigua revocada, consulta nueva habilitada y tres políticas restrictivas. El script `node --env-file=.env scripts/verificar-supabase.mjs` confirmó columnas y función disponibles el 23 de septiembre; no imprime claves ni registros personales.
- Despliegue de Edge Function confirmado por el panel de Supabase. No se cambiaron correos ni contraseñas de usuarios reales para probarlo.
- Navegador con sesión existente: panel y exportaciones a 390 px; exportación completada sin error; escáner a 320 px después de corregir recortes. Anchos medidos de 320, 390, 600, 760 y 1100 px sin desbordamiento horizontal del escáner. No se probó la cámara física ni el teclado virtual en dispositivos reales.

## Orden de instalación en otro entorno

1. Revisar el esquema existente y disponer de un respaldo recuperable. No ejecutar indiscriminadamente todos los scripts históricos: incluyen variantes y correcciones manuales.
2. En una base que ya tiene los cambios hasta v23, aplicar `supabase/migration-v24-seguridad-registro-asistencia.sql` como una transacción completa. No borrar inscripciones ni asistencias antiguas.
3. Desplegar `supabase/functions/admin-restablecer-contrasena/index.ts` con las variables de entorno existentes del proyecto.
4. Ejecutar la comprobación de esquema y revisar las políticas efectivas. Después publicar el frontend de este commit. El frontend nuevo necesita la columna y la función QR nuevas.
5. Ante un incidente, inspeccionar las definiciones anteriores del registro privado. No restaurar automáticamente funciones vulnerables ni eliminar registros creados después de la actualización.

## Pendientes concretos

- **Respaldos (A26):** el panel de Supabase indicó “No backups”. Falta configurar una estrategia de respaldo y comprobar una restauración. El registro de definiciones de v24 no es un backup de los datos.
- **Importación (A18):** convertirla en una operación transaccional o en lotes persistentes con reanudación e idempotencia. La entrega actual informa el resultado parcial.
- **Identidad y recuperación (A02/A05):** la coincidencia de documento y correo no verifica posesión del correo; implementar verificación por correo, límites de intentos y recuperación asistida si se pierde el código.
- **Certificados (A14):** emisión real por participante, reglas de elegibilidad y verificación pública. La plantilla sigue siendo únicamente una muestra.
- **Móvil y rendimiento (A22/A23):** pruebas en Android/iPhone reales, cámara, teclado, orientación y modo sin conexión. Consolidar gradualmente el CSS y revisar la precarga de la PWA.
- **Migraciones y operación (A25/A26):** consolidar una instalación reproducible desde cero, auditar acciones administrativas y definir retención. v24 agrega trazabilidad, pero no reconstruye el historial manual anterior.

SheetJS se obtiene de la distribución oficial indicada en su [documentación de instalación](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), fijada en el lockfile.
