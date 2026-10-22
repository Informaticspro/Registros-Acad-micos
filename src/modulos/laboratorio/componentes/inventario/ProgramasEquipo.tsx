import { useRef, useState } from 'react';
import { Download, Save } from 'lucide-react';
import type { AplicacionFichaLaboratorio } from '@/tipos/dominio';
import type { CambioPrograma } from '@/modulos/laboratorio/programas.servicio';

export function ProgramasEquipo({ programas, isSaving, onSave }: { programas: AplicacionFichaLaboratorio[]; isSaving: boolean; onSave: (cambio: CambioPrograma) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [accion, setAccion] = useState<CambioPrograma['accion']>('instalar');
  const [nombre, setNombre] = useState('');
  const [version, setVersion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const receipt = useRef(crypto.randomUUID());
  const installed = programas.filter(item => item.instalada).sort((a,b) => a.nombre.localeCompare(b.nombre,'es'));
  function renew() { receipt.current = crypto.randomUUID(); }
  function start(action: CambioPrograma['accion'], app?: AplicacionFichaLaboratorio) {
    renew(); setAccion(action); setNombre(app?.nombre ?? ''); setVersion(action === 'actualizar' ? app?.observacion ?? '' : ''); setDescripcion(''); setOpen(true);
  }
  return <section className="lab-equipment-detail-section">
    <div className="lab-home-section-header"><div><span className="eyebrow">Programas de esta PC</span><h3>Programas instalados · {installed.length}</h3></div><button className="primary-button" type="button" disabled={isSaving} onClick={() => start('instalar')}><Download size={18} />Registrar instalación</button></div>
    {!installed.length ? <p className="form-hint">No hay programas registrados. La lista se completa al registrar instalaciones o desde Detalles técnicos.</p> : <ul className="lab-software-list">{installed.map(app => <li key={app.nombre}><div><strong>{app.nombre}</strong><small>{app.observacion || 'Versión sin especificar'}</small></div><div className="page-actions"><button className="secondary-button" type="button" disabled={isSaving} onClick={() => start('actualizar',app)}>Actualizar</button><button className="secondary-button" type="button" disabled={isSaving} onClick={() => start('retirar',app)}>Registrar retiro</button></div></li>)}</ul>}
    {open ? <form className="stack-form lab-form" onSubmit={async event => {
      event.preventDefault();
      if (isSaving || !nombre.trim()) return;
      if (await onSave({ accion, nombre: nombre.trim(), version: version.trim(), descripcion: descripcion.trim(), requestId: receipt.current })) { setOpen(false); renew(); }
    }}>
      <h3>{accion === 'instalar' ? 'Registrar instalación de software' : accion === 'actualizar' ? 'Registrar actualización' : 'Registrar retiro de software'}</h3>
      <p className="form-hint">Registre una acción que ya realizó. La fecha, hora, responsable e historial se guardan automáticamente junto con la lista de programas.</p>
      <label>Programa *<input name="programa" required maxLength={120} readOnly={accion !== 'instalar'} value={nombre} autoFocus onChange={event => { renew(); setNombre(event.target.value); }} placeholder="Ej. Visual Studio Code" /></label>
      {accion !== 'retirar' ? <label>Versión (opcional)<input maxLength={160} value={version} onChange={event => { renew(); setVersion(event.target.value); }} placeholder="Ej. 1.105" /></label> : null}
      <label>Descripción / solicitud (opcional)<textarea rows={3} maxLength={5000} value={descripcion} onChange={event => { renew(); setDescripcion(event.target.value); }} placeholder="Ej. Solicitado por la profesora; se comprobó que abre correctamente." /></label>
      {accion === 'retirar' ? <p className="form-hint">Se marcará como retirado de esta PC; el historial se conservará.</p> : null}
      <div className="page-actions"><button className="primary-button" type="submit" disabled={isSaving || !nombre.trim()}><Save size={18} />{isSaving ? 'Guardando…' : 'Guardar registro'}</button><button className="secondary-button" type="button" disabled={isSaving} onClick={() => setOpen(false)}>Cancelar</button></div>
    </form> : null}
  </section>;
}
