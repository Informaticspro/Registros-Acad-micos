import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Encabezado } from '@/componentes/estructura/Encabezado';
import { BarraLateral } from '@/componentes/estructura/BarraLateral';

export function LayoutAplicacion() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() =>
    window.matchMedia('(max-width: 760px)').matches,
  );

  function closeSidebarOnMobile() {
    if (window.matchMedia('(max-width: 760px)').matches) {
      setIsSidebarCollapsed(true);
    }
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <BarraLateral
        isCollapsed={isSidebarCollapsed}
        onNavigate={closeSidebarOnMobile}
        onToggle={() => setIsSidebarCollapsed((value) => !value)}
      />
      {!isSidebarCollapsed ? (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      ) : null}
      <div className="app-main">
        <Encabezado onToggleMenu={() => setIsSidebarCollapsed((value) => !value)} />
        <main className="content-shell">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
