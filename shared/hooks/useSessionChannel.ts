import { useEffect, useState } from 'react';
import { getSession, subscribeToSession, type TrackingSession } from '../api/sessions';
import { ensureSignedIn } from '../lib/firebase';
import type { LocationFix } from '../lib/geo';

export interface SessionChannel {
  userId: string | null;
  /** undefined = cargando; null = no existe o sin acceso. */
  session: TrackingSession | null | undefined;
  setSession: React.Dispatch<React.SetStateAction<TrackingSession | null | undefined>>;
  /** Ubicación recibida en vivo (solo llega a quien monitorea). */
  remoteFix: LocationFix | null;
  peerOnline: boolean;
  connected: boolean;
  loadError: string | null;
}

/** Carga una sesión y la mantiene sincronizada en tiempo real. Lo usan las dos apps. */
export function useSessionChannel(id: string): SessionChannel {
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<TrackingSession | null | undefined>(undefined);
  const [remoteFix, setRemoteFix] = useState<LocationFix | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const uid = await ensureSignedIn();
        const loaded = await getSession(id);
        if (cancelled) return;
        setUserId(uid);
        setSession(loaded);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la sesión');
        setSession(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hasSession = Boolean(session);
  useEffect(() => {
    if (!userId || !hasSession) return;
    return subscribeToSession(id, userId, {
      onLocation: setRemoteFix,
      onSession: setSession,
      onPeerPresence: setPeerOnline,
      onStatus: setConnected,
    });
  }, [id, userId, hasSession]);

  return { userId, session, setSession, remoteFix, peerOnline, connected, loadError };
}
