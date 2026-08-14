import { labTabOrder, tabLabels } from '@/modulos/laboratorio/constantes/laboratorio.constantes';
import type { LabTab } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

type PestanasLaboratorioProps = {
  activeTab: LabTab;
  onChange: (tab: LabTab) => void;
};

export function PestanasLaboratorio({ activeTab, onChange }: PestanasLaboratorioProps) {
  return (
    <div className="lab-tabs" role="tablist" aria-label="Secciones de laboratorio">
      {labTabOrder.map((tab) => (
        <button
          type="button"
          className={`lab-tab-${tab}${activeTab === tab ? ' active' : ''}`}
          key={tab}
          onClick={() => onChange(tab)}
          title={tabLabels[tab]}
        >
          <span className="lab-tab-label-full">{tabLabels[tab]}</span>
          <span className="lab-tab-label-short">{tab === 'bitacoras' ? 'Mant. e incid.' : tabLabels[tab]}</span>
        </button>
      ))}
    </div>
  );
}
