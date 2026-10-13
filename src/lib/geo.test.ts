import { describe, expect, it } from 'vitest';
import {
  appendToTrail,
  distanceMeters,
  formatAltitude,
  formatCoordinate,
  formatMeters,
  formatRelativeTime,
  fromGeolocationPosition,
  isStale,
  NOT_AVAILABLE,
  shouldPublish,
  type LocationFix,
} from './geo';

// Coordenadas ficticias.
const fix = (overrides: Partial<LocationFix> = {}): LocationFix => ({
  latitude: 10,
  longitude: 20,
  accuracy: 8,
  altitude: null,
  altitudeAccuracy: null,
  capturedAt: new Date('2026-01-01T12:00:00Z'),
  ...overrides,
});

describe('fromGeolocationPosition', () => {
  it('mantiene latitud y longitud separadas de la altitud', () => {
    const result = fromGeolocationPosition({
      timestamp: Date.parse('2026-01-01T12:00:00Z'),
      coords: {
        latitude: -12.5,
        longitude: -70.25,
        accuracy: 15,
        altitude: 2400,
        altitudeAccuracy: 30,
        heading: null,
        speed: null,
      },
    } as GeolocationPosition);
    expect(result).toMatchObject({ latitude: -12.5, longitude: -70.25, altitude: 2400, altitudeAccuracy: 30, accuracy: 15 });
  });

  it('convierte altitud ausente o no finita en null', () => {
    const result = fromGeolocationPosition({
      timestamp: 0,
      coords: { latitude: 1, longitude: 2, accuracy: Number.NaN, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    } as GeolocationPosition);
    expect(result.altitude).toBeNull();
    expect(result.altitudeAccuracy).toBeNull();
    expect(result.accuracy).toBeNull();
  });
});

describe('distanceMeters', () => {
  it('es cero para el mismo punto', () => {
    expect(distanceMeters(fix(), fix())).toBe(0);
  });

  it('aproxima ~111 km por grado de latitud', () => {
    const d = distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('shouldPublish', () => {
  it('publica la primera lectura', () => {
    expect(shouldPublish(null, fix())).toBe(true);
  });

  it('no publica lecturas cercanas en el tiempo y el espacio', () => {
    const prev = fix();
    const next = fix({ capturedAt: new Date(prev.capturedAt.getTime() + 1_000), latitude: 10.00001 });
    expect(shouldPublish(prev, next)).toBe(false);
  });

  it('publica si pasó el intervalo mínimo', () => {
    const prev = fix();
    expect(shouldPublish(prev, fix({ capturedAt: new Date(prev.capturedAt.getTime() + 5_000) }))).toBe(true);
  });

  it('publica antes del intervalo si hubo un desplazamiento grande', () => {
    const prev = fix();
    const next = fix({ capturedAt: new Date(prev.capturedAt.getTime() + 1_000), latitude: 10.001 });
    expect(shouldPublish(prev, next)).toBe(true);
  });

  it('descarta lecturas más viejas que la publicada', () => {
    const prev = fix();
    expect(shouldPublish(prev, fix({ capturedAt: new Date(prev.capturedAt.getTime() - 1), latitude: 11 }))).toBe(false);
  });
});

describe('isStale', () => {
  const t = new Date('2026-01-01T12:00:00Z');
  it('no está obsoleta dentro del umbral', () => {
    expect(isStale(t, new Date(t.getTime() + 60_000))).toBe(false);
  });
  it('está obsoleta después del umbral', () => {
    expect(isStale(t, new Date(t.getTime() + 60_001))).toBe(true);
  });
});

describe('appendToTrail', () => {
  it('ignora puntos repetidos consecutivos', () => {
    const trail = appendToTrail([], fix());
    expect(appendToTrail(trail, fix())).toBe(trail);
  });

  it('limita el tamaño del recorrido', () => {
    let trail: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) trail = appendToTrail(trail, { latitude: i, longitude: 0 }, 3);
    expect(trail).toEqual([
      [7, 0],
      [8, 0],
      [9, 0],
    ]);
  });
});

describe('formato', () => {
  it('muestra hemisferios', () => {
    expect(formatCoordinate(-12.5, 'lat')).toBe('12.500000° S');
    expect(formatCoordinate(70.25, 'lng')).toBe('70.250000° E');
    expect(formatCoordinate(-70.25, 'lng')).toBe('70.250000° O');
  });

  it('muestra "No disponible" cuando falta un dato', () => {
    expect(formatMeters(null)).toBe(NOT_AVAILABLE);
    expect(formatAltitude(null, 10)).toBe(NOT_AVAILABLE);
  });

  it('incluye la precisión de la altitud cuando existe', () => {
    expect(formatAltitude(2400.4, 29.6)).toBe('2400 m (± 30 m)');
    expect(formatAltitude(12, null)).toBe('12 m');
  });

  it('formatea tiempos relativos', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    expect(formatRelativeTime(new Date(now.getTime() - 2_000), now)).toBe('justo ahora');
    expect(formatRelativeTime(new Date(now.getTime() - 30_000), now)).toBe('hace 30 s');
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000), now)).toBe('hace 5 min');
  });
});
