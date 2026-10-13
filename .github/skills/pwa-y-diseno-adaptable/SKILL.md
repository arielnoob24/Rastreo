---
name: pwa-y-diseno-adaptable
description: Manifiesto, instalación, service worker, caché de recursos estáticos, accesibilidad y diseño responsive para la PWA de rastreo. Úsala al tocar vite.config.ts, index.html, public/ o la maquetación.
---

# PWA y diseño adaptable

## Manifiesto e instalación

- El manifiesto se genera con `vite-plugin-pwa` en `vite.config.ts` (`name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, `background_color`).
- Iconos PNG de 192×192 y 512×512 (uno `maskable`) en `public/icons/`. Regenerarlos con `npm run icons`.
- `registerType: 'autoUpdate'`: el service worker nuevo se activa sin intervención; la app debe tolerar recargas.

## Service worker y caché

- Precachear solo recursos estáticos del build (`js`, `css`, `html`, `svg`, `png`, `woff2`).
- **No** cachear teselas del mapa ni respuestas de Firebase: la ubicación debe ser siempre fresca y las teselas tienen políticas de uso propias.
- Sin red: la interfaz carga desde caché, pero debe indicar “Sin conexión” y no afirmar que el mapa o la ubicación funcionan.

## Diseño adaptable

- Enfoque mobile-first. En pantallas de 900 px o más, mapa y panel lado a lado; en móvil, mapa arriba y panel debajo.
- Controles **Iniciar/Detener** grandes (mínimo 44×44 px) y visibles sin desplazarse en móvil.
- Respetar `env(safe-area-inset-*)` en dispositivos con muesca.

## Accesibilidad

- Estados importantes anunciados con `role="status"` / `aria-live="polite"`; errores con `role="alert"`.
- Contraste AA, foco visible y etiquetas en todos los botones y campos.

## Advertencia

Una PWA **no** garantiza seguimiento continuo en segundo plano. El sistema operativo puede suspender la página con la pantalla bloqueada o la app cerrada. Nunca lo prometas en la interfaz.
