import { Outlet } from 'react-router-dom';
import { Encabezado } from '@/componentes/estructura/Encabezado';
import { BarraLateral } from '@/componentes/estructura/BarraLateral';

export function LayoutAplicacion() {
  return (
    <div className="app-shell">
      <BarraLateral />
      <div className="app-main">
        <Encabezado />
        <main className="content-shell">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

