import { AlertTriangle, X } from 'lucide-react';

type ConfirmacionModalTone = 'danger' | 'warning' | 'info';

type ConfirmacionModalProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  isOpen: boolean;
  message: string;
  tone?: ConfirmacionModalTone;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmacionModal({
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  isOpen,
  message,
  tone = 'danger',
  title,
  onCancel,
  onConfirm,
}: ConfirmacionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop confirmation-backdrop" role="presentation" onClick={onCancel}>
      <section
        className={`modal-panel confirmation-modal confirmation-modal-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close-button" type="button" aria-label="Cerrar" onClick={onCancel}>
          <X size={18} />
        </button>
        <div className="confirmation-modal-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <div className="confirmation-modal-copy">
          <span className="eyebrow">Confirmacion requerida</span>
          <h2 id="confirmation-modal-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="confirmation-modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export type { ConfirmacionModalTone };
