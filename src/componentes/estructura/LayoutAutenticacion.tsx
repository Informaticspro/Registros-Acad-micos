import { Outlet } from 'react-router-dom';

export function LayoutAutenticacion() {
  return (
    <main className="auth-shell">
      <Outlet />
    </main>
  );
}

