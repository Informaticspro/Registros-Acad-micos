import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ImagePlus, ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { useConfirmacion } from '@/hooks/useConfirmacion';
import { VisorImagen } from './VisorImagen';
import { formatDateTime } from '@/utilidades/formato';
import { GALERIA_PAGE_SIZE, eliminarImagenes, listarImagenes, subirImagen, type ImagenGaleria } from '../galeria.servicio';

export function GaleriaImagenes({ organizationId, onBack }: { organizationId: string | null; onBack: () => void }) {
  const [imagenes, setImagenes] = useState<ImagenGaleria[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const { confirmar, confirmacionModal } = useConfirmacion();
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
      if (current === request.current) { setImagenes(result); setSelection([]); }
    } catch (err) { if (current === request.current) setError(err instanceof Error ? err.message : 'No se pudo cargar la galería.'); }
    finally { if (current === request.current) setLoading(false); }
  }, [organizationId, page]);
  useEffect(() => { const counter = request; void refresh(); return () => { counter.current++; }; }, [refresh]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file || !organizationId || saving || deleting) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await subirImagen(organizationId, file);
      if (input.current) input.current.value = '';
      setNotice('Imagen guardada. Ya está disponible para el equipo de soporte.');
      if (page !== 0) setPage(0); else await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.'); }
    finally { setSaving(false); }
  }

  async function removeSelected() {
    if (!organizationId || !selection.length || deleting || saving || loading) return;
    const imagesToDelete = imagenes.filter(item => selection.includes(item.name));
    if (!imagesToDelete.length) return;
    setDeleting(true);
    try {
      const accepted = await confirmar({ title: 'Eliminar imágenes seleccionadas',
        message: `Se eliminarán permanentemente ${imagesToDelete.length} imagen(es): ${imagesToDelete.map(item => item.title).join(', ')}. También dejarán de estar disponibles para el equipo de soporte. Esta acción no se puede deshacer.`,
        confirmLabel: 'Sí, eliminar', tone: 'danger' });
      if (!accepted) return;
      setError(''); setNotice('');
      await eliminarImagenes(organizationId, imagesToDelete.map(item => item.name));
      setSelectedImage(null);
      if (page > 0 && imagesToDelete.length === imagenes.length) setPage(page - 1); else await refresh();
      setSelection([]);
      setNotice(`${imagesToDelete.length} imagen(es) eliminada(s).`);
    } catch (err) {
      await refresh();
      setError(err instanceof Error ? err.message : 'No se pudieron eliminar las imágenes.');
    } finally { setDeleting(false); }
  }

  const busy = saving || deleting;

  return <section className="lab-gallery" aria-labelledby="gallery-title">
    <div className="page-actions"><button className="secondary-button" type="button" disabled={busy} onClick={onBack}><ArrowLeft size={16} />Volver al inicio</button></div>
    <h2 id="gallery-title">Imágenes de referencia</h2>
    <p className="form-hint">Guarde ideas, ejemplos y fotos para futuros trabajos. Esta galería se comparte con el personal autorizado de soporte.</p>
    <form className="lab-form stack-form" onSubmit={event => void upload(event)}>
      <label>Seleccionar imagen<input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" required disabled={busy} /></label>
      <small>JPG, PNG, WebP o GIF · Máximo 10 MB por imagen.</small>
      <div className="page-actions"><button className="primary-button" type="submit" disabled={busy || !organizationId}><ImagePlus size={18} />{saving ? 'Subiendo…' : 'Subir imagen'}</button><button className="secondary-button" type="button" disabled={loading || busy} onClick={() => void refresh()}>Actualizar galería</button></div>
    </form>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <p role="status">Cargando imágenes…</p> : !error && !imagenes.length ? <p>Aún no hay imágenes en esta página.</p> : null}
    {!loading && !error && imagenes.length ? <div className="page-actions">
      <button className="secondary-button" type="button" disabled={busy} onClick={() => setSelection(selection.length === imagenes.length ? [] : imagenes.map(item => item.name))}>{selection.length === imagenes.length ? 'Quitar selección' : 'Seleccionar todas en esta página'}</button>
      <span>{selection.length} seleccionada(s)</span>
      <button className="danger-button" type="button" disabled={busy || !selection.length} onClick={() => void removeSelected()}><Trash2 size={16} />{deleting ? 'Eliminando…' : 'Eliminar seleccionadas'}</button>
    </div> : null}
    {!loading && !error ? <div className="lab-gallery-grid">{imagenes.map(item => <article className="lab-record" key={item.name}>
      <label className="lab-gallery-select"><input type="checkbox" checked={selection.includes(item.name)} disabled={busy} onChange={event => setSelection(current => event.target.checked ? [...current, item.name] : current.filter(name => name !== item.name))} />Seleccionar {item.title}</label>
      <button className="lab-image-thumbnail" type="button" onClick={() => setSelectedImage(item)} aria-label={`Ver ${item.title}`}><img src={item.url} alt={item.title} loading="lazy" /></button>
      <h3>{item.title}</h3><small>{formatDateTime(item.createdAt)}</small>
      <button className="secondary-button" type="button" onClick={() => setSelectedImage(item)}><Eye size={16} />Ver imagen</button>
    </article>)}</div> : null}
    <div className="page-actions"><button className="secondary-button" type="button" disabled={page === 0 || loading || busy} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1}</span><button className="secondary-button" type="button" disabled={imagenes.length < GALERIA_PAGE_SIZE || loading || busy || Boolean(error)} onClick={() => setPage(page + 1)}>Siguiente</button></div>
    {selectedImage ? <VisorImagen imagen={selectedImage} onClose={() => setSelectedImage(null)} /> : null}
    {confirmacionModal}
  </section>;
}
