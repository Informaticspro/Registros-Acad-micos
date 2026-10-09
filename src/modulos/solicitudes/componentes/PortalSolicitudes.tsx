import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Mouse, Projector, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export type SolicitudEquipo = { nombre: string; procedencia: string; equipo: string; aula: string; inicio: string; fin: string };
type Props = { onSubmit: (solicitud: SolicitudEquipo) => Promise<void>; puedeVolver?: boolean };
const lugaresFacultad = [
  ...['3A', '3B', '3C', '3D', '3E', '3F', '3G', '3H'].map(aula => `Salón ${aula}`),
  'Laboratorio 1', 'Laboratorio 2', 'Maestría', 'Biblioteca', 'Decanato',
  'Oficina del laboratorio', 'Salón de estudiantes',
];

export function PortalSolicitudes({ onSubmit, puedeVolver = false }: Props) {
  const portalRef = useRef<HTMLElement>(null);
  const [escala, setEscala] = useState(1);
  const [tipo, setTipo] = useState('Control multimedia');
  const [lugar, setLugar] = useState('');
  const [etapa, setEtapa] = useState<'formulario' | 'confirmar' | 'enviado'>('formulario');
  const [solicitud, setSolicitud] = useState<SolicitudEquipo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useLayoutEffect(() => {
    const portal = portalRef.current;
    const page = portal?.parentElement;
    if (!portal || !page) return;
    const ajustar = () => setEscala(Math.min(1, page.clientHeight / Math.max(portal.offsetHeight, 1), page.clientWidth / Math.max(portal.scrollWidth, 1)));
    const observer = new ResizeObserver(ajustar);
    observer.observe(portal);
    observer.observe(page);
    ajustar();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (etapa !== 'enviado') return;
    const timer = window.setTimeout(() => {
      setSolicitud(null);
      setTipo('Control multimedia');
      setLugar('');
      setError('');
      setEtapa('formulario');
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [etapa]);
  function revisar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const inicio = new Date();
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).format(inicio);
    const fin = new Date(`${fecha}T${value('fin')}:00-05:00`);
    if (Number.isNaN(fin.getTime()) || fin <= inicio) { setError('La devolución debe ser posterior a la hora actual.'); return; }
    const aula = lugar === 'otro' ? value('otroLugar') : lugar;
    if (!aula) { setError('Seleccione el aula o especifique el lugar de uso.'); return; }
    setSolicitud({ nombre: value('nombre'), procedencia: lugar === 'otro' ? aula : 'Facultad de Economía', equipo: tipo === 'Otro equipo' ? value('otroEquipo') : tipo, aula, inicio: inicio.toISOString(), fin: fin.toISOString() });
    setError(''); setEtapa('confirmar');
  }
  async function enviar() {
    if (!solicitud || busy) return;
    setBusy(true); setError('');
    try { await onSubmit(solicitud); setEtapa('enviado'); }
    catch { setError('No se pudo registrar la solicitud. Reintente o avise al personal.'); }
    finally { setBusy(false); }
  }
  return <main ref={portalRef} className="borrow-portal" style={{ transform: `scale(${escala})` }}>
    <header className="borrow-header"><div className="borrow-brand"><img src="/logo-unachi.png" alt="Logo de UNACHI" /><div><strong>UNACHI · Facultad de Economía</strong><span>Sección de Tecnología · Laboratorio</span></div></div>{puedeVolver ? <Link className="secondary-button" to="/laboratorio#prestamos">← Volver atrás · Préstamos</Link> : <span className="borrow-public-label">Registro público de préstamos</span>}</header>
    {etapa === 'enviado' ? <section className="borrow-result" aria-live="polite"><Check size={46} aria-hidden="true" /><h1>¡Solicitud registrada!</h1><p>Acérquese al personal para retirar el equipo. La entrega se confirma cuando se lo proporcionen.</p><p>Esta pantalla volverá al inicio automáticamente en 8 segundos.</p></section> : <>
      <h1>¿Qué necesita para su clase?</h1><p className="borrow-intro">Elija el equipo y complete sus datos. El personal confirmará la entrega.</p>
      {etapa === 'formulario' ? <><div className="borrow-options" role="group" aria-label="Equipo solicitado">
        <button className={tipo === 'Control multimedia' ? 'selected' : ''} type="button" onClick={() => setTipo('Control multimedia')}><Radio size={30} /><strong>Control multimedia</strong><span>Para el proyector del salón</span></button>
        <button className={tipo === 'Data Show' ? 'selected' : ''} type="button" onClick={() => setTipo('Data Show')}><Projector size={30} /><strong>Data Show</strong><span>Proyector para su actividad</span></button>
        <button className={tipo === 'Otro equipo' ? 'selected' : ''} type="button" onClick={() => setTipo('Otro equipo')}><Mouse size={30} /><strong>Otros equipos</strong><span>Mouse, cables y accesorios</span></button>
      </div><form className="borrow-form" onSubmit={revisar}><h2>Datos del préstamo</h2><div className="borrow-fields">
        <label>Nombre completo<input name="nombre" autoComplete="off" required maxLength={120} placeholder="Escriba su nombre" /></label>
        <label>Aula o lugar de uso<select name="aula" required value={lugar} onChange={event => setLugar(event.target.value)}><option value="" disabled>Seleccione un aula o lugar</option>{lugaresFacultad.map(item => <option key={item} value={item}>{item}</option>)}<option value="otro">Otro lugar</option></select></label>
        <label>Hora prevista de devolución<input name="fin" type="time" required /></label>
        {lugar === 'otro' ? <label>Facultad, departamento o lugar de uso<input name="otroLugar" autoComplete="off" required maxLength={100} placeholder="Ej. Facultad de Educación / Auditorio o Dirección de Extensión" /></label> : null}
        {tipo === 'Otro equipo' ? <label>Equipo que necesita<input name="otroEquipo" required maxLength={120} placeholder="Ej. mouse o cable HDMI" /></label> : null}
      </div>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="borrow-form-footer"><small>La fecha y la hora de solicitud se registran automáticamente.</small><button className="primary-button" type="submit">Revisar solicitud</button></div></form></> : <section className="borrow-form"><h2>Confirme su solicitud</h2><p><strong>{solicitud?.equipo}</strong> · {solicitud?.aula}</p><p>{solicitud?.nombre} · {solicitud?.procedencia}</p><p>Devolución prevista: {solicitud ? new Date(solicitud.fin).toLocaleString('es-PA', { timeZone: 'America/Panama' }) : ''}</p>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="page-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setEtapa('formulario')}>Corregir</button><button className="primary-button" type="button" disabled={busy} onClick={() => void enviar()}>{busy ? 'Registrando…' : 'Confirmar solicitud'}</button></div></section>}
    </>}
  </main>;
}
