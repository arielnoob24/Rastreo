import { useCallback, useEffect, useRef, useState } from 'react';
import { fromGeolocationPosition, geolocationErrorMessage, type LocationFix } from '../lib/geo';

export type WatchStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'unsupported';

export interface GeolocationWatch {
  status: WatchStatus;
  fix: LocationFix | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

const WATCH_OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 };

export function geolocationSupport(): { ok: true } | { ok: false; reason: string } {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    return { ok: false, reason: 'La ubicación solo funciona en una conexión segura (HTTPS).' };
  }
  if (!('geolocation' in navigator)) {
    return { ok: false, reason: 'Este navegador no permite obtener la ubicación.' };
  }
  return { ok: true };
}

/**
 * Observa la posición solo mientras se haya pulsado Iniciar. `onFix` recibe cada lectura nueva.
 * Al detener o desmontar se llama a clearWatch(): no queda ningún seguimiento activo.
 */
export function useGeolocationWatch(onFix: (fix: LocationFix) => void): GeolocationWatch {
  const [status, setStatus] = useState<WatchStatus>('idle');
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const onFixRef = useRef(onFix);
  onFixRef.current = onFix;

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setStatus('idle');
    setFix(null);
    setError(null);
  }, []);

  const start = useCallback(() => {
    const support = geolocationSupport();
    if (!support.ok) {
      setStatus('unsupported');
      setError(support.reason);
      return;
    }
    if (watchId.current !== null) return;

    setStatus('requesting');
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = fromGeolocationPosition(position);
        setFix(next);
        setStatus('active');
        setError(null);
        onFixRef.current(next);
      },
      (err) => {
        setError(geolocationErrorMessage(err.code));
        if (err.code === err.PERMISSION_DENIED) {
          if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
          setStatus('denied');
        } else {
          // Sin señal o tiempo agotado: el watch sigue vivo y puede recuperarse.
          setStatus((prev) => (prev === 'active' ? 'active' : 'error'));
        }
      },
      WATCH_OPTIONS,
    );
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { status, fix, error, start, stop };
}
