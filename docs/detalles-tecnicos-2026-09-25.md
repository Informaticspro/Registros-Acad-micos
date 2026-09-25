# Detalles técnicos dentro de Inventario

La antigua pestaña Ficha técnica se integra al inventario: abrir un equipo y pulsar Detalles técnicos permite editar su registro más reciente. El expediente muestra sus características, IP, usuario y programas. Un acceso al archivo desde Inventario conserva la consulta de todos los registros, incluso los antiguos sin relación reconocida con un equipo.

El formulario se concentra en configuración y características, con regreso al inventario y distribución de dos columnas que pasa a una en pantallas pequeñas. Las acciones nuevas se registran en Trabajos de soporte; las acciones e identificadores de inventario guardados en fichas anteriores se preservan al editar y siguen disponibles en la consulta. Los registros nuevos requieren seleccionar un equipo. No se modifica el esquema de Supabase.

La fecha de una ficha ya no cuenta como mantenimiento. El indicador usa trabajos de mantenimiento resueltos o cerrados. Se conserva por compatibilidad la vinculación existente por nombre o identificadores; una relación por ID requiere una migración posterior.

Validación: npm run check aprobado, 25 pruebas, incluida la conservación de acciones e inventario antiguos al guardar. TypeScript volvió a pasar tras añadir el resumen técnico al expediente. La vista local con datos ficticios no pudo inspeccionarse: el navegador devolvió ERR_BLOCKED_BY_CLIENT. Queda pendiente la revisión visual en escritorio y celular y la confirmación del despliegue en Netlify.
