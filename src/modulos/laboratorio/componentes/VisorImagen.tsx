import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut, X } from 'lucide-react';
import type { ImagenGaleria } from '../galeria.servicio';

export function VisorImagen({ imagen, onClose }: { imagen: ImagenGaleria; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);

  return createPortal(<dialog ref={dialog} className="lab-image-viewer" aria-labelledby="image-viewer-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="lab-image-viewer-content">
      <header><h2 id="image-viewer-title">{imagen.title}</h2><button className="icon-button" type="button" aria-label="Cerrar vista de imagen" onClick={onClose}><X size={22} /></button></header>
      <div className={`lab-image-viewer-canvas${zoom ? ' is-zoomed' : ''}`}><img src={imagen.url} alt={imagen.title} /></div>
      <button className="secondary-button" type="button" onClick={() => setZoom(!zoom)}>{zoom ? <ZoomOut size={16} /> : <ZoomIn size={16} />}{zoom ? 'Ajustar a la pantalla' : 'Ampliar imagen'}</button>
    </section>
  </dialog>, document.body);
}
