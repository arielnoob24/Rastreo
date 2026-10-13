export type StatusKind =
  | 'waiting-permission'
  | 'sharing'
  | 'paused'
  | 'waiting-location'
  | 'live'
  | 'stale'
  | 'offline'
  | 'reconnecting'
  | 'denied'
  | 'error'
  | 'ended'
  | 'no-access';

const LABELS: Record<StatusKind, { title: string; tone: 'ok' | 'info' | 'warn' | 'danger' }> = {
  'waiting-permission': { title: 'Esperando permiso de ubicación…', tone: 'info' },
  sharing: { title: 'Compartiendo tu ubicación', tone: 'ok' },
  paused: { title: 'No estás compartiendo tu ubicación', tone: 'info' },
  'waiting-location': { title: 'Esperando la ubicación de la otra persona', tone: 'info' },
  live: { title: 'Ubicación actualizada', tone: 'ok' },
  stale: { title: 'Ubicación desactualizada', tone: 'warn' },
  offline: { title: 'Sin conexión', tone: 'danger' },
  reconnecting: { title: 'Reconectando…', tone: 'warn' },
  denied: { title: 'Permiso de ubicación denegado', tone: 'danger' },
  error: { title: 'Problema al obtener la ubicación', tone: 'warn' },
  ended: { title: 'Sesión terminada', tone: 'info' },
  'no-access': { title: 'No tienes acceso a esta sesión', tone: 'danger' },
};

interface Props {
  kind: StatusKind;
  detail?: string | null;
}

export function StatusBanner({ kind, detail }: Props) {
  const { title, tone } = LABELS[kind];
  const isAlert = tone === 'danger';
  return (
    <div
      className={`status status--${tone}`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      data-status={kind}
    >
      <span className="status__dot" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {detail ? <p className="status__detail">{detail}</p> : null}
      </div>
    </div>
  );
}
