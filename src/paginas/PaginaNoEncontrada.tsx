import { Link } from 'react-router-dom';

export function PaginaNoEncontrada() {
  return (
    <main className="not-found">
      <h1>Ruta no encontrada</h1>
      <p>La pagina solicitada no existe o ya no esta disponible.</p>
      <Link className="primary-button" to="/dashboard">
        Volver al panel de control
      </Link>
    </main>
  );
}

