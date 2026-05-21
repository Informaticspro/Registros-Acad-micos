import { FormEvent, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import { useAutenticacion } from '@/modulos/autenticacion/hooks/useAutenticacion';
import { updateOwnPassword } from '@/servicios/usuarios.servicio';
import { getErrorMessage } from '@/utilidades/errores';

export function PaginaMiCuenta() {
  const { profile } = useAutenticacion();
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
      setSuccess('Contrasena actualizada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cambiar la contrasena'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack account-page">
      <PageEncabezado
        eyebrow="Mi cuenta"
        title="Cambiar contrasena"
        description={`Actualice la contrasena de ${profile?.email ?? 'su usuario'} para mantener su acceso protegido.`}
      />
      <form className="panel stack-form account-password-form" onSubmit={handleSubmit}>
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
          {isSaving ? 'Guardando...' : 'Actualizar contrasena'}
        </button>
      </form>
    </div>
  );
}
