# Préstamos públicos del laboratorio

## Cuenta de recepción

En Usuarios, elegir **Recepción de préstamos (solicitudes y devoluciones)**. Al iniciar sesión, esa cuenta abre `/recepcion-prestamos` sin menú administrativo. Cualquier intento de abrir una ruta interna protegida regresa al formulario. Las políticas de la base de datos bloquean el acceso directo a datos internos para este rol; puede leer su propio perfil y consultar una lista limitada de préstamos entregados de su organización mediante la función de recepción. Soporte confirma la entrega; la persona puede registrar la devolución desde la PC de recepción.

Aplicar `supabase/migration-v27-rol-recepcion.sql` y publicar `admin-restablecer-contrasena` para habilitar también la edición de perfiles con este rol. La cuenta de recepción no sustituye el modo quiosco del equipo.

La pantalla pública se abre en `/prestamos/solicitar/<organizationId>`. El personal autorizado encuentra el enlace en **Soporte técnico → Préstamos**. Allí puede copiarlo o pulsar **Abrir pantalla de préstamos**, que conserva la sesión y permite volver a la gestión. Para la computadora pública, usar una cuenta dedicada de **Recepción de préstamos** o abrir el enlace en un navegador sin sesión del personal.

La persona solicita un control multimedia, Data Show u otro equipo e indica su nombre y aula. Si elige Otro lugar, completa un único campo de facultad, departamento o lugar de uso. La solicitud queda **por entregar**. Soporte confirma la entrega con un botón. En la PC con cuenta de recepción, la persona busca su nombre en **En préstamo ahora**, pulsa **Devolver** y confirma tras entregar físicamente el equipo. La fecha y hora real de devolución se registran automáticamente. No se solicita una hora prevista ni se inventan vencimientos. Cada movimiento queda en la base de datos; la persona no firma ni necesita una cuenta individual. Después de registrar la solicitud, la pantalla vuelve al inicio y limpia los datos automáticamente en 3 segundos.

Aplicar `supabase/migration-v28-devoluciones-recepcion.sql` antes de publicar esta versión. El enlace público sin sesión permite enviar solicitudes, pero no consultar nombres ni registrar devoluciones. La nueva función limita la consulta a nombre, equipo, aula y fecha de entrega de préstamos activos; no incluye historial, contactos ni códigos de solicitud. Las devoluciones se bloquean por organización y estado, y repetir una confirmación no cambia la hora ya registrada.

## Activación de la base de datos

Aplicar `supabase/migration-v26-solicitudes-prestamos.sql` en el proyecto de Supabase correspondiente antes de habilitar el enlace en producción. La migración crea solicitudes separadas de préstamos efectivos, limita las escrituras públicas y solo permite consultar o gestionar la lista al personal de la misma organización. No aplicar la migración deja la pantalla visible pero impide registrar solicitudes.

## Computadora de recepción

La aplicación puede cerrar la sesión del personal y mantener abierta la ruta pública, pero una página web no puede bloquear otras pestañas, direcciones ni aplicaciones de Windows. Para que en esa computadora solo se vea el formulario, configurar una cuenta de Windows dedicada con modo quiosco del navegador, abrir el enlace público como página inicial y restringir la salida del quiosco al personal de soporte. No usar una cuenta de soporte iniciada en ese perfil de Windows. Probar reinicio del equipo, conexión y salida del modo quiosco antes de ponerlo a disposición del público.

El enlace es público para que no haya inicio de sesión. Cualquier persona que lo conozca puede abrirlo desde otro dispositivo; el modo quiosco solo limita la computadora física. La base de datos no expone el listado de solicitudes a visitantes.

