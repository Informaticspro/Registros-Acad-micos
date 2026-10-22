import { supabase } from '@/infraestructura/supabase';

const BUCKET = 'laboratory-images';
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const GALERIA_PAGE_SIZE = 24;
export type ImagenGaleria = { name: string; title: string; url: string; createdAt: string };

export function validarImagen(file: File) {
  if (!TYPES.includes(file.type)) throw new Error('Seleccione una imagen JPG, PNG, WebP o GIF.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen debe pesar como máximo 10 MB.');
  if (!file.size) throw new Error('La imagen está vacía.');
}

function storage() {
  if (!supabase) throw new Error('El almacenamiento no está disponible.');
  return supabase.storage.from(BUCKET);
}

export async function subirImagen(organizationId: string, file: File) {
  validarImagen(file);
  const filename = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140);
  const { error } = await storage().upload(`${organizationId}/${crypto.randomUUID()}--${filename}`, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('No se pudo guardar la imagen. Compruebe su conexión y los permisos de la galería.');
}

export async function eliminarImagenes(organizationId: string, names: string[]) {
  const unique = [...new Set(names)];
  if (!organizationId || !unique.length || unique.some(name => !name || name.includes('/') || name.includes('\\') || name === '.' || name === '..')) {
    throw new Error('Seleccione imágenes válidas de la galería.');
  }
  const { data, error } = await storage().remove(unique.map(name => `${organizationId}/${name}`));
  if (error || unique.some(name => !data?.some(item => item.name === `${organizationId}/${name}`))) {
    throw new Error('No se pudieron eliminar todas las imágenes. Actualice la galería y compruebe sus permisos antes de intentarlo de nuevo.');
  }
}

export async function listarImagenes(organizationId: string, page = 0): Promise<ImagenGaleria[]> {
  const bucket = storage();
  const { data, error } = await bucket.list(organizationId, {
    limit: GALERIA_PAGE_SIZE, offset: page * GALERIA_PAGE_SIZE, sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) throw new Error('No se pudo cargar la galería. Intente actualizarla.');
  const files = (data ?? []).filter(item => item.id);
  if (!files.length) return [];
  const { data: urls, error: signingError } = await bucket.createSignedUrls(files.map(file => `${organizationId}/${file.name}`), 3600);
  if (signingError || !urls || urls.some(item => item.error || !item.signedUrl)) throw new Error('No se pudieron abrir las imágenes. Actualice la galería.');
  return files.map((file, index) => ({ name: file.name, title: file.name.split('--').slice(1).join('--') || file.name, url: urls[index].signedUrl!, createdAt: file.created_at ?? '' }));
}
