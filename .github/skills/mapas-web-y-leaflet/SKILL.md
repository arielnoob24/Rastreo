---
name: mapas-web-y-leaflet
description: Mapas con React Leaflet para una o varias personas - marcadores con nombre y color, recorridos, círculo de precisión, selección, encuadre de todos, teselas y atribución. Úsala al tocar src/components/ de mapas.
---

# Mapas web con Leaflet

## Inicialización

- Importar `leaflet/dist/leaflet.css` una sola vez (en `src/main.tsx`).
- El contenedor del mapa necesita una altura explícita en CSS; si no, no se ve.
- Los iconos por defecto de Leaflet fallan con bundlers: usar `L.divIcon` propio.

## Varias personas (pantalla de monitoreo)

- Un marcador por persona, con su **inicial o nombre** y un **color** estable derivado de su `uid` (misma persona, mismo color siempre). Paleta de hasta 10 colores distinguibles en modo claro y oscuro.
- El color no puede ser la única señal: mostrar el nombre en la etiqueta del marcador o al lado.
- Marcador atenuado (gris o semitransparente) si la ubicación está desactualizada; sin marcador si la persona no está compartiendo.
- Al seleccionar a alguien en la lista: centrar en su marcador y resaltarlo. Botón **Ver a todos**: `map.fitBounds()` con todos los marcadores visibles y un margen.
- Usar una `key` estable por persona para que React actualice los marcadores en lugar de recrearlos.

## Actualización

- No recrear `MapContainer` en cada posición: actualizar `Marker`, `Circle` y `Polyline` con props nuevas.
- Seguir automáticamente a la persona seleccionada solo mientras el seguimiento esté activo; si se arrastra el mapa, desactivarlo y ofrecer **Centrar**.
- El radio del `Circle` es `accuracy` en metros. Si falta, no dibujar círculo.

## Recorrido

- El recorrido se mantiene **solo en memoria** en el cliente (máximo ~500 puntos por persona) y se descarta al dejar de compartir. No se guarda historial en la base de datos salvo que el plan lo apruebe.

## Pantalla de compartir

- Mapa pequeño con la posición propia; no ocupar el espacio de los controles **Iniciar/Detener**.

## Teselas y atribución

- URL y atribución configurables con `VITE_TILE_URL` y `VITE_TILE_ATTRIBUTION`.
- Por defecto OpenStreetMap: apto solo para bajo volumen y sujeto a su [política de uso](https://operations.osmfoundation.org/policies/tiles/). Para más tráfico usar un proveedor comercial.
- La atribución debe estar siempre visible; no ocultar el control de atribución.
