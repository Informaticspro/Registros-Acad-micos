import { useState, type FormEvent } from 'react';
import { Check, Mouse, Projector, Radio } from 'lucide-react';

export type SolicitudEquipo = { nombre: string; procedencia: string; equipo: string; aula: string; inicio: string; fin: string };
type Props = { onSubmit: (solicitud: SolicitudEquipo) => Promise<void> };

export function PortalSolicitudes({ onSubmit }: Props) {
  const [tipo, setTipo] = useState('Control multimedia');
  const [etapa, setEtapa] = useState<'formulario' | 'confirmar' | 'enviado'>('formulario');
  const [solicitud, setSolicitud] = useState<SolicitudEquipo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function revisar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? '').trim();
    const inicio = new Date();
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).format(inicio);
    const fin = new Date(`${fecha}T${value('fin')}:00-05:00`);
    if (Number.isNaN(fin.getTime()) || fin <= inicio) { setError('La devolución debe ser posterior a la hora actual.'); return; }
    setSolicitud({ nombre: value('nombre'), procedencia: value('procedencia'), equipo: tipo === 'Otro equipo' ? value('otroEquipo') : tipo, aula: value('aula'), inicio: inicio.toISOString(), fin: fin.toISOString() });
    setError(''); setEtapa('confirmar');
  }
  async function enviar() {
    if (!solicitud || busy) return;
    setBusy(true); setError('');
    try { await onSubmit(solicitud); setEtapa('enviado'); }
    catch { setError('No se pudo registrar la solicitud. Reintente o avise al personal.'); }
    finally { setBusy(false); }
  }
  function finalizar() { setSolicitud(null); setTipo('Control multimedia'); setError(''); setEtapa('formulario'); }
  return <main className="borrow-portal">
    <header className="borrow-header"><div className="borrow-brand"><img src="/logo-unachi.png" alt="Logo de UNACHI" /><div><strong>UNACHI · Facultad de Economía</strong><span>Sección de Tecnología · Laboratorio</span></div></div><span className="borrow-public-label">Registro público de préstamos</span></header>
    {etapa === 'enviado' ? <section className="borrow-result" aria-live="polite"><Check size={46} aria-hidden="true" /><h1>¡Solicitud registrada!</h1><p>Acérquese al personal para retirar el equipo. La entrega se confirma cuando se lo proporcionen.</p><button className="primary-button" type="button" onClick={finalizar}>Listo · siguiente persona</button></section> : <>
      <span className="eyebrow">Sin cuenta · sin firmas</span><h1>¿Qué necesita para su clase?</h1><p className="borrow-intro">Elija el equipo y complete sus datos. El personal confirmará la entrega.</p>
      {etapa === 'formulario' ? <><div className="borrow-options" role="group" aria-label="Equipo solicitado">
        <button className={tipo === 'Control multimedia' ? 'selected' : ''} type="button" onClick={() => setTipo('Control multimedia')}><Radio size={30} /><strong>Control multimedia</strong><span>Para el proyector del salón</span></button>
        <button className={tipo === 'Data Show' ? 'selected' : ''} type="button" onClick={() => setTipo('Data Show')}><Projector size={30} /><strong>Data Show</strong><span>Proyector para su actividad</span></button>
        <button className={tipo === 'Otro equipo' ? 'selected' : ''} type="button" onClick={() => setTipo('Otro equipo')}><Mouse size={30} /><strong>Otros equipos</strong><span>Mouse, cables y accesorios</span></button>
      </div><form className="borrow-form" onSubmit={revisar}><h2>Datos del préstamo</h2><div className="borrow-fields">
        <label>Nombre completo<input name="nombre" autoComplete="off" required maxLength={120} placeholder="Escriba su nombre" /></label>
        <label>Facultad o departamento de procedencia<input name="procedencia" autoComplete="off" required maxLength={120} placeholder="Ej. Facultad de Economía / Dirección de Extensión" /></label>
        <label>Aula o lugar de uso<input name="aula" autoComplete="off" required maxLength={100} placeholder="Ej. Salón 3H" /></label>
        <label>Hora prevista de devolución<input name="fin" type="time" required /></label>
        {tipo === 'Otro equipo' ? <label>Equipo que necesita<input name="otroEquipo" required maxLength={120} placeholder="Ej. mouse o cable HDMI" /></label> : null}
      </div>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="borrow-form-footer"><small>La fecha y la hora de solicitud se registran automáticamente.</small><button className="primary-button" type="submit">Revisar solicitud</button></div></form></> : <section className="borrow-form"><h2>Confirme su solicitud</h2><p><strong>{solicitud?.equipo}</strong> · {solicitud?.aula}</p><p>{solicitud?.nombre} · {solicitud?.procedencia}</p><p>Devolución prevista: {solicitud ? new Date(solicitud.fin).toLocaleString('es-PA', { timeZone: 'America/Panama' }) : ''}</p>{error ? <p role="alert" className="form-error">{error}</p> : null}<div className="page-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => setEtapa('formulario')}>Corregir</button><button className="primary-button" type="button" disabled={busy} onClick={() => void enviar()}>{busy ? 'Registrando…' : 'Confirmar solicitud'}</button></div></section>}
    </>}
  </main>;
}
