import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="not-found">
      <h1>Ruta no encontrada</h1>
      <p>La página solicitada no existe o ya no está disponible.</p>
      <Link className="primary-button" to="/dashboard">
        Volver al dashboard
      </Link>
    </main>
  );
}
