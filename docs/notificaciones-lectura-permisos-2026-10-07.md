# Lectura y permisos de notificaciones — 7 de octubre de 2026

- Se sincroniza la lectura entre instancias del menú, pestañas del mismo navegador y al recuperar el foco.
- Al marcar avisos se combina con lo ya almacenado; se elimina el recorte a 80 identificadores que podía olvidar lecturas anteriores.
- Se incorpora Marcar todas como leídas. Abrir la campana por sí solo no marca todo como leído.
- El contenido se filtra antes de renderizar por usuario y permiso actual, además de omitir consultas de soporte para cuentas sin acceso.
- Roles de soporte coinciden con GuardaRol: propietario, admin y soporte. Las políticas SQL del repositorio también restringen lectura de laboratory_logs y laboratory_loans. No se inspeccionaron las políticas desplegadas en producción.
- Las lecturas siguen siendo locales por usuario y navegador; no hay sincronización entre dispositivos. Cambios de estado generan avisos nuevos. No se pueden recuperar identificadores leídos que ya fueron descartados por el límite anterior.
