# Limpieza y optimización — 30 de octubre de 2026

## Código retirado

- Exportación de etiquetas HTML sustituida por PDF, junto con sus funciones de HTML y SVG sin consumidores.
- Generador de informe TXT por rango sin llamadas desde la aplicación ni las pruebas.
- Tipos y componentes CSS de la maqueta FADECO que nunca se montan en la aplicación actual. Se conserva la tarjeta real del próximo evento, sus estilos y sus variantes móviles.
- Variables de diseño sin referencias y la configuración VITE_APP_NAME, que ya no determina el nombre de Nexus FADECO.
- Dependencias file-saver y @types/file-saver, sin importaciones.

Se eliminó la carpeta vacía src/diseno/types. Los archivos generados en outputs, .work-*, .ppt-build y .codex-remote-attachments se ignoran en Git; su contenido no se elimina. Los archivos de inventario ya versionados dentro de outputs continúan versionados.

## Organización y rendimiento

- laboratorio.servicio.ts queda centrado en persistencia y operaciones del laboratorio.
- laboratorio-exportaciones.servicio.ts reúne las exportaciones vigentes y se importa al solicitar una descarga. Las pantallas esperan la operación asíncrona.
- EscanerInventarioModal se carga al pulsar Escanear equipo, con estado de carga y opción de cancelar.
- Los patrones y la normalización de códigos de barras se comparten en identificadores-inventario.ts.
- TypeScript comprueba variables y parámetros sin uso en cada compilación.

En las compilaciones locales, la suma de los módulos JavaScript estáticos adicionales de la ruta Laboratorio pasó de 1.533.167 a 225.686 bytes (−85,3 %). La medición excluye el JavaScript común de entrada y usa bytes sin comprimir; no representa una medición del tiempo de carga ni del tráfico total de instalación de la PWA. El precache para uso sin conexión se conserva.

## Conservación y validación

Se conservan las migraciones, la documentación histórica, los archivos personales y el endpoint retirado que responde 410; este último evita reactivar el antiguo acceso de administración.

TypeScript, ESLint, 47 pruebas Vitest, 18 pruebas Node y compilación/PWA completados. Las pruebas de exportación verifican las hojas Inventario/Resumen, el contenido y escape CSV, la carga diferida y los mensajes de error. No requiere cambios en Supabase.
