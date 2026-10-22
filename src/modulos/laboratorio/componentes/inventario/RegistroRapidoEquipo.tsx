import { useState } from 'react';
import { Save, Wrench } from 'lucide-react';
import type { TipoTrabajoRapido } from '@/modulos/laboratorio/constantes/laboratorio.constantes';

type Props = {
  isSaving: boolean;
  onSave: (tipo: TipoTrabajoRapido, descripcion: string) => Promise<boolean>;
};

export function RegistroRapidoEquipo({ isSaving, onSave }: Props) {
  const [tipo, setTipo] = useState<TipoTrabajoRapido | null>(null);
  const [descripcion, setDescripcion] = useState('');
  return <section className="lab-quick-work">
    <div className="page-actions">
      <button className="secondary-button" type="button" disabled={isSaving} onClick={() => setTipo('fisico')}><Wrench size={18} />Registrar trabajo físico</button>
    </div>
    {tipo ? <form className="stack-form lab-form" onSubmit={async event => {
      event.preventDefault();
      if (isSaving || !descripcion.trim()) return;
      if (await onSave(tipo, descripcion.trim())) { setDescripcion(''); setTipo(null); }
    }}>
      <h3>Registrar trabajo físico</h3>
      <p className="form-hint">La fecha y hora actuales, su nombre y este equipo se registran automáticamente. Se guardará como trabajo finalizado.</p>
      <label>¿Qué se hizo? *<textarea autoFocus name="descripcionTrabajoRapido" required maxLength={5000} rows={3} value={descripcion} disabled={isSaving} onChange={event => setDescripcion(event.target.value)} placeholder="Ej. Se reemplazó el cable HDMI y se comprobó la imagen." /></label>
      <div className="page-actions"><button className="primary-button" type="submit" disabled={isSaving || !descripcion.trim()}><Save size={18} />{isSaving ? 'Guardando…' : 'Guardar registro'}</button><button className="secondary-button" type="button" disabled={isSaving} onClick={() => setTipo(null)}>Cancelar</button></div>
    </form> : null}
  </section>;
}
