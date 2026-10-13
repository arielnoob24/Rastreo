import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { leaveSession } from '@shared/api/sessions';
import { LocationPanel } from '@shared/components/LocationPanel';
import { MapView } from '@shared/components/MapView';
import { StatusBanner, type StatusKind } from '@shared/components/StatusBanner';
import { useNow } from '@shared/hooks/useNow';
import { useOnlineStatus } from '@shared/hooks/useOnlineStatus';
import { useSessionChannel } from '@shared/hooks/useSessionChannel';
import { compartirUrl } from '@shared/lib/appLinks';
import { appendToTrail, formatRelativeTime, isStale } from '@shared/lib/geo';
import { forgetSession } from '@shared/lib/recentSession';

/** Pantalla de quien monitorea: mapa grande y datos en vivo, solo lectura. */
export function SessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const now = useNow();
  const { userId, session, remoteFix, peerOnline, connected, loadError } = useSessionChannel(id);

  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // El recorrido solo vive en memoria; si la otra persona deja de compartir, se descarta.
  useEffect(() => {
    if (remoteFix) setTrail((t) => appendToTrail(t, remoteFix));
    else setTrail([]);
  }, [remoteFix]);

  const isViewer = Boolean(session && userId && session.viewerId === userId);
  const isOwner = Boolean(session && userId && session.ownerId === userId);
  const ended = Boolean(session && (session.endedAt || session.expiresAt <= now));

  const onLeave = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await leaveSession(id);
      forgetSession('monitoreo');
      navigate('/', { replace: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo salir de la sesión');
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined) {
    return (
      <main className="page page--narrow">
        <p role="status">Cargando…</p>
      </main>
    );
  }

  if (isOwner) {
    // Quien comparte entró a la app equivocada: su lugar es la app de ubicación.
    return (
      <main className="page page--narrow">
        <StatusBanner kind="no-access" detail="Esta es tu propia sesión: aquí no puedes verte a ti mismo." />
        <a className="btn" href={`${compartirUrl()}#/sesion/${id}`}>
          Abrir en la app de ubicación
        </a>
      </main>
    );
  }

  if (session === null || !isViewer) {
    return (
      <main className="page page--narrow">
        <StatusBanner kind="no-access" detail={loadError ?? 'La sesión no existe, venció o te quitaron el acceso.'} />
        <p>
          <Link to="/">Ingresar otro código</Link>
        </p>
      </main>
    );
  }

  const stale = remoteFix ? isStale(remoteFix.capturedAt, now) : false;
  let status: StatusKind;
  let detail: string | null = null;
  if (ended) {
    status = 'ended';
    detail = 'Ya no se comparte ni se conserva ninguna ubicación de esta sesión.';
  } else if (!online) {
    status = 'offline';
    detail = 'Lo que ves puede no estar actualizado.';
  } else if (!connected) {
    status = 'reconnecting';
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
          <MapView fix={remoteFix} trail={trail} stale={stale} size="large" />
        </div>

        <aside className="viewer-layout__side">
          <div className={`last-seen${stale ? ' last-seen--stale' : ''}`}>
            <span className="last-seen__label">Última actualización</span>
            <strong className="last-seen__value">{remoteFix ? formatRelativeTime(remoteFix.capturedAt, now) : '—'}</strong>
            <span className={`presence${peerOnline ? ' presence--on' : ''}`}>
              {peerOnline ? 'La otra persona está conectada' : 'La otra persona no está conectada'}
            </span>
          </div>

          <StatusBanner kind={status} detail={detail} />
          {actionError ? (
            <p role="alert" className="error-text">
              {actionError}
            </p>
          ) : null}
          <LocationPanel fix={remoteFix} now={now} />

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
