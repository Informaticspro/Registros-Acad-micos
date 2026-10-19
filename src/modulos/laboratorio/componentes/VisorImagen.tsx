import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import type { ImagenGaleria } from '../galeria.servicio';

export function VisorImagen({ imagen, onClose }: { imagen: ImagenGaleria; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      <img src={imagen.url} alt={imagen.title} />
      <a className="secondary-button" href={imagen.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Abrir tamaño original</a>
    </section>
  </dialog>, document.body);
}
