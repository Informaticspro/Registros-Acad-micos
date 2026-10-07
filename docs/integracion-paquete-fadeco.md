# Integración del paquete FADECO

Origen: files.zip entregado por el usuario (incluye fadeco-design.zip). Se integraron los tokens y CSS originales en src/diseno/styles, la tarjeta NextEventHero y la fuente local Plus Jakarta Sans (400, 600, 800).

integracion.css conecta las clases existentes con los tokens del paquete para conservar router, búsqueda, notificaciones, permisos y formularios. No se monta App.demo ni se importan datos mock. Se conservan las métricas reales; no se añaden tendencias o porcentajes inventados. La cuenta del evento usa días de calendario de Panamá. El degradado se oscureció para mejorar contraste del texto blanco.

Validación: TypeScript, ESLint, 26 pruebas Vitest, 14 pruebas Node y build/PWA correctos. No se abrió navegador por petición previa del usuario; la revisión visual sigue pendiente. La instalación informó cinco avisos de dependencias; requieren una revisión separada y no se ejecutó una actualización automática de paquetes ajenos al diseño.
