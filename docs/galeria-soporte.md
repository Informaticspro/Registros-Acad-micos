# Galería de imágenes de referencia

Acceso desde el botón Imágenes junto a Escanear equipo en Soporte técnico.

Requiere aplicar `supabase/migration-v30-galeria-soporte.sql`. Crea el bucket privado `laboratory-images` y políticas de lectura y subida para propietario, administrador y soporte de la misma organización. Recepción y usuarios académicos no tienen acceso.

Se admiten JPG, PNG, WebP y GIF hasta 10 MB por archivo. Se guarda una imagen por operación, sin reemplazar archivos existentes, con identificador único y nombre de archivo. La lista muestra 24 imágenes por página y enlaces temporales de una hora; Actualizar galería renueva los enlaces.

Para borrar, requiere también `supabase/migration-v31-eliminar-imagenes.sql`. Se selecciona una o varias imágenes (o todas en la página) y se pulsa Eliminar seleccionadas. La confirmación muestra los nombres y advierte que es permanente. El permiso de borrado se restringe a propietario, administrador y soporte de la misma organización; no se borran imágenes al habilitar esta función.

Las imágenes quedan compartidas en Supabase Storage, independientes de las bitácoras y de los equipos, para conservar ideas y referencias para futuros trabajos.

Al tocar una miniatura o «Ver imagen», se abre un visor dentro de la aplicación. Permite cerrar con el botón, Escape o el fondo. «Ampliar imagen» aumenta la vista dentro del mismo visor, sin abrir enlaces externos.
