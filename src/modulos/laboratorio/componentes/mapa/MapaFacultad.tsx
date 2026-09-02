import { Building2, Copy, DoorOpen, MapPinned, Route, Users } from 'lucide-react';

import {
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type MapaFacultadProps = {
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
  muted?: boolean;
};

const zonas: MapaZona[][] = [
  [
    { etiqueta: 'Salon 3A', ubicacion: '3A', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salon 3H', ubicacion: '3H', lado: 'right', icono: 'aula' },
  ],
  [
    { etiqueta: 'Salon de profesores', lado: 'left', icono: 'servicio', muted: true },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salon de profesores', lado: 'right', icono: 'servicio', muted: true },
  ],
  [
    { etiqueta: 'Salon 3B', ubicacion: '3B', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salon 3G', ubicacion: '3G', lado: 'right', icono: 'aula' },
  ],
  [
    { etiqueta: 'Salon 3C', ubicacion: '3C', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Biblioteca', ubicacion: 'Biblioteca', lado: 'right', icono: 'biblioteca' },
  ],
  [
    { etiqueta: 'Salon 3D', ubicacion: '3D', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Salon de estudiantes', lado: 'right', icono: 'servicio', muted: true },
  ],
  [
    { etiqueta: 'Salon 3E', ubicacion: '3E', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Laboratorio 2', ubicacion: 'Laboratorio 2', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: 'Salon 3F', ubicacion: '3F', lado: 'left', icono: 'aula' },
    { etiqueta: 'Pasillo central', lado: 'center', muted: true },
    { etiqueta: 'Laboratorio 1', ubicacion: 'Laboratorio 1', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: 'Banos hombres', lado: 'left', icono: 'servicio', muted: true },
    { etiqueta: 'Decanato', ubicacion: 'Decanato', lado: 'center', icono: 'servicio' },
    { etiqueta: 'Oficina laboratorio', ubicacion: 'Seccion de Tecnologia', lado: 'right', icono: 'laboratorio' },
  ],
  [
    { etiqueta: 'Escalera', lado: 'left', icono: 'escalera', muted: true },
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
  estadoEquipoNombre,
  estadosAlertaPorUbicacion,
  getFilterCount,
  onSelectLocation,
}: MapaFacultadProps) {
  const zonasIzquierda = getSideZones('left');
  const zonasDerecha = getSideZones('right');
  const zonasCentrales = getSideZones('center').filter((zona) => zona.ubicacion);

  function renderZona(zona: MapaZona, index: number) {
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
          <span className="faculty-map-alerts" aria-label="Estados con atencion">
            {alertas.map((estado) => (
              <i
                className={`equipment-${getEstadoEquipoClass(estado)}`}
                key={estado}
                title={estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
              />
            ))}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <section className="faculty-map-panel">
      <div className="faculty-map-heading">
        <span className="eyebrow">Mapa interactivo</span>
        <h2>Facultad de Economia</h2>
        <p>Toque un salon, laboratorio o area para ver sus equipos en el inventario.</p>
      </div>

      <div className="faculty-map" aria-label="Plano interactivo de ubicaciones">
        <div className="faculty-map-graphic">
          <div className="faculty-map-wing faculty-map-wing-left">
            <span className="faculty-map-side-label">Ala izquierda</span>
            {zonasIzquierda.map(renderZona)}
          </div>

          <div className="faculty-map-perspective" aria-hidden="true">
            <div className="faculty-map-ceiling">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="faculty-map-vanishing-point" />
            <div className="faculty-map-floor">
              <span />
              <span />
              <span />
              <span />
            </div>
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
    </section>
  );
}
