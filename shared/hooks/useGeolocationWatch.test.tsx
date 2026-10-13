import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocationWatch } from './useGeolocationWatch';

type Success = (p: GeolocationPosition) => void;
type Failure = (e: GeolocationPositionError) => void;

let success: Success;
let failure: Failure;
const watchPosition = vi.fn((ok: Success, err: Failure) => {
  success = ok;
  failure = err;
  return 42;
});
const clearWatch = vi.fn();

beforeEach(() => {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(navigator, 'geolocation', { value: { watchPosition, clearWatch }, configurable: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

const position = { timestamp: 0, coords: { latitude: 1, longitude: 2, accuracy: 5, altitude: null, altitudeAccuracy: null } };

describe('useGeolocationWatch', () => {
  it('no observa nada hasta pulsar Iniciar', () => {
    renderHook(() => useGeolocationWatch(vi.fn()));
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('pasa de esperando permiso a activo y entrega lecturas', () => {
    const onFix = vi.fn();
    const { result } = renderHook(() => useGeolocationWatch(onFix));
    act(() => result.current.start());
    expect(result.current.status).toBe('requesting');
    act(() => success(position as unknown as GeolocationPosition));
    expect(result.current.status).toBe('active');
    expect(onFix).toHaveBeenCalledWith(expect.objectContaining({ latitude: 1, longitude: 2, altitude: null }));
  });

  it('llama a clearWatch al detener', () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(result.current.status).toBe('idle');
  });

  it('llama a clearWatch al desmontar', () => {
    const { result, unmount } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    unmount();
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it('informa el permiso denegado y deja de observar', () => {
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    act(() => failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: '' } as GeolocationPositionError));
    expect(result.current.status).toBe('denied');
    expect(result.current.error).toMatch(/denegado/i);
    expect(clearWatch).toHaveBeenCalledWith(42);
  });

  it('rechaza contextos no seguros', () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const { result } = renderHook(() => useGeolocationWatch(vi.fn()));
    act(() => result.current.start());
    expect(result.current.status).toBe('unsupported');
    expect(watchPosition).not.toHaveBeenCalled();
  });
});
