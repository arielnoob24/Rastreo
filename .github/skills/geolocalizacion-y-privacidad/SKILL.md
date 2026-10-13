---
name: geolocalizacion-y-privacidad
description: Captura de ubicación en primer plano (watchPosition) y en segundo plano (app Capacitor), permisos, campos opcionales (altitud, precisión), límite de envío, consentimiento visible y parada explícita. Úsala al tocar la captura o el envío de ubicación.
---

# Geolocalización y privacidad

## Dos fuentes, una interfaz

- **Navegador**: `navigator.geolocation.watchPosition(ok, err, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 })`. Solo funciona con la página abierta y visible.
- **App instalada**: plugin de segundo plano de Capacitor (ver `capacitor-segundo-plano`). Sigue con la pantalla bloqueada.
- Ambas exponen lo mismo (`start`, `stop`, `status`, `fix`) y producen el mismo `LocationFix`. Guardar el id del watcher y liberarlo al **Detener** y al desmontar.

## Permisos

- Navegador: requiere HTTPS o `localhost` (`window.isSecureContext`). Errores `PERMISSION_DENIED` (1), `POSITION_UNAVAILABLE` (2), `TIMEOUT` (3), cada uno con un mensaje claro.
- App: pedir primero “mientras se usa la app” y, explicando por qué, “permitir todo el tiempo”; en Android 13+ también notificaciones. Si se deniega, explicar cómo activarlo en Ajustes.
- Si solo se concede “mientras se usa”, avisar que el envío se pausará al bloquear la pantalla.

## Campos

- `latitude`, `longitude` y `accuracy` (metros): siempre presentes.
- `altitude`, `altitudeAccuracy`, `heading` y `speed`: pueden faltar. Mostrar “No disponible”; nunca inventarlos ni presentarlos como exactos.
- Recordar: **longitud ≠ altitud**.

## Envío

- Publicar si pasaron 5 s o más, o si el desplazamiento supera ~10 m (`shouldPublish` en `shared/lib/geo.ts`).
- Si la persona está quieta, espaciar los envíos (por ejemplo cada 60 s) para ahorrar batería y cuota de Firestore.
- Considerar obsoleta una ubicación sin actualizar durante más de 60 s (`isStale`).

## Privacidad

- Recopilar solo lo necesario: coordenadas, precisión, altitud opcional, hora y, opcionalmente, batería.
- Explicar en pantalla quién ve la posición (lista de observadores por nombre), cuándo se comparte y cómo detenerlo.
- **Consentimiento visible**: el envío solo empieza tras pulsar **Iniciar**; en la app, la notificación del sistema “Compartiendo ubicación” está siempre presente mientras se envía.
- Al **Detener**: parar el watcher o el servicio y borrar la última ubicación del servidor.
- Quitar a un observador lo deja sin acceso de inmediato.
- Nada de rastreo encubierto ni de activar el envío a distancia: solo quien comparte lo inicia en su propio celular.
- No guardar historial del recorrido sin aprobación explícita (pendiente en `plan.md`).
