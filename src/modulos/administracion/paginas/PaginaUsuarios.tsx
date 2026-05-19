import { FormEvent, useEffect, useState } from 'react';
import { Pencil, RefreshCw, Save, Trash2, UserPlus, X } from 'lucide-react';
import { PageEncabezado } from '@/componentes/interfaz/EncabezadoPagina';
import {
  createStaffUser,
  deleteStaffUser,
  listStaffUsers,
  UsuarioSistema,
  updateStaffUser,
} from '@/servicios/usuarios.servicio';
import { RolAplicacion } from '@/tipos/dominio';
import { getErrorMessage } from '@/utilidades/errores';

const roleLabels: Record<RolAplicacion, string> = {
  admin: 'Administrador',
  organizador: 'Organizador',
  scanner: 'Escaner',
};

function readForm(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    fullName: String(data.get('fullName') ?? '').trim(),
    email: String(data.get('email') ?? '').trim(),
    password: String(data.get('password') ?? ''),
    role: String(data.get('role') ?? 'organizador') as RolAplicacion,
  };
}

export function PaginaUsuarios() {
  const [users, setUsers] = useState<UsuarioSistema[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await listStaffUsers());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los usuarios'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const input = readForm(formElement);
      await createStaffUser(input);
      setSuccess('Usuario creado en Supabase Auth y habilitado para iniciar sesion.');
      setError(null);
      formElement.reset();
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo crear el usuario'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const input = readForm(event.currentTarget);
      await updateStaffUser({
        id: userId,
        fullName: input.fullName,
        email: input.email,
        role: input.role,
      });
      setSuccess('Usuario actualizado correctamente.');
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo actualizar el usuario'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(user: UsuarioSistema) {
    const confirmed = window.confirm(`Desea desactivar a ${user.fullName}? Ya no podra entrar a la app.`);
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await deleteStaffUser(user.id);
      setSuccess('Usuario desactivado correctamente.');
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo borrar el usuario'));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <div className="page-stack">
      <PageEncabezado
        eyebrow="Administracion"
        title="Usuarios del sistema"
        description="Solo administradores pueden crear, editar y borrar cuentas de la organizacion."
        actions={
          <button className="secondary-button" type="button" onClick={() => void loadUsers()}>
            <RefreshCw size={18} />
            Actualizar
          </button>
        }
      />

      <form className="panel form-grid" onSubmit={handleCreate}>
        <label>
          Nombre completo
          <input name="fullName" required placeholder="Ej. Ana Perez" />
        </label>
        <label>
          Correo
          <input name="email" required type="email" placeholder="admin@institucion.edu" />
        </label>
        <label>
          Contrasena temporal
          <input name="password" required type="password" minLength={8} placeholder="Minimo 8 caracteres" />
        </label>
        <label>
          Rol
          <select name="role" defaultValue="organizador" required>
            <option value="admin">Administrador</option>
            <option value="organizador">Organizador</option>
            <option value="scanner">Escaner</option>
          </select>
        </label>
        <p className="form-hint full-field">
          Modo localhost con Supabase: crea usuarios reales para iniciar sesion. Para acceso inmediato, desactiva la
          confirmacion obligatoria de correo en Supabase Auth.
        </p>
        {error ? <p className="form-error full-field">{error}</p> : null}
        {success ? <p className="form-hint full-field">{success}</p> : null}
        <button className="primary-button full-field" type="submit" disabled={isSaving}>
          <UserPlus size={18} />
          {isSaving ? 'Guardando...' : 'Crear usuario'}
        </button>
      </form>

      <section className="panel">
        <div className="panel-heading">
          <h2>Usuarios registrados</h2>
          <span>{isLoading ? 'Cargando...' : `${users.length} usuarios`}</span>
        </div>
        <div className="users-list">
          {users.map((user) =>
            editingId === user.id ? (
              <form className="user-edit-row" key={user.id} onSubmit={(event) => void handleUpdate(event, user.id)}>
                <input name="fullName" defaultValue={user.fullName} required />
                <input name="email" defaultValue={user.email} type="email" required />
                <select name="role" defaultValue={user.role} required>
                  <option value="admin">Administrador</option>
                  <option value="organizador">Organizador</option>
                  <option value="scanner">Escaner</option>
                </select>
                <button className="icon-button" type="submit" aria-label="Guardar usuario" disabled={isSaving}>
                  <Save size={18} />
                </button>
                <button className="icon-button" type="button" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                  <X size={18} />
                </button>
              </form>
            ) : (
              <div className="user-row" key={user.id}>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>{user.email}</span>
                </div>
                <span className="role-pill">{roleLabels[user.role]}</span>
                <div className="row-actions">
                  <button className="icon-button" type="button" aria-label="Editar usuario" onClick={() => setEditingId(user.id)}>
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Borrar usuario"
                    disabled={isSaving}
                    onClick={() => void handleDelete(user)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ),
          )}
          {!isLoading && users.length === 0 ? <p className="form-hint">No hay usuarios registrados.</p> : null}
        </div>
      </section>
    </div>
  );
}

