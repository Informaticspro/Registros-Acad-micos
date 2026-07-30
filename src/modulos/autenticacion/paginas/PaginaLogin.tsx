import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { hasSupabaseConfig, isDemoMode } from '@/infraestructura/entorno';

export function PaginaLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAutenticacion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const passwordUpdated = Boolean((location.state as { passwordUpdated?: boolean } | null)?.passwordUpdated);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const profile = await signIn(email, password);
      const target =
        profile.role === 'scanner' ? '/asistencia/escanear' : profile.role === 'soporte' ? '/laboratorio' : '/dashboard';
      navigate(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    }
  }

  return (
    <section className="login-panel">
      <div className="brand auth-brand">
        <div className="brand-mark">
          <img src="/logo-registros-academicos.png" alt="Registros academicos" />
        </div>
        <div>
          <strong>Registros Academicos</strong>
          <span>Facultad de Economia</span>
        </div>
      </div>
      <div className="login-heading">
        <span className="eyebrow">Acceso administrativo</span>
        <h1>Control profesional de eventos academicos</h1>
        <p>Administra inscripciones, asistencia por QR, certificados y reportes desde una sola consola.</p>
      </div>
      <form className="stack-form" onSubmit={handleSubmit} autoComplete="off">
        <label>
          Correo
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            autoComplete="off"
            placeholder="usuario@unachi.ac.pa"
          />
        </label>
        <label>
          Contrasena
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            autoComplete="current-password"
            placeholder="Ingrese su contrasena"
          />
        </label>
        <Link className="login-recovery-link" to="/recuperar-contrasena">
          Olvide mi contrasena
        </Link>
        {error ? <p className="form-error">{error}</p> : null}
        {passwordUpdated ? <p className="form-hint">Contrasena actualizada. Inicie sesion nuevamente.</p> : null}
        {isDemoMode() ? (
          <p className="form-hint">Modo demo activo. Puede usar admin@academico.local / demo123456.</p>
        ) : null}
        {!hasSupabaseConfig() && !isDemoMode() ? (
          <p className="form-error">Supabase no esta configurado en este despliegue.</p>
        ) : null}
        <button className="primary-button" type="submit">
          Entrar
        </button>
      </form>
      <Link className="secondary-button public-lookup-button" to="/mi-codigo">
        <QrCode size={18} />
        Consultar mi QR
      </Link>
    </section>
  );
}
