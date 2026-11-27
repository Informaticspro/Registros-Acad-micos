import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import type { LaboratorioState } from '@/servicios/laboratorio.servicio';
import { buscarEnLaboratorio, crearIndiceLaboratorio, type ResultadoLaboratorio } from './busqueda-laboratorio';
import './buscador-laboratorio.css';

type Props = {
  datos: LaboratorioState;
  ubicaciones: readonly string[];
  onSeleccionar: (resultado: ResultadoLaboratorio) => void;
};

export function BuscadorLaboratorio({ datos, ubicaciones, onSeleccionar }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [consulta, setConsulta] = useState('');
  const [limite, setLimite] = useState(12);
  const indice = useMemo(() => crearIndiceLaboratorio(datos, ubicaciones), [datos, ubicaciones]);
  const resultados = useMemo(() => buscarEnLaboratorio(indice, consulta), [indice, consulta]);
  const buscando = consulta.trim().length >= 2;

  return (
    <section className="lab-search" role="search" aria-label="Búsqueda de soporte técnico"
      onKeyDown={event => {
        if (event.key !== 'Escape' || !consulta) return;
        event.stopPropagation();
        setConsulta('');
        input.current?.focus();
      }}>
      <div className="lab-search-field">
        <Search size={19} aria-hidden="true" />
        <input ref={input} type="search" autoComplete="off" aria-label="Buscar en soporte técnico"
          placeholder="Buscar equipo, serie, trabajo, ubicación…" value={consulta}
          onChange={event => { setConsulta(event.target.value); setLimite(12); }} />
        {consulta ? <button type="button" className="icon-button" title="Limpiar búsqueda" aria-label="Limpiar búsqueda"
          onClick={() => { setConsulta(''); input.current?.focus(); }}><X size={17} aria-hidden="true" /></button> : null}
      </div>
      {buscando ? <div className="lab-search-results">
        <p role="status">{resultados.length === 0 ? 'No se encontraron coincidencias.' :
          resultados.length > limite ? `Mostrando ${limite} de ${resultados.length} resultados.` :
            `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}</p>
        {resultados.length ? <ul aria-label="Resultados de soporte">
          {resultados.slice(0, limite).map(resultado => <li key={`${resultado.tipo}:${resultado.id}`}>
            <button type="button" onClick={() => { setConsulta(''); onSeleccionar(resultado); }}>
              <span className="lab-search-record"><strong>{resultado.titulo}</strong><small>{resultado.detalle}</small></span>
              <span className="lab-search-kind">{resultado.etiqueta}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </li>)}
        </ul> : null}
        {resultados.length > limite ? <button type="button" className="lab-search-more" onClick={() => setLimite(valor => valor + 12)}>
          Mostrar más resultados
        </button> : null}
      </div> : null}
    </section>
  );
}
