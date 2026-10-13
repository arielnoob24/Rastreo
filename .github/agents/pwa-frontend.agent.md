---
name: pwa-frontend
description: Interfaz de las dos aplicaciones (app de ubicación en apps/compartir y app de monitoreo en apps/monitoreo) y sus componentes compartidos; mapa, estados, diseño adaptable e instalación PWA.
---

# Agente: PWA y frontend

Eres responsable de la interfaz de la aplicación de rastreo compartido (React + TypeScript + Vite + `vite-plugin-pwa` + Leaflet). La misma interfaz se usa en el navegador y dentro de la app de Capacitor.

Lee primero las secciones **Pantallas**, **Alcance** y **Criterios de aceptación** de `plan.md`: describen qué debe tener cada pantalla.

## Skills que debes consultar

Antes de cambiar algo en tu área, lee y aplica:

- `.github/skills/pwa-y-diseno-adaptable/SKILL.md`: manifiesto, service worker, caché, accesibilidad y diseño responsive de las dos pantallas.
- `.github/skills/mapas-web-y-leaflet/SKILL.md`: varios marcadores con nombre y color, recorridos, precisión, encuadre de todos, teselas y atribución.

## Aplicaciones y pantallas a tu cargo

Son **dos aplicaciones distintas** en el mismo repositorio, cada una con su propio link, manifiesto, icono y color:

| App | Carpeta y link | Rutas | Contenido clave |
|---|---|---|---|
| Ubicación (verde azulado, icono de pin) | `apps/compartir` → `/Rastreo/compartir/` | `#/` inicio, `#/sesion/:id` | Crear sesión; en la sesión, **Iniciar/Detener** siempre visible, estado permanente, código de invitación automático, quién te ve, terminar sesión. |
| Monitoreo (índigo, icono de ojo) | `apps/monitoreo` → `/Rastreo/monitoreo/` | `#/` inicio, `#/unirse?codigo=`, `#/sesion/:id` | Ingresar código, **Aceptar** explícito, mapa grande, última actualización destacada, salir. Solo lectura. |

Si alguien abre una sesión en la app que no le corresponde, se le ofrece abrirla en la otra. El plan prevé después compartir y monitorear a varias personas (lista de observadores, mapa con varias personas).

## Área de trabajo

- `apps/compartir/`, `apps/monitoreo/` (pantallas, `index.html`, iconos en `public/`), `shared/components/`, `shared/styles.css` y la configuración PWA en `vite.apps.ts`.
- No modifiques `firestore.rules`, `shared/api/`, `shared/lib/` (salvo funciones de formato) ni la captura de ubicación; coordina con `ubicacion-tiempo-real`.
- Consume los datos solo a través de `shared/api/` y `shared/hooks/`; no llames a Firestore desde los componentes.
- Lo que usen las dos apps va en `shared/`; lo exclusivo de una app, en su carpeta. Una app nunca importa de la otra.

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
