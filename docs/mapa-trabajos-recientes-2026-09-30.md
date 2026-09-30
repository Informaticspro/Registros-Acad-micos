# Mapa y trabajos recientes — 30 de septiembre de 2026

- Se reemplazó el pasillo decorativo por una referencia compacta, con áreas y contadores que usan los colores del tema claro u oscuro.
- Se aumentó la legibilidad de nombres y se sustituyeron puntos de alerta por etiquetas con texto.
- En celular las alas se presentan consecutivamente para evitar desplazamiento horizontal.
- Trabajos recientes es un panel lateral cerrado inicialmente. Su apertura no cambia el ancho ni la distribución del plano.
- Muestra hasta seis trabajos por fecha del trabajo, incluidos cerrados y resueltos, con responsable, ubicación, descripción y filtro por área. Usa los registros existentes sin migraciones ni nuevas consultas.
- Validación: TypeScript, ESLint de los componentes, compilación de producción y prueba de apertura, orden, filtro y cierre del panel correctas.
- No se abrió navegador por preferencia del usuario. La comprobación visual en dispositivos queda pendiente.

## Ajuste: consulta directa por salón
- Tocar un área ahora abre sus últimos trabajos en el panel, sin abandonar el mapa. Ver equipos es una acción explícita dentro del panel.
- La selección se destaca en el plano y el título identifica el salón. Las áreas sin actividad muestran un estado vacío.
- La comparación tolera acentos, mayúsculas y el prefijo Salón (3H y Salón 3H), sin mezclar otras ubicaciones.
- Se recuperó el aspecto de plano esquemático con muros, puertas hacia el pasillo, cuadrícula del corredor y Decanato al fondo. En móvil se conservan ambas alas.
- Pasaron dos pruebas de interacción, TypeScript, ESLint y compilación. Revisión visual en navegador pendiente por preferencia del usuario.
