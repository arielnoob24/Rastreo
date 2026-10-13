// Reglas puras de ubicación: sin dependencias del navegador ni de Firebase, para poder probarlas.

/** Posición publicada. Latitud y longitud son coordenadas; la altitud es la elevación (puede faltar). */
export interface LocationFix {
  latitude: number;
  longitude: number;
  /** Radio de precisión horizontal en metros. */
  accuracy: number | null;
  /** Metros sobre el elipsoide WGS84. `null` si el dispositivo no la proporciona. */
  altitude: number | null;
  altitudeAccuracy: number | null;
  /** Momento en que el dispositivo midió la posición. */
  capturedAt: Date;
}

export const PUBLISH_MIN_INTERVAL_MS = 5_000;
export const PUBLISH_MIN_DISTANCE_M = 10;
export const STALE_AFTER_MS = 60_000;
export const MAX_TRAIL_POINTS = 500;

const finiteOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export function fromGeolocationPosition(position: GeolocationPosition): LocationFix {
  const { coords } = position;
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: finiteOrNull(coords.accuracy),
    altitude: finiteOrNull(coords.altitude),
    altitudeAccuracy: finiteOrNull(coords.altitudeAccuracy),
    capturedAt: new Date(position.timestamp),
  };
}

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanceMeters(
  a: Pick<LocationFix, 'latitude' | 'longitude'>,
  b: Pick<LocationFix, 'latitude' | 'longitude'>,
): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Decide si vale la pena enviar una posición nueva, para ahorrar batería y datos. */
export function shouldPublish(
  previous: LocationFix | null,
  next: LocationFix,
  minIntervalMs = PUBLISH_MIN_INTERVAL_MS,
  minDistanceM = PUBLISH_MIN_DISTANCE_M,
): boolean {
  if (!previous) return true;
  const elapsed = next.capturedAt.getTime() - previous.capturedAt.getTime();
  if (elapsed < 0) return false; // lectura más vieja que la ya publicada
  if (elapsed >= minIntervalMs) return true;
  return distanceMeters(previous, next) >= minDistanceM;
}

export function isStale(capturedAt: Date, now: Date = new Date(), staleAfterMs = STALE_AFTER_MS): boolean {
  return now.getTime() - capturedAt.getTime() > staleAfterMs;
}

/** Agrega un punto al recorrido en memoria, evitando duplicados y limitando su tamaño. */
export function appendToTrail(
  trail: Array<[number, number]>,
  fix: Pick<LocationFix, 'latitude' | 'longitude'>,
  max = MAX_TRAIL_POINTS,
): Array<[number, number]> {
  const point: [number, number] = [fix.latitude, fix.longitude];
  const last = trail[trail.length - 1];
  if (last && last[0] === point[0] && last[1] === point[1]) return trail;
  const next = [...trail, point];
  return next.length > max ? next.slice(next.length - max) : next;
}

export const NOT_AVAILABLE = 'No disponible';

export function formatCoordinate(value: number, axis: 'lat' | 'lng'): string {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'O';
  return `${Math.abs(value).toFixed(6)}° ${hemisphere}`;
}

export function formatMeters(value: number | null, prefix = ''): string {
  if (value === null) return NOT_AVAILABLE;
  return `${prefix}${Math.round(value).toLocaleString('es')} m`;
}

export function formatAltitude(altitude: number | null, altitudeAccuracy: number | null): string {
  if (altitude === null) return NOT_AVAILABLE;
  const base = formatMeters(altitude);
  return altitudeAccuracy === null ? base : `${base} (± ${Math.round(altitudeAccuracy)} m)`;
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 5) return 'justo ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Permiso de ubicación denegado. Actívalo en la configuración del sitio de tu navegador y vuelve a pulsar Iniciar.';
    case 2:
      return 'No se pudo determinar la ubicación. Revisa que el GPS o los servicios de ubicación estén activados.';
    case 3:
      return 'La ubicación tardó demasiado en llegar. Seguimos intentando.';
    default:
      return 'Error desconocido al obtener la ubicación.';
  }
}
