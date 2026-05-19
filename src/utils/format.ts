import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function formatDateTime(value: string | null) {
  if (!value) return 'Sin fecha definida';
  return format(new Date(value), "dd MMM yyyy '·' h:mm a", { locale: es });
}

export function toTitleCase(value: string) {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
