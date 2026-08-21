import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Cpu, Package, Wrench } from 'lucide-react';

import { listLaboratorioData, type LaboratorioState } from '@/servicios/laboratorio.servicio';
import type { AsignacionComponenteLaboratorio, BitacoraLaboratorio, EquipoLaboratorio, FichaTecnicaLaboratorio } from '@/tipos/dominio';
import { formatDateTime } from '@/utilidades/formato';
import {
  appendUniqueInventoryValue,
  containsExactLooseText,
  getEstadoEquipoLabel,
  getTechnicalIdentifiers,
  normalizeLooseText,
  splitMarcaModelo,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

function matchesEquipoPorIdentificador(equipo: EquipoLaboratorio, value: string) {
  const equipoIdentifiers = getTechnicalIdentifiers(`${equipo.codigo} ${equipo.serie}`);
  if (equipoIdentifiers.length === 0) return false;
  const valueIdentifiers = new Set(getTechnicalIdentifiers(value));
  return equipoIdentifiers.some((identifier) => valueIdentifiers.has(identifier));
}

function matchesEquipoPorNombre(equipo: EquipoLaboratorio, value: string) {
  return containsExactLooseText(value, equipo.nombre);
}

function getFichasEquipo(state: LaboratorioState, equipo: EquipoLaboratorio) {
  return state.fichas
    .filter(
      (item) =>
        normalizeLooseText(item.pc) === normalizeLooseText(equipo.nombre) ||
        matchesEquipoPorIdentificador(equipo, item.inventario.map((field) => field.numero).join(' ')),
    )
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
}

function getBitacorasEquipo(state: LaboratorioState, equipo: EquipoLaboratorio) {
  return state.bitacoras
    .filter(
      (item) =>
        item.equipoId === equipo.id ||
        matchesEquipoPorIdentificador(equipo, `${item.equipoOrigen} ${item.equipoDestino} ${item.titulo}`) ||
        matchesEquipoPorNombre(equipo, `${item.equipoDestino} ${item.titulo}`),
    )
    .sort((first, second) => second.fecha.localeCompare(first.fecha));
}

function getComponentesActivos(state: LaboratorioState, equipo: EquipoLaboratorio) {
  return state.asignacionesComponentes
    .filter((item) => item.equipoPadreId === equipo.id && !item.fechaRetiro)
    .map((asignacion) => {
      const componente = state.equipos.find((item) => item.id === asignacion.componenteId) ?? null;
      return componente ? { asignacion, componente } : null;
    })
    .filter((item): item is { asignacion: AsignacionComponenteLaboratorio; componente: EquipoLaboratorio } =>
      Boolean(item),
    );
}

function getEquipoPadre(state: LaboratorioState, equipo: EquipoLaboratorio) {
  const asignacion = state.asignacionesComponentes.find((item) => item.componenteId === equipo.id && !item.fechaRetiro);
  if (!asignacion) return null;
  const equipoPadre = state.equipos.find((item) => item.id === asignacion.equipoPadreId) ?? null;
  return equipoPadre ? { asignacion, equipoPadre } : null;
}

function getInventarioCalculado(equipo: EquipoLaboratorio, componentes: Array<{ componente: EquipoLaboratorio }>) {
  const base = splitMarcaModelo(equipo.marcaModelo);
  const componentesMarcaModelo = componentes.map((item) => splitMarcaModelo(item.componente.marcaModelo));

  return {
    marca: appendUniqueInventoryValue(base.marca, componentesMarcaModelo.map((item) => item.marca)),
    modelo: appendUniqueInventoryValue(base.modelo, componentesMarcaModelo.map((item) => item.modelo)),
    codigo: appendUniqueInventoryValue(equipo.codigo || 'S/N', componentes.map((item) => item.componente.codigo || 'S/N')),
    serie: appendUniqueInventoryValue(equipo.serie || 'S/N', componentes.map((item) => item.componente.serie || 'S/N')),
  };
}

function getUltimoMantenimiento(fichas: FichaTecnicaLaboratorio[], bitacoras: BitacoraLaboratorio[]) {
  const fechas = [
    ...fichas.map((item) => item.fecha),
    ...bitacoras
      .filter((item) => item.clase === 'mantenimiento' || item.tipoTrabajo.toLowerCase().includes('mantenimiento'))
      .map((item) => item.fecha),
  ].filter(Boolean);

  return fechas.sort((first, second) => second.localeCompare(first))[0] ?? null;
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || 'No indicado'}</dd>
    </div>
  );
}

export function PaginaEquipoLaboratorio() {
  const { equipoId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<LaboratorioState | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    listLaboratorioData()
      .then((data) => {
        if (!mounted) return;
        setState(data);
        setError('');
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el expediente del equipo.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const equipo = useMemo(() => state?.equipos.find((item) => item.id === equipoId) ?? null, [equipoId, state?.equipos]);
  const componentes = useMemo(() => (state && equipo ? getComponentesActivos(state, equipo) : []), [equipo, state]);
  const equipoPadre = useMemo(() => (state && equipo ? getEquipoPadre(state, equipo) : null), [equipo, state]);
  const fichas = useMemo(() => (state && equipo ? getFichasEquipo(state, equipo) : []), [equipo, state]);
  const bitacoras = useMemo(() => (state && equipo ? getBitacorasEquipo(state, equipo) : []), [equipo, state]);
  const inventario = useMemo(() => (equipo ? getInventarioCalculado(equipo, componentes) : null), [componentes, equipo]);
  const ultimoMantenimiento = useMemo(() => getUltimoMantenimiento(fichas, bitacoras), [bitacoras, fichas]);

  if (isLoading) {
    return <div className="screen-loader">Cargando expediente tecnico...</div>;
  }

  if (error) {
    return (
      <main className="content-shell lab-qr-page">
        <button className="secondary-button" type="button" onClick={() => navigate('/laboratorio')}>
          <ArrowLeft size={18} />
          Volver al laboratorio
        </button>
        <section className="lab-qr-empty">
          <h1>No se pudo cargar el expediente</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!equipo || !inventario) {
    return (
      <main className="content-shell lab-qr-page">
        <button className="secondary-button" type="button" onClick={() => navigate('/laboratorio')}>
          <ArrowLeft size={18} />
          Volver al laboratorio
        </button>
        <section className="lab-qr-empty">
          <h1>Equipo no encontrado</h1>
          <p>El codigo escaneado no coincide con un equipo activo del inventario.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="content-shell lab-qr-page">
      <button className="secondary-button" type="button" onClick={() => navigate('/laboratorio')}>
        <ArrowLeft size={18} />
        Volver al laboratorio
      </button>

      <section className="lab-qr-hero">
        <span className="eyebrow">Expediente tecnico escaneado</span>
        <h1>{equipo.nombre}</h1>
        <p>
          {equipo.codigo || 'Sin inventario'} | {equipo.ubicacion || 'Sin ubicacion'} | {getEstadoEquipoLabel(equipo.estado)}
        </p>
      </section>

      <section className="lab-qr-summary-grid">
        <article>
          <Cpu size={24} />
          <span>Componentes</span>
          <strong>{componentes.length}</strong>
        </article>
        <article>
          <ClipboardList size={24} />
          <span>Fichas tecnicas</span>
          <strong>{fichas.length}</strong>
        </article>
        <article>
          <Wrench size={24} />
          <span>Bitacoras</span>
          <strong>{bitacoras.length}</strong>
        </article>
      </section>

      <section className="lab-equipment-detail-section lab-qr-section">
        <h2>Inventario actual</h2>
        <dl className="lab-equipment-detail-grid">
          <DetailCard label="Numero de inventario" value={inventario.codigo} />
          <DetailCard label="Categoria" value={equipo.categoria} />
          <DetailCard label="Marca" value={inventario.marca} />
          <DetailCard label="Modelo" value={inventario.modelo} />
          <DetailCard label="Serie" value={inventario.serie} />
          <DetailCard label="Ubicacion" value={equipo.ubicacion} />
          <DetailCard label="Estado" value={getEstadoEquipoLabel(equipo.estado)} />
          <DetailCard label="Ultimo mantenimiento" value={ultimoMantenimiento ? formatDateTime(ultimoMantenimiento) : 'Sin registro'} />
          <DetailCard label="Actualizado" value={formatDateTime(equipo.updatedAt)} />
        </dl>
        {equipo.observaciones ? <p className="lab-qr-notes">{equipo.observaciones}</p> : null}
      </section>

      {equipoPadre ? (
        <section className="lab-equipment-detail-section lab-qr-section">
          <h2>Este componente pertenece a</h2>
          <Link className="lab-qr-linked-card" to={`/laboratorio/equipos/${equipoPadre.equipoPadre.id}`}>
            <Package size={20} />
            <strong>{equipoPadre.equipoPadre.nombre}</strong>
            <span>{equipoPadre.equipoPadre.codigo || 'Sin inventario'} | {equipoPadre.equipoPadre.ubicacion}</span>
          </Link>
        </section>
      ) : null}

      <section className="lab-equipment-detail-section lab-qr-section">
        <h2>Componentes asignados</h2>
        {componentes.length === 0 ? <p>Este equipo no tiene componentes relacionados actualmente.</p> : null}
        {componentes.map(({ asignacion, componente }) => (
          <Link className="lab-qr-linked-card" key={asignacion.id} to={`/laboratorio/equipos/${componente.id}`}>
            <Package size={20} />
            <strong>{componente.nombre}</strong>
            <span>
              {asignacion.tipo.toUpperCase()} | {componente.codigo || 'Sin inventario'} | {componente.serie || 'Sin serie'} |{' '}
              {getEstadoEquipoLabel(componente.estado)}
            </span>
          </Link>
        ))}
      </section>

      <section className="lab-equipment-detail-section lab-qr-section">
        <h2>Fichas tecnicas</h2>
        {fichas.length === 0 ? <p>Este equipo todavia no tiene fichas tecnicas relacionadas.</p> : null}
        {fichas.slice(0, 8).map((ficha) => (
          <article className="lab-qr-record" key={ficha.id}>
            <strong>{ficha.pc}</strong>
            <span>{formatDateTime(ficha.fecha)} | {ficha.responsable || 'Sin responsable'}</span>
            <p>{ficha.observacionGeneral || 'Sin observaciones generales.'}</p>
          </article>
        ))}
      </section>

      <section className="lab-equipment-detail-section lab-qr-section">
        <h2>Bitacoras e incidencias</h2>
        {bitacoras.length === 0 ? <p>Este equipo todavia no tiene bitacoras relacionadas.</p> : null}
        {bitacoras.slice(0, 10).map((bitacora) => (
          <article className="lab-qr-record" key={bitacora.id}>
            <strong>{bitacora.titulo}</strong>
            <span>{formatDateTime(bitacora.fecha)} | {bitacora.responsable || 'Sin responsable'} | {bitacora.estado}</span>
            <p>{bitacora.descripcion || 'Sin descripcion registrada.'}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
