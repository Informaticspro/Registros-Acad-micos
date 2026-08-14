import { ChangeEvent, RefObject } from 'react';
import { ClipboardList, Save, Search, Trash2, Upload } from 'lucide-react';

import { AsignacionComponenteLaboratorio, EquipoLaboratorio, EstadoEquipoLaboratorio } from '@/tipos/dominio';
import {
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
} from '@/modulos/laboratorio/utilidades/laboratorio.utilidades';

type InventarioCalculado = {
  marca: string;
  modelo: string;
  codigo: string;
  serie: string;
  componentes: Array<{
    asignacion: AsignacionComponenteLaboratorio;
    componente: EquipoLaboratorio;
  }>;
};

type VistaInventarioProps = {
  equipos: EquipoLaboratorio[];
  equiposFiltrados: EquipoLaboratorio[];
  estadosEquipo: EstadoEquipoLaboratorio[];
  estadoEquipoNombre: Record<string, string>;
  estadosAlertaPorUbicacion: Record<string, string[]>;
  inventoryResultsRef: RefObject<HTMLDivElement>;
  inventorySearch: string;
  isSaving: boolean;
  selectedInventoryLocation: string;
  totalComponentesAsignados: number;
  totalPrincipales: number;
  ubicacionesInventario: string[];
  getEquipoById: (id: string) => EquipoLaboratorio | null;
  getFilterCount: (ubicacion: string) => number;
  getInventarioCalculadoEquipo: (equipo: EquipoLaboratorio) => InventarioCalculado;
  getAsignacionActivaComoComponente: (equipo: EquipoLaboratorio) => AsignacionComponenteLaboratorio | null;
  onDeleteEquipo: (equipo: EquipoLaboratorio) => void;
  onFilterLocation: (ubicacion: string) => void;
  onInventarioExcelUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onNewEquipo: () => void;
  onOpenEquipo: (equipo: EquipoLaboratorio) => void;
  onQuickEstadoEquipo: (equipo: EquipoLaboratorio, estado: EstadoEquipoLaboratorio) => void;
  onSearchChange: (value: string) => void;
};

export function VistaInventario({
  equipos,
  equiposFiltrados,
  estadosEquipo,
  estadoEquipoNombre,
  estadosAlertaPorUbicacion,
  inventoryResultsRef,
  inventorySearch,
  isSaving,
  selectedInventoryLocation,
  totalComponentesAsignados,
  totalPrincipales,
  ubicacionesInventario,
  getEquipoById,
  getFilterCount,
  getInventarioCalculadoEquipo,
  getAsignacionActivaComoComponente,
  onDeleteEquipo,
  onFilterLocation,
  onInventarioExcelUpload,
  onNewEquipo,
  onOpenEquipo,
  onQuickEstadoEquipo,
  onSearchChange,
}: VistaInventarioProps) {
  return (
    <>
      <section className="lab-inventory-hero">
        <div>
          <span className="eyebrow">Inventario tecnico</span>
          <h2>Inventario de la facultad</h2>
          <p>Consulte, filtre, edite y registre equipos desde una vista concentrada para trabajar comodo en PC y celular.</p>
        </div>
        <div className="lab-inventory-hero-actions">
          <strong>{equipos.length}</strong>
          <span>registros de inventario</span>
          {totalComponentesAsignados > 0 ? (
            <small>
              {totalPrincipales} PC/CPU | {totalComponentesAsignados} componentes enlazados
            </small>
          ) : null}
          <button className="primary-button" type="button" onClick={onNewEquipo}>
            <Save size={18} />
            Nuevo equipo
          </button>
          <label className="secondary-button lab-file-button">
            <Upload size={18} />
            Cargar Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onInventarioExcelUpload} disabled={isSaving} />
          </label>
        </div>
      </section>

      <section className="lab-inventory-workspace">
        <div className="lab-inventory-sheet-title">
          <strong>Universidad Autonoma de Chiriqui</strong>
          <span>Facultad de Economia</span>
          <h2>Inventario de la facultad</h2>
          <small>{new Date().toLocaleDateString('es-PA')}</small>
        </div>
        <div className="lab-inventory-search">
          <Search size={18} />
          <input
            value={inventorySearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por equipo, inventario, serie, marca o ubicacion"
            aria-label="Buscar equipo en inventario"
          />
          {inventorySearch ? (
            <button type="button" onClick={() => onSearchChange('')}>
              Limpiar
            </button>
          ) : null}
        </div>
        <div className="lab-inventory-results-anchor" ref={inventoryResultsRef} aria-hidden="true" />
        <div className="lab-inventory-filter" aria-label="Filtrar inventario por ubicacion">
          {ubicacionesInventario.map((ubicacion) => (
            <button
              className={selectedInventoryLocation === ubicacion ? 'active' : ''}
              key={ubicacion}
              type="button"
              onClick={() => onFilterLocation(ubicacion)}
            >
              {ubicacion}
              {estadosAlertaPorUbicacion[ubicacion]?.length ? (
                <span className="inventory-filter-alerts" aria-label="Estados con atencion">
                  {estadosAlertaPorUbicacion[ubicacion].map((estado) => (
                    <i
                      className={`equipment-${getEstadoEquipoClass(estado)}`}
                      key={estado}
                      title={estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                    />
                  ))}
                </span>
              ) : null}
              <span>{getFilterCount(ubicacion)}</span>
            </button>
          ))}
        </div>
        {equipos.length === 0 ? <p className="form-hint">Todavia no hay equipos registrados.</p> : null}
        {equipos.length > 0 ? (
          <div className="lab-inventory-table-wrap">
            <div className="lab-inventory-table">
              <div className="lab-inventory-head">
                <span>Fila</span>
                <span>Equipo</span>
                <span>Marca</span>
                <span>Modelo</span>
                <span>Inventario</span>
                <span>Serie</span>
                <span>Ubicacion</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {equiposFiltrados.length === 0 ? (
                <div className="lab-inventory-row lab-inventory-empty-row">
                  <span>No hay equipos que coincidan con este filtro.</span>
                </div>
              ) : null}
              {equiposFiltrados.map((item, index) => {
                const inventarioCalculado = getInventarioCalculadoEquipo(item);
                const asignacionComoComponente = getAsignacionActivaComoComponente(item);
                const equipoPadreComponente = asignacionComoComponente ? getEquipoById(asignacionComoComponente.equipoPadreId) : null;
                const componentSummary = inventarioCalculado.componentes
                  .map(
                    ({ asignacion, componente }) =>
                      `${asignacion.tipo}: ${componente.codigo || 'S/N'} - ${componente.nombre} - ${componente.serie || 'S/N'}`,
                  )
                  .join('\n');

                return (
                  <div
                    className="lab-inventory-row clickable"
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    title="Abrir expediente tecnico del equipo"
                    onClick={() => onOpenEquipo(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenEquipo(item);
                      }
                    }}
                  >
                    <span className="inventory-cell-fila">{index + 1}</span>
                    <strong className="inventory-cell-equipo" title={componentSummary || undefined}>
                      <b>{item.nombre || item.categoria}</b>
                      {asignacionComoComponente ? (
                        <small className="inventory-role-badge component">
                          Componente de {equipoPadreComponente?.nombre ?? 'equipo'}
                        </small>
                      ) : null}
                      {inventarioCalculado.componentes.length > 0 ? (
                        <small className="inventory-role-badge linked">
                          {inventarioCalculado.componentes.length}{' '}
                          {inventarioCalculado.componentes.length === 1 ? 'componente enlazado' : 'componentes enlazados'}
                        </small>
                      ) : null}
                      {inventarioCalculado.componentes.length > 0 ? (
                        <em className="inventory-component-list">
                          {inventarioCalculado.componentes.map(({ asignacion, componente }) => (
                            <i key={asignacion.id}>
                              {asignacion.tipo}: {componente.codigo || 'S/N'} - {componente.nombre}
                            </i>
                          ))}
                        </em>
                      ) : null}
                    </strong>
                    <span className="inventory-cell-marca" title={componentSummary || undefined}>
                      {inventarioCalculado.marca}
                    </span>
                    <span className="inventory-cell-modelo" title={componentSummary || undefined}>
                      {inventarioCalculado.modelo}
                    </span>
                    <span className="inventory-cell-codigo" title={componentSummary || undefined}>
                      {inventarioCalculado.codigo}
                    </span>
                    <span className="inventory-cell-serie" title={componentSummary || undefined}>
                      {inventarioCalculado.serie}
                    </span>
                    <span className="inventory-cell-ubicacion">{item.ubicacion || 'Sin ubicacion'}</span>
                    <span className="inventory-cell-estado">
                      <select
                        className={`inventory-status inventory-status-select equipment-${getEstadoEquipoClass(item.estado)}`}
                        value={item.estado}
                        disabled={isSaving}
                        title="Cambiar estado"
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onQuickEstadoEquipo(item, event.target.value as EstadoEquipoLaboratorio)}
                      >
                        {estadosEquipo.map((estado) => (
                          <option value={estado} key={estado}>
                            {estadoEquipoNombre[estado] ?? getEstadoEquipoLabel(estado)}
                          </option>
                        ))}
                      </select>
                    </span>
                    <span className="row-actions inventory-actions">
                      <button
                        className="icon-button"
                        type="button"
                        title="Ver expediente tecnico"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenEquipo(item);
                        }}
                      >
                        <ClipboardList size={16} />
                      </button>
                      <button
                        className="icon-button danger-button"
                        type="button"
                        title="Eliminar"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteEquipo(item);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
