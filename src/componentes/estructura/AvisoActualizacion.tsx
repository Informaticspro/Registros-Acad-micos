import { useEffect, useState } from 'react';

export function AvisoActualizacion() {
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    let registration: ServiceWorkerRegistration | undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const notify = () => { if (!cancelled && hadController) setDisponible(true); };
    navigator.serviceWorker.addEventListener('controllerchange', notify);
    void navigator.serviceWorker.ready.then(value => {
      if (cancelled) return;
      registration = value;
      void value.update().catch(() => {});
    });
    const check = () => { if (document.visibilityState === 'visible') void registration?.update().catch(() => {}); };
    const interval = window.setInterval(check, 60000);
    window.addEventListener('focus', check);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener('focus', check); navigator.serviceWorker.removeEventListener('controllerchange', notify); };
  }, []);
  if (!disponible) return null;
  return <aside className="app-update-notice" role="status"><div><strong>Hay una nueva versión disponible</strong><p>Guarde lo que esté editando y actualice para ver los cambios.</p></div><button className="primary-button" type="button" onClick={() => window.location.reload()}>Actualizar aplicación</button></aside>;
}
