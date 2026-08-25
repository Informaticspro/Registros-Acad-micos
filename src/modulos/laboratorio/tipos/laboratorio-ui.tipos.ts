import type {
  BitacoraLaboratorioInput,
} from '@/servicios/laboratorio.servicio';
import type {
  EquipoLaboratorio,
  EstadoEquipoLaboratorio,
} from '@/tipos/dominio';

type LabTab = 'inicio' | 'mapa' | 'fichas' | 'bitacoras' | 'inventario' | 'descartes' | 'prestamos' | 'informes';
type CatalogManagerType = 'secciones' | 'categorias' | 'estados';
type TemaVisual = 'dark' | 'light';
type ConfirmacionOperativoPendiente = {
  input: BitacoraLaboratorioInput;
  equipoAtendido: EquipoLaboratorio;
  nextEquipoEstado: EstadoEquipoLaboratorio;
  form: HTMLFormElement;
};

export type { CatalogManagerType, ConfirmacionOperativoPendiente, LabTab, TemaVisual };
