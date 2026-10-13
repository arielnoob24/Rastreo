import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocationPanel } from './LocationPanel';
import { StatusBanner } from './StatusBanner';

const capturedAt = new Date('2026-01-01T12:00:00Z');
const base = { latitude: -12.5, longitude: -70.25, accuracy: 12, altitude: null, altitudeAccuracy: null, capturedAt };

describe('LocationPanel', () => {
  it('muestra latitud, longitud y precisión', () => {
    render(<LocationPanel fix={base} now={capturedAt} />);
    expect(screen.getByText('Latitud').nextSibling).toHaveTextContent('12.500000° S');
    expect(screen.getByText('Longitud').nextSibling).toHaveTextContent('70.250000° O');
    expect(screen.getByText('Precisión').nextSibling).toHaveTextContent('± 12 m');
  });

  it('indica "No disponible" si faltan altitud o precisión', () => {
    render(<LocationPanel fix={{ ...base, accuracy: null }} now={capturedAt} />);
    expect(screen.getByText('Altitud').nextSibling).toHaveTextContent('No disponible');
    expect(screen.getByText('Precisión').nextSibling).toHaveTextContent('No disponible');
  });

  it('marca la ubicación obsoleta', () => {
    render(<LocationPanel fix={base} now={new Date(capturedAt.getTime() + 5 * 60_000)} />);
    expect(screen.getByText('hace 5 min')).toHaveClass('badge--warn');
  });

  it('avisa cuando aún no hay ubicación', () => {
    render(<LocationPanel fix={null} now={capturedAt} />);
    expect(screen.getByText(/todavía no hay una ubicación/i)).toBeInTheDocument();
  });
});

describe('StatusBanner', () => {
  it('anuncia los estados normales como status', () => {
    render(<StatusBanner kind="sharing" />);
    expect(screen.getByRole('status')).toHaveTextContent('Compartiendo tu ubicación');
  });

  it('anuncia los problemas graves como alerta', () => {
    render(<StatusBanner kind="offline" detail="Tu ubicación no se está enviando." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
  });

  it('distingue ubicación obsoleta y sesión terminada', () => {
    const { rerender } = render(<StatusBanner kind="stale" />);
    expect(screen.getByRole('status')).toHaveTextContent('Ubicación desactualizada');
    rerender(<StatusBanner kind="ended" />);
    expect(screen.getByRole('status')).toHaveTextContent('Sesión terminada');
  });
});
