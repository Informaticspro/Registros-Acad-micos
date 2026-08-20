import { XCircle } from 'lucide-react';

import type { ConfirmacionOperativoPendiente } from '@/modulos/laboratorio/tipos/laboratorio-ui.tipos';

type ConfirmacionOperativoModalProps = {
  confirmacion: ConfirmacionOperativoPendiente | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (shouldSyncEquipoEstado: boolean) => void;
};

export function ConfirmacionOperativoModal({
  confirmacion,
  isSaving,
  onClose,
  onConfirm,
}: ConfirmacionOperativoModalProps) {
  if (!confirmacion) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="modal-panel lab-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-confirm-operativo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lab-catalog-modal-header">
          <div>
            <span className="eyebrow">Confirmacion de inventario</span>
            <h2 id="lab-confirm-operativo-title">Devolver equipo a operativo</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Cerrar">
            <XCircle size={18} />
          </button>
        </header>
        <p>
          Este registro esta resuelto o cerrado. Desea devolver el equipo{' '}
          <strong>
            {confirmacion.equipoAtendido.codigo} - {confirmacion.equipoAtendido.nombre}
          </strong>{' '}
          a estado operativo en el inventario?
        </p>
        <div className="lab-confirm-actions">
          <button className="primary-button" type="button" disabled={isSaving} onClick={() => onConfirm(true)}>
            Si, devolver a operativo
          </button>
          <button className="secondary-button" type="button" disabled={isSaving} onClick={() => onConfirm(false)}>
            No, solo guardar bitacora
          </button>
        </div>
      </article>
    </div>
  );
}
