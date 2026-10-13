---
name: firebase-firestore-y-reglas
description: Modelo de datos en Firestore para compartir con varias personas (users, shares, invitations, locations), consultas array-contains, listeners en tiempo real, reglas por observador, presencia y límites del plan gratuito. Úsala al tocar firestore.rules, shared/api/ o shared/lib/firebase.ts.
---

# Firebase: Firestore, Auth anónima y reglas

`plan.md` (sección **Datos en Firebase**) define el modelo objetivo. Hoy está implementado el modelo de dos personas (`sessions`); al migrar, reemplázalo por el de esta skill y actualiza `rules-test/`.

## Modelo objetivo

- `users/{uid}`: `name` (1 a 30 caracteres), `createdAt`.
- `shares/{uid}`: una por persona que comparte. `ownerId == uid`, `ownerName`, `sharing`, `expiresAt` (opcional, `null` = hasta detener), `viewerIds` (lista, máx. 10), `viewers` (mapa `uid → { name, joinedAt }`).
- `shares/{uid}/presence/{viewerId}`: `lastSeen`. Va separado para que el latido de un observador no genere lecturas en todos los demás.
- `invitations/{sha256(código)}`: `ownerId`, `ownerName`, `createdAt`, `expiresAt`, `usedAt`, `usedBy`. El código en claro nunca se guarda.
- `locations/{uid}`: solo la **última** posición: `latitude`, `longitude`, `accuracy`, `altitude`, `altitudeAccuracy`, `capturedAt`, `updatedAt`, `battery` (opcional).

## Consultas

- Monitoreo: `query(collection(db, 'shares'), where('viewerIds', 'array-contains', uid))`. La regla de `list` debe exigir exactamente esa condición (`request.auth.uid in resource.data.viewerIds`).
- Luego, un listener `onSnapshot` de `locations/{ownerId}` por cada compartición con `sharing == true`. Abrir y cerrar listeners según cambie la lista; nunca duplicarlos.
- Quien comparte: `onSnapshot` de su propio `shares/{uid}` y de `presence`.

## Reglas

- Todo denegado por defecto. Validar claves permitidas (`keys().hasOnly`), tipos, rangos y tamaños.
- `shares/{uid}`: lee el dueño y quien esté en `viewerIds`. El dueño cambia `sharing`, `expiresAt` y puede **quitar** observadores. Un observador solo puede quitarse a sí mismo.
- Unirse = **lote** que marca la invitación como usada y añade exactamente el `uid` de quien acepta a `viewerIds` y a `viewers`. Las reglas usan `get`/`getAfter` para exigir ambas escrituras, comprueban que la invitación no esté usada ni vencida y que `viewerIds.size() <= 10`.
- Invitaciones: solo `get` por ID (sin `list`); solo el dueño las crea; una por persona invitada.
- `locations/{uid}`: lee el dueño y los observadores, solo con `sharing == true` y sin vencer. Solo el dueño escribe, solo con `sharing == true`.
- **Detener** = lote que pone `sharing: false` y borra `locations/{uid}`.
- Cada regla nueva lleva su caso en `rules-test/` y debe pasar `npm run test:rules`.

## Límites del plan gratuito (Spark)

- 50 000 lecturas y 20 000 escrituras al día. Cada ubicación enviada cuesta 1 escritura y 1 lectura por cada observador conectado.
- Mantener el límite de envío (5 s o 10 m) y espaciar los latidos de presencia (60 s).
- Sin facturación no hay TTL ni Cloud Functions: las reglas deben comprobar el vencimiento para que lo vencido sea ilegible.

## Secretos y configuración

- Las claves `VITE_FIREBASE_*` son públicas por diseño; la protección real son las reglas y la autenticación.
- Nunca incluir credenciales de cuentas de servicio en el repositorio.
- Autenticación anónima: una cuenta por navegador o app. Para probar con varias personas en un mismo equipo, usar perfiles, ventanas de incógnito o contextos de Playwright distintos.
