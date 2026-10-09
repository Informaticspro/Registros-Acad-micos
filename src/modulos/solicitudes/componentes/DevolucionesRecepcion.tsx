import { useCallback, useEffect, useState } from 'react';
import { prestamosRecepcion, type PrestamoRecepcion } from '../solicitudes.servicio';

export function DevolucionesRecepcion() {
  const [items, setItems] = useState<PrestamoRecepcion[]>([]);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(0);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    try { setItems(await prestamosRecepcion()); setError(''); }
    catch { setError('No se pudieron cargar los préstamos. Avise al personal.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => { setNotice(''); setBuscar(''); setPagina(0); }, 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const filtered = items.filter(item => `${item.applicant} ${item.equipment} ${item.room}`.toLocaleLowerCase().includes(buscar.trim().toLocaleLowerCase()));
  const lastPage = Math.max(0, Math.ceil(filtered.length / 6) - 1);
  const currentPage = Math.min(pagina, lastPage);
  async function devolver(id: string) {
    if (busy) return;
    setBusy(true); setError('');
    try { await prestamosRecepcion('return', id); setItems(previous => previous.filter(item => item.id !== id)); setConfirmar(null); setNotice('¡Devolución registrada! La fecha y hora se guardaron automáticamente.'); }
    catch { setError('No se pudo registrar la devolución. Consulte al personal antes de retirarse.'); }
    finally { setBusy(false); }
  }
  return <section className="borrow-returns" aria-labelledby="returns-heading">
    <div className="borrow-returns-heading"><h2 id="returns-heading">En préstamo ahora <span>{items.length}</span></h2><label className="borrow-returns-search">Buscar préstamo<input aria-label="Buscar préstamo por nombre" placeholder="Buscar por nombre" autoComplete="off" value={buscar} onChange={event => { setBuscar(event.target.value); setPagina(0); setConfirmar(null); }} /></label><div className="page-actions"><button type="button" className="secondary-button" aria-label="Préstamos anteriores" disabled={currentPage === 0 || busy} onClick={() => { setPagina(currentPage - 1); setConfirmar(null); }}>‹</button><span>{currentPage + 1} / {lastPage + 1}</span><button type="button" className="secondary-button" aria-label="Más préstamos" disabled={currentPage === lastPage || busy} onClick={() => { setPagina(currentPage + 1); setConfirmar(null); }}>›</button></div></div>
    <p className="borrow-return-hint">Busque su nombre y confirme la devolución después de entregar físicamente el equipo al personal.</p>
    {error ? <p role="alert" className="form-error">{error}</p> : null}{notice ? <p role="status" className="borrow-return-success">{notice}</p> : null}
    {loading ? <p role="status">Cargando préstamos…</p> : !filtered.length ? <p>{buscar ? 'No se encontraron préstamos con ese nombre.' : 'No hay equipos prestados en este momento.'}</p> : null}
    <div className="borrow-return-grid">{filtered.slice(currentPage * 6, currentPage * 6 + 6).map(item => <article key={item.id} className="borrow-return-card"><div><strong>{item.applicant}</strong><span>{item.equipment} · {item.room}</span></div>{confirmar === item.id ? <div className="borrow-return-confirm"><small>¿Ya entregó el equipo?</small><div className="page-actions"><button type="button" className="primary-button" disabled={busy} onClick={() => void devolver(item.id)}>{busy ? 'Guardando…' : 'Sí, devolver'}</button><button type="button" className="secondary-button" disabled={busy} aria-label="Cancelar devolución" onClick={() => setConfirmar(null)}>✕</button></div></div> : <button type="button" className="primary-button" disabled={busy} onClick={() => { setConfirmar(item.id); setNotice(''); }}>Devolver</button>}</article>)}</div>
  </section>;
}
