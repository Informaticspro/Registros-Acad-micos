import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { enrutador } from '@/rutas/enrutador';
import { ProveedorAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import '@/estilos/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveedorAutenticacion>
      <RouterProvider router={enrutador} />
    </ProveedorAutenticacion>
  </React.StrictMode>,
);

