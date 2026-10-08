import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { formatDateTime } from '@/utilidades/formato';
import { gestionarSolicitud, listarSolicitudes, type SolicitudPrestamo } from '../solicitudes.servicio';

type Props = { organizationId: string | null; onChanged: () => Promise<void> };

export function SolicitudesPrestamos({ organizationId, onChanged }: Props) {

  const [items, setItems] = useState<SolicitudPrestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const url = organizationId ? `${window.location.origin}/prestamos/solicitar/${organizationId}` : '';

  const refresh = useCallback(async () => {
    try { setItems(await listarSolicitudes()); setError(''); }
    catch { setError('No se pudieron cargar las solicitudes. Compruebe que la migración de préstamos esté instalada.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function act(action: 'deliver' | 'return' | 'cancel', id: string) {
    setBusyId(id); setError('');
    try { await gestionarSolicitud(action, id); await refresh(); await onChanged(); }
    catch { setError('No se pudo completar la acción. Actualice la lista y vuelva a intentarlo.'); }
    finally { setBusyId(null); }
  }

  const active = items.filter(item => item.status === 'pendiente' || item.status === 'entregado');
  const history = items.filter(item => item.status === 'devuelto' || item.status === 'cancelado');
  return <div className="borrow-staff">
    <div className="page-actions"><Link className="secondary-button" to="/recepcion-prestamos">Abrir módulo de recepción</Link></div>
    <section className="borrow-staff-setup"><div><h2>Pantalla pública de préstamos</h2><p>Para revisar el formulario, abra la pantalla conservando su sesión. En la computadora de atención al público, inicie sesión con una cuenta de Recepción de préstamos.</p>{url ? <code>{url}</code> : <p>Su perfil todavía no tiene organización asignada.</p>}</div><div className="page-actions"><button type="button" className="secondary-button" disabled={!url} onClick={() => { void navigator.clipboard.writeText(url).then(() => setNotice('Enlace copiado.')).catch(() => setError('No se pudo copiar el enlace.')); }}>Copiar enlace</button><Link className="primary-button" to="/recepcion-prestamos">Abrir pantalla de préstamos</Link></div></section>
    {notice ? <p role="status">{notice}</p> : null}{error ? <p role="alert" className="form-error">{error}</p> : null}
    <div className="borrow-staff-heading"><h2>Por entregar o devolver <span>{active.length}</span></h2><button className="secondary-button" type="button" onClick={() => void refresh()}>Actualizar</button></div>
    {loading ? <p>Cargando solicitudes…</p> : null}
    {!loading && !active.length ? <p className="form-hint">No hay préstamos pendientes.</p> : null}
    <div className="borrow-staff-list">{active.map(item => <article className="borrow-staff-record" key={item.id}><div><span className={`status-pill ${item.status === 'pendiente' ? 'loan-pending' : 'loan-activo'}`}>{item.status === 'pendiente' ? 'Por entregar' : 'Prestado · falta devolución'}</span><h3>{item.equipment} · {item.room}</h3><p>{item.applicant} · {item.affiliation}</p><small>Solicitado: {formatDateTime(item.created_at)} · Devolución prevista: {formatDateTime(item.ends_at)}</small></div><div className="page-actions"><button className="primary-button" type="button" disabled={busyId !== null} onClick={() => void act(item.status === 'pendiente' ? 'deliver' : 'return', item.id)}>{busyId === item.id ? 'Guardando…' : item.status === 'pendiente' ? 'Entregar equipo' : 'Recibir devolución'}</button>{item.status === 'pendiente' ? <button className="secondary-button" type="button" disabled={busyId !== null} onClick={() => void act('cancel', item.id)}>Cancelar solicitud</button> : null}</div></article>)}</div>
    <h2>Historial reciente</h2><div className="borrow-staff-list">{history.slice(0, 20).map(item => <article className="borrow-staff-record" key={item.id}><div><span className="status-pill loan-devuelto">{item.status === 'devuelto' ? 'Devuelto' : 'Cancelado'}</span><h3>{item.equipment} · {item.room}</h3><p>{item.applicant} · {item.affiliation}</p></div><small>{formatDateTime(item.returned_at ?? item.created_at)}</small></article>)}</div>
  </div>;
}
