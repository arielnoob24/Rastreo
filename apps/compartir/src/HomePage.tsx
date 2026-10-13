import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSession } from '@shared/api/sessions';
import { PrivacyNotice } from '@shared/components/PrivacyNotice';
import { monitoreoUrl } from '@shared/lib/appLinks';
import { ensureSignedIn, isFirebaseConfigured } from '@shared/lib/firebase';
import { recentSession, rememberSession } from '@shared/lib/recentSession';

const DURATIONS = [
  { minutes: 60, label: '1 hora' },
  { minutes: 240, label: '4 horas' },
  { minutes: 720, label: '12 horas' },
  { minutes: 1440, label: '24 horas' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(240);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = recentSession('compartir');

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const session = await createSession(duration);
      rememberSession('compartir', session.id);
      navigate(`/sesion/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--narrow app-home">
      <header className="hero">
        <span className="app-badge">App de ubicación</span>
        <h1>Rastreo · Compartir</h1>
        <p>Comparte tu ubicación en vivo con una persona de confianza, solo mientras tú lo decidas.</p>
      </header>

      {!isFirebaseConfigured ? (
        <div className="status status--danger" role="alert">
          <span className="status__dot" aria-hidden="true" />
          <div>
            <strong>Falta configurar el servidor</strong>
            <p className="status__detail">Completa las variables VITE_FIREBASE_* en .env.local.</p>
          </div>
        </div>
      ) : null}

      {recent ? (
        <Link className="btn btn--ghost" to={`/sesion/${recent}`}>
          Volver a mi sesión
        </Link>
      ) : null}

      <section className="card" aria-labelledby="crear">
        <h2 id="crear">Nueva sesión</h2>
        <label className="field">
          <span>Duración máxima</span>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={onCreate} disabled={busy || !isFirebaseConfigured}>
          {busy ? 'Creando…' : 'Crear sesión'}
        </button>
        <p className="muted">Al crearla verás el código para la otra persona.</p>
        {error ? <p role="alert" className="error-text">{error}</p> : null}
      </section>

      <PrivacyNotice />

      <p className="muted other-app">
        ¿Quieres ver la ubicación de alguien? Usa la <a href={monitoreoUrl()}>app de monitoreo</a>.
      </p>
    </main>
  );
}
