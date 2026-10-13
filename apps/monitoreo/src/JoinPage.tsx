import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { acceptInvitation } from '@shared/api/sessions';
import { ensureSignedIn, isFirebaseConfigured } from '@shared/lib/firebase';
import { formatCode, normalizeCode } from '@shared/lib/invite';
import { rememberSession } from '@shared/lib/recentSession';

export function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get('codigo') ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aceptar requiere un clic explícito: abrir el enlace no une a nadie automáticamente.
  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const sessionId = await acceptInvitation(code);
      rememberSession('monitoreo', sessionId);
      navigate(`/sesion/${sessionId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitación inválida o vencida');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--narrow">
      <section className="card">
        <h1>Unirte a una sesión</h1>
        <p>
          Al unirte podrás ver la ubicación de quien te invitó, solo mientras decida compartirla. Puede detenerla o
          quitarte el acceso en cualquier momento.
        </p>
        <p>
          Código: <code>{code ? formatCode(normalizeCode(code)) : '—'}</code>
        </p>
        <button type="button" className="btn" onClick={onAccept} disabled={busy || !code || !isFirebaseConfigured}>
          {busy ? 'Uniendo…' : 'Unirme'}
        </button>
        {error ? <p role="alert" className="error-text">{error}</p> : null}
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </section>
    </main>
  );
}
