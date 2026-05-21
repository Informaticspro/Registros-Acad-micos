import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { updateOwnPassword } from '@/servicios/usuarios.servicio';
import { getErrorMessage } from '@/utilidades/errores';

export function PaginaActualizarContrasena() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await updateOwnPassword(password);
      formElement.reset();
      setSuccess('Contrasena actualizada. Ya puede volver al login.');
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No se pudo actualizar la contrasena. Abra de nuevo el enlace de recuperacion enviado al correo.',
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="login-panel recovery-panel">
      <div className="login-heading">
        <span className="eyebrow">Nueva contrasena</span>
        <h1>Restablecer acceso</h1>
        <p>Use el enlace recibido por correo para crear una contrasena nueva de al menos 8 caracteres.</p>
      </div>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label>
          Nueva contrasena
          <input name="password" type="password" minLength={8} required placeholder="Minimo 8 caracteres" />
        </label>
        <label>
          Confirmar contrasena
          <input name="confirmPassword" type="password" minLength={8} required placeholder="Repita la contrasena" />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-hint">{success}</p> : null}
        <button className="primary-button" type="submit" disabled={isSaving}>
          <KeyRound size={18} />
          {isSaving ? 'Guardando...' : 'Guardar nueva contrasena'}
        </button>
      </form>
      <Link className="secondary-button public-lookup-button" to="/login">
        Ir al login
      </Link>
    </section>
  );
}
