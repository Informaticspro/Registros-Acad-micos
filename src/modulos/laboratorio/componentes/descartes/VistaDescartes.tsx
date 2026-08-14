import { ChangeEvent, FormEvent } from 'react';
import { Download, Save, Trash2, Upload } from 'lucide-react';

import { DescarteLaboratorio, EquipoLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { normalizeExcelKey, splitMarcaModelo } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type VistaDescartesProps = {
  descartes: DescarteLaboratorio[];
  equipos: EquipoLaboratorio[];
  isSaving: boolean;
  responsableSesion: string;
  selectedEquipoId: string;
  selectedEquipo: EquipoLaboratorio | null;
  onSelectedEquipoChange: (equipoId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onExcelUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onExportExcel: () => void;
  onDelete: (descarte: DescarteLaboratorio) => void;
};

export function VistaDescartes({
  descartes,
  equipos,
  isSaving,
  responsableSesion,
  selectedEquipoId,
  selectedEquipo,
  onSelectedEquipoChange,
  onSubmit,
  onExcelUpload,
  onExportExcel,
  onDelete,
}: VistaDescartesProps) {
  const equiposEnDeposito = equipos.filter((equipo) => normalizeExcelKey(equipo.ubicacion).includes('deposito'));
  const selectedBrandModel = selectedEquipo ? splitMarcaModelo(selectedEquipo.marcaModelo) : null;

  return (
    <div className="lab-grid">
      <form className="stack-form lab-form" onSubmit={onSubmit}>
        <h2>Registrar descarte</h2>
        <p className="form-hint">
          Use esta seccion cuando un equipo en Deposito sale definitivamente de la facultad. Si selecciona un equipo registrado, se guarda la evidencia y se retira del inventario activo.
        </p>
        <div className="form-grid compact-form-grid">
          <label>
            Fecha
            <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </label>
          <label>
            Equipo del inventario
            <select name="equipoId" value={selectedEquipoId} onChange={(event) => onSelectedEquipoChange(event.target.value)}>
              <option value="">Registro manual</option>
              {equiposEnDeposito.map((equipo) => (
                <option value={equipo.id} key={equipo.id}>
                  {equipo.codigo || 'S/N'} - {equipo.nombre} - {equipo.ubicacion}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid compact-form-grid" key={selectedEquipoId || 'manual'}>
          <label>
            Inventario
            <input name="inventario" required defaultValue={selectedEquipo?.codigo ?? ''} placeholder="Ej. 16332 o S/N" />
          </label>
          <label>
            Equipo
            <input name="equipo" required defaultValue={selectedEquipo?.nombre ?? ''} placeholder="Monitor, PC, impresora..." />
          </label>
          <label>
            Marca
            <input name="marca" defaultValue={selectedBrandModel?.marca ?? ''} placeholder="HP, Dell..." />
          </label>
          <label>
            Modelo
            <input name="modelo" defaultValue={selectedBrandModel?.modelo ?? ''} placeholder="L1710, 400 G9..." />
          </label>
          <label>
            Serie
            <input name="serie" defaultValue={selectedEquipo?.serie ?? ''} placeholder="S/N" />
          </label>
          <label>
            Ubicacion
            <input name="ubicacion" defaultValue={selectedEquipo?.ubicacion ?? 'Deposito'} />
          </label>
        </div>
        <label>
          Detalle del descarte
          <textarea name="detalle" rows={4} required placeholder="Motivo, condicion del equipo, dano encontrado o referencia administrativa." />
        </label>
        <label>
          Responsable
          <input name="responsable" defaultValue={responsableSesion} required />
        </label>
        <div className="form-grid compact-form-grid">
          <label>
            Evidencia
            <input name="evidenciaTitulo" placeholder="Acta, foto, memorando, factura..." />
          </label>
          <label>
            Enlace o referencia
            <input name="evidenciaUrl" placeholder="URL, carpeta, archivo o referencia fisica" />
          </label>
        </div>
        <div className="page-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            <Save size={18} />
            Guardar descarte
          </button>
          <label className="secondary-button file-action-button">
            <Upload size={18} />
            Cargar Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onExcelUpload} disabled={isSaving} />
          </label>
          <button className="secondary-button" type="button" onClick={onExportExcel}>
            <Download size={18} />
            Descargar Excel
          </button>
        </div>
      </form>

      <div className="lab-list">
        <h2>Descartes registrados</h2>
        {descartes.length === 0 ? <p className="form-hint">Todavia no hay descartes registrados.</p> : null}
        {descartes.map((item) => (
          <article className="lab-record compact" key={item.id}>
            <div className="lab-record-header">
              <div>
                <span className="status-pill equipment-baja">Descarte</span>
                <h3>{item.inventario} - {item.equipo}</h3>
                <small>{formatDateTime(item.fecha)} | {item.ubicacion || 'Sin ubicacion'}</small>
              </div>
              <div className="row-actions">
                <button className="icon-button danger-button" type="button" title="Eliminar descarte" onClick={() => onDelete(item)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p>{item.marca || 'S/N'} | {item.modelo || 'S/N'} | Serie: {item.serie || 'S/N'}</p>
            <small>
              {item.detalle || 'Sin detalle'} | Responsable: {item.responsable || 'No indicado'}
              {item.evidenciaTitulo || item.evidenciaUrl ? ` | Evidencia: ${[item.evidenciaTitulo, item.evidenciaUrl].filter(Boolean).join(' - ')}` : ''}
            </small>
          </article>
        ))}
      </div>
    </div>
  );
}
