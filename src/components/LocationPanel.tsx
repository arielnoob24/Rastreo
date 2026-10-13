import {
  formatAltitude,
  formatClock,
  formatCoordinate,
  formatMeters,
  formatRelativeTime,
  isStale,
  type LocationFix,
} from '../lib/geo';

interface Props {
  fix: LocationFix | null;
  now: Date;
}

export function LocationPanel({ fix, now }: Props) {
  if (!fix) {
    return (
      <section className="panel" aria-label="Datos de ubicación">
        <p className="muted">Todavía no hay una ubicación para mostrar.</p>
      </section>
    );
  }

  const stale = isStale(fix.capturedAt, now);

  return (
    <section className="panel" aria-label="Datos de ubicación">
      <dl className="readout">
        <div>
          <dt>Latitud</dt>
          <dd>{formatCoordinate(fix.latitude, 'lat')}</dd>
        </div>
        <div>
          <dt>Longitud</dt>
          <dd>{formatCoordinate(fix.longitude, 'lng')}</dd>
        </div>
        <div>
          <dt>Precisión</dt>
          <dd>{formatMeters(fix.accuracy, '± ')}</dd>
        </div>
        <div>
          <dt>Altitud</dt>
          <dd>{formatAltitude(fix.altitude, fix.altitudeAccuracy)}</dd>
        </div>
        <div className="readout__wide">
          <dt>Última actualización</dt>
          <dd>
            <time dateTime={fix.capturedAt.toISOString()}>{formatClock(fix.capturedAt)}</time>{' '}
            <span className={stale ? 'badge badge--warn' : 'badge badge--ok'}>
              {formatRelativeTime(fix.capturedAt, now)}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
