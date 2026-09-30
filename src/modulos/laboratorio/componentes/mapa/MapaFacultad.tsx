import { useEffect, useState } from 'react';
import { Building2, Copy, DoorOpen, Maximize2, Minimize2, MapPinned, Route, Users } from 'lucide-react';
import type { BitacoraLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import { estadoTrabajoLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';

import {
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type MapaFacultadProps = {
  trabajos: BitacoraLaboratorio[];
  onOpenWorks: () => void;
  defaultFullView?: boolean;
  estadoEquipoNombre: Record<string, string>;
  estadosAlertaPorUbicacion: Record<string, string[]>;
  getFilterCount: (ubicacion: string) => number;
  onSelectLocation: (ubicacion: string) => void;
};

type MapaZona = {
  etiqueta: string;
  ubicacion?: string;
  lado: 'left' | 'right' | 'center';
  icono?: 'aula' | 'laboratorio' | 'biblioteca' | 'servicio' | 'escalera' | 'copiadora';
  hidden?: boolean;
  muted?: boolean;
};

const zonas: MapaZona[][] = [
  [
    { etiqueta: 'Salón 3A', ubicacion: '3A', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salón 3H', ubicacion: '3H', lado: 'right', icono: 'aula' },
  ],
  [
    { etiqueta: 'Escalera', lado: 'left', icono: 'escalera', muted: true },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Copiadora', lado: 'right', icono: 'copiadora', muted: true },
  ],
  [
    { etiqueta: 'Maestría', ubicacion: 'maestría', lado: 'left', icono: 'servicio' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Baños mujeres', lado: 'right', icono: 'servicio', muted: true },
  ],
  [
    { etiqueta: 'Salón 3B', ubicacion: '3B', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salón 3G', ubicacion: '3G', lado: 'right', icono: 'aula' },
  ],
  [
    { etiqueta: 'Salón 3C', ubicacion: '3C', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Biblioteca', ubicacion: 'Biblioteca', lado: 'right', icono: 'biblioteca' },
  ],
  [
    { etiqueta: 'Salón 3D', ubicacion: '3D', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salón de estudiantes', lado: 'right', icono: 'servicio', muted: true },
  ],
  [
    { etiqueta: 'Salón 3E', ubicacion: '3E', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Laboratorio 2', ubicacion: 'Laboratorio 2', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: 'Salón 3F', ubicacion: '3F', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Laboratorio 1', ubicacion: 'Laboratorio 1', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: '', lado: 'left', hidden: true, muted: true },
    { etiqueta: 'Decanato', ubicacion: 'Decanato', lado: 'center', icono: 'servicio' },
    { etiqueta: 'Oficina laboratorio', ubicacion: 'Seccion de Tecnologia', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: 'Baños hombres', lado: 'left', icono: 'servicio', muted: true },
    { etiqueta: 'Acceso principal', lado: 'center', icono: 'servicio', muted: true },
    { etiqueta: 'Escalera', lado: 'right', icono: 'escalera', muted: true },
  ],
];

function getIcon(icono: MapaZona['icono']) {
  if (icono === 'laboratorio') return <Building2 size={18} />;
  if (icono === 'biblioteca') return <DoorOpen size={18} />;
  if (icono === 'escalera') return <Route size={18} />;
  if (icono === 'copiadora') return <Copy size={18} />;
  if (icono === 'servicio') return <Users size={18} />;
  return <MapPinned size={18} />;
}

function getSideZones(lado: MapaZona['lado']) {
  return zonas.map((fila) => fila.find((zona) => zona.lado === lado)).filter((zona): zona is MapaZona => Boolean(zona));
}

export function MapaFacultad({
  trabajos,
  onOpenWorks,
  defaultFullView = false,
  estadoEquipoNombre,
  estadosAlertaPorUbicacion,
  getFilterCount,
  onSelectLocation,
}: MapaFacultadProps) {
  const [isFullView, setIsFullView] = useState(defaultFullView);
  const [showWorks, setShowWorks] = useState(false);
  const [area, setArea] = useState('');
  const areas = Array.from(new Set(trabajos.map((item) => item.ubicacion).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const recientes = trabajos.filter((item) => !area || item.ubicacion === area)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime() || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
  const zonasIzquierda = getSideZones('left');
  const zonasDerecha = getSideZones('right');
  const zonasCentrales = getSideZones('center').filter((zona) => zona.ubicacion);

  useEffect(() => {
    if (!isFullView) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsFullView(false);
    }

    document.body.classList.add('body-map-full-view');
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('body-map-full-view');
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullView]);

  function renderZona(zona: MapaZona, index: number) {
    if (zona.hidden) {
      return <span className="faculty-map-zone-placeholder" key={`placeholder-${zona.lado}-${index}`} />;
    }

    const count = zona.ubicacion ? getFilterCount(zona.ubicacion) : 0;
    const alertas = zona.ubicacion ? estadosAlertaPorUbicacion[zona.ubicacion] ?? [] : [];
    const isClickable = Boolean(zona.ubicacion);

    return (
      <button
        className={`faculty-map-zone faculty-map-zone-${zona.lado} faculty-map-zone-${
          zona.icono ?? 'aula'
        }${zona.muted ? ' muted' : ''}${isClickable ? ' clickable' : ''}`}
        disabled={!isClickable}
        key={`${zona.etiqueta}-${zona.lado}-${index}`}
        type="button"
        onClick={() => zona.ubicacion && onSelectLocation(zona.ubicacion)}
      >
        <span className="faculty-map-zone-icon">{getIcon(zona.icono)}</span>
        <strong>{zona.etiqueta}</strong>
        {zona.ubicacion ? (
          <small>
            {count} {count === 1 ? 'equipo' : 'equipos'}
          </small>
        ) : null}
        {alertas.length ? (
          <span className="faculty-map-alerts" aria-label="Estados que requieren atención">
            {alertas.map((estado) => (
              <span
                className={`equipment-${getEstadoEquipoClass(estado)}`}
                key={estado}
              >
                {estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
              </span>
            ))}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <section className={`faculty-map-panel${isFullView ? ' is-full-view' : ''}`}>
      <div className="faculty-map-heading">
        <div>
          <span className="eyebrow">Mapa interactivo</span>
          <h2>Facultad de Economía</h2>
          <p>Seleccione un área para consultar sus equipos. Los espacios sin contador son referencias del edificio.</p>
        </div>
        <div className="faculty-map-heading-actions">
        <button type="button" className="secondary-button" aria-expanded={showWorks} aria-controls="map-recent-works" onClick={() => setShowWorks((value) => !value)}>
          {showWorks ? 'Cerrar trabajos recientes' : 'Trabajos recientes'}
        </button>
        <button
          className="secondary-button faculty-map-fullscreen-button"
          type="button"
          aria-pressed={isFullView}
          onClick={() => setIsFullView((value) => !value)}
        >
          {isFullView ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          {isFullView ? 'Salir de vista completa' : 'Vista completa'}
        </button>
        </div>
      </div>

      <div className="faculty-map-content">
      {showWorks ? <aside id="map-recent-works" className="faculty-map-activity" aria-label="Trabajos recientes">
        <div className="faculty-map-activity-heading">
          <div><span className="eyebrow">Actividad de soporte</span><h3>Trabajos recientes</h3></div>
          <button type="button" className="secondary-button" onClick={() => setShowWorks(false)}>Cerrar panel</button>
          <button type="button" className="secondary-button" onClick={onOpenWorks}>Ver todos los trabajos</button>
        </div>
        <label htmlFor="map-work-area">Filtrar trabajos por área</label>
        <select id="map-work-area" value={area} onChange={(event) => setArea(event.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((ubicacion) => <option key={ubicacion} value={ubicacion}>{ubicacion}</option>)}
        </select>
        <p className="faculty-map-activity-note">Últimos 6 por fecha del trabajo, incluidos los finalizados.</p>
        {recientes.length ? <ol className="faculty-map-work-list">
          {recientes.map((item) => <li key={item.id}>
            <span className="faculty-map-work-status">{estadoTrabajoLabels[item.estado]}</span>
            <h4>{item.titulo}</h4>
            <p>{item.responsable || 'Sin responsable'}</p>
            <time dateTime={item.fecha}>{formatDateTime(item.fecha)}</time>
            {item.ubicacion ? <button className="faculty-map-work-location" type="button" onClick={() => onSelectLocation(item.ubicacion)}><MapPinned size={16} />{item.ubicacion} · Ver equipos</button> : <p>Sin ubicación registrada</p>}
            <details><summary>Detalle del trabajo</summary><p>{item.descripcion || 'Sin descripción adicional.'}</p></details>
          </li>)}
        </ol> : <p>No hay trabajos registrados en esta área.</p>}
      </aside> : null}
      <div className="faculty-map" aria-label="Plano interactivo de ubicaciones">
        <div className="faculty-map-graphic">
          <div className="faculty-map-wing faculty-map-wing-left">
            <span className="faculty-map-side-label">Ala izquierda</span>
            {zonasIzquierda.map(renderZona)}
          </div>

          <div className="faculty-map-perspective" aria-hidden="true">
            <Route size={24} />
            <strong>Pasillo central</strong>
          </div>

          <div className="faculty-map-wing faculty-map-wing-right">
            <span className="faculty-map-side-label">Ala derecha</span>
            {zonasDerecha.map(renderZona)}
          </div>
        </div>

        {zonasCentrales.length ? (
          <div className="faculty-map-center-zones">
            {zonasCentrales.map((zona, index) => renderZona(zona, index))}
          </div>
        ) : null}
      </div>
      </div>
    </section>
  );
}
