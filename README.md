# Rastreo en pareja

PWA para que dos personas compartan una sesión de ubicación en vivo. Quien comparte pulsa **Iniciar** y **Detener** cuando quiere; la otra persona, unida por una invitación de un solo uso, ve en un mapa la posición, la precisión, la altitud (si existe) y la hora de la última actualización.

El plan completo está en [plan.md](plan.md).

**App publicada:** https://arielnoob24.github.io/Rastreo/ (se vuelve a publicar sola con cada `git push` a `main`, mediante `.github/workflows/pages.yml`).

Proyecto de Firebase: `rastreo-pareja-387e` ([consola](https://console.firebase.google.com/project/rastreo-pareja-387e/overview)). La configuración web está en las variables del repositorio (Settings → Secrets and variables → Actions → Variables) y en `.env.local` para desarrollo.

## Tecnologías

React + TypeScript + Vite, `vite-plugin-pwa`, Leaflet, **Firebase** (Auth anónima, Firestore, Hosting), Vitest, Testing Library y Playwright.

## Puesta en marcha rápida (sin nube, con emuladores)

Requiere Java 21 o superior (para el emulador de Firestore).

```bash
npm install
npm run emulators      # terminal 1: Auth + Firestore locales (UI en http://localhost:4000)
npm run dev:emu        # terminal 2: la app apuntando a los emuladores
```

Abre `http://localhost:5173`. Para simular dos personas usa dos perfiles del navegador o una ventana de incógnito (la cuenta anónima es una por perfil).

## Puesta en marcha con tu proyecto de Firebase

1. Crea el proyecto en https://console.firebase.google.com y activa **Authentication → Método de acceso → Anónimo**.
2. Crea **Firestore Database** (modo producción).
3. Agrega una **app web** y copia su configuración a `.env.local` (ver `.env.example`).
4. `npx firebase login` y `npx firebase use --add` para vincular el proyecto.
5. `npm run deploy` publica reglas, índices/TTL y la web en Firebase Hosting (HTTPS, necesario para la geolocalización en el celular).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo contra tu proyecto de Firebase |
| `npm run dev:emu` | Servidor de desarrollo contra los emuladores |
| `npm run emulators` | Arranca Auth y Firestore locales |
| `npm run build` | Comprobación de tipos y build de producción con service worker |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:rules` | Prueba `firestore.rules` contra el emulador |
| `npm run test:flow` | Flujo de dos personas contra los emuladores (Playwright) |
| `npm run test:e2e` | Pruebas de navegador del build (escritorio y móvil) |
| `npm run deploy` | Build y despliegue de Hosting y Firestore |
| `npm run icons` | Regenera los iconos PWA |

Los comandos que usan emuladores necesitan Java 21+. En PowerShell, si tu `java` por defecto es más antiguo:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

## Estructura

```
src/
  api/sessions.ts            Firestore: sesiones, invitaciones, ubicación y listeners
  lib/geo.ts                 Reglas puras: formato, envío limitado, ubicación obsoleta, recorrido
  lib/invite.ts              Generación y hash de códigos de invitación
  lib/firebase.ts            Inicialización de Firebase y autenticación anónima
  hooks/useGeolocationWatch  watchPosition()/clearWatch() con estados de permiso
  components/ pages/         Interfaz
firestore.rules              Reglas de seguridad
firestore.indexes.json       Índices (y TTL si se activa la facturación)
rules-test/                  Pruebas de las reglas
e2e/ e2e-flow/               Pruebas de navegador
.github/agents/ skills/      Agentes y skills del plan
docs/pruebas-dispositivos.md Registro de pruebas en celulares reales
```

## Privacidad

- Solo se guarda la **última** posición de cada sesión; el recorrido existe solo en memoria en el navegador.
- Al pulsar **Detener** se borra la ubicación del servidor en la misma operación atómica que desactiva `sharing`.
- Los códigos de invitación son aleatorios (12 caracteres), de un solo uso y vencen; en Firestore solo existe su hash SHA-256.
- Las reglas impiden leer la ubicación si no se está compartiendo, si la sesión terminó o venció, o si no eres integrante.
- Si la página se recarga mientras se compartía, la sesión se pausa: nunca se reanuda sin pulsar **Iniciar**.
- Sin Cloud Functions ni facturación: si el teléfono se apaga sin pulsar Detener, la última posición queda guardada pero las reglas la hacen ilegible al vencer la sesión. Las políticas TTL de borrado automático requieren activar la facturación (plan Blaze); si se activa, añádelas en `firestore.indexes.json` (`fieldOverrides` con `"ttl": true` sobre `expiresAt`).
- No se garantiza el seguimiento con la pantalla bloqueada o la app cerrada; registra lo observado en `docs/pruebas-dispositivos.md`.

## Mapa

Por defecto se usan teselas de OpenStreetMap, aptas solo para bajo volumen según su [política de uso](https://operations.osmfoundation.org/policies/tiles/). Configura otro proveedor con `VITE_TILE_URL` y `VITE_TILE_ATTRIBUTION`; la atribución siempre se muestra.
