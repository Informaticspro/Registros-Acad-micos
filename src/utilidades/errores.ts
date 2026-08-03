const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con la base de datos. Verifique su conexion a internet, recargue la pagina e intente guardar nuevamente.';

function isNetworkErrorMessage(message: string) {
  return /failed to fetch|networkerror|load failed|fetch failed/i.test(message);
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (isNetworkErrorMessage(error.message)) return NETWORK_ERROR_MESSAGE;
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code].filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    );

    if (parts.some(isNetworkErrorMessage)) return NETWORK_ERROR_MESSAGE;
    if (parts.length > 0) return parts.join(' ');
  }

  return fallback;
}
