import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSession } from '../api/sessions';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { recentSession, rememberSession } from '../lib/recentSession';
import { ensureSignedIn, isFirebaseConfigured } from '../lib/firebase';

const DURATIONS = [
  { minutes: 60, label: '1 hora' },
  { minutes: 240, label: '4 horas' },
  { minutes: 720, label: '12 horas' },
  { minutes: 1440, label: '24 horas' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(240);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recent = recentSession();

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const session = await createSession(duration);
      rememberSession(session.id);
      navigate(`/sesion/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la sesión');
    } finally {
      setBusy(false);
    }
  };

  const onJoin = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed) navigate(`/unirse?codigo=${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className="page page--narrow">
      <header className="hero">
        <h1>Rastreo en pareja</h1>
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
        <p>
          <Link to={`/sesion/${recent}`}>Volver a mi última sesión</Link>
        </p>
      ) : null}

      <section className="card" aria-labelledby="crear">
        <h2 id="crear">Compartir mi ubicación</h2>
        <label className="field">
          <span>Duración máxima de la sesión</span>
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
        {error ? <p role="alert" className="error-text">{error}</p> : null}
      </section>

      <section className="card" aria-labelledby="unirse">
        <h2 id="unirse">Ver la ubicación de alguien</h2>
        <form onSubmit={onJoin} className="join-form">
          <label className="field">
            <span>Código de invitación</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD-EFGH-JKLM"
            />
          </label>
          <button type="submit" className="btn btn--ghost" disabled={!code.trim()}>
            Continuar
          </button>
        </form>
      </section>

      <PrivacyNotice />
    </main>
  );
}
