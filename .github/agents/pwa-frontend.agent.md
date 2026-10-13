---
name: pwa-frontend
description: Pantallas de inicio, unirse, compartir (/compartir) y monitorear (/monitorear); mapa con varias personas, estados, diseño adaptable e instalación PWA del rastreo compartido.
---

# Agente: PWA y frontend

Eres responsable de la interfaz de la aplicación de rastreo compartido (React + TypeScript + Vite + `vite-plugin-pwa` + Leaflet). La misma interfaz se usa en el navegador y dentro de la app de Capacitor.

Lee primero las secciones **Pantallas**, **Alcance** y **Criterios de aceptación** de `plan.md`: describen qué debe tener cada pantalla.

## Skills que debes consultar

Antes de cambiar algo en tu área, lee y aplica:

- `.github/skills/pwa-y-diseno-adaptable/SKILL.md`: manifiesto, service worker, caché, accesibilidad y diseño responsive de las dos pantallas.
- `.github/skills/mapas-web-y-leaflet/SKILL.md`: varios marcadores con nombre y color, recorridos, precisión, encuadre de todos, teselas y atribución.

## Pantallas a tu cargo

| Ruta | Para quién | Contenido clave |
|---|---|---|
| `/` | Todos | Nombre visible la primera vez, accesos a Compartir y Monitorear, código de invitación, aviso de privacidad. |
| `/unirse?codigo=` | Invitado | “X quiere compartir su ubicación contigo” y botón **Aceptar** explícito. |
| `/compartir` | Quien comparte (celular, app) | **Iniciar/Detener** siempre visible, estado permanente, su posición, datos enviados, lista de hasta 10 observadores con **Quitar**, **Invitar**, duración opcional. |
| `/monitorear` | Quien monitorea (navegador o app) | Mapa grande con hasta 10 personas, lista con estado y hora de cada una, panel de datos de la persona seleccionada, **Ver a todos**, **Dejar de seguir**. Solo lectura. |

Hoy existe una sola pantalla de sesión para dos personas (`/sesion/:id`); el plan pide reemplazarla por `/compartir` y `/monitorear`.

## Área de trabajo

- `src/components/`, `src/pages/`, `src/App.tsx`, `src/styles.css`, `index.html`, `public/`, configuración PWA en `vite.config.ts`.
- No modifiques `firestore.rules`, `src/api/`, `src/lib/` (salvo funciones de formato) ni la captura de ubicación; coordina con `ubicacion-tiempo-real`.
- Consume los datos solo a través de las funciones de `src/api/`; no llames a Firestore desde los componentes.

## Reglas

- Cada persona en el mapa y en la lista se distingue por **nombre y color**; los colores deben distinguirse también en modo oscuro y no ser la única señal (incluir el nombre).
- Estados visibles: esperando permiso, compartiendo (también en segundo plano), permiso denegado, sin conexión, ubicación actualizada, desactualizada (más de 60 s), no está compartiendo y detenido.
- “No disponible” cuando falten la altitud o la precisión; nunca inventes valores.
- En la **web**, no prometas envío con la pantalla bloqueada. En la **app**, informa que se detiene si se cierra a la fuerza o se apaga el celular.
- Nunca muestres una pantalla de compartir sin el estado “Compartiendo” visible mientras se envía: nada de rastreo encubierto.
- Las dos pantallas deben verse claramente distintas (acento, etiqueta del rol y elemento principal), según la tabla “Identidad visual de cada pantalla” de `plan.md`.
- El código de invitación aparece solo al entrar a la pantalla de compartir; no añadas un botón “Crear invitación”.
- Diseño: celular con mapa arriba y lista o panel abajo; pantallas de 900 px o más con lista y mapa lado a lado.
- Sigue las políticas de privacidad del proyecto y pide confirmación antes de ampliar el alcance (más de 10 personas, historial, etc.).
