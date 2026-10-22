# Registro rápido desde el inventario

En el expediente técnico del equipo hay dos accesos: Registrar instalación (software) y Registrar trabajo físico. Solo se escribe la descripción del trabajo realizado.

Al guardar se crea una bitácora nueva, con la fecha y hora actuales, el usuario de soporte de la sesión, el identificador del equipo, el inventario y la ubicación. Se registra como finalizado y aparece en el historial del equipo, en Trabajos de soporte y en sus informes. No cambia el estado del inventario ni modifica otro trabajo que estuviese en edición.

Esta función registra tareas ya realizadas; para reportar una falla pendiente, planificar una intervención o cambiar el estado del equipo se mantienen los flujos existentes.

La lista de programas utiliza las fichas existentes. Requiere aplicar `migration-v32-programas-equipo.sql` antes de publicar. Añade el vínculo por identificador de equipo a las fichas y un guardado transaccional para instalar, actualizar o retirar programas junto a su bitácora. Los reintentos de una misma operación no duplican registros. La fecha, el responsable y los permisos se comprueban en el servidor; no se cambia el estado del inventario.

Las fichas antiguas se vinculan solo con coincidencias no ambiguas de nombre/ubicación o inventario único. Una coincidencia ambigua no se reasigna automáticamente. Se conservan las características técnicas, IP, usuario, inventario, acciones y notas existentes. El formulario de Detalles técnicos también conserva programas con nombres libres y detecta si otra persona modificó la ficha antes de guardarla.
