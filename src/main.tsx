import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { enrutador } from '@/rutas/enrutador';
import { ProveedorAutenticacion } from '@/modulos/autenticacion/hooks/ProveedorAutenticacion';
import '@/estilos/global.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@/diseno/styles/tokens.css';
import '@/diseno/styles/fadeco.css';
import '@/diseno/styles/integracion.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveedorAutenticacion>
      <RouterProvider router={enrutador} />
    </ProveedorAutenticacion>
  </React.StrictMode>,
);

