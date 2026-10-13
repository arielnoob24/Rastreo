---
name: pwa-y-diseno-adaptable
description: Manifiesto, instalación, service worker, caché de recursos estáticos, accesibilidad y diseño responsive de las pantallas de compartir y monitorear. Úsala al tocar vite.apps.ts, apps/*/index.html, apps/*/public/ o la maquetación.
---

# PWA y diseño adaptable

## Dos aplicaciones

- **App de ubicación** (`apps/compartir`, `/Rastreo/compartir/`): para quien comparte. Más adelante se empaqueta con Capacitor para el segundo plano (sin service worker dentro de la app nativa).
- **App de monitoreo** (`apps/monitoreo`, `/Rastreo/monitoreo/`): para quien observa, siempre web.
- Cada una tiene su build, manifiesto (`id`, `scope` y `start_url` propios), service worker, icono y color; se instalan por separado. Ambas salen de `appConfig()` en `vite.apps.ts`.
- Portada del sitio en `site/index.html`, con enlaces a las dos.
- Rutas con `HashRouter` (`#/sesion/...`): funcionan en GitHub Pages y en Capacitor sin reescrituras.
- Para enlazar una app con la otra usar `shared/lib/appLinks.ts` (por ejemplo, el enlace de invitación abre la app de monitoreo); nunca rutas fijas.

## Manifiesto e instalación

- Generado con `vite-plugin-pwa` en `vite.config.ts` (`name`, `short_name`, `start_url`, `scope`, `display: standalone`, colores).
- Iconos PNG de 192×192 y 512×512 (uno `maskable`) en `public/icons/`. Regenerarlos con `npm run icons`.
- `registerType: 'autoUpdate'`: la app debe tolerar recargas.

## Service worker y caché

- Precachear solo recursos estáticos del build.
- **No** cachear teselas del mapa ni respuestas de Firebase: la ubicación debe ser siempre fresca.
- Sin red: la interfaz carga desde caché, pero indica “Sin conexión” y no afirma que el mapa o la ubicación funcionan.

## Diseño adaptable

- Mobile-first.
- **App de ubicación**: botón **Iniciar/Detener** grande (mínimo 56 px de alto) y estado visibles sin desplazarse; debajo, observadores e invitar.
- **App de monitoreo**: en celular, mapa arriba y lista de personas deslizable abajo; en pantallas de 900 px o más, lista a un lado y mapa ocupando el resto.
- Objetivos táctiles de al menos 44×44 px. Respetar `env(safe-area-inset-*)`.
- Modo claro y oscuro con tokens de color; los colores de las personas deben verse bien en ambos.

## Identidad visual por rol

- Compartir: acento verde azulado (`.session--owner`), etiqueta “Tú compartes”, botón circular grande Iniciar/Detener como elemento principal, mapa pequeño.
- Monitorear: acento índigo (`.session--viewer`), etiqueta “Solo observas”, mapa grande como elemento principal y tarjeta “Última actualización” destacada.
- Los colores de acento se definen como variables CSS en la clase de la pantalla y se redefinen en modo oscuro; no usar colores fijos en los componentes.
- En la pantalla de compartir, el código de invitación se muestra automáticamente al entrar, sin un paso extra.

## Accesibilidad

- Estados importantes con `role="status"` / `aria-live="polite"`; errores con `role="alert"`.
- Cada persona en la lista identificable por nombre (no solo por color). Contraste AA, foco visible y etiquetas en botones y campos.

## Advertencia

En el **navegador** el envío se pausa con la pantalla bloqueada o al cambiar de app; nunca lo prometas en la web. El envío en segundo plano solo existe en la **app instalada**.
