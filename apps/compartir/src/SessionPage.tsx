import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { endSession, publishLocation, setSharing } from '@shared/api/sessions';
import { LocationPanel } from '@shared/components/LocationPanel';
import { MapView } from '@shared/components/MapView';
import { PrivacyNotice } from '@shared/components/PrivacyNotice';
import { StatusBanner, type StatusKind } from '@shared/components/StatusBanner';
import { useGeolocationWatch, type WatchStatus } from '@shared/hooks/useGeolocationWatch';
import { useNow } from '@shared/hooks/useNow';
import { useOnlineStatus } from '@shared/hooks/useOnlineStatus';
import { useSessionChannel } from '@shared/hooks/useSessionChannel';
import { monitoreoUrl } from '@shared/lib/appLinks';
import { appendToTrail, formatClock, isStale, shouldPublish, type LocationFix } from '@shared/lib/geo';
import { forgetSession } from '@shared/lib/recentSession';
import { InvitePanel } from './InvitePanel';

const OWNER_STATUS: Record<WatchStatus, StatusKind> = {
  idle: 'paused',
  requesting: 'waiting-permission',
  active: 'sharing',
  denied: 'denied',
  error: 'error',
  unsupported: 'error',
};

/** Pantalla de quien comparte: Iniciar/Detener, código de invitación y vista previa de lo que se envía. */
export function SessionPage() {
  const { id = '' } = useParams();
  const online = useOnlineStatus();
  const now = useNow();
  const { userId, session, setSession, peerOnline, connected, loadError } = useSessionChannel(id);

  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastPublished = useRef<LocationFix | null>(null);
  const publishing = useRef(false);

  const isOwner = Boolean(session && userId && session.ownerId === userId);
  const ended = Boolean(session && (session.endedAt || session.expiresAt <= now));

  // Envío de ubicación, limitado para ahorrar batería y datos.
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

  // Si al abrir la página la sesión quedó marcada como "compartiendo" pero aquí no hay seguimiento
  // (por ejemplo, tras recargar), se pausa: nunca se comparte sin que la persona pulse Iniciar.
  const pausedOnLoad = useRef(false);
  useEffect(() => {
    if (!isOwner || !session || pausedOnLoad.current) return;
    pausedOnLoad.current = true;
    if (session.sharing && watch.status === 'idle' && !ended) {
      void setSharing(id, false).then(() => setSession((s) => (s ? { ...s, sharing: false } : s)));
    }
  }, [isOwner, session, watch.status, ended, id, setSession]);

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
  }, [isOwner, watch, session?.sharing, ended, id, setSession]);

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
      forgetSession('compartir');
      setSession((s) => (s ? { ...s, sharing: false, endedAt: new Date() } : s));
    });
  };

  if (session === undefined) {
    return (
      <main className="page page--narrow">
        <p role="status">Cargando sesión…</p>
      </main>
    );
  }

  if (session === null) {
    return (
      <main className="page page--narrow">
        <StatusBanner kind="no-access" detail={loadError ?? 'La sesión no existe o venció.'} />
        <p>
          <Link to="/">Crear una sesión nueva</Link>
        </p>
      </main>
    );
  }

  if (!isOwner) {
    // Quien observa entró a la app equivocada: su lugar es la app de monitoreo.
    return (
      <main className="page page--narrow">
        <StatusBanner kind="no-access" detail="Esta sesión la estás observando, no compartiendo." />
        <a className="btn" href={`${monitoreoUrl()}#/sesion/${id}`}>
          Abrir en la app de monitoreo
        </a>
      </main>
    );
  }

  const stale = watch.fix ? isStale(watch.fix.capturedAt, now) : false;
  let status: StatusKind;
  let detail: string | null = null;
  if (ended) {
    status = 'ended';
    detail = 'Ya no se comparte ni se conserva ninguna ubicación de esta sesión.';
  } else if (!online) {
    status = 'offline';
    detail = 'Tu ubicación no se está enviando.';
  } else if (!connected) {
    status = 'reconnecting';
  } else {
    status = OWNER_STATUS[watch.status];
    detail = watch.error;
    if (status === 'sharing') {
      detail = session.viewerId
        ? 'La persona invitada puede ver tu posición. Mantén esta pantalla abierta.'
        : 'Aún nadie se ha unido a la sesión.';
    }
  }

  const sharingNow = watch.status === 'active' || watch.status === 'requesting' || watch.status === 'error';

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
            {actionError ? (
              <p role="alert" className="error-text">
                {actionError}
              </p>
            ) : null}
          </section>

          {!ended ? <InvitePanel sessionId={id} hasViewer={Boolean(session.viewerId)} peerOnline={peerOnline} /> : null}
        </div>

        <div className="owner-layout__aside">
          <section className="card owner-card" aria-label="Lo que estás enviando">
            <h2 className="card__title">Lo que estás enviando</h2>
            <MapView fix={watch.fix} trail={trail} stale={stale} size="small" />
            <LocationPanel fix={watch.fix} now={now} />
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
