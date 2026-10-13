---
name: capacitor-segundo-plano
description: Empaquetar la app con Capacitor y enviar la ubicación con la pantalla bloqueada o en segundo plano (Android primero; iOS opcional). Úsala al tocar capacitor.config.ts, android/, ios/ o la fuente de ubicación nativa.
---

# Capacitor y ubicación en segundo plano

## Por qué

Un navegador suspende la página al bloquear la pantalla o cambiar de app. Para que quien comparte siga enviando su ubicación, la app se empaqueta con **Capacitor** y usa un plugin nativo de ubicación en segundo plano. La pantalla de monitoreo sigue funcionando en el navegador.

## Configuración

- Dependencias: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, y el plugin `@capacitor-community/background-geolocation`.
- Solo se empaqueta la **app de ubicación** (`apps/compartir`); la de monitoreo sigue siendo web.
- `capacitor.config.ts`: `appId` (por ejemplo `com.rastreo.compartir`), `appName: 'Rastreo · Compartir'`, `webDir: 'dist/compartir'`.
- La build para la app nativa usa base `/` (no `/Rastreo/compartir/` de GitHub Pages); las rutas ya usan `HashRouter`. El enlace de invitación debe apuntar a la URL pública de la app de monitoreo (`__MONITOREO_URL__` absoluto).
- Flujo: build de la app de ubicación → `npx cap sync android` → abrir en Android Studio o `./gradlew assembleDebug` para el APK.
- El service worker de la PWA no es necesario dentro de la app; no registrarlo cuando `Capacitor.isNativePlatform()` es verdadero.

## Uso del plugin

- Detectar la plataforma con `Capacitor.isNativePlatform()` y elegir la implementación; el resto del código usa la misma interfaz que `useGeolocationWatch` (`start`, `stop`, `status`, `fix`).
- `addWatcher({ backgroundTitle, backgroundMessage, requestPermissions: true, stale: false, distanceFilter: 10 })` al pulsar **Iniciar**; guardar el id y llamar a `removeWatcher({ id })` al **Detener**.
- Convertir cada posición del plugin al mismo `LocationFix` (latitud, longitud, precisión, altitud, hora); `altitude` puede faltar.
- Mientras el watcher está activo, la WebView sigue ejecutándose y el SDK de Firestore puede escribir. Aplicar el mismo límite de envío (`shouldPublish`).
- Errores: `NOT_AUTHORIZED` → explicar cómo dar el permiso en Ajustes y ofrecer `openSettings()`.

## Android

- Permisos en `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` (Android 13+).
- Servicio en primer plano con notificación fija “Compartiendo ubicación con N personas”: es obligatorio y además es la señal visible de consentimiento.
- Pedir el permiso en dos pasos: primero “mientras se usa la app” y luego, explicando por qué, “permitir todo el tiempo”.
- Sugerir quitar la optimización de batería para la app; algunos fabricantes (Xiaomi, Huawei, Samsung) cierran apps en segundo plano de forma agresiva.
- Distribución académica: APK de depuración o firmado, instalado directamente. Google Play exige justificar la ubicación en segundo plano.

## iOS (solo si se aprueba)

- Requiere Mac con Xcode y cuenta de Apple Developer (99 USD/año) para usarla más de 7 días.
- `Info.plist`: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription` y `UIBackgroundModes` con `location`.

## Privacidad

- El envío en segundo plano solo empieza tras pulsar **Iniciar** y siempre con la notificación visible.
- Si la app se cierra a la fuerza o el celular se apaga, el envío se detiene: informarlo en la pantalla de compartir y a quien monitorea (ubicación desactualizada).
