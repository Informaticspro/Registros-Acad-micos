# Revisión de legibilidad y temas

Se revisó la hoja global y se corrigieron contrastes de la interfaz, con atención a soporte, inventario, formularios y estados. Había colores claros fijos en estados y roles que también se usaban sobre fondos claros; textos de inventario de 0.62rem; campos con bordes apenas visibles; y colores de filtros de inventario que no se adaptaban al tema oscuro.

## Cambios

- Paleta semántica con pares opacos de fondo/texto para información, éxito, advertencia, error, reparación, archivo y cierre, específicos por tema.
- Texto secundario más oscuro en claro y más claro en oscuro. Etiquetas de formularios con el color principal; placeholders explícitos sin transparencia.
- Bordes de campos más visibles y foco de teclado de 3px.
- Fondo general más neutro, menor uso de degradados detrás de texto y filtros adaptados al tema.
- Estados y notas de inventario de al menos 13px en los selectores corregidos; pestañas de 14px y controles de 44px de alto mínimo.
- Indicadores del encabezado con título y cifra en filas distintas.
- A 320px, pestañas en dos columnas. Listas de soporte sin desplazamientos anidados en móvil; campos a 16px.

## Medidas

Se usa la fórmula de luminancia relativa de WCAG. El objetivo es 4.5:1 para texto normal y 3:1 para bordes de campos y foco sobre las superficies probadas: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum

| Par de colores | Contraste |
|---|---:|
| Texto secundario anterior / superficie suave clara | 4.70:1 |
| Texto secundario nuevo / superficie suave clara | 6.66:1 |
| Texto secundario nuevo / superficie suave oscura | 9.47:1 |
| Advertencia nueva / fondo de advertencia claro | 6.37:1 |
| Información nueva / fondo informativo claro | 7.65:1 |

Las pruebas automatizadas verifican texto principal, secundario, acento, estados, botón principal, bordes y foco contra los tokens seleccionados de ambos temas. Esto no certifica todas las combinaciones posibles, transparencias, imágenes o páginas de la aplicación.

## Comprobación visual

`docs/revision-visual.html` es una muestra local reproducible con la hoja real y datos ficticios, sin conexión a Supabase. Se inspeccionó en claro y oscuro a 1280px y 390px, además de claro a 320px. En la muestra móvil no se observó desbordamiento horizontal; se corrigió el solapamiento de las cifras del encabezado y el desplazamiento anidado. Se restauró el tamaño del navegador al terminar.

Validación funcional: 29 pruebas aprobadas, TypeScript, ESLint y compilación. Falta comprobar las pantallas autenticadas con datos reales y el despliegue publicado; la inspección visual descrita corresponde a la muestra local.
