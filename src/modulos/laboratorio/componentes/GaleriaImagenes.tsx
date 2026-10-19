import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ImagePlus, ArrowLeft, Eye } from 'lucide-react';
import { VisorImagen } from './VisorImagen';
import { formatDateTime } from '@/utilidades/formato';
import { GALERIA_PAGE_SIZE, listarImagenes, subirImagen, type ImagenGaleria } from '../galeria.servicio';

export function GaleriaImagenes({ organizationId, onBack }: { organizationId: string | null; onBack: () => void }) {
  const [imagenes, setImagenes] = useState<ImagenGaleria[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagenGaleria | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError('');
    try {
      if (!organizationId) throw new Error('Su perfil no tiene una organización asignada.');
      const result = await listarImagenes(organizationId, page);
      if (current === request.current) setImagenes(result);
    } catch (err) { if (current === request.current) setError(err instanceof Error ? err.message : 'No se pudo cargar la galería.'); }
    finally { if (current === request.current) setLoading(false); }
  }, [organizationId, page]);
  useEffect(() => { const counter = request; void refresh(); return () => { counter.current++; }; }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file || !organizationId || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await subirImagen(organizationId, file);
      if (input.current) input.current.value = '';
      setNotice('Imagen guardada. Ya está disponible para el equipo de soporte.');
      if (page !== 0) setPage(0); else await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.'); }
    finally { setSaving(false); }
  }

  return <section className="lab-gallery" aria-labelledby="gallery-title">
    <div className="page-actions"><button className="secondary-button" type="button" onClick={onBack}><ArrowLeft size={16} />Volver al inicio</button></div>
    <h2 id="gallery-title">Imágenes de referencia</h2>
    <p className="form-hint">Guarde ideas, ejemplos y fotos para futuros trabajos. Esta galería se comparte con el personal autorizado de soporte.</p>
    <form className="lab-form stack-form" onSubmit={event => void upload(event)}>
      <label>Seleccionar imagen<input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" required disabled={saving} /></label>
      <small>JPG, PNG, WebP o GIF · Máximo 10 MB por imagen.</small>
      <div className="page-actions"><button className="primary-button" type="submit" disabled={saving || !organizationId}><ImagePlus size={18} />{saving ? 'Subiendo…' : 'Subir imagen'}</button><button className="secondary-button" type="button" disabled={loading || saving} onClick={() => void refresh()}>Actualizar galería</button></div>
    </form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <p role="status">Cargando imágenes…</p> : !error && !imagenes.length ? <p>Aún no hay imágenes en esta página.</p> : null}
    {!loading && !error ? <div className="lab-gallery-grid">{imagenes.map(item => <article className="lab-record" key={item.name}>
      <button className="lab-image-thumbnail" type="button" onClick={() => setSelectedImage(item)} aria-label={`Ver ${item.title}`}><img src={item.url} alt={item.title} loading="lazy" /></button>
      <h3>{item.title}</h3><small>{formatDateTime(item.createdAt)}</small>
      <button className="secondary-button" type="button" onClick={() => setSelectedImage(item)}><Eye size={16} />Ver imagen</button>
    </article>)}</div> : null}
    <div className="page-actions"><button className="secondary-button" type="button" disabled={page === 0 || loading || saving} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button className="secondary-button" type="button" disabled={imagenes.length < GALERIA_PAGE_SIZE || loading || saving || Boolean(error)} onClick={() => setPage(page + 1)}>Siguiente</button></div>
    {selectedImage ? <VisorImagen imagen={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
  </section>;
}
