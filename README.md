# Rastreo

Dos aplicaciones web (PWA) que trabajan juntas para compartir la ubicación en vivo:

| | Link | Para quién |
|---|---|---|
| **App de ubicación** | https://arielnoob24.github.io/Rastreo/compartir/ | Quien comparte: crea la sesión, entrega el código y pulsa **Iniciar** / **Detener**. |
| **App de monitoreo** | https://arielnoob24.github.io/Rastreo/monitoreo/ | Quien observa: ingresa el código y ve en un mapa la posición, la precisión, la altitud (si existe) y la hora de la última actualización. |
| Portada | https://arielnoob24.github.io/Rastreo/ | Enlaza a las dos. |

Se publican solas con cada `git push` a `main` (`.github/workflows/pages.yml`). El plan completo está en [plan.md](plan.md).

Proyecto de Firebase: `rastreo-pareja-387e` ([consola](https://console.firebase.google.com/project/rastreo-pareja-387e/overview)), compartido por las dos apps. La configuración web está en las variables del repositorio (Settings → Secrets and variables → Actions → Variables) y en `.env.local` para desarrollo.

## Tecnologías

React + TypeScript + Vite, `vite-plugin-pwa`, Leaflet, **Firebase** (Auth anónima y Firestore), Vitest, Testing Library y Playwright.

## Desarrollo

```bash
npm install
npm run dev:compartir    # app de ubicación en http://localhost:5173
npm run dev:monitoreo    # app de monitoreo en http://localhost:5174
```

Las dos se conectan a tu proyecto de Firebase (`.env.local`). Para no tocar la nube, usa los emuladores (requieren Java 21+):

```bash
npm run emulators            # Auth + Firestore locales (UI en http://localhost:4000)
npm run dev:emu:compartir
npm run dev:emu:monitoreo
```

Para simular a las dos personas en el mismo equipo usa una ventana normal y otra de incógnito: la cuenta anónima es una por perfil del navegador.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev:compartir` / `dev:monitoreo` | Servidor de desarrollo de cada app |
| `npm run dev:emu:compartir` / `dev:emu:monitoreo` | Lo mismo, contra los emuladores |
| `npm run emulators` | Arranca Auth y Firestore locales |
| `npm run build` | Tipos + build de las dos apps y la portada en `dist/` |
| `npm run preview` | Sirve `dist/` completo en http://localhost:4173 |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:rules` | Prueba `firestore.rules` contra el emulador |
| `npm run test:flow` | Flujo completo entre las dos apps contra los emuladores (Playwright) |
| `npm run test:e2e` | Pruebas de navegador del build (escritorio y móvil) |
| `npm run icons` | Regenera los iconos de ambas apps |

Los comandos con emuladores necesitan Java 21+. En PowerShell, si tu `java` por defecto es más antiguo:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

## Estructura

```
apps/
  compartir/                 App de ubicación (pantallas, index.html, iconos)
  monitoreo/                 App de monitoreo (pantallas, index.html, iconos, tema índigo)
shared/
  api/sessions.ts            Firestore: sesiones, invitaciones, ubicación y listeners
  hooks/                     Ubicación (watchPosition), sesión en vivo, conexión, reloj
  lib/                       Firebase, reglas de ubicación, códigos, enlaces entre apps
  components/                Mapa, panel de datos, estados, aviso de privacidad
  styles.css                 Estilos base de ambas apps
site/                        Portada del sitio
vite.apps.ts                 Configuración común; vite.compartir.config.ts y vite.monitoreo.config.ts
firestore.rules              Reglas de seguridad (una sola copia para las dos apps)
rules-test/                  Pruebas de las reglas
e2e/ e2e-flow/               Pruebas de navegador
.github/agents/ skills/      Agentes y skills del plan
docs/pruebas-dispositivos.md Registro de pruebas en celulares reales
```

## Privacidad

- Solo se guarda la **última** posición de cada sesión; el recorrido existe solo en memoria en el navegador.
- Al pulsar **Detener** se borra la ubicación del servidor en la misma operación que desactiva `sharing`.
- Los códigos de invitación son aleatorios (12 caracteres), de un solo uso y vencen; en Firestore solo existe su hash SHA-256.
- Las reglas impiden leer la ubicación si no se está compartiendo, si la sesión terminó o venció, o si no eres integrante.
- Si la app de ubicación se recarga mientras compartía, la sesión se pausa: nunca se reanuda sin pulsar **Iniciar**.
- Sin Cloud Functions ni facturación: si el teléfono se apaga sin pulsar Detener, la última posición queda guardada pero las reglas la hacen ilegible al vencer la sesión. Las políticas TTL de borrado automático requieren el plan Blaze.
- En el navegador no se garantiza el envío con la pantalla bloqueada o la app cerrada; para eso está prevista la app Android (ver `plan.md`).

## Mapa

Por defecto se usan teselas de OpenStreetMap, aptas solo para bajo volumen según su [política de uso](https://operations.osmfoundation.org/policies/tiles/). Configura otro proveedor con `VITE_TILE_URL` y `VITE_TILE_ATTRIBUTION`; la atribución siempre se muestra.
