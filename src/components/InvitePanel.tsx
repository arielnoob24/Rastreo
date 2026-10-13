import { useState } from 'react';
import { createInvitation, revokeViewer, type Invitation } from '../api/sessions';
import { formatClock } from '../lib/geo';
import { formatCode } from '../lib/invite';

interface Props {
  sessionId: string;
  hasViewer: boolean;
  peerOnline: boolean;
}

export function inviteLink(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}unirse?codigo=${encodeURIComponent(code)}`;
}

export function InvitePanel({ sessionId, hasViewer, peerOnline }: Props) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ocurrió un error');
    } finally {
      setBusy(false);
    }
  };

  if (hasViewer) {
    return (
      <section className="panel" aria-label="Persona invitada">
        <p>
          Otra persona está unida a esta sesión{' '}
          <span className={peerOnline ? 'badge badge--ok' : 'badge'}>{peerOnline ? 'conectada' : 'desconectada'}</span>
        </p>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => run(async () => {
            await revokeViewer(sessionId);
            setInvitation(null);
          })}
        >
          Revocar acceso
        </button>
        {message ? <p role="alert" className="error-text">{message}</p> : null}
      </section>
    );
  }

  const share = async (code: string) => {
    const url = inviteLink(code);
    if (navigator.share) {
      await navigator.share({ title: 'Rastreo en pareja', text: `Código: ${code}`, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url);
      setMessage('Enlace copiado.');
    }
  };

  return (
    <section className="panel" aria-label="Invitación">
      <p className="muted">Nadie más está unido. Crea una invitación de un solo uso para la otra persona.</p>
      {invitation ? (
        <div className="invite">
          <code className="invite__code" aria-label="Código de invitación">
            {formatCode(invitation.code)}
          </code>
          <p className="muted">Vence a las {formatClock(invitation.expiresAt)}. Solo sirve una vez.</p>
          <button type="button" className="btn" onClick={() => run(() => share(invitation.code))}>
            Compartir enlace
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className={invitation ? 'btn btn--ghost' : 'btn'}
        disabled={busy}
        onClick={() => run(async () => setInvitation(await createInvitation(sessionId)))}
      >
        {invitation ? 'Generar otro código' : 'Crear invitación'}
      </button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </section>
  );
}
