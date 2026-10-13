# Plan del proyecto: rastreo compartido

## Contexto y objetivo

Crear una aplicación para compartir la ubicación en vivo con personas de confianza:

- **Una persona puede compartir su ubicación con varias personas** a la vez (hasta 10).
- **Una persona puede monitorear a varias personas** a la vez (hasta 10) y verlas juntas en un mapa.
- **La ubicación debe seguir enviándose con la pantalla bloqueada o con la aplicación en segundo plano.**

El proyecto son **dos aplicaciones distintas**, en el mismo repositorio, con links, iconos y colores propios:

- **App de ubicación** (quien comparte): inicia y detiene el envío, entrega el código de invitación y decide quién puede verla.
- **App de monitoreo** (quien observa): ingresa el código y ve en un mapa a las personas que le comparten su ubicación.

Una misma persona puede usar las dos: compartir su ubicación con una app y monitorear a otras con la otra.

Además de la posición, se muestran la hora de la última actualización y, cuando el dispositivo la proporcione, la altitud. En términos geográficos, las coordenadas son **latitud** y **longitud**; la longitud no debe confundirse con la altitud.

Publicación (GitHub Pages):

| | Link |
|---|---|
| Portada (enlaza a las dos) | https://arielnoob24.github.io/Rastreo/ |
| App de ubicación | https://arielnoob24.github.io/Rastreo/compartir/ |
| App de monitoreo | https://arielnoob24.github.io/Rastreo/monitoreo/ |

Datos: Firebase, proyecto `rastreo-pareja-387e`, compartido por las dos aplicaciones.

## Dos aplicaciones en un repositorio

| | App de ubicación | App de monitoreo |
|---|---|---|
| Carpeta | `apps/compartir` | `apps/monitoreo` |
| Para quién | Quien comparte, desde su celular | Quien observa, desde PC o celular |
| Color e icono | Verde azulado, pin de ubicación | Índigo, ojo |
| Puede | Crear sesión, Iniciar/Detener, mostrar el código, revocar acceso, terminar sesión | Ingresar código, ver el mapa en vivo, salir de la sesión |
| No puede | Ver la ubicación de otras personas | Enviar ubicación ni crear sesiones |
| Distribución | Web (PWA) y, más adelante, APK con Capacitor para el segundo plano | Siempre web (PWA) |

Organización del código:

- `apps/compartir/` y `apps/monitoreo/`: pantallas, `index.html`, iconos y punto de entrada de cada app. Una app nunca importa código de la otra.
- `shared/`: lo que usan ambas (conexión a Firebase, acceso a datos, ubicación, mapa, paneles, estilos base).
- `firestore.rules`: una sola copia de las reglas, porque las dos apps usan la misma base de datos.
- `vite.apps.ts`: configuración común; cada app tiene su build, manifiesto, service worker y scope propios, así que se instalan por separado.
- `site/index.html`: portada con enlaces a las dos apps.
- El enlace de invitación que genera la app de ubicación abre directamente la app de monitoreo en “unirse”.
- Si alguien abre una sesión en la app que no le corresponde, se le ofrece abrirla en la otra.

Se eligió un solo repositorio para no duplicar el código común ni las reglas de seguridad. Si se exigieran repositorios separados, cada app ya está en su propia carpeta.

## Tecnologías

| Parte | Elección | Motivo |
|---|---|---|
| Interfaz | React + TypeScript + Vite | Ecosistema amplio, buen soporte de herramientas y desarrollo rápido sin renderizado de servidor. |
| App instalable | **Capacitor** (Android; iOS opcional) | Empaqueta la misma interfaz como app nativa. Es necesario para enviar la ubicación en segundo plano, algo que un navegador no permite. |
| Web y PWA | `vite-plugin-pwa` | Cada app es una PWA independiente; la de monitoreo funciona en cualquier navegador, sin instalar nada. |
| Mapa | Leaflet + React Leaflet | Varios marcadores, recorridos y círculos de precisión; liviano y cómodo en móvil. Respetar límites y atribución del proveedor de teselas. |
| Ubicación en primer plano | `navigator.geolocation.watchPosition()` | Para la versión web mientras la página está abierta. |
| Ubicación en segundo plano | Plugin de geolocalización en segundo plano de Capacitor | Sigue entregando posiciones con la pantalla bloqueada. En Android usa un servicio en primer plano con notificación fija. |
| Backend y datos | **Firebase**: Authentication anónima + Cloud Firestore | Toda la información se guarda en Firestore. `onSnapshot` entrega los cambios en tiempo real y `firestore.rules` controla quién lee y escribe cada documento. |
| Publicación | GitHub Pages con GitHub Actions; APK para Android | Cada `push` a `main` prueba, construye y publica la web. |
| Pruebas | Vitest + Testing Library; Playwright; emulador de Firestore | Pruebas unitarias, de reglas de seguridad y del flujo con varias personas. |

Se usa el plan gratuito de Firebase (Spark), sin Cloud Functions.

## Ubicación en segundo plano

Un navegador (Chrome, Safari) suspende la página al bloquear la pantalla o cambiar de aplicación, y deja de entregar la ubicación. Por eso **la app de ubicación debe instalarse como app nativa** (APK); la de monitoreo no lo necesita.

| | Android | iPhone |
|---|---|---|
| Comportamiento | Sigue enviando con la pantalla bloqueada. Muestra una notificación fija “Compartiendo ubicación” mientras está activo, como exige Android. | Sigue enviando con el indicador de ubicación visible. |
| Permisos | Ubicación “Permitir todo el tiempo” y notificaciones. Pedir quitar la optimización de batería para la app. | Ubicación “Siempre”. |
| Requisitos para construirla | PC con Android Studio (gratis). | Mac con Xcode y cuenta de Apple Developer (99 USD/año) para usarla más de 7 días. |
| Distribución | Archivo APK instalado directamente en el celular. | Instalación desde Xcode. |

Limitaciones que hay que asumir y comunicar:

- Si la persona **cierra la app a la fuerza** (deslizarla en la lista de recientes en algunos teléfonos), apaga el celular o se queda sin batería, el envío se detiene.
- Algunos fabricantes (Xiaomi, Huawei, Samsung con ahorro extremo) cierran apps en segundo plano de forma agresiva; hay que probarlo en los teléfonos reales.
- El envío en segundo plano consume más batería; usar el mismo límite de frecuencia (cada 5 s o 10 m como máximo) y permitir uno más espaciado cuando la persona está quieta.

Quien **monitorea** no necesita instalar nada: la app de monitoreo funciona en el navegador.

> **Pendiente de decidir:** qué celulares usarán quienes comparten. Con Android se puede construir todo desde la PC; con iPhone hace falta una Mac.

## Pantallas

### 1. Inicio de cada app

- **App de ubicación**: crear sesión (duración), volver a la sesión activa, aviso de privacidad y enlace a la app de monitoreo.
- **App de monitoreo**: campo “Agregar persona con código”, volver a la última sesión vista y enlace a la app de ubicación.
- Más adelante, la primera vez: pedir **un nombre visible** (por ejemplo “Ariel”), necesario para distinguir a varias personas en el mapa.

### 2. Unirse (app de monitoreo)

- Muestra quién invita (“Ariel quiere compartir su ubicación contigo”).
- Requiere pulsar **Aceptar**: abrir el enlace no une a nadie automáticamente.
- Al aceptar, esa persona aparece en la pantalla de monitoreo.

### 3. Sesión en la app de ubicación

Pensada para el **celular** (app instalada).

- Botón grande **Iniciar** / **Detener**, siempre visible sin desplazarse.
- Estado claro y permanente: esperando permiso, compartiendo (también en segundo plano), permiso denegado, sin conexión, detenido. Nunca hay rastreo sin que este estado esté a la vista y sin la notificación del sistema.
- Su propia posición en un mapa pequeño y los datos que se envían (latitud, longitud, precisión, altitud, hora).
- **Personas que pueden verme** (hasta 10): nombre, si está conectada y botón **Quitar** para cada una.
- **Código de invitación visible de inmediato**: al crear la sesión, el código aparece solo, sin tener que pulsar “Crear invitación”, con botones **Compartir enlace** y **Copiar código**. Es de un solo uso y dura lo mismo que la sesión; tras usarse aparece uno nuevo para la siguiente persona. Opción **Generar otro código** para invalidar el anterior.
- Duración opcional: compartir hasta que lo detenga, o durante 1, 4, 12 o 24 horas.
- Aviso de que se detiene si se cierra la app a la fuerza o se apaga el celular.

### 4. Sesión en la app de monitoreo

Pensada para **computadora o celular**, en el navegador o en la app. Solo lectura.

- **Mapa grande** con un marcador por persona, cada uno con su **nombre y color**, círculo de precisión y recorrido reciente.
- **Lista de personas** (hasta 10): nombre, estado (actualizada, desactualizada, no está compartiendo), hora de la última actualización (“hace 10 s”) y batería si la app la proporciona.
- Tocar una persona centra el mapa en ella y muestra su panel: latitud, longitud, precisión, altitud (“No disponible” si falta) y hora.
- Botón **Ver a todos** para encuadrar a todas las personas en el mapa.
- Botón **Dejar de seguir** para cada persona.
- En pantallas grandes, lista y mapa lado a lado; en celular, mapa arriba y lista deslizable abajo.

Una persona ajena nunca ve a nadie que no la haya invitado.

### Identidad visual de cada pantalla

Las dos pantallas deben distinguirse a simple vista, no solo por el título:

| | Mi ubicación (compartir) | Ubicación compartida (monitorear) |
|---|---|---|
| Color de acento | Verde azulado | Índigo |
| Etiqueta del rol | “Tú compartes” | “Solo observas” |
| Elemento principal | Botón circular grande **Iniciar** (verde) / **Detener** (rojo) | Mapa grande que ocupa la mayor parte de la pantalla |
| Mapa | Pequeño, como vista previa de lo que se envía | Principal, con marcador y recorrido en índigo |
| Información destacada | Estado del envío y código de invitación | Tarjeta “Última actualización” en grande (se vuelve ámbar si está desactualizada) y si la otra persona está conectada |
| Controles | Iniciar/Detener, código, revocar acceso, terminar sesión | Solo **Salir** |

## Funcionamiento esperado

1. Cada persona abre la app y elige su nombre visible (cuenta anónima, sin correo ni contraseña).
2. Quien comparte crea una invitación por cada persona y le envía el código o enlace.
3. Cada invitado acepta y queda autorizado para ver la ubicación de quien lo invitó.
4. Quien comparte pulsa **Iniciar** y concede los permisos de ubicación (y notificaciones en Android).
5. La app envía la posición a Firestore, también con la pantalla bloqueada, como máximo cada 5 s o al moverse unos 10 m.
6. Todas las personas autorizadas ven el marcador moverse en tiempo real en su pantalla de monitoreo, junto con las demás personas que siguen.
7. Quien comparte puede **Detener**, quitar a una persona concreta o dejar de compartir con todas; quien monitorea puede dejar de seguir a alguien.

## Datos en Firebase (Firestore)

| Colección | Contenido |
|---|---|
| `users/{uid}` | Nombre visible y fecha de creación. |
| `shares/{uid}` | Compartición de cada persona (una por usuario): si está compartiendo, vencimiento opcional, `viewerIds` (hasta 10) y el nombre de cada observador. |
| `shares/{uid}/presence/{viewerId}` | Última conexión de cada observador (separada para no generar lecturas a todos con cada latido). |
| `invitations/{hash}` | Invitación de un solo uso: el ID es el SHA-256 del código. Quién invita, vencimiento, cuándo y quién la usó. |
| `locations/{uid}` | Última ubicación de quien comparte: latitud, longitud, precisión, altitud, hora y, si existe, batería. |

Consultas clave:

- Pantalla de monitoreo: `shares` donde `viewerIds` contiene mi `uid`, y un listener de `locations/{uid}` por cada persona que comparte activamente.

Reglas de seguridad:

- Solo quien comparte y las personas en su `viewerIds` leen su compartición y su ubicación.
- Solo quien comparte escribe su ubicación, y solo con el envío activo.
- Aceptar una invitación agrega exactamente el `uid` de quien acepta a `viewerIds`, en la misma operación que marca la invitación como usada; no se puede superar el máximo de 10.
- Quien comparte puede quitar a cualquier observador; un observador solo puede quitarse a sí mismo.
- Al pulsar **Detener** se borra la ubicación; una compartición vencida deja de ser legible.

Consumo del plan gratuito (50 000 lecturas y 20 000 escrituras al día): cada ubicación enviada genera una lectura por cada persona que la está mirando. Por ejemplo, 1 persona compartiendo cada 5 s durante 4 horas con 5 observadores ≈ 2 900 escrituras y 14 400 lecturas. Con 10 observadores conectados todo el día, el límite se alcanza; si el uso crece, espaciar los envíos o pasar al plan Blaze.

> **Pendiente de decidir:** hoy solo se guarda la última ubicación. Si se requiere conservar el recorrido en Firebase, añadir `locations/{uid}/track` con cada punto y su hora, definir cuánto tiempo se conserva y avisarlo en la pantalla de privacidad.

## Alcance

- Nombre visible por persona.
- Compartir con hasta 10 personas, con invitaciones de un solo uso, y quitarlas individualmente.
- Monitorear hasta 10 personas en un mismo mapa, con nombre, color y estado de cada una.
- Envío de ubicación en segundo plano con la app instalada (Android primero).
- Panel con latitud, longitud, precisión, hora de actualización y altitud opcional.
- Estados claros: esperando permiso, compartiendo, sin conexión, ubicación desactualizada y detenido.
- Pantalla de monitoreo accesible desde el navegador; instalación PWA y caché de recursos estáticos.
- No mantener ni retransmitir ubicaciones cuando la persona detuvo el envío.

Fuera de alcance: rastreo encubierto o sin aviso visible, grupos de más de 10 personas, navegación giro a giro y seguimiento con el celular apagado.

## Consideraciones técnicas, privacidad y riesgos

- **Consentimiento visible**: la ubicación en segundo plano solo se activa después de pulsar **Iniciar**, con la notificación del sistema siempre presente. La app no debe poder usarse para rastrear a alguien sin que lo sepa.
- Las tiendas de aplicaciones (Google Play, App Store) exigen justificar el permiso de ubicación en segundo plano; para un proyecto académico, distribuir el APK directamente evita esa revisión.
- La Geolocation API web requiere HTTPS (excepto `localhost`) y permiso explícito.
- La altitud y su precisión pueden ser `null` o variar mucho; mostrar “No disponible” cuando falten.
- Recopilar solo los datos necesarios y explicar quién ve la posición, cuándo y cómo detenerlo.
- Las claves `VITE_FIREBASE_*` son públicas por diseño; la protección real son las reglas de Firestore. Nunca subir credenciales de cuentas de servicio.
- Sin Cloud Functions ni facturación no hay borrado automático (TTL); las reglas hacen ilegible lo vencido.
- Considerar permisos denegados o revocados, pérdida de señal, batería, consumo de datos, estados obsoletos y reconexiones.
- Usar teselas de mapa de un proveedor permitido para el volumen previsto, con su atribución.

## Agentes y skills

Los agentes están en `.github/agents/` y las skills en `.github/skills/<nombre>/SKILL.md`. Cada agente indica qué skills consultar.

| Agente | Responsabilidad | Skills vinculadas |
|---|---|---|
| `pwa-frontend.agent.md` | Pantallas de inicio, compartir y monitorear; mapa con varias personas, estados e instalación. | `pwa-y-diseno-adaptable`; `mapas-web-y-leaflet` |
| `ubicacion-tiempo-real.agent.md` | Ubicación en primer y segundo plano, modelo de datos en Firestore, invitaciones, tiempo real y reglas de seguridad. | `geolocalizacion-y-privacidad`; `firebase-firestore-y-reglas`; `capacitor-segundo-plano` (nueva) |
| `qa-movil.agent.md` | Pruebas en navegadores y celulares, segundo plano, varias personas, errores y reconexiones. | `pruebas-pwa-movil`; `geolocalizacion-y-privacidad`; `capacitor-segundo-plano` |

- **`pwa-y-diseno-adaptable`**: manifiesto, service worker, caché, accesibilidad y diseño responsive.
- **`mapas-web-y-leaflet`**: varios marcadores con nombre y color, recorridos, precisión, encuadre de todos, atribución.
- **`geolocalizacion-y-privacidad`**: `watchPosition()`/`clearWatch()`, permisos, campos opcionales, consentimiento y parada explícita.
- **`firebase-firestore-y-reglas`**: modelo `users`/`shares`/`invitations`/`locations`, consultas `array-contains`, reglas por observador, límites del plan gratuito.
- **`capacitor-segundo-plano`** (nueva): configuración de Capacitor, plugin de ubicación en segundo plano, permisos de Android (ubicación siempre, notificaciones, servicio en primer plano), optimización de batería y construcción del APK.
- **`pruebas-pwa-movil`**: matriz de dispositivos, pantalla bloqueada, app en segundo plano, varias personas y verificación responsive.

Los agentes deben limitar los cambios a su área, seguir las políticas de privacidad del proyecto y pedir confirmación antes de ampliar el alcance o conservar más historial del acordado.

## Criterios de aceptación

- Una persona puede invitar a varias (hasta 10); cada una solo puede unirse con su propia invitación.
- Quien comparte ve la lista de quienes la pueden ver y puede quitar a cualquiera; la persona quitada deja de verla de inmediato.
- Quien monitorea ve en un mismo mapa a todas las personas que le comparten su ubicación, distinguibles por nombre y color, y recibe sus cambios sin recargar.
- Con la app instalada en Android, la ubicación sigue actualizándose con la pantalla bloqueada durante al menos 30 minutos, con la notificación visible.
- La pantalla de monitoreo distingue ubicación actualizada de obsoleta e informa cuando la precisión o la altitud no están disponibles.
- Al pulsar **Detener**, dejan de enviarse actualizaciones; una persona no invitada no puede leer nada.
- Las pantallas se pueden usar en celular y computadora.
- Se ha probado en los celulares reales, incluyendo permiso denegado, pérdida de conexión, pantalla bloqueada y app en segundo plano.

## Estado actual y próximos pasos

Hecho (versión web para dos personas):

- **Dos aplicaciones separadas** con su propio link, icono, color y manifiesto: app de ubicación y app de monitoreo, más una portada.
- App de ubicación: crear sesión, Iniciar/Detener, código de invitación automático, revocar acceso, terminar sesión.
- App de monitoreo: unirse con código, mapa grande en tiempo real, última actualización destacada, salir.
- Firestore con reglas probadas, tiempo real y publicación automática en GitHub Pages.

Por hacer, en este orden:

1. **Modelo de varias personas**: nombre visible, `shares` con `viewerIds`, invitaciones por persona, nuevas reglas y sus pruebas.
2. **Varias personas en cada app**: lista de observadores en la app de ubicación y mapa con varias personas en la de monitoreo.
3. **App de ubicación para Android con Capacitor** y ubicación en segundo plano; construir el APK.
4. Probar en los celulares reales, incluida la pantalla bloqueada.
5. Decidir si se guarda el historial del recorrido y si se necesita iPhone.

## Referencias

- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Capacitor](https://capacitorjs.com/docs)
- [Android: acceso a la ubicación en segundo plano](https://developer.android.com/develop/sensors-and-location/location/background)
- [Firebase: Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase: reglas de seguridad de Firestore](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase: precios y cuotas](https://firebase.google.com/pricing)
- [Leaflet: API reference](https://leafletjs.com/reference.html)
