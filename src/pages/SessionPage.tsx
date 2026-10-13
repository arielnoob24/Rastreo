import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  endSession,
  getSession,
  leaveSession,
  publishLocation,
  setSharing,
  subscribeToSession,
  type TrackingSession,
} from '../api/sessions';
import { InvitePanel } from '../components/InvitePanel';
import { LocationPanel } from '../components/LocationPanel';
import { MapView } from '../components/MapView';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { StatusBanner, type StatusKind } from '../components/StatusBanner';
import { useGeolocationWatch, type WatchStatus } from '../hooks/useGeolocationWatch';
import { useNow } from '../hooks/useNow';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { appendToTrail, formatClock, formatRelativeTime, isStale, shouldPublish, type LocationFix } from '../lib/geo';
import { forgetSession } from '../lib/recentSession';
import { ensureSignedIn } from '../lib/firebase';

const OWNER_STATUS: Record<WatchStatus, StatusKind> = {
  idle: 'paused',
  requesting: 'waiting-permission',
  active: 'sharing',
  denied: 'denied',
  error: 'error',
  unsupported: 'error',
};

export function SessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const now = useNow();

  const [userId, setUserId] = useState<string | null>(null);
  // undefined = cargando; null = no existe o sin acceso.
  const [session, setSession] = useState<TrackingSession | null | undefined>(undefined);
  const [remoteFix, setRemoteFix] = useState<LocationFix | null>(null);
  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const [peerOnline, setPeerOnline] = useState(false);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lastPublished = useRef<LocationFix | null>(null);
  const publishing = useRef(false);

  const isOwner = Boolean(session && userId && session.ownerId === userId);
  const isViewer = Boolean(session && userId && session.viewerId === userId);
  const ended = Boolean(session && (session.endedAt || session.expiresAt <= now));

  // Carga inicial.
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
        setActionError(err instanceof Error ? err.message : 'No se pudo cargar la sesión');
        setSession(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Envío de ubicación (solo owner), limitado para ahorrar batería y datos.
  const onFix = useCallback(
    (fix: LocationFix) => {
      setTrail((t) => appendToTrail(t, fix));
      if (publishing.current || !shouldPublish(lastPublished.current, fix)) return;
      publishing.current = true;
      publishLocation(id, fix)
        .then(() => {
          lastPublished.current = fix;
          setActionError(null);
        })
        .catch((err: unknown) => setActionError(err instanceof Error ? err.message : 'No se pudo enviar la ubicación'))
        .finally(() => {
          publishing.current = false;
        });
    },
    [id],
  );

  const watch = useGeolocationWatch(onFix);

  // Canal en vivo.
  const hasSession = Boolean(session);
  const isOwnerRef = useRef(false);
  isOwnerRef.current = isOwner;
  useEffect(() => {
    if (!userId || !hasSession) return;
    return subscribeToSession(id, userId, {
      onLocation: (fix) => {
        setRemoteFix(fix);
        if (isOwnerRef.current) return; // el owner dibuja su recorrido con sus lecturas locales
        if (fix) setTrail((t) => appendToTrail(t, fix));
        else setTrail([]); // la otra persona dejó de compartir: no conservar el recorrido
      },
      onSession: setSession,
      onPeerPresence: setPeerOnline,
      onStatus: setConnected,
    });
  }, [id, userId, hasSession]);

  // Si al abrir la página la sesión quedó marcada como "compartiendo" pero aquí no hay seguimiento
  // (por ejemplo, tras recargar), se pausa: nunca se comparte sin que la persona pulse Iniciar.
  const pausedOnLoad = useRef(false);
  useEffect(() => {
    if (!isOwner || !session || pausedOnLoad.current) return;
    pausedOnLoad.current = true;
    if (session.sharing && watch.status === 'idle' && !ended) {
      void setSharing(id, false).then(() => setSession((s) => (s ? { ...s, sharing: false } : s)));
    }
  }, [isOwner, session, watch.status, ended, id]);

  // Permiso denegado o sesión terminada: detener todo.
  useEffect(() => {
    if (!isOwner) return;
    if (watch.status === 'denied' && session?.sharing) {
      setSession((s) => (s ? { ...s, sharing: false } : s));
      void setSharing(id, false).catch(() => undefined);
    }
    if (ended && watch.status !== 'idle') {
      watch.stop();
      setTrail([]);
    }
  }, [isOwner, watch, session?.sharing, ended, id]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setBusy(false);
    }
  };

  const onStart = () =>
    run(async () => {
      await setSharing(id, true);
      setSession((s) => (s ? { ...s, sharing: true } : s));
      lastPublished.current = null;
      watch.start();
    });

  const onStop = () =>
    run(async () => {
      watch.stop();
      lastPublished.current = null;
      setTrail([]);
      await setSharing(id, false); // el servidor borra la última ubicación
      setSession((s) => (s ? { ...s, sharing: false } : s));
    });

  const onEnd = () => {
    if (!window.confirm('¿Terminar la sesión? La otra persona perderá el acceso y se borrará la ubicación.')) return;
    void run(async () => {
      watch.stop();
      setTrail([]);
      await endSession(id);
      forgetSession();
      setSession((s) => (s ? { ...s, sharing: false, endedAt: new Date() } : s));
    });
  };

  const onLeave = () =>
    run(async () => {
      await leaveSession(id);
      forgetSession();
      navigate('/', { replace: true });
    });

  if (session === undefined) {
    return (
      <main className="page page--narrow">
        <p role="status">Cargando sesión…</p>
      </main>
    );
  }

  if (session === null || (!isOwner && !isViewer)) {
    return (
      <main className="page page--narrow">
        <StatusBanner kind="no-access" detail={actionError ?? 'La sesión no existe, venció o te quitaron el acceso.'} />
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </main>
    );
  }

  const shownFix = isOwner ? watch.fix : remoteFix;
  const stale = shownFix ? isStale(shownFix.capturedAt, now) : false;

  let status: StatusKind;
  let detail: string | null = null;
  if (ended) {
    status = 'ended';
    detail = 'Ya no se comparte ni se conserva ninguna ubicación de esta sesión.';
  } else if (!online) {
    status = 'offline';
    detail = isOwner ? 'Tu ubicación no se está enviando.' : 'Lo que ves puede no estar actualizado.';
  } else if (!connected) {
    status = 'reconnecting';
  } else if (isOwner) {
    status = OWNER_STATUS[watch.status];
    detail = watch.error;
    if (status === 'sharing') {
      detail = session.viewerId
        ? 'La persona invitada puede ver tu posición. Mantén esta pantalla abierta.'
        : 'Aún nadie se ha unido a la sesión.';
    }
  } else if (!session.sharing) {
    status = 'waiting-location';
    detail = 'La otra persona no está compartiendo su ubicación ahora.';
  } else if (!remoteFix) {
    status = 'waiting-location';
  } else if (stale) {
    status = 'stale';
    detail = 'Puede que el teléfono de la otra persona haya pausado el envío o perdido la señal.';
  } else {
    status = 'live';
  }

  const sharingNow = watch.status === 'active' || watch.status === 'requesting' || watch.status === 'error';
  const errorText =
    actionError && status !== 'no-access' ? (
      <p role="alert" className="error-text">
        {actionError}
      </p>
    ) : null;

  if (isOwner) {
    return (
      <main className="page session session--owner">
        <header className="session__header">
          <Link to="/" className="back">
            ← Inicio
          </Link>
          <span className="role-chip">Tú compartes</span>
          <h1>Mi ubicación</h1>
          {!ended ? <p className="muted">La sesión vence a las {formatClock(session.expiresAt)}</p> : null}
        </header>

        <div className="owner-layout">
          <div className="owner-layout__main">
            <section
              className={`card owner-card share-control${sharingNow ? ' share-control--on' : ''}`}
              aria-label="Compartir ubicación"
            >
              <StatusBanner kind={status} detail={detail} />
              {!ended ? (
                sharingNow ? (
                  <button type="button" className="share-button share-button--stop" onClick={onStop} disabled={busy}>
                    Detener
                  </button>
                ) : (
                  <button type="button" className="share-button" onClick={onStart} disabled={busy || !online}>
                    Iniciar
                  </button>
                )
              ) : null}
              {!ended ? (
                <p className="muted share-control__hint">
                  {sharingNow
                    ? 'Mantén esta pantalla abierta mientras compartes.'
                    : 'Pulsa Iniciar para que la otra persona vea dónde estás.'}
                </p>
              ) : null}
              {errorText}
            </section>

            {!ended ? (
              <InvitePanel sessionId={id} hasViewer={Boolean(session.viewerId)} peerOnline={peerOnline} />
            ) : null}
          </div>

          <div className="owner-layout__aside">
            <section className="card owner-card" aria-label="Lo que estás enviando">
              <h2 className="card__title">Lo que estás enviando</h2>
              <MapView fix={shownFix} trail={trail} stale={stale} size="small" />
              <LocationPanel fix={shownFix} now={now} />
            </section>

            {!ended ? (
              <button type="button" className="btn btn--ghost" onClick={onEnd} disabled={busy}>
                Terminar sesión
              </button>
            ) : null}
            <PrivacyNotice />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page session session--viewer">
      <header className="session__header">
        <Link to="/" className="back">
          ← Inicio
        </Link>
        <span className="role-chip">Solo observas</span>
        <h1>Ubicación compartida</h1>
      </header>

      <div className="viewer-layout">
        <div className="viewer-layout__map">
          <MapView fix={shownFix} trail={trail} stale={stale} size="large" />
        </div>

        <aside className="viewer-layout__side">
          <div className={`last-seen${stale ? ' last-seen--stale' : ''}`}>
            <span className="last-seen__label">Última actualización</span>
            <strong className="last-seen__value">
              {shownFix ? formatRelativeTime(shownFix.capturedAt, now) : '—'}
            </strong>
            <span className={`presence${peerOnline ? ' presence--on' : ''}`}>
              {peerOnline ? 'La otra persona está conectada' : 'La otra persona no está conectada'}
            </span>
          </div>

          <StatusBanner kind={status} detail={detail} />
          {errorText}
          <LocationPanel fix={shownFix} now={now} />

          {!ended ? (
            <button type="button" className="btn btn--ghost" onClick={onLeave} disabled={busy}>
              Salir de la sesión
            </button>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
