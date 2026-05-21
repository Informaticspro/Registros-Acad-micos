import { FormEvent, useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sendPasswordRecovery } from '@/servicios/usuarios.servicio';
import { getErrorMessage } from '@/utilidades/errores';

export function PaginaRecuperarContrasena() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSending(true);

    try {
      await sendPasswordRecovery(email);
      setSuccess('Revise su correo. Supabase envio un enlace para crear una nueva contrasena.');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo enviar el correo de recuperacion'));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="login-panel recovery-panel">
      <div className="login-heading">
        <span className="eyebrow">Recuperar acceso</span>
        <h1>Olvide mi contrasena</h1>
        <p>Ingrese el correo de su cuenta. Le enviaremos un enlace para crear una contrasena nueva.</p>
      </div>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="usuario@institucion.edu"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-hint">{success}</p> : null}
        <button className="primary-button" type="submit" disabled={isSending}>
          <MailCheck size={18} />
          {isSending ? 'Enviando...' : 'Enviar enlace de recuperacion'}
        </button>
      </form>
      <Link className="secondary-button public-lookup-button" to="/login">
        <ArrowLeft size={18} />
        Volver al login
      </Link>
    </section>
  );
}
