# Integración del paquete FADECO

Origen: files.zip entregado por el usuario (incluye fadeco-design.zip). Se integraron los tokens y CSS originales en src/diseno/styles, la tarjeta NextEventHero y la fuente local Plus Jakarta Sans (400, 600, 800).

integracion.css conecta las clases existentes con los tokens del paquete para conservar router, búsqueda, notificaciones, permisos y formularios. No se monta App.demo ni se importan datos mock. Se conservan las métricas reales; no se añaden tendencias o porcentajes inventados. La cuenta del evento usa días de calendario de Panamá. El degradado se oscureció para mejorar contraste del texto blanco.

Validación: TypeScript, ESLint, 26 pruebas Vitest, 14 pruebas Node y build/PWA correctos. No se abrió navegador por petición previa del usuario; la revisión visual sigue pendiente. La instalación informó cinco avisos de dependencias; requieren una revisión separada y no se ejecutó una actualización automática de paquetes ajenos al diseño.

## Coordinación de superficies restantes

Se revisaron los selectores existentes de navegación, eventos, participantes, formularios públicos, inventario, trabajos, detalles técnicos, métricas y notificaciones. Se completó el adaptador para evitar colores secundarios heredados y se actualizaron las listas de atención señaladas por el usuario: tarjetas independientes, sin franja lateral, detalle como enlace y acción suave verde. Las pestañas de soporte comparten forma y color activo, con desplazamiento horizontal en móvil. Se mantienen las etiquetas semánticas de estado y la geometría del mapa.

Alcance de validación: revisión de código y comprobaciones automatizadas; no se ha realizado inspección visual de todas las pantallas en navegador. La captura del usuario guía el ajuste concreto.
