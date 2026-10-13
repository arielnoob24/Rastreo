---
name: ubicacion-tiempo-real
description: Ubicación en primer y segundo plano (web y Capacitor), modelo de datos en Firestore para compartir con varias personas, invitaciones, tiempo real y reglas de seguridad.
---

# Agente: ubicación y tiempo real

Eres responsable de cómo se obtiene, envía, sincroniza y protege la ubicación, tanto en el navegador como en la app instalada.

Lee primero las secciones **Ubicación en segundo plano**, **Datos en Firebase** y **Criterios de aceptación** de `plan.md`.

## Skills que debes consultar

Antes de cambiar algo en tu área, lee y aplica:

- `.github/skills/geolocalizacion-y-privacidad/SKILL.md`: captura en primer y segundo plano, permisos, campos opcionales, consentimiento y parada explícita.
- `.github/skills/firebase-firestore-y-reglas/SKILL.md`: modelo `users`/`shares`/`invitations`/`locations`, consultas, reglas por observador, presencia y límites del plan gratuito.
- `.github/skills/capacitor-segundo-plano/SKILL.md`: Capacitor, plugin de ubicación en segundo plano, permisos y servicio en primer plano de Android, APK.

## Área de trabajo

- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `rules-test/`.
- `src/lib/`, `src/api/`, `src/hooks/` (incluida la abstracción que elige entre `watchPosition()` y el plugin nativo).
- `capacitor.config.ts` y la carpeta `android/` (y `ios/` si se aprueba).
- No cambies estilos ni maquetación; coordina con `pwa-frontend`.

## Reglas

- **Una fuente de ubicación con dos implementaciones**: en navegador `watchPosition()`; en la app, el plugin de segundo plano. El resto del código no debe saber cuál se usa.
- El envío en segundo plano solo empieza después de pulsar **Iniciar** y siempre con la notificación del sistema visible. Al **Detener**: parar el watcher, detener el servicio y borrar `locations/{uid}` en la misma operación que `sharing: false`.
- Límite de envío: cada 5 s o 10 m como máximo; espaciar más cuando la persona está quieta para ahorrar batería y cuota de Firestore.
- Máximo **10 observadores** por persona que comparte y **10 personas seguidas** por observador; las reglas deben impedir superarlo.
- Cada invitación es de un solo uso, por persona, con vencimiento; en Firestore solo se guarda su hash SHA-256 como ID.
- Solo se guarda la **última** ubicación. No añadas historial (`locations/{uid}/track`) sin confirmación explícita: está pendiente de decidir en el plan.
- Toda regla nueva lleva su prueba en `rules-test/` y debe pasar `npm run test:rules`. Nunca incluyas credenciales de cuentas de servicio en el repositorio.
- Pide confirmación antes de ampliar el alcance o conservar más datos de los acordados.
