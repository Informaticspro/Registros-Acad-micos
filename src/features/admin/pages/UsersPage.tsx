import { FormEvent, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { createStaffUser } from '@/services/users.service';
import { AppRole } from '@/types/domain';
import { getErrorMessage } from '@/utils/errors';
import { isDemoMode } from '@/lib/env';

export function UsersPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const role = String(form.get('role') ?? 'organizador') as AppRole;
      await createStaffUser({
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        fullName: String(form.get('fullName') ?? '').trim(),
        role,
      });
      setSuccess('Usuario creado. Si Supabase exige confirmación de correo, el nuevo admin debe confirmar antes de entrar.');
      event.currentTarget.reset();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios del sistema"
        description="Cree cuentas para organizadores, escáneres o administradores de su organización."
      />
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input name="fullName" required placeholder="Ej. Ana Pérez" />
        </label>
        <label>
          Correo
          <input name="email" required type="email" placeholder="admin@institucion.edu" />
        </label>
        <label>
          Contraseña temporal
          <input name="password" required type="password" minLength={8} placeholder="Mínimo 8 caracteres" />
        </label>
        <label>
          Rol
          <select name="role" defaultValue="organizador" required>
            <option value="admin">Administrador</option>
            <option value="organizador">Organizador</option>
            <option value="scanner">Escáner (solo asistencia)</option>
          </select>
        </label>
        {isDemoMode() ? (
          <p className="form-hint full-field">En modo demo el formulario no crea usuarios reales.</p>
        ) : (
          <p className="form-hint full-field">
            Requiere ejecutar <code>migration-v2-attendance-export-admin.sql</code> en Supabase y tener
            confirmación de email desactivada o gestionada para acceso inmediato.
          </p>
        )}
        {error ? <p className="form-error full-field">{error}</p> : null}
        {success ? <p className="form-hint full-field">{success}</p> : null}
        <button className="primary-button full-field" type="submit" disabled={isSaving}>
          <UserPlus size={18} />
          {isSaving ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}
