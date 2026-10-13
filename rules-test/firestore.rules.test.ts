import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const SID = 'sesion1';
const HASH = 'a'.repeat(64);
const OWNER = 'owner';
const VIEWER = 'viewer';
const STRANGER = 'stranger';

let env: RulesTestEnvironment;

const inHours = (h: number) => Timestamp.fromMillis(Date.now() + h * 3_600_000);

const baseSession = (over: Record<string, unknown> = {}) => ({
  ownerId: OWNER,
  viewerId: null,
  sharing: false,
  createdAt: Timestamp.now(),
  expiresAt: inHours(4),
  endedAt: null,
  inviteHash: null,
  ownerSeen: null,
  viewerSeen: null,
  ...over,
});

const location = (expiresAt: Timestamp, over: Record<string, unknown> = {}) => ({
  latitude: 10,
  longitude: 20,
  accuracy: 8,
  altitude: null,
  altitudeAccuracy: null,
  capturedAt: Timestamp.now(),
  updatedAt: serverTimestamp(),
  expiresAt,
  ...over,
});

async function seed(session = baseSession(), invitation: Record<string, unknown> | null = null) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'sessions', SID), session);
    if (invitation) await setDoc(doc(db, 'invitations', HASH), invitation);
  });
}

const validInvitation = (over: Record<string, unknown> = {}) => ({
  sessionId: SID,
  ownerId: OWNER,
  createdAt: Timestamp.now(),
  expiresAt: inHours(1),
  usedAt: null,
  usedBy: null,
  ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rastreo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(() => env.cleanup());
const contexts = new Map<string, ReturnType<RulesTestEnvironment['authenticatedContext']>>();
beforeEach(async () => {
  contexts.clear();
  await env.clearFirestore();
});

// Un solo contexto por usuario y prueba: las referencias deben pertenecer a la misma instancia.
const as = (uid: string) => {
  if (!contexts.has(uid)) contexts.set(uid, env.authenticatedContext(uid));
  return contexts.get(uid)!.firestore();
};

describe('sesiones', () => {
  it('cualquiera autenticado crea su propia sesión, pero no a nombre de otro', async () => {
    await assertSucceeds(
      setDoc(doc(as(OWNER), 'sessions', SID), { ...baseSession(), createdAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(as(STRANGER), 'sessions', 'otra'), { ...baseSession(), createdAt: serverTimestamp() }),
    );
  });

  it('rechaza sesiones de más de 24 h y usuarios sin autenticar', async () => {
    await assertFails(
      setDoc(doc(as(OWNER), 'sessions', SID), { ...baseSession({ expiresAt: inHours(30) }), createdAt: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(env.unauthenticatedContext().firestore(), 'sessions', SID), {
        ...baseSession(),
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('un ajeno no puede leerla; el dueño sí', async () => {
    await seed();
    await assertFails(getDoc(doc(as(STRANGER), 'sessions', SID)));
    await assertSucceeds(getDoc(doc(as(OWNER), 'sessions', SID)));
  });

  it('el dueño inicia y detiene; un ajeno no puede cambiar sharing', async () => {
    await seed();
    await assertSucceeds(updateDoc(doc(as(OWNER), 'sessions', SID), { sharing: true }));
    await assertFails(updateDoc(doc(as(STRANGER), 'sessions', SID), { sharing: true }));
  });

  it('el dueño no puede cambiar ownerId ni expiresAt', async () => {
    await seed();
    await assertFails(updateDoc(doc(as(OWNER), 'sessions', SID), { ownerId: STRANGER }));
    await assertFails(updateDoc(doc(as(OWNER), 'sessions', SID), { expiresAt: inHours(20) }));
  });

  it('una sesión terminada o vencida no admite cambios', async () => {
    await seed(baseSession({ endedAt: Timestamp.now() }));
    await assertFails(updateDoc(doc(as(OWNER), 'sessions', SID), { sharing: true }));
  });

  it('el visor puede salir, pero no tocar otros campos', async () => {
    await seed(baseSession({ viewerId: VIEWER }));
    await assertFails(updateDoc(doc(as(VIEWER), 'sessions', SID), { sharing: true }));
    await assertSucceeds(updateDoc(doc(as(VIEWER), 'sessions', SID), { viewerId: null }));
  });
});

describe('invitaciones', () => {
  it('solo el dueño de una sesión libre la crea, y no se puede listar', async () => {
    await seed();
    const ok = writeBatch(as(OWNER));
    ok.set(doc(as(OWNER), 'invitations', HASH), { ...validInvitation(), createdAt: serverTimestamp() });
    await assertSucceeds(ok.commit());

    const bad = writeBatch(as(STRANGER));
    bad.set(doc(as(STRANGER), 'invitations', 'b'.repeat(64)), {
      ...validInvitation({ ownerId: STRANGER }),
      createdAt: serverTimestamp(),
    });
    await assertFails(bad.commit());
  });

  it('rechaza IDs que no son un hash', async () => {
    await seed();
    await assertFails(
      setDoc(doc(as(OWNER), 'invitations', 'ABCDEFGHJKLM'), { ...validInvitation(), createdAt: serverTimestamp() }),
    );
  });

  it('la persona invitada se une aceptando la invitación en un lote', async () => {
    await seed(baseSession({ inviteHash: HASH }), validInvitation());
    const batch = writeBatch(as(VIEWER));
    batch.update(doc(as(VIEWER), 'invitations', HASH), { usedAt: serverTimestamp(), usedBy: VIEWER });
    batch.update(doc(as(VIEWER), 'sessions', SID), { viewerId: VIEWER });
    await assertSucceeds(batch.commit());
  });

  it('no se puede unir sin marcar la invitación como usada', async () => {
    await seed(baseSession({ inviteHash: HASH }), validInvitation());
    await assertFails(updateDoc(doc(as(VIEWER), 'sessions', SID), { viewerId: VIEWER }));
  });

  it('una invitación usada, vencida o reemplazada no sirve', async () => {
    const attempt = async () => {
      const batch = writeBatch(as(VIEWER));
      batch.update(doc(as(VIEWER), 'invitations', HASH), { usedAt: serverTimestamp(), usedBy: VIEWER });
      batch.update(doc(as(VIEWER), 'sessions', SID), { viewerId: VIEWER });
      return batch.commit();
    };

    await seed(baseSession({ inviteHash: HASH }), validInvitation({ usedAt: Timestamp.now(), usedBy: STRANGER }));
    await assertFails(attempt());

    await env.clearFirestore();
    await seed(baseSession({ inviteHash: HASH }), validInvitation({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
    await assertFails(attempt());

    await env.clearFirestore();
    await seed(baseSession({ inviteHash: 'c'.repeat(64) }), validInvitation());
    await assertFails(attempt());
  });

  it('el dueño no puede aceptar su propia invitación', async () => {
    await seed(baseSession({ inviteHash: HASH }), validInvitation());
    const batch = writeBatch(as(OWNER));
    batch.update(doc(as(OWNER), 'invitations', HASH), { usedAt: serverTimestamp(), usedBy: OWNER });
    batch.update(doc(as(OWNER), 'sessions', SID), { viewerId: OWNER });
    await assertFails(batch.commit());
  });
});

describe('ubicaciones', () => {
  const expires = inHours(4);

  it('el dueño publica solo si pulsó Iniciar', async () => {
    await seed(baseSession({ expiresAt: expires }));
    await assertFails(setDoc(doc(as(OWNER), 'locations', SID), location(expires)));

    await seed(baseSession({ expiresAt: expires, sharing: true }));
    await assertSucceeds(setDoc(doc(as(OWNER), 'locations', SID), location(expires)));
  });

  it('rechaza coordenadas fuera de rango o campos extra', async () => {
    await seed(baseSession({ expiresAt: expires, sharing: true }));
    await assertFails(setDoc(doc(as(OWNER), 'locations', SID), location(expires, { latitude: 120 })));
    await assertFails(setDoc(doc(as(OWNER), 'locations', SID), location(expires, { extra: 'x' })));
  });

  it('el visor y el dueño leen mientras se comparte; un ajeno nunca', async () => {
    await seed(baseSession({ expiresAt: expires, sharing: true, viewerId: VIEWER }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'locations', SID), location(expires, { updatedAt: Timestamp.now() }));
    });
    await assertSucceeds(getDoc(doc(as(VIEWER), 'locations', SID)));
    await assertSucceeds(getDoc(doc(as(OWNER), 'locations', SID)));
    await assertFails(getDoc(doc(as(STRANGER), 'locations', SID)));
  });

  it('al dejar de compartir nadie puede leer la última ubicación', async () => {
    await seed(baseSession({ expiresAt: expires, sharing: false, viewerId: VIEWER }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'locations', SID), location(expires, { updatedAt: Timestamp.now() }));
    });
    await assertFails(getDoc(doc(as(VIEWER), 'locations', SID)));
  });

  it('el visor no puede publicar ni borrar la ubicación', async () => {
    await seed(baseSession({ expiresAt: expires, sharing: true, viewerId: VIEWER }));
    await assertFails(setDoc(doc(as(VIEWER), 'locations', SID), location(expires)));
  });

  it('una sesión vencida deja de ser legible', async () => {
    const past = Timestamp.fromMillis(Date.now() - 60_000);
    await seed(baseSession({ expiresAt: past, sharing: true, viewerId: VIEWER }));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'locations', SID), location(past, { updatedAt: Timestamp.now() }));
    });
    await assertFails(getDoc(doc(as(VIEWER), 'locations', SID)));
  });
});
