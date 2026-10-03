import { HardDrive, Wrench } from 'lucide-react';
import { useRef, useState } from 'react';
import type { BitacoraLaboratorio, EquipoLaboratorio } from '@/tipos/dominio';
import { esTrabajoAbierto } from '@/modulos/laboratorio/utilidades/atencion';
import { getEstadoEquipoClass, getEstadoEquipoLabel, shouldRequestIssueDetailForEstado } from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';
import { estadoTrabajoLabels, prioridadLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';

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
  desactualizado?: boolean;
  equipos: EquipoLaboratorio[];
  trabajos: BitacoraLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  onOpenEquipo: (equipo: EquipoLaboratorio) => void;
  onOpenTrabajo: (trabajo: BitacoraLaboratorio) => void;
  actividadReciente: ActividadRecienteLaboratorio[];
  cantidadEquipos: number;
  cantidadFichas: number;
  indicadores: IndicadoresInicioLaboratorio;
  showMoreActivity: boolean;
  onChangeTab: (tab: LabTab) => void;
  onToggleActivityLimit: () => void;
};

export function InicioLaboratorio({
  desactualizado = false,
  equipos, trabajos, estadoEquipoNombre, onOpenEquipo, onOpenTrabajo,
  actividadReciente,
  cantidadEquipos,
  cantidadFichas,
  indicadores,
  showMoreActivity,
  onChangeTab,
  onToggleActivityLimit,
}: InicioLaboratorioProps) {
  const [verTodos, setVerTodos] = useState(false);
  const trabajosRef = useRef<HTMLElement>(null);
  const equiposRef = useRef<HTMLElement>(null);
  const abiertos = trabajos.filter(esTrabajoAbierto).sort((a, b) => {
    const orden = { critica: 0, alta: 1, media: 2, baja: 3 };
    return orden[a.prioridad] - orden[b.prioridad] || b.createdAt.localeCompare(a.createdAt);
  });
  const atencion = equipos.filter((item) => shouldRequestIssueDetailForEstado(item.estado))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pendientes = abiertos.filter((item) => item.estado === 'pendiente').length;
  function mostrarAbiertos() {
    setVerTodos(true);
    trabajosRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    trabajosRef.current?.focus({ preventScroll: true });
  }
  return (
    <div className="lab-home">
      <p role="status" className="form-hint">{desactualizado
        ? 'No se pudieron actualizar los datos. Se muestra la última información disponible; reintentaremos automáticamente.'
        : 'Actualización automática cada 30 segundos mientras Inicio está visible.'}</p>
      <section className="lab-home-panel lab-home-hero">
        <div>
          <span className="eyebrow">Inicio tecnico</span>
          <h2>Centro de operaciones del laboratorio</h2>
          <p>¿Instaló un cable, reparó un equipo o atendió una falla? Empiece en Registrar trabajo.</p>
        </div>
        <div className="lab-home-actions">
          <button className="primary-button" type="button" onClick={() => onChangeTab('bitacoras')}>
            <Wrench size={18} />
            Registrar trabajo
          </button>
          <button className="secondary-button" type="button" onClick={() => onChangeTab('inventario')}>
            <HardDrive size={18} />
            Inventario
          </button>
        </div>
      </section>

      {atencion.length > 0 ? <button type="button" className="lab-home-attention-banner" onClick={() => { equiposRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); equiposRef.current?.focus({ preventScroll: true }); }}>
        <strong>Requieren atención: {atencion.length} equipos</strong>
        <span>{atencion.slice(0, 3).map((equipo) => `${equipo.nombre} (${estadoEquipoNombre[equipo.estado] || getEstadoEquipoLabel(equipo.estado)})`).join(' · ')}</span>
        <span>Ver equipos y sus estados →</span>
      </button> : null}

      <section className="lab-home-metrics">
        <button
          className={indicadores.equiposMantenimiento > 0 ? 'attention' : ''}
          type="button"
          onClick={() => { equiposRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); equiposRef.current?.focus({ preventScroll: true }); }}
        >
          <span>En mantenimiento</span>
          <strong>{indicadores.equiposMantenimiento}</strong>
          <small>Equipos con atencion tecnica activa</small>
        </button>
        <button type="button" className={abiertos.length ? 'attention' : ''} onClick={mostrarAbiertos}>
          <span>Trabajos abiertos</span>
          <strong>{indicadores.trabajosAbiertos}</strong>
          <small>{pendientes} pendientes · {abiertos.length - pendientes} en proceso</small>
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
          <span>Detalles técnicos</span>
          <strong>{cantidadFichas}</strong>
          <small>Características e historial del equipo</small>
        </button>
      </section>

      <div className="lab-attention-grid">
        <section className="lab-home-panel" ref={equiposRef} tabIndex={-1} aria-label="Equipos que requieren atención">
          <span className="eyebrow">Atención técnica</span>
          <h2>Equipos que requieren atención · {atencion.length}</h2>
          <p>En revisión, reparación o mantenimiento. Seleccione un equipo para consultar su historial.</p>
          {!atencion.length ? <p>No hay equipos con revisión, reparación o mantenimiento pendientes.</p> : null}
          <div className="lab-attention-list">
            {atencion.map((equipo) => <button key={equipo.id} type="button" onClick={() => onOpenEquipo(equipo)}>
              <span className={`status-pill equipment-${getEstadoEquipoClass(equipo.estado)}`}>{estadoEquipoNombre[equipo.estado] || getEstadoEquipoLabel(equipo.estado)}</span>
              <strong>{equipo.nombre} · {equipo.codigo || 'Sin inventario'}</strong>
              <span>{equipo.ubicacion || 'Sin ubicación'}</span>
              <small>Actualizado: {formatDateTime(equipo.updatedAt)}</small>
            </button>)}
          </div>
        </section>
        <section className="lab-home-panel" ref={trabajosRef} tabIndex={-1} aria-label="Trabajos abiertos">
          <span className="eyebrow">Pendientes del equipo de soporte</span>
          <h2>Trabajos abiertos · {abiertos.length}</h2>
          <p>{pendientes} pendientes · {abiertos.length - pendientes} en proceso. Ordenados por prioridad y registro más reciente. Resueltos y cerrados no se incluyen.</p>
          {!abiertos.length ? <p>No hay trabajos pendientes ni en proceso.</p> : null}
          <div className="lab-attention-list">
            {(verTodos ? abiertos : abiertos.slice(0, 5)).map((trabajo) => <article key={trabajo.id}>
              <div className="lab-attention-badges"><span className={`status-pill priority-${trabajo.prioridad}`}>Prioridad {prioridadLabels[trabajo.prioridad]}</span><span className={`status-pill equipment-${trabajo.estado === 'pendiente' ? 'pendiente_revision' : 'mantenimiento'}`}>{estadoTrabajoLabels[trabajo.estado]}</span></div>
              <h3>{trabajo.titulo}</h3>
              <p>{trabajo.ubicacion || 'Sin ubicación'} · {trabajo.responsable || 'Sin responsable'}</p>
              <small>{formatDateTime(trabajo.fecha)}</small>
              <details><summary>Ver detalle</summary><p>{trabajo.descripcion || 'Sin descripción adicional.'}</p></details>
              <button type="button" className="secondary-button" onClick={() => onOpenTrabajo(trabajo)}>Revisar / actualizar trabajo</button>
            </article>)}
          </div>
          {abiertos.length > 5 ? <button type="button" className="secondary-button" onClick={() => setVerTodos((value) => !value)}>{verTodos ? 'Mostrar solo 5' : `Ver los ${abiertos.length} trabajos abiertos`}</button> : null}
        </section>
      </div>

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
