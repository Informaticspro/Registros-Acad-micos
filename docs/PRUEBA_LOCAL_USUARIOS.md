# Prueba Local Del Modulo De Usuarios

El modulo de usuarios necesita una funcion serverless porque crear, editar y borrar usuarios usa la `service_role key` de Supabase.

No funciona completo si ejecutas solamente:

```powershell
npm run dev
```

Ese comando levanta Vite, pero no levanta funciones Netlify.

## Para probarlo localmente

1. Agrega temporalmente en `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

No subas esta variable a Git.

2. Ejecuta con Netlify Dev:

```powershell
npx netlify-cli dev
```

3. Abre la URL que indique Netlify, normalmente:

```text
http://localhost:8888
```

4. Entra como admin y prueba `/usuarios`.

## En Produccion

En Netlify debe existir:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_NAME
SUPABASE_SERVICE_ROLE_KEY
```

La `SUPABASE_SERVICE_ROLE_KEY` solo debe vivir en Netlify o en tu entorno local privado.
