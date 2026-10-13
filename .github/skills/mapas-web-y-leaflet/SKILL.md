---
name: mapas-web-y-leaflet
description: Inicialización y actualización del marcador con React Leaflet, trazado del recorrido, círculo de precisión, proveedor de teselas y atribución. Úsala al tocar src/components/MapView.tsx.
---

# Mapas web con Leaflet

## Inicialización

- Importar `leaflet/dist/leaflet.css` una sola vez (en `src/main.tsx`).
- El contenedor del mapa necesita una altura explícita en CSS; si no, no se ve.
- Los iconos por defecto de Leaflet fallan con bundlers: usar un `L.divIcon` propio.

## Actualización

- No recrear `MapContainer` en cada posición: actualizar `Marker`, `Circle` y `Polyline` con props nuevas.
- Recentrar con `map.panTo()` solo mientras el seguimiento automático esté activo; si la persona arrastra el mapa, desactivarlo y ofrecer un botón “Centrar”.
- El radio del `Circle` es `accuracy` en metros. Si falta, no dibujar círculo.

## Recorrido

- El recorrido de la sesión se mantiene **solo en memoria** en el cliente (máximo ~500 puntos) y se descarta al terminar. No se guarda historial en la base de datos.

## Teselas y atribución

- URL y atribución configurables con `VITE_TILE_URL` y `VITE_TILE_ATTRIBUTION`.
- Por defecto OpenStreetMap: apto solo para bajo volumen y sujeto a su [política de uso](https://operations.osmfoundation.org/policies/tiles/). Para más tráfico usar un proveedor comercial.
- La atribución debe estar siempre visible; no ocultar el control de atribución.
