import { useEffect, useState, type FormEvent } from 'react';
import { Check, Mouse, Projector, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DevolucionesRecepcion } from './DevolucionesRecepcion';
import './datos-adicionales.css';

export type SolicitudEquipo = { nombre: string; procedencia: string; equipo: string; aula: string; inicio: string; fin: null; datosAdicionales?: string };
type Props = { onSubmit: (solicitud: SolicitudEquipo) => Promise<void>; puedeVolver?: boolean; puedeDevolver?: boolean };
const lugaresFacultad = [
  ...['3A', '3B', '3C', '3D', '3E', '3F', '3G', '3H'].map(aula => `Salón ${aula}`),
  'Laboratorio 1', 'Laboratorio 2', 'Maestría', 'Biblioteca', 'Decanato',
  'Oficina del laboratorio', 'Salón de estudiantes',
];

export function PortalSolicitudes({ onSubmit, puedeVolver = false, puedeDevolver = false }: Props) {
  const [tipo, setTipo] = useState('Control multimedia');
  const [lugar, setLugar] = useState('');
  const [etapa, setEtapa] = useState<'formulario' | 'confirmar' | 'enviado'>('formulario');
  const [solicitud, setSolicitud] = useState<SolicitudEquipo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (etapa !== 'enviado') return;
    const timer = window.setTimeout(() => {
      setSolicitud(null);
      setTipo('Control multimedia');
      setLugar('');
      setError('');
      setEtapa('formulario');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [etapa]);
  function revisar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const inicio = new Date();
    const aula = lugar === 'otro' ? value('otroLugar') : lugar;
    if (!aula) { setError('Seleccione el aula o especifique el lugar de uso.'); return; }
    setSolicitud({ nombre: value('nombre'), procedencia: lugar === 'otro' ? aula : 'Facultad de Economía', equipo: tipo === 'Otro equipo' ? value('otroEquipo') : tipo, aula, inicio: inicio.toISOString(), fin: null, datosAdicionales: value('datosAdicionales') });
    setError(''); setEtapa('confirmar');
  }
  async function enviar() {
    if (!solicitud || busy) return;
    setBusy(true); setError('');
    try { await onSubmit(solicitud); setEtapa('enviado'); }
    catch { setError('No se pudo registrar la solicitud. Reintente o avise al personal.'); }
    finally { setBusy(false); }
  }
  return <main className="borrow-portal">
    <header className="borrow-header"><div className="borrow-brand"><img src="/logo-unachi.png" alt="Logo de UNACHI" /><div><strong>Nexus FADECO</strong><span>UNACHI · Facultad de Economía · Laboratorio</span></div></div>{puedeVolver ? <Link className="secondary-button" to="/laboratorio#prestamos">← Volver atrás · Préstamos</Link> : <span className="borrow-public-label">Registro público de préstamos</span>}</header>
    {etapa === 'enviado' ? <section className="borrow-result" aria-live="polite"><Check size={46} aria-hidden="true" /><h1>¡Préstamo registrado!</h1><p>Su equipo ya aparece en «En préstamo ahora». Cuando lo entregue, busque su nombre y pulse Devolver.</p><p>Esta pantalla volverá al inicio automáticamente en 3 segundos.</p></section> : <>
      <h1>¿Qué necesita para su clase?</h1><p className="borrow-intro">Elija el equipo y complete sus datos. El préstamo se registra automáticamente al confirmar.</p>
      {etapa === 'formulario' ? <><div className="borrow-options" role="group" aria-label="Equipo solicitado">
        <button className={tipo === 'Control multimedia' ? 'selected' : ''} type="button" onClick={() => setTipo('Control multimedia')}><Radio size={30} /><strong>Control multimedia</strong><span>Para el proyector del salón</span></button>
        <button className={tipo === 'Data Show' ? 'selected' : ''} type="button" onClick={() => setTipo('Data Show')}><Projector size={30} /><strong>Data Show</strong><span>Proyector para su actividad</span></button>
        <button className={tipo === 'Otro equipo' ? 'selected' : ''} type="button" onClick={() => setTipo('Otro equipo')}><Mouse size={30} /><strong>Otros equipos</strong><span>Mouse, cables y accesorios</span></button>
      </div><form className="borrow-form" onSubmit={revisar}><h2>Datos del préstamo</h2><div className="borrow-fields">
        <div className="borrow-field-group"><label>Nombre completo<input name="nombre" autoComplete="off" required maxLength={120} placeholder="Escriba su nombre" defaultValue={solicitud?.nombre} /></label>
          <details className="borrow-additional" open={solicitud?.datosAdicionales ? true : undefined}>
            <summary>Datos adicionales (opcional)</summary>
            <label>Contacto o procedencia<textarea name="datosAdicionales" maxLength={500} rows={3} defaultValue={solicitud?.datosAdicionales} placeholder="Ej. teléfono, facultad, departamento o aula de procedencia" /></label>
          </details>
        </div>
        <div className="borrow-field-group">
          <label>Aula o lugar de uso<select name="aula" required value={lugar} onChange={event => setLugar(event.target.value)}><option value="" disabled>Seleccione un aula o lugar</option>{lugaresFacultad.map(item => <option key={item} value={item}>{item}</option>)}<option value="otro">Otro lugar</option></select></label>
          {lugar === 'otro' ? <label>Especifique el lugar de uso<input name="otroLugar" autoComplete="off" required maxLength={100} placeholder="Ej. Auditorio de la Facultad de Educación" defaultValue={solicitud?.aula} /></label> : null}
          {tipo === 'Otro equipo' ? <label>Equipo que necesita<input name="otroEquipo" required maxLength={120} placeholder="Ej. mouse o cable HDMI" defaultValue={solicitud?.equipo} /></label> : null}
        </div>
      </div>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="borrow-form-footer"><small>La fecha y la hora de solicitud se registran automáticamente.</small><button className="primary-button" type="submit">Revisar préstamo</button></div></form>{puedeDevolver ? <DevolucionesRecepcion /> : null}</> : <section className="borrow-form"><h2>Confirme su préstamo</h2><p><strong>{solicitud?.equipo}</strong> · {solicitud?.aula}</p><p>Solicitante: {solicitud?.nombre}</p>{solicitud?.datosAdicionales ? <p style={{ whiteSpace: 'pre-wrap' }}>Datos adicionales: {solicitud.datosAdicionales}</p> : null}<p>La fecha y hora de devolución se registrarán al devolver el equipo.</p>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="page-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setEtapa('formulario')}>Corregir</button><button className="primary-button" type="button" disabled={busy} onClick={() => void enviar()}>{busy ? 'Registrando…' : 'Confirmar préstamo'}</button></div></section>}
    </>}
  </main>;
}
