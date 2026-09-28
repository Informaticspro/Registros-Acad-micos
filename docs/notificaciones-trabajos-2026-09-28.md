# Trabajos terminados en la campana

La consulta y el menú filtraban exclusivamente pendiente/en_proceso y limitaban los trabajos a dos. Un registro creado cerrado aparecía en actividad reciente pero nunca en notificaciones.

Ahora se consultan los seis registros creados más recientemente, sin excluir estados, y hasta dos pendientes/en proceso adicionales, deduplicados por ID. Se conservan los avisos de préstamos y eventos. Resuelto y cerrado tienen sus propios títulos. Es un resumen reciente, no un historial completo ni una notificación push del sistema operativo.

Abrir el menú ya no marca todo como leído; seleccionar un aviso marca ese aviso. Su identidad incluye registro, estado y fecha de creación. Cambiar el estado de un trabajo visible genera un aviso nuevo. Seleccionar un trabajo lleva a la sección Trabajos de soporte.

Se actualiza al guardar desde el formulario, abrir la campana, recuperar el foco y cada 60 segundos. No requiere cambios en Supabase. Validación: tipos, lint, compilación y 31 pruebas aprobadas (incluidas pruebas de consulta, trabajo cerrado, lectura y cambio de estado). No se abrió el navegador, según la preferencia del usuario. El despliegue público queda pendiente de Netlify.
