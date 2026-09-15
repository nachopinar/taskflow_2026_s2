import { useCallback, useState } from 'react';
import { errorText } from './api';

interface RunOptions {
  /** Si es false, la acción no marca `busy` (para acciones que comparten el mensaje de error pero no el botón). */
  trackBusy?: boolean;
}

/**
 * Encapsula el patrón de las acciones asíncronas de la UI: limpia el error,
 * marca `busy`, ejecuta la llamada y guarda el mensaje de error si falla.
 * `run` devuelve true si la acción terminó sin errores.
 */
export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (
      fn: () => Promise<unknown>,
      fallback: string,
      { trackBusy = true }: RunOptions = {},
    ): Promise<boolean> => {
      setError(null);
      if (trackBusy) setBusy(true);
      try {
        await fn();
        return true;
      } catch (err) {
        setError(errorText(err, fallback));
        return false;
      } finally {
        if (trackBusy) setBusy(false);
      }
    },
    [],
  );

  return { run, busy, error, setError };
}
