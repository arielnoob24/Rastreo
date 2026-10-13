# Plan del proyecto: rastreo compartido en pareja

> **Actualización:** el backend se implementó con **Firebase** (Auth anónima + Firestore + Hosting) en lugar de Supabase. Las referencias a Supabase, Postgres y RLS de este plan se corresponden con Firestore y sus reglas de seguridad (`firestore.rules`). La skill vinculada es `firebase-firestore-y-reglas`.

## Contexto y objetivo

Crear una aplicación web progresiva (PWA) para que dos personas compartan una sesión de ubicación. Una persona inicia el rastreo desde su celular y puede detenerlo cuando quiera; la otra abre la sesión desde una computadora o celular y ve la posición actualizada sobre un mapa. La interfaz debe adaptarse a pantallas pequeñas y grandes.

Además de la posición, se mostrarán la hora de la última actualización y, cuando el dispositivo la proporcione, la altitud. En términos geográficos, las coordenadas son **latitud** y **longitud**; la longitud no debe confundirse con la altitud.

## Propuesta de tecnologías

| Parte | Recomendación | Motivo |
|---|---|---|
| Interfaz | React + TypeScript + Vite | Ecosistema amplio, buen soporte de herramientas y desarrollo rápido sin necesitar renderizado de servidor para este caso. |
| PWA | `vite-plugin-pwa` | Integra el manifiesto y el service worker con Vite; permite preparar instalación y experiencia offline básica. |
| Mapa | Leaflet + React Leaflet | Adecuado para mostrar un marcador y el recorrido reciente; liviano y cómodo en móvil. Elegir un proveedor de teselas y respetar sus límites y atribución. |
| Ubicación | API del navegador `navigator.geolocation.watchPosition()` | Obtiene actualizaciones de posición con permiso explícito del usuario; proporciona latitud, longitud, precisión y otros datos opcionales. |
| Backend y sincronización | Supabase (Auth, Postgres, Realtime y políticas RLS) | Reúne autenticación, almacenamiento y actualizaciones en vivo. Realtime puede distribuir cambios y mostrar presencia/conexión. |
| Pruebas | Vitest + Testing Library; Playwright para flujos de navegador | Pruebas unitarias de reglas y pruebas de los flujos principales en pantallas de escritorio y móvil. |

**Alternativa:** Firebase Authentication + Realtime Database es una opción válida si se prioriza una sincronización en tiempo real directa. Para este proyecto se recomienda Supabase porque los datos relacionales de usuarios, invitaciones y sesiones encajan naturalmente con Postgres y sus políticas de acceso.

No se recomienda empezar con Next.js: el producto necesita una interfaz cliente, geolocalización y un canal en vivo, no renderizado de páginas en servidor. Se puede reconsiderar si aparece una necesidad concreta de SEO o contenido público.

## Funcionamiento esperado

1. Una persona crea una sesión y obtiene un enlace o código de invitación de un solo uso o con vencimiento.
2. La segunda persona acepta la invitación y se une a esa sesión.
3. Quien comparte su ubicación pulsa **Iniciar** y concede el permiso de ubicación del navegador.
4. El celular obtiene cambios de posición y publica la ubicación más reciente mientras la sesión esté activa.
5. La otra persona ve el marcador moverse, la precisión estimada y el momento de la última actualización.
6. Quien comparte puede pulsar **Detener** y revocar el acceso de la otra persona; la sesión también debe poder caducar.

## Alcance inicial (MVP)

- Crear y unirse a una sesión privada entre dos personas.
- Controles visibles para iniciar y detener el envío de ubicación.
- Mapa adaptable con marcador actual y, si es viable, una línea del recorrido de la sesión.
- Panel con latitud, longitud, precisión, hora de actualización y altitud opcional.
- Estados claros: esperando permiso, compartiendo, sin conexión, ubicación desactualizada y sesión terminada.
- Instalación PWA y caché de recursos estáticos; no mantener ni retransmitir ubicaciones cuando la persona detuvo el rastreo.
- Autorización para que solo integrantes de la sesión lean su ubicación.

Fuera del primer alcance: rastreo encubierto, seguimiento garantizado con la aplicación cerrada, historial permanente, navegación giro a giro y compartir con grupos grandes.

## Consideraciones técnicas, privacidad y riesgos

- La Geolocation API requiere contexto seguro (HTTPS, excepto `localhost` para desarrollo) y permiso explícito del usuario.
- `watchPosition()` entrega actualizaciones mientras el navegador permite ejecutar la página. En móviles, el sistema operativo puede limitar o suspender una pestaña o PWA en segundo plano; **no se debe garantizar seguimiento continuo con pantalla bloqueada o aplicación cerrada**. Probarlo en los celulares reales del equipo y documentar el comportamiento observado. Si el seguimiento en segundo plano confiable se vuelve requisito, evaluar una app nativa o híbrida.
- La altitud y su precisión pueden ser `null` o variar considerablemente según el dispositivo y las condiciones. Mostrar “No disponible” cuando falten; no inventar un valor ni tratarlo como exacto.
- Recopilar únicamente los datos necesarios. Explicar claramente quién puede ver la posición, cuándo se comparte y cómo detenerlo. Definir cuánto tiempo se conserva la última posición y borrar los datos al terminar o expirar la sesión.
- Aplicar RLS a todas las tablas y validar la pertenencia a la sesión en cada operación. Nunca incluir una clave `service_role` en el frontend. No usar códigos de invitación predecibles ni dejarlos accesibles después de su vencimiento.
- Considerar permisos denegados, pérdida de señal, coordenadas imprecisas, batería, consumo de datos, estados obsoletos y reconexiones duplicadas.
- Usar teselas de mapa con un proveedor permitido para el volumen y uso previstos, mostrando siempre la atribución requerida.

## Agentes y skills propuestos

Los agentes se guardarían como perfiles en `.github/agents/` y las skills como carpetas con `SKILL.md` en `.github/skills/`. Cada agente debe indicar explícitamente en sus instrucciones qué skills consultar para su responsabilidad, de modo que la skill correcta acompañe al agente y no quede como documentación aislada.

| Agente | Responsabilidad | Skills vinculadas |
|---|---|---|
| `pwa-frontend.agent.md` | Pantallas adaptables, estados de permisos, mapa, marcador y experiencia de instalación PWA. | `pwa-y-diseno-adaptable`; `mapas-web-y-leaflet` |
| `ubicacion-tiempo-real.agent.md` | Captura de ubicación, modelo de datos, sesiones/invitaciones, sincronización en vivo y controles de acceso. | `geolocalizacion-y-privacidad`; `supabase-realtime-y-rls` |
| `qa-movil.agent.md` | Estrategia y ejecución de pruebas en distintos navegadores, celulares y tamaños de pantalla; verifica errores y reconexiones. | `pruebas-pwa-movil`; `geolocalizacion-y-privacidad` |

Contenido que debería tener cada skill:

- **`pwa-y-diseno-adaptable`**: manifiesto, instalación, service worker, caché de recursos estáticos, accesibilidad y diseño responsive; advertencia de no asumir rastreo de fondo continuo.
- **`mapas-web-y-leaflet`**: inicialización y actualización del marcador, trazado de coordenadas, precisión, atribución y política del proveedor de teselas.
- **`geolocalizacion-y-privacidad`**: `watchPosition()`/`clearWatch()`, HTTPS, permisos, campos opcionales como altitud, precisión, caducidad de datos, consentimiento y parada explícita.
- **`supabase-realtime-y-rls`**: esquema de sesiones, invitaciones, última ubicación, canal Realtime, RLS por integrante, secretos y reglas de expiración.
- **`pruebas-pwa-movil`**: matriz de navegadores/dispositivos, simulación de permisos y desconexiones, pruebas de instalación, actualización, pantalla bloqueada y verificación responsive.

Los agentes deben limitar los cambios a su área, seguir las políticas de privacidad del proyecto y pedir confirmación antes de ampliar el alcance o conservar más historial del acordado.

## Criterios de aceptación del MVP

- Un usuario puede crear una sesión y el segundo unirse únicamente mediante su invitación.
- Tras conceder permiso, el primer celular actualiza su posición y el segundo dispositivo recibe y representa esos cambios sin recargar la página.
- La pantalla distingue ubicación actualizada de ubicación obsoleta e informa cuando la precisión o altitud no están disponibles.
- Al detener el rastreo, dejan de enviarse actualizaciones; una persona ajena a la sesión no puede leerlas.
- La interfaz principal se puede usar en celular y computadora, y los recursos esenciales de la PWA cargan desde caché cuando no hay red (sin afirmar que el mapa o la ubicación funcionan offline).
- Se ha probado el flujo en los modelos de celular y navegadores disponibles para la pareja, incluyendo denegación de permiso y pérdida de conexión.

## Referencias consultadas

- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [MDN: Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Vite PWA: Getting Started](https://vite-pwa-org.netlify.app/guide/)
- [Supabase: Realtime](https://supabase.com/docs/guides/realtime)
- [Leaflet: API reference](https://leafletjs.com/reference.html)