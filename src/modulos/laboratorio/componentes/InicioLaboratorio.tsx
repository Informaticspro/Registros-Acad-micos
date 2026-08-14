import { ClipboardList, HardDrive, Wrench } from 'lucide-react';

import { formatDateTime } from '@/utilidades/formato';
import type { LabTab } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

type IndicadoresInicioLaboratorio = {
  trabajosAbiertos: number;
  equiposMantenimiento: number;
  prestamosActivos: number;
  descartesRegistrados: number;
};

type ActividadRecienteLaboratorio = {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  detalle: string;
  tab: LabTab;
};

type InicioLaboratorioProps = {
  actividadReciente: ActividadRecienteLaboratorio[];
  cantidadEquipos: number;
  cantidadFichas: number;
  indicadores: IndicadoresInicioLaboratorio;
  showMoreActivity: boolean;
  onChangeTab: (tab: LabTab) => void;
  onToggleActivityLimit: () => void;
};

export function InicioLaboratorio({
  actividadReciente,
  cantidadEquipos,
  cantidadFichas,
  indicadores,
  showMoreActivity,
  onChangeTab,
  onToggleActivityLimit,
}: InicioLaboratorioProps) {
  return (
    <div className="lab-home">
      <section className="lab-home-panel lab-home-hero">
        <div>
          <span className="eyebrow">Inicio tecnico</span>
          <h2>Centro de operaciones del laboratorio</h2>
          <p>Revise el movimiento reciente y elija la tarea que desea realizar sin entrar directo a un formulario.</p>
        </div>
        <div className="lab-home-actions">
          <button className="primary-button" type="button" onClick={() => onChangeTab('bitacoras')}>
            <Wrench size={18} />
            Nueva bitacora
          </button>
          <button className="secondary-button" type="button" onClick={() => onChangeTab('fichas')}>
            <ClipboardList size={18} />
            Ficha tecnica
          </button>
          <button className="secondary-button" type="button" onClick={() => onChangeTab('inventario')}>
            <HardDrive size={18} />
            Inventario
          </button>
        </div>
      </section>

      <section className="lab-home-metrics">
        <button
          className={indicadores.equiposMantenimiento > 0 ? 'attention' : ''}
          type="button"
          onClick={() => onChangeTab('inventario')}
        >
          <span>En mantenimiento</span>
          <strong>{indicadores.equiposMantenimiento}</strong>
          <small>Equipos con atencion tecnica activa</small>
        </button>
        <button type="button" onClick={() => onChangeTab('bitacoras')}>
          <span>Trabajos abiertos</span>
          <strong>{indicadores.trabajosAbiertos}</strong>
          <small>Bitacoras pendientes o en proceso</small>
        </button>
        <button type="button" onClick={() => onChangeTab('inventario')}>
          <span>Equipos registrados</span>
          <strong>{cantidadEquipos}</strong>
          <small>Inventario total del laboratorio</small>
        </button>
        <button type="button" onClick={() => onChangeTab('prestamos')}>
          <span>Prestamos activos</span>
          <strong>{indicadores.prestamosActivos}</strong>
          <small>Dispositivos por devolver</small>
        </button>
        <button type="button" onClick={() => onChangeTab('descartes')}>
          <span>Descartes registrados</span>
          <strong>{indicadores.descartesRegistrados}</strong>
          <small>Equipos retirados del inventario</small>
        </button>
        <button type="button" onClick={() => onChangeTab('fichas')}>
          <span>Fichas tecnicas</span>
          <strong>{cantidadFichas}</strong>
          <small>Registros de mantenimiento</small>
        </button>
      </section>

      <section className="lab-home-panel lab-recent-activity">
        <div className="lab-home-section-header">
          <div>
            <span className="eyebrow">Actividad reciente</span>
            <h2>Ultimas acciones registradas</h2>
          </div>
          <div className="lab-section-actions">
            <small>{showMoreActivity ? 'Ultimos 20 registros' : 'Maximo 8 registros'}</small>
            <button className="secondary-button compact-button" type="button" onClick={onToggleActivityLimit}>
              {showMoreActivity ? 'Ver menos' : 'Ver ultimos 20'}
            </button>
          </div>
        </div>
        {actividadReciente.length === 0 ? (
          <p className="form-hint">Todavia no hay acciones recientes registradas.</p>
        ) : null}
        <div className="lab-activity-list">
          {actividadReciente.map((item) => (
            <button type="button" key={item.id} onClick={() => onChangeTab(item.tab)}>
              <span>{item.tipo}</span>
              <strong>{item.titulo}</strong>
              <small>{item.detalle}</small>
              <time>{formatDateTime(item.fecha)}</time>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
