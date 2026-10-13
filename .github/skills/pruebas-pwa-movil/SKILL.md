---
name: pruebas-pwa-movil
description: Matriz de navegadores y dispositivos, simulación de permisos y desconexiones, pruebas de instalación, actualización, pantalla bloqueada y verificación responsive. Úsala al escribir o ejecutar pruebas.
---

# Pruebas de PWA móvil

## Niveles

- **Unitarias (Vitest + Testing Library)**: reglas puras de `src/lib/geo.ts` y componentes de estado (`LocationPanel`, `StatusBanner`). Ejecutar con `npm test`.
- **E2E (Playwright)**: `npm run test:e2e`. Proyectos de escritorio (Chromium) y móvil (Pixel 7 emulado).
- **Reglas de Firestore**: `npm run test:rules` (emulador; requiere Java 21+).
- **Flujo de dos personas**: `npm run test:flow` (emuladores de Auth y Firestore, dos contextos de navegador).

## Simulación

- Permisos: `context.grantPermissions(['geolocation'])` y `context.setGeolocation({ latitude, longitude, accuracy })`; probar también sin concederlos.
- Desconexión: `context.setOffline(true)` y verificar el aviso “Sin conexión”.
- Usar coordenadas ficticias, nunca ubicaciones reales.

## Matriz manual mínima

| Dispositivo | Navegador | Casos |
|---|---|---|
| Android de la pareja | Chrome | Instalar la PWA, iniciar/detener, permiso denegado, pantalla bloqueada 1 y 5 min |
| iPhone de la pareja | Safari | Añadir a inicio, iniciar/detener, permiso denegado, segundo plano |
| Computadora | Chrome / Firefox / Edge | Ver la sesión, ubicación obsoleta, recarga, sin red |

Registrar los resultados en `docs/pruebas-dispositivos.md`, incluido el comportamiento real en segundo plano.

## Verificaciones de aceptación

- Solo se puede unir con invitación; un código usado o vencido falla.
- El visor recibe cambios sin recargar.
- Se distingue la ubicación actual de la obsoleta; aparece “No disponible” si faltan altitud o precisión.
- Al Detener no llegan más actualizaciones; un tercero no puede leer la sesión.
- Responsive en 360×640, 768×1024 y 1440×900.
- Sin red, la interfaz carga desde caché y avisa que no hay conexión.
