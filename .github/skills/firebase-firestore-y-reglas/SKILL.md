---
name: firebase-firestore-y-reglas
description: Modelo de datos en Firestore (sesiones, invitaciones, última ubicación), listeners en tiempo real, reglas de seguridad por integrante, secretos y expiración con TTL. Úsala al tocar firestore.rules, src/api/ o src/lib/firebase.ts.
---

# Firebase: Firestore, Auth anónima y reglas

## Modelo (`firestore.rules` es la fuente de verdad)

- `sessions/{sid}`: `ownerId`, `viewerId`, `sharing`, `createdAt`, `expiresAt`, `endedAt`, `inviteHash`, `ownerSeen`, `viewerSeen`.
- `invitations/{sha256(código)}`: `sessionId`, `ownerId`, `expiresAt`, `usedAt`, `usedBy`. El ID es el hash; el código en claro nunca se guarda.
- `locations/{sid}`: solo la **última** posición (`latitude`, `longitude`, `accuracy`, `altitude`, `altitudeAccuracy`, `capturedAt`, `updatedAt`, `expiresAt`).

## Reglas

- Todo denegado por defecto. Cada colección valida claves permitidas (`keys().hasOnly`), tipos y rangos.
- Unirse = un **lote** que marca la invitación como usada y asigna `viewerId`. Las reglas usan `get`/`getAfter` para exigir ambas escrituras a la vez; una invitación solo sirve si es la `inviteHash` actual de la sesión, no está usada y no venció.
- Las invitaciones se leen solo por `get` (no hay `list`): hay que conocer el código.
- La ubicación solo es legible para integrantes, con la sesión vigente y `sharing == true`. Solo el dueño la escribe, y solo con `sharing == true`.
- Detener o terminar = lote que actualiza la sesión y **borra** `locations/{sid}`.
- Tras cambiar `firestore.rules`, ejecutar `npm run test:rules` y añadir un caso por cada regla nueva.

## Tiempo real

- `onSnapshot` en la sesión; el visor solo escucha `locations/{sid}` mientras `sharing` es verdadero (las reglas la deniegan si no).
- Estado de conexión: `snapshot.metadata.fromCache`.
- Presencia: latidos `ownerSeen`/`viewerSeen` cada 20 s; "conectado" = latido de menos de 60 s.
- Cancelar los listeners en el cleanup del efecto para evitar duplicados.

## Secretos y configuración

- Las claves `VITE_FIREBASE_*` son públicas por diseño; la protección real son las reglas y la autenticación.
- Nunca incluir credenciales de cuentas de servicio en el repositorio.
- Autenticación anónima: una cuenta por navegador. Para probar con dos personas en un mismo equipo, usar perfiles o ventanas de incógnito distintas.

## Expiración

- Las políticas TTL sobre `expiresAt` requieren facturación (Blaze); el proyecto actual no la tiene, así que `firestore.indexes.json` no las declara.
- El TTL borra con retraso (puede tardar horas): las reglas ya comprueban `expiresAt > request.time`, así que un dato vencido no es legible.
- Sin Cloud Functions no hay borrado en el servidor si el teléfono desaparece sin pulsar Detener: la ubicación queda ilegible (`sharing` sigue verdadero pero la sesión vence) hasta el TTL. Documentarlo.
