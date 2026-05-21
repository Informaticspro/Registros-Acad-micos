import { Outlet } from 'react-router-dom';
import { PieLegal } from '@/componentes/estructura/PieLegal';

export function LayoutAutenticacion() {
  return (
    <div className="auth-layout">
      <main className="auth-shell">
        <Outlet />
      </main>
      <PieLegal />
    </div>
  );
}

