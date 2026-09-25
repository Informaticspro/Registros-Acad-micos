# Ajuste del tema oscuro e inventario

Se separaron los niveles de fondo oscuro: página, paneles, tarjetas y campos. Se redujo el peso de textos secundarios, etiquetas e inputs solo en oscuro. La paleta clara permanece sin cambios.

En Inventario, las reglas de fondos por posición tenían mayor especificidad que el estilo adaptable al tema. Se corrigió su prioridad para que todos los filtros inactivos tengan texto claro sobre fondo oscuro. La tabla ahora muestra los datos propios del equipo y un resumen de cantidad de componentes; sus detalles siguen en el expediente. Se evita concatenar marcas, modelos, códigos y series de accesorios en la fila principal. Se amplió la columna del equipo y se reservó espacio para el estado completo.

En escritorio, el desplazamiento horizontal queda dentro de la tabla. En celular se conserva la presentación por tarjetas y se acomodan los botones del encabezado en filas completas. Se evita que Enter o Espacio en controles internos active también la apertura de la fila.

Verificación: 29 pruebas y compilación aprobadas. Se inspeccionó el componente real VistaInventario con datos ficticios en 1280px y 390px; los filtros inactivos mostraron rgb(237,242,247) sobre rgb(24,33,44), sin degradado claro. La fila de prueba con tres componentes midió aproximadamente 65px de alto. Se revisó también la muestra del formulario oscuro con los estilos reales. No se modificaron datos de Supabase. El despliegue público queda sujeto a Netlify.
