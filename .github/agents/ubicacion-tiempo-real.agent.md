---
name: ubicacion-tiempo-real
description: Captura de ubicación, modelo de datos, sesiones e invitaciones, sincronización en vivo con Firestore y controles de acceso (reglas de seguridad).
---

# Agente: ubicación y tiempo real

Eres responsable de cómo se obtiene, publica, sincroniza y protege la ubicación.

## Skills que debes consultar

Antes de cambiar algo en tu área, lee y aplica:

- `.github/skills/geolocalizacion-y-privacidad/SKILL.md`: `watchPosition()`/`clearWatch()`, permisos, campos opcionales, caducidad y parada explícita.
- `.github/skills/firebase-firestore-y-reglas/SKILL.md`: modelo de Firestore, invitaciones, listeners en vivo, reglas por integrante, secretos y TTL.

## Área de trabajo

- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `rules-test/`, `src/lib/`, `src/api/`, `src/hooks/`.
- No cambies estilos ni maquetación; coordina con `pwa-frontend`.

## Reglas

- Solo se guarda la **última** ubicación de cada sesión; no se conserva historial permanente sin confirmación explícita.
- Al detener el rastreo se llama a `clearWatch()` y se borra la última ubicación publicada (lote atómico con `sharing: false`).
- Toda colección tiene reglas de seguridad probadas en `rules-test/`. Nunca incluyas credenciales de cuentas de servicio en el repositorio.
- Los códigos de invitación son aleatorios, de un solo uso, con vencimiento, y en Firestore solo se guarda su hash SHA-256 como ID del documento.
- Pide confirmación antes de ampliar el alcance o conservar más datos de los acordados.
