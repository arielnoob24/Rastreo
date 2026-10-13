import { useEffect, useState } from 'react';

/** Hora actual que se refresca periódicamente, para tiempos relativos y detección de datos obsoletos. */
export function useNow(intervalMs = 1_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
