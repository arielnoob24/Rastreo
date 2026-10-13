import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { LocationFix } from '../lib/geo';
import { auth, requireDb } from '../lib/firebase';
import { generateCode, hashCode } from '../lib/invite';

export interface TrackingSession {
  id: string;
  ownerId: string;
  viewerId: string | null;
  sharing: boolean;
  createdAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
}

export interface Invitation {
  code: string;
  expiresAt: Date;
}

const HEARTBEAT_MS = 20_000;
const PEER_ONLINE_WITHIN_MS = 60_000;
const INVALID_INVITATION = 'Invitación inválida o vencida';

const sessionRef = (id: string) => doc(requireDb(), 'sessions', id);
const locationRef = (id: string) => doc(requireDb(), 'locations', id);
const invitationRef = (hash: string) => doc(requireDb(), 'invitations', hash);

// La regla de ubicaciones exige que expiresAt coincida exactamente con el de la sesión.
const sessionExpiry = new Map<string, Timestamp>();

const millis = (value: unknown): number | null => (value instanceof Timestamp ? value.toMillis() : null);

function toSession(id: string, data: DocumentData): TrackingSession {
  const expires = data.expiresAt as Timestamp;
  sessionExpiry.set(id, expires);
  return {
    id,
    ownerId: data.ownerId,
    viewerId: data.viewerId ?? null,
    sharing: Boolean(data.sharing),
    createdAt: (data.createdAt as Timestamp | null)?.toDate() ?? new Date(),
    expiresAt: expires.toDate(),
    endedAt: data.endedAt ? (data.endedAt as Timestamp).toDate() : null,
  };
}

function toFix(data: DocumentData): LocationFix {
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy ?? null,
    altitude: data.altitude ?? null,
    altitudeAccuracy: data.altitudeAccuracy ?? null,
    capturedAt: (data.capturedAt as Timestamp).toDate(),
  };
}

export async function createSession(durationMinutes = 240): Promise<TrackingSession> {
  if (durationMinutes < 15 || durationMinutes > 1440) {
    throw new Error('La duración debe estar entre 15 minutos y 24 horas');
  }
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');

  const ref = doc(requireDb(), 'sessions', crypto.randomUUID());
  const expiresAt = Timestamp.fromMillis(Date.now() + durationMinutes * 60_000);
  await setDoc(ref, {
    ownerId: uid,
    viewerId: null,
    sharing: false,
    createdAt: serverTimestamp(),
    expiresAt,
    endedAt: null,
    inviteHash: null,
    ownerSeen: null,
    viewerSeen: null,
  });
  sessionExpiry.set(ref.id, expiresAt);
  return {
    id: ref.id,
    ownerId: uid,
    viewerId: null,
    sharing: false,
    createdAt: new Date(),
    expiresAt: expiresAt.toDate(),
    endedAt: null,
  };
}

export async function getSession(sessionId: string): Promise<TrackingSession | null> {
  try {
    const snap = await getDoc(sessionRef(sessionId));
    return snap.exists() ? toSession(snap.id, snap.data()) : null;
  } catch (err) {
    // Sin permiso (no integrante o sesión ajena) se trata igual que "no existe".
    if ((err as { code?: string }).code === 'permission-denied') return null;
    throw err;
  }
}

export async function createInvitation(sessionId: string, ttlMinutes = 30): Promise<Invitation> {
  const snap = await getDoc(sessionRef(sessionId));
  if (!snap.exists()) throw new Error('No se puede invitar a esta sesión');
  const session = toSession(snap.id, snap.data());
  if (session.viewerId || session.endedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new Error('No se puede invitar a esta sesión');
  }

  const code = generateCode();
  const hash = await hashCode(code);
  const expiresMs = Math.min(Date.now() + ttlMinutes * 60_000, session.expiresAt.getTime());

  // En un lote: crea la invitación y la deja como la única vigente de la sesión (las anteriores dejan de servir).
  const batch = writeBatch(requireDb());
  batch.set(invitationRef(hash), {
    sessionId,
    ownerId: session.ownerId,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(expiresMs),
    usedAt: null,
    usedBy: null,
  });
  batch.update(sessionRef(sessionId), { inviteHash: hash });
  await batch.commit();

  return { code, expiresAt: new Date(expiresMs) };
}

export async function acceptInvitation(code: string): Promise<string> {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('No autenticado');

  const hash = await hashCode(code);
  const invitation = await getDoc(invitationRef(hash));
  const data = invitation.data();
  if (!data || data.usedAt || (data.expiresAt as Timestamp).toMillis() <= Date.now()) {
    throw new Error(INVALID_INVITATION);
  }

  // Un solo lote: marcar la invitación usada y unirse a la sesión. Las reglas exigen ambas cosas a la vez.
  const batch = writeBatch(requireDb());
  batch.update(invitationRef(hash), { usedAt: serverTimestamp(), usedBy: uid });
  batch.update(sessionRef(data.sessionId), { viewerId: uid });
  try {
    await batch.commit();
  } catch {
    throw new Error(INVALID_INVITATION);
  }
  return data.sessionId as string;
}

export async function setSharing(sessionId: string, sharing: boolean): Promise<void> {
  if (sharing) {
    await updateDoc(sessionRef(sessionId), { sharing: true });
    return;
  }
  // Al detener: dejar de compartir y borrar la última ubicación del servidor, atómicamente.
  const batch = writeBatch(requireDb());
  batch.update(sessionRef(sessionId), { sharing: false });
  batch.delete(locationRef(sessionId));
  await batch.commit();
}

export async function revokeViewer(sessionId: string): Promise<void> {
  const batch = writeBatch(requireDb());
  batch.update(sessionRef(sessionId), { viewerId: null, viewerSeen: null });
  batch.delete(locationRef(sessionId));
  await batch.commit();
}

export async function leaveSession(sessionId: string): Promise<void> {
  await updateDoc(sessionRef(sessionId), { viewerId: null });
}

export async function endSession(sessionId: string): Promise<void> {
  const batch = writeBatch(requireDb());
  batch.update(sessionRef(sessionId), { endedAt: serverTimestamp(), sharing: false });
  batch.delete(locationRef(sessionId));
  await batch.commit();
}

export async function publishLocation(sessionId: string, fix: LocationFix): Promise<void> {
  let expiresAt = sessionExpiry.get(sessionId);
  if (!expiresAt) {
    await getSession(sessionId);
    expiresAt = sessionExpiry.get(sessionId);
  }
  if (!expiresAt) throw new Error('No se pudo enviar la ubicación');

  await setDoc(locationRef(sessionId), {
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracy: fix.accuracy,
    altitude: fix.altitude,
    altitudeAccuracy: fix.altitudeAccuracy,
    capturedAt: Timestamp.fromDate(fix.capturedAt),
    updatedAt: serverTimestamp(),
    expiresAt,
  });
}

export async function getLastLocation(sessionId: string): Promise<LocationFix | null> {
  try {
    const snap = await getDoc(locationRef(sessionId));
    return snap.exists() ? toFix(snap.data()) : null;
  } catch (err) {
    if ((err as { code?: string }).code === 'permission-denied') return null;
    throw err;
  }
}

export interface SessionChannelHandlers {
  onLocation: (fix: LocationFix | null) => void;
  /** `null` cuando la sesión ya no existe o se perdió el acceso. */
  onSession: (session: TrackingSession | null) => void;
  onPeerPresence: (online: boolean) => void;
  onStatus: (connected: boolean) => void;
}

/**
 * Escucha en vivo una sesión: su estado, la ubicación (solo el visor, y solo mientras se comparte)
 * y la presencia de la otra persona mediante latidos periódicos.
 */
export function subscribeToSession(
  sessionId: string,
  userId: string,
  handlers: SessionChannelHandlers,
): () => void {
  let stopped = false;
  let unsubLocation: Unsubscribe | null = null;
  let last: DocumentData | null = null;

  const stopLocation = () => {
    if (unsubLocation) {
      unsubLocation();
      unsubLocation = null;
      handlers.onLocation(null);
    }
  };

  const peerOnline = () => {
    if (!last) return false;
    const seen = millis(last.ownerId === userId ? last.viewerSeen : last.ownerSeen);
    return seen !== null && Date.now() - seen <= PEER_ONLINE_WITHIN_MS;
  };

  const isLive = () =>
    Boolean(last && !last.endedAt && (last.expiresAt as Timestamp).toMillis() > Date.now());

  const beat = () => {
    if (stopped || !last || !isLive() || document.visibilityState !== 'visible') return;
    const field = last.ownerId === userId ? 'ownerSeen' : last.viewerId === userId ? 'viewerSeen' : null;
    if (field) void updateDoc(sessionRef(sessionId), { [field]: serverTimestamp() }).catch(() => undefined);
  };

  const unsubSession = onSnapshot(
    sessionRef(sessionId),
    { includeMetadataChanges: true },
    (snap) => {
      handlers.onStatus(!snap.metadata.fromCache);
      if (!snap.exists()) {
        last = null;
        stopLocation();
        handlers.onSession(null);
        return;
      }
      const firstSnapshot = last === null;
      last = snap.data({ serverTimestamps: 'estimate' });
      handlers.onSession(toSession(snap.id, last));
      handlers.onPeerPresence(peerOnline());
      if (firstSnapshot) beat();

      // El visor solo escucha la ubicación mientras el dueño comparte: las reglas no la dejan leer si no.
      const wantLocation = last.viewerId === userId && last.sharing === true && isLive();
      if (wantLocation && !unsubLocation) {
        unsubLocation = onSnapshot(
          locationRef(sessionId),
          (locSnap) => handlers.onLocation(locSnap.exists() ? toFix(locSnap.data()) : null),
          () => handlers.onLocation(null),
        );
      } else if (!wantLocation) {
        stopLocation();
      }
    },
    (error) => {
      if ((error as { code?: string }).code === 'permission-denied') {
        last = null;
        stopLocation();
        handlers.onSession(null);
      } else {
        handlers.onStatus(false);
      }
    },
  );

  const heartbeat = window.setInterval(beat, HEARTBEAT_MS);
  const presenceTick = window.setInterval(() => handlers.onPeerPresence(peerOnline()), 10_000);

  return () => {
    stopped = true;
    window.clearInterval(heartbeat);
    window.clearInterval(presenceTick);
    unsubSession();
    if (unsubLocation) unsubLocation();
    unsubLocation = null;
    // Mejor esfuerzo: marcar como desconectado al salir de la pantalla.
    if (last && isLive()) {
      const field = last.ownerId === userId ? 'ownerSeen' : last.viewerId === userId ? 'viewerSeen' : null;
      if (field) void updateDoc(sessionRef(sessionId), { [field]: null }).catch(() => undefined);
    }
  };
}
