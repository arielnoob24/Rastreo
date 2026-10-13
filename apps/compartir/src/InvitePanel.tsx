import { useCallback, useEffect, useRef, useState } from 'react';
import { createInvitation, revokeViewer, type Invitation } from '@shared/api/sessions';
import { inviteLink } from '@shared/lib/appLinks';
import { formatClock } from '@shared/lib/geo';
import { formatCode } from '@shared/lib/invite';

interface Props {
  sessionId: string;
  hasViewer: boolean;
  peerOnline: boolean;
}

// El código dura lo mismo que la sesión (la función lo limita al vencimiento de la sesión); sigue siendo de un solo uso.
const INVITE_TTL_MINUTES = 24 * 60;

// Se recuerda el código en este dispositivo para no generar otro (e invalidar el ya enviado) al recargar.
const storageKey = (sessionId: string) => `rastreo:invitacion:${sessionId}`;

function loadInvitation(sessionId: string): Invitation | null {
  try {
    const raw = localStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { code: string; expiresAt: string };
    const expiresAt = new Date(parsed.expiresAt);
    return expiresAt.getTime() > Date.now() ? { code: parsed.code, expiresAt } : null;
  } catch {
    return null;
  }
}

function saveInvitation(sessionId: string, invitation: Invitation | null): void {
  try {
    if (invitation) localStorage.setItem(storageKey(sessionId), JSON.stringify(invitation));
    else localStorage.removeItem(storageKey(sessionId));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function InvitePanel({ sessionId, hasViewer, peerOnline }: Props) {
  const [invitation, setInvitation] = useState<Invitation | null>(() => loadInvitation(sessionId));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const creating = useRef(false);

  const generate = useCallback(async () => {
    if (creating.current) return;
    creating.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const created = await createInvitation(sessionId, INVITE_TTL_MINUTES);
      saveInvitation(sessionId, created);
      setInvitation(created);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo crear el código');
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }, [sessionId]);

  // Sin nadie unido: el código aparece solo, sin tener que pedirlo.
  useEffect(() => {
    if (!hasViewer && !invitation) void generate();
  }, [hasViewer, invitation, generate]);

  // Cuando alguien se une, el código ya se usó: olvidarlo para generar uno nuevo si esa persona sale.
  useEffect(() => {
    if (hasViewer) {
      saveInvitation(sessionId, null);
      setInvitation(null);
    }
  }, [hasViewer, sessionId]);

  if (hasViewer) {
    return (
      <section className="card owner-card" aria-label="Persona que te ve">
        <h2 className="card__title">Quién te ve</h2>
        <p>
          Una persona está unida{' '}
          <span className={peerOnline ? 'badge badge--ok' : 'badge'}>{peerOnline ? 'conectada' : 'desconectada'}</span>
        </p>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await revokeViewer(sessionId);
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'No se pudo revocar el acceso');
            } finally {
              setBusy(false);
            }
          }}
        >
          Revocar acceso
        </button>
        {message ? <p role="alert" className="error-text">{message}</p> : null}
      </section>
    );
  }

  const share = async (code: string) => {
    const url = inviteLink(code);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rastreo', text: `Código: ${formatCode(code)}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Enlace copiado.');
      }
    } catch {
      /* compartir cancelado */
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setMessage('Código copiado.');
    } catch {
      setMessage('No se pudo copiar; escribe el código a mano.');
    }
  };

  return (
    <section className="card owner-card invite-card" aria-label="Invitación">
      <h2 className="card__title">Código para la otra persona</h2>
      {invitation ? (
        <>
          <code className="invite__code" aria-label="Código de invitación">
            {formatCode(invitation.code)}
          </code>
          <p className="muted">
            Solo sirve una vez. Vence a las {formatClock(invitation.expiresAt)}. La otra persona lo escribe en la app de
            monitoreo.
          </p>
          <div className="button-row">
            <button type="button" className="btn" onClick={() => share(invitation.code)}>
              Compartir enlace
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => copyCode(invitation.code)}>
              Copiar código
            </button>
          </div>
          <button type="button" className="link-button" disabled={busy} onClick={() => void generate()}>
            Generar otro código
          </button>
        </>
      ) : (
        <p role="status" className="muted">
          {busy ? 'Generando código…' : 'No se pudo generar el código.'}
        </p>
      )}
      {!invitation && !busy ? (
        <button type="button" className="btn" onClick={() => void generate()}>
          Reintentar
        </button>
      ) : null}
      {message ? <p role="status" className="muted">{message}</p> : null}
    </section>
  );
}
