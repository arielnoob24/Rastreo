import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compartirUrl } from '@shared/lib/appLinks';
import { isFirebaseConfigured } from '@shared/lib/firebase';
import { recentSession } from '@shared/lib/recentSession';

export function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const recent = recentSession('monitoreo');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed) navigate(`/unirse?codigo=${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className="page page--narrow app-home">
      <header className="hero">
        <span className="app-badge">App de monitoreo</span>
        <h1>Rastreo · Monitoreo</h1>
        <p>Mira en un mapa, en tiempo real, la ubicación que alguien decidió compartir contigo.</p>
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
          Volver a la ubicación que estaba viendo
        </Link>
      ) : null}

      <section className="card" aria-labelledby="codigo">
        <h2 id="codigo">Agregar persona con código</h2>
        <form onSubmit={onSubmit} className="join-form">
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
          <button type="submit" className="btn" disabled={!code.trim() || !isFirebaseConfigured}>
            Continuar
          </button>
        </form>
        <p className="muted">Pídele el código a la persona que comparte; lo ve en su app de ubicación.</p>
      </section>

      <p className="muted other-app">
        ¿Quieres compartir tu propia ubicación? Usa la <a href={compartirUrl()}>app de ubicación</a>.
      </p>
    </main>
  );
}
