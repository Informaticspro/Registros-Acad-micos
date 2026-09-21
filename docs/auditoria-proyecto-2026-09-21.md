# Auditoría técnica del proyecto

Fecha: 21 de septiembre de 2026. Base revisada: commit c797a5b, rama main.

## Dictamen
La aplicación compila, pero necesita correcciones de autorización e integridad de datos antes de ampliar funcionalidades. La siguiente inversión debe priorizar seguridad, exactitud de asistencia y exportaciones, y pruebas; después, rendimiento y experiencia móvil.

Esta revisión analiza el código local de React, servicios, funciones de servidor, SQL, configuración de publicación y dependencias. Los defectos descritos están sustentados en el repositorio. No se inspeccionó el esquema efectivo de Supabase ni se ejecutaron operaciones de ataque o escrituras de prueba contra producción. La exposición real de los defectos SQL depende de qué migraciones se hayan aplicado. No se volvió a recorrer visualmente la aplicación en esta sesión; las comprobaciones visuales del 9 de septiembre son antecedentes, no pruebas actuales. No es una certificación de seguridad ni una prueba de todos los flujos.

## Resultados ejecutados
- `npm run typecheck`: correcto.
- `npm run build`: correcto, incluida generación PWA.
- `npm run lint`: falla con 33 errores y 5 advertencias. Los 33 errores están en laboratorio.servicio.ts. Muchos proceden del nombre useLocalStorageFallback: es una función normal, no un hook real. Renombrarla elimina esa categoría sin desactivar la regla. También hay tipos any y escapes innecesarios; las advertencias de dependencias de hooks requieren revisión individual.
- `npm audit --omit=dev --json`: el registro informó 11 paquetes afectados: 1 crítico, 4 altos, 5 moderados y 1 bajo. Es clasificación del registro, no demostración de explotación en esta app. Vite aparece incluso al omitir desarrollo debido al grafo de dependencias y clasificación del proyecto; no todo aviso afecta al sitio estático publicado.
- Paquete principal: 2.282,37 kB sin comprimir, 794,13 kB gzip. Precaché PWA: 6.789,79 KiB, 18 recursos.
- No se encontraron tests automatizados de aplicación ni flujo de GitHub Actions en el árbol inspeccionado. El build no ejecuta lint.

## Hallazgos prioritarios de seguridad

### A01 · Alta · Administración de credenciales sin verificar primero el usuario destino
Evidencia: netlify/functions/staff-users.mjs:94–161 y netlify.toml, sección functions.
La creación busca un correo en todo Auth y, si existe, cambia su contraseña antes de asignarle la organización del administrador. La actualización cambia Auth antes de aplicar el filtro de organización en profiles. El filtro tardío no revierte una mutación de credenciales ya realizada. Además, el backend solo admite admin mientras la app incluye propietario y soporte en distintos flujos.
Corrección: resolver y autorizar el perfil destino antes de cualquier mutación de Auth; rechazar cuentas de otra organización y proteger al propietario. Centralizar la gestión en un único backend. El frontend actual usa RPC y no esta función Netlify, pero el archivo permanece configurado para despliegue: verificar si está publicado y eliminarlo si es obsoleto.
Prueba de aceptación: un administrador de A no puede modificar usuarios de B y ningún fallo de autorización cambia Auth ni profiles.

### A02 · Alta · Registro público puede sobrescribir identidades existentes
Evidencia: supabase/migration-v20-fix-registro-publico-permanente.sql:65–116, 170.
La función pública con privilegios elevados reutiliza un participante por cédula O correo y actualiza nombre, apellido, correo, documento y metadata. No acredita que el solicitante controle esa identidad. Al compartir participants entre eventos, la modificación puede alterar información histórica de varias inscripciones.
Corrección: no modificar identidad existente desde el registro anónimo. Verificar posesión del correo o remitir cambios al personal autorizado; guardar los datos propios de cada inscripción por separado.
Prueba: un nuevo envío que coincida parcialmente con una identidad existente no cambia sus datos personales.

### A03 · Alta · Marcación diaria comprueba sesión, pero no rol ni organización
Evidencia: supabase/migration-v5-bloquear-duplicados-asistencia.sql:21–54.
record_daily_attendance es SECURITY DEFINER y solo exige auth.uid() no nulo. No comprueba que el perfil tenga rol de escáner ni que el evento pertenezca a su organización. Las restricciones del menú y las políticas de tabla no sustituyen la autorización dentro de esta función.
Corrección: comprobar perfil, rol permitido, organización del evento y elegibilidad antes de buscar o registrar asistencia.
Prueba: cuentas sin perfil, de soporte y de otra organización deben ser rechazadas sin escritura.

### A04 · Alta · Aislamiento por organización inconsistente entre migraciones
Evidencia: supabase/migration-v7-rol-propietario.sql:79–91, 160–198; supabase/fix-registrations-read-policies.sql.
La migración v7 crea políticas generales de inscripciones y asistencia que solo comprueban el rol. admin_assign_staff_profile permite reasignar la organización de un perfil existente que no sea propietario sin exigir pertenencia previa. Hay otro script que restringe inscripciones por organización, por lo que el orden de aplicación cambia el resultado; las políticas permisivas pueden coexistir y ampliar permisos.
Corrección: consolidar migraciones y verificar políticas efectivas en la base. Todas las rutas deben validar organización, incluyendo RPC con privilegios elevados.
Prueba: matriz de lectura/escritura entre dos organizaciones, incluyendo SQL/RPC y no solo interfaz.

### A05 · Alta · Consulta pública expone datos y credencial QR por cédula
Evidencia: supabase/migration-v3-lookup-export.sql:4–49; src/servicios/qr-participante.servicio.ts.
El evento y la cédula bastan para devolver nombre, correo, token QR y código de certificado. No hay verificación de posesión en el flujo inspeccionado.
Corrección: entrega mediante enlace individual o verificación de correo; limitar intentos y minimizar campos de respuesta. Evitar tratar la cédula como secreto.

### A06 · Alta · Dependencias con avisos de seguridad
Evidencia: auditoría de npm ejecutada en esta revisión, package-lock.json.
Se requieren actualizaciones comprobadas, especialmente de bibliotecas que procesan archivos de usuario. El registro marca xlsx como alto y sin corrección automática disponible dentro del paquete consultado. No ejecutar audit fix --force sin revisar cambios incompatibles. Separar avisos que afectan al navegador, al procesamiento de archivos y al servidor de desarrollo.
Prueba: nueva auditoría, importación/exportación con archivos válidos y malformados, generación PDF y navegación tras cada actualización.

## Exactitud y funcionamiento

| ID | Prioridad | Hallazgo y efecto | Evidencia y corrección |
|---|---|---|---|
| A07 | Alta | Inscribirse genera inmediatamente asistencia present, incluso antes del evento. Se atribuye al organizador aunque provenga del formulario público. | migration-v20:119–158. Separar inscripción de presencia y procedencia; el formulario de congreso dice presentar el QR el día del evento. |
| A08 | Alta | El contador Asistencias de hoy lee attendance_records, mientras el escáner escribe attendance_daily_logs. Una marca diaria no incrementa necesariamente el indicador. | PaginaPanel.tsx:42,64 y asistencia.servicio.ts, listAttendance/recordDailyAttendance. Usar la misma fuente o una agregación explícita. |
| A09 | Alta | No se comprueban cupos ni fechas en el registro SQL revisado; is_permanent permite pasar incluso si el estado es borrador o archivado. | migration-v20:49. Validar estado, fechas y capacidad en servidor, con control de concurrencia; no basta el formulario. |
| A10 | Media | La deduplicación diaria usa ::date de la sesión SQL, mientras el cliente usa Panamá. Si SQL está en UTC, una tarde puede dividirse en dos días. | migration-v5:64,72 y asistencia.servicio.ts. Expresar America/Panama en cálculo y clave de unicidad; probar alrededor de medianoche UTC/local. |
| A11 | Alta | Listados, conteos e informes no paginan. Si la API limita filas, se procesará un subconjunto como si fuera completo. | participantes.servicio.ts:49–83; exportaciones.servicio.ts:174,238–275; laboratorio.servicio.ts:619–627. Paginación real y agregaciones de servidor; probar por encima del límite configurado. |
| A12 | Alta | El Excel continúa si falla la lectura de asistencia; solo escribe una advertencia en consola y puede generar un informe incompleto. | exportaciones.servicio.ts:267–279. Bloquear descarga o informar inequívocamente que es parcial y qué fuente falló. |
| A13 | Media | Editar correo de usuario cambia profiles, pero no el correo de Supabase Auth. | usuarios.servicio.ts:131–154. Unificar la actualización segura de identidad y perfil; probar acceso con correo nuevo. |
| A14 | Media | Certificados descarga una plantilla fija, con código constante y sin participante ni verificación de asistencia. | PaginaCertificados.tsx:6–20. Identificarla claramente como ejemplo hasta implementar emisión real y verificación pública. |
| A15 | Media | Leer eventos dispara actualizaciones de estado desde el navegador; los resultados de error de esas actualizaciones no se inspeccionan. | eventos.servicio.ts:90–137. Mover ciclo de vida a servidor, usar reloj fiable y mantener lecturas sin efectos secundarios. |
| A16 | Media | Un fallo de cualquiera de las cuatro consultas del panel deja valores iniciales sin mensaje de error. | PaginaPanel.tsx:41–50. Carga/error por sección y reintento; no presentar cero como resultado confirmado. |
| A17 | Media | Una falla al cargar el perfil después de iniciar sesión no garantiza limpiar isLoading. | useAutenticacion.tsx:105–118. Usar try/finally, manejar fallos de sesión y evitar respuestas antiguas tras cerrar sesión. |
| A18 | Media | Importación de inventario escribe fila por fila sin transacción global. Un fallo intermedio deja cambios parciales sin resultado completo. | laboratorio.servicio.ts:1117–1159. Importación validada con transacción o lote identificable, resumen parcial e idempotencia. |
| A19 | Media | Errores de catálogos/secciones se convierten en valores predeterminados y ciertos errores de tablas nuevas en listas vacías. | laboratorio.servicio.ts:632–644. Diferenciar tabla ausente de permisos/red y mostrar estado degradado antes de exportar o editar. |
| A20 | Por definir | El escáner admite únicamente congresos; seminarios/talleres quedan fuera de la marcación diaria. | PaginaEscaner.tsx:59–64. Confirmar regla de negocio antes de ampliar; no asumir que es necesariamente un defecto. |

## Móvil, accesibilidad y mantenimiento
- **A21 · Media:** ConfirmacionModal.tsx declara aria-modal, pero no implementa foco inicial, confinamiento de foco, restauración ni Escape. Comprobar y corregir navegación por teclado antes de reutilizarlo como estándar.
- **A22 · Media:** todas las páginas se importan de forma estática en enrutador.tsx; PDF/Excel contribuyen al paquete principal. Aplicar carga diferida por módulo, medir tiempo de carga móvil y conservar pantallas de carga claras.
- **A23 · Media:** el CSS global supera siete mil líneas y contiene reglas repetidas por breakpoint. Consolidar estilos por componente sin cambiar toda la apariencia a la vez. Verificar especialmente 320, 390, 600, 760 y 1100 px, teclado abierto y orientación horizontal. Las correcciones anteriores siguen presentes, pero esta revisión no vuelve a validar visualmente todos esos tamaños.
- **A24 · Media:** faltan pruebas automatizadas de autorización, fechas, duplicados y exportación. El build comprueba tipos y empaquetado, no reglas de negocio. Añadir CI con pruebas focalizadas y lint.
- **A25 · Media:** scripts SQL duplicados y aplicación manual dificultan reconstruir una instalación. Crear una secuencia reproducible, un registro de migraciones y una comparación del esquema aplicado contra el esperado.
- **A26 · Pendiente operativo:** comprobar restauración de backups, registro de acciones administrativas, despliegue de funciones y política de retención. No se verificaron estos mecanismos en la infraestructura real; ausencia de comprobación no significa ausencia del servicio.

## Aspectos correctos observados
- Roles y rutas protegidas están definidos en la interfaz.
- Los tokens QR del esquema se generan con bytes aleatorios, no con identificadores secuenciales.
- La función específica de restablecer contraseña en Supabase sí comprueba organización del destino y protege al propietario.
- Existen restricciones únicas y un bloqueo transaccional para reducir duplicados de asistencia.
- Se conserva el ajuste de interfaz móvil e historial real de la revisión anterior.
- Los secretos de servicio en las funciones se leen de variables de entorno; no fue necesario abrir el archivo .env para esta auditoría.

## Orden de trabajo recomendado
1. **Seguridad:** verificar SQL desplegado y cerrar A01–A05; inventariar y retirar endpoints obsoletos; actualizar dependencias según exposición real.
2. **Datos confiables:** separar inscripción/asistencia, arreglar contador, fechas, cupos, paginación y fallos de exportación.
3. **Operación:** corregir usuarios, importaciones parciales, estados de carga y certificados; crear pruebas de regresión y CI.
4. **Experiencia móvil:** medir rendimiento, dividir módulos, mejorar modales y validar formularios en Android/iPhone reales.

No recomiendo empezar por un rediseño completo. Primero hay que asegurar que permisos, datos y reportes sean correctos. Cada entrega debe incluir pruebas, commit y revisión del resultado; las migraciones necesitan respaldo y validación en un entorno de prueba antes de producción.

## Alcance de esta entrega
Solo se documenta la auditoría. No se modificaron funciones de aplicación ni políticas de producción y no se hicieron escrituras funcionales en Supabase. Los hallazgos de infraestructura se mantienen condicionados hasta inspeccionar la configuración desplegada.

## Detalle de dependencias y evidencia guardada
El resultado completo está en `auditoria-dependencias-2026-09-21.json`, junto a este informe. El aviso crítico corresponde a jsPDF. Los paquetes clasificados como altos son nanoid, postcss, vite y xlsx; los moderados son @remix-run/router, dompurify, esbuild, react-router y react-router-dom; @babel/core figura como bajo. Son 11 entradas de paquetes, no 11 ataques distintos. Algunas comparten causas transitivas y varias correcciones propuestas cambian versiones mayores. Evaluar la aplicabilidad de cada aviso según las APIs utilizadas.
