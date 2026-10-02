# Alertas visibles en Inicio — 2 de octubre de 2026

- Aviso destacado antes de los indicadores con los equipos que requieren revisión, reparación o mantenimiento. Usa los datos ya cargados; no depende de abrir la campana.
- Listado de equipos con estado y colores existentes, ubicación y acceso a su expediente.
- Trabajos abiertos cuenta exclusivamente pendiente y en_proceso. Antes incluía resuelto; no se modificaron registros históricos para cambiar el contador.
- El indicador desplaza a la lista completa de abiertos en Inicio. Se muestran prioridad, estado, responsable, ubicación y descripción; cada trabajo se puede abrir para actualizarlo.
- Se muestran cinco trabajos inicialmente, priorizando urgencia y fecha de registro. Actividad reciente permanece separada.
- Validación: dos pruebas de regresión, TypeScript, ESLint de archivos afectados y compilación. Sin comprobación visual en navegador por preferencia del usuario.
- No se consultó la base de producción: no se atribuye el total de 30 a una composición de estados sin verificarla.
