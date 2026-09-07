import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmacionModal, type ConfirmacionModalTone } from '@/componentes/interfaz/ConfirmacionModal';

type ConfirmacionOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
  tone?: ConfirmacionModalTone;
};

type ConfirmarAccion = (options: ConfirmacionOptions) => Promise<boolean>;

export function useConfirmacion() {
  const [options, setOptions] = useState<ConfirmacionOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmar = useCallback<ConfirmarAccion>(
    (nextOptions) =>
      new Promise((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setOptions(nextOptions);
      }),
    [],
  );

  useEffect(
    () => () => {
      resolverRef.current?.(false);
    },
    [],
  );

  const confirmacionModal = (
    <ConfirmacionModal
      cancelLabel={options?.cancelLabel}
      confirmLabel={options?.confirmLabel}
      isOpen={Boolean(options)}
      message={options?.message ?? ''}
      title={options?.title ?? ''}
      tone={options?.tone}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  );

  return { confirmacionModal, confirmar };
}

export type { ConfirmacionOptions, ConfirmarAccion };
