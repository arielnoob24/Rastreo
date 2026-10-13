---
name: geolocalizacion-y-privacidad
description: Uso de watchPosition()/clearWatch(), HTTPS, permisos, campos opcionales (altitud, precisión), caducidad de datos, consentimiento y parada explícita. Úsala al tocar la captura o publicación de ubicación.
---

# Geolocalización y privacidad

## API

- `navigator.geolocation.watchPosition(ok, err, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 })`.
- Guardar el id devuelto y llamar a `clearWatch(id)` al **Detener**, al desmontar y al terminar la sesión.
- Requiere contexto seguro: HTTPS o `localhost`. Comprobar `window.isSecureContext` y que exista `navigator.geolocation`.
- Errores: `PERMISSION_DENIED` (1), `POSITION_UNAVAILABLE` (2), `TIMEOUT` (3). Cada uno con un mensaje claro; con permiso denegado, explicar cómo reactivarlo en el navegador.

## Campos

- `latitude`, `longitude` y `accuracy` (metros): siempre presentes.
- `altitude`, `altitudeAccuracy`, `heading` y `speed`: pueden ser `null`. Mostrar “No disponible”; nunca inventarlos ni presentarlos como exactos.
- Recordar: **longitud ≠ altitud**.

## Publicación

- Limitar envíos: publicar si pasaron 5 s o más, o si el desplazamiento supera ~10 m (`shouldPublish` en `src/lib/geo.ts`).
- Considerar obsoleta una ubicación sin actualizar durante más de 60 s (`isStale`).

## Privacidad

- Recopilar solo lo necesario: coordenadas, precisión, altitud opcional y hora.
- Explicar en pantalla quién ve la posición, cuándo se comparte y cómo detenerlo.
- Al **Detener**: `clearWatch` y borrar la última ubicación del servidor.
- Al terminar o expirar la sesión se borran sesión, invitaciones y ubicación (en cascada).
- Nada de rastreo encubierto: el estado “Compartiendo” debe estar siempre visible para quien comparte.
