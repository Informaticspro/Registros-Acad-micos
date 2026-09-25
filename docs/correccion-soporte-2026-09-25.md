# Recuperación de soporte técnico — 25 de septiembre de 2026

El panel mostraba cero en todos los indicadores y un aviso de error porque faltaba `public.laboratory_catalogs` en Supabase (PGRST205). Al hacer estricta la carga en la revisión anterior, el fallo de esa consulta bloqueó el conjunto completo de datos. Los ceros eran el estado inicial de la interfaz, no una pérdida de registros.

Se aplicó en producción `migration-v25-reparar-catalogos-laboratorio.sql`, que recupera la migración v13 omitida dentro de una transacción, crea 13 categorías/estados predeterminados y mantiene el aislamiento por organización y los roles de soporte, administración y propietario. No modifica equipos ni bitácoras. Se notificó a PostgREST para refrescar el esquema.

La pantalla ahora distingue carga y error de un resultado vacío, ofrece reintentar y oculta indicadores y formularios mientras no hay datos válidos. El verificador de esquema cubre las ocho tablas de laboratorio; puede usar una credencial de servidor opcional para comprobar tablas que niegan completamente el acceso anónimo, sin descargar registros. La comprobación pública del QR sigue usando la clave anónima.

Validación: `npm run check` aprobado (TypeScript, ESLint, 24 pruebas y compilación). Una nueva prueba ejecuta la reparación dos veces, comprueba que no duplica categorías y verifica aislamiento por organización y denegación anónima. El verificador remoto pasó después de aplicar SQL. Recuentos posteriores: 145 equipos, 106 bitácoras, 4 fichas, 79 descartes y 13 entradas de catálogo; los registros principales conservan sus cantidades anteriores.

Limitación: el navegador de comprobación abrió el sitio público en la pantalla de acceso, por lo que no se verificó visualmente el panel con una sesión de usuario. La reparación de base de datos está activa; la mejora de la pantalla depende del despliegue del commit en Netlify.
