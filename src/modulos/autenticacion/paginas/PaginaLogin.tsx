import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, QrCode } from 'lucide-react';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { hasSupabaseConfig, isDemoMode } from '@/infraestructura/entorno';

export function PaginaLogin() {
  const navigate = useNavigate();
  const { signIn } = useAutenticacion();
  const [email, setEmail] = useState('admin@academico.local');
  const [password, setPassword] = useState('demo123456');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion');
    }
  }

  return (
    <section className="login-panel">
      <div className="brand auth-brand">
        <div className="brand-mark">
          <GraduationCap size={24} />
        </div>
        <div>
          <strong>AcadEvents</strong>
          <span>Registro y asistencia</span>
        </div>
      </div>
      <div>
        <span className="eyebrow">Acceso administrativo</span>
        <h1>Control profesional de eventos academicos</h1>
        <p>Administra inscripciones, asistencia por QR, certificados y reportes desde una sola consola.</p>
      </div>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Correo
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Contrasena
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {isDemoMode() ? (
          <p className="form-hint">Modo demo activo hasta configurar Supabase en `.env`.</p>
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

