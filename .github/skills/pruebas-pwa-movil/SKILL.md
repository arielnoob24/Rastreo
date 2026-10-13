---
name: pruebas-pwa-movil
description: Niveles de prueba, matriz de dispositivos, envío en segundo plano con pantalla bloqueada, varias personas compartiendo y monitoreando, permisos, desconexiones y verificación responsive. Úsala al escribir o ejecutar pruebas.
---

# Pruebas de la app web y móvil

## Niveles

- **Unitarias (Vitest + Testing Library)**: reglas puras de `shared/lib/` y componentes de estado. `npm test`.
- **Reglas de Firestore**: `npm run test:rules` (emulador; requiere Java 21+). Cubrir: máximo de 10 observadores, unirse solo con invitación, quitar observador, observador que se quita a sí mismo, lectura denegada a no invitados.
- **Flujo entre las dos apps**: `npm run test:flow` (emuladores de Auth y Firestore; app de ubicación en el puerto 5173 y de monitoreo en el 5174). Usar un contexto de Playwright por persona: 1 que comparte con 3 observadores y 1 observador que sigue a 3 personas.
- **E2E del build**: `npm run test:e2e` sobre la portada y las dos apps, en escritorio (Chromium) y móvil (Pixel 7).
- **App Android**: pruebas manuales con el APK en celulares reales (el segundo plano no se puede simular en el navegador).

## Simulación en navegador

- Permisos: `context.grantPermissions(['geolocation'])` y `context.setGeolocation({ latitude, longitude, accuracy })`; probar también sin conceder.
- Desconexión: `context.setOffline(true)` y verificar “Sin conexión” y la reconexión sin listeners duplicados.
- Usar coordenadas ficticias, nunca ubicaciones reales.

## Matriz manual mínima

| Dispositivo | Cómo | Casos |
|---|---|---|
| Android de quien comparte | APK instalado | Iniciar/Detener, permiso “todo el tiempo” y “solo mientras se usa”, notificaciones denegadas, pantalla bloqueada 1, 5 y 30 min, app en segundo plano, cierre forzado, ahorro de batería |
| iPhone (si se aprueba) | App desde Xcode | Iniciar/Detener, permiso “Siempre”, pantalla bloqueada |
| Computadora | Chrome / Firefox / Edge | Monitorear a varias personas, ubicación obsoleta, Ver a todos, recarga, sin red |
| Celular de quien monitorea | Navegador | Monitorear, lista y mapa en pantalla pequeña |

Registrar en `docs/pruebas-dispositivos.md` modelo, fabricante, versión del sistema y comportamiento real observado.

## Verificaciones de aceptación

- Hasta 10 observadores por persona; el 11.º falla. Cada uno solo con su propia invitación; una invitación usada o vencida falla.
- Quitar a un observador lo deja sin acceso de inmediato.
- El observador ve a todas las personas que sigue, distinguibles por nombre y color, y recibe los cambios sin recargar.
- Con el APK en Android, la ubicación sigue actualizándose 30 minutos con la pantalla bloqueada y la notificación visible.
- Se distingue ubicación actual de obsoleta; “No disponible” si faltan altitud o precisión.
- Al Detener no llegan más actualizaciones; un no invitado no puede leer nada.
- Responsive en 360×640, 768×1024 y 1440×900.
- Consumo de Firestore de una prueba larga anotado y comparado con el plan gratuito.
