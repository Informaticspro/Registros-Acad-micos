import { useEffect, useState } from 'react';
import { listLaboratorioData, type LaboratorioState } from '@/servicios/laboratorio.servicio';

export function useActualizacionInicio(enabled: boolean, onData: (data: LaboratorioState) => void) {
  const [desactualizado, setDesactualizado] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let loading = false;
    async function reload() {
      if (!active || loading || document.visibilityState === 'hidden') return;
      loading = true;
      try {
        const data = await listLaboratorioData();
        if (active) { onData(data); setDesactualizado(false); }
      } catch {
        // Keep the last successful data visible and retry on the next tick.
        if (active) setDesactualizado(true);
      } finally {
        loading = false;
      }
    }
    void reload();
    const listener = () => { void reload(); };
    const timer = window.setInterval(listener, 30_000);
    window.addEventListener('focus', listener);
    window.addEventListener('online', listener);
    document.addEventListener('visibilitychange', listener);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', listener);
      window.removeEventListener('online', listener);
      document.removeEventListener('visibilitychange', listener);
    };
  }, [enabled, onData]);
  return desactualizado;
}
