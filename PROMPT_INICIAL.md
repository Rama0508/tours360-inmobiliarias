# Prompt para Claude Code — Plataforma de Tours Virtuales Inmobiliarios

> Instrucciones de uso al final del archivo. Esto es lo que copiás y pegás
> como primer mensaje a Claude Code, parado adentro de la carpeta del proyecto.

---

## Contexto

Soy desarrollador freelance en San Pedro de Jujuy, Argentina. Vengo de construir
sitios web para inmobiliarias y asociaciones profesionales locales (mi stack
habitual es Node.js + Express + MySQL, deploy en VPS Hostinger con Nginx, PM2,
Cloudflare y Let's Encrypt). Quiero construir un producto propio, no un
proyecto de un cliente: una plataforma de **tours virtuales 360° para
inmobiliarias**, que después voy a extender a constructoras para tours de
edificios en preventa. Este primer proyecto es solo la fase 1 (inmobiliarias).

Ya tengo un esqueleto funcional armado (te voy a copiar los archivos a esta
carpeta antes de que arranques — leelos enteros antes de tocar nada). Incluye:

- `backend/schema.sql` — modelo de datos MySQL completo (inmobiliarias,
  usuarios, propiedades, tours, escenas, hotspots, leads)
- `backend/server.js` + `backend/routes/*.js` — API Express con CRUD de
  propiedades, tours, escenas (upload de fotos 360), hotspots y leads
- `frontend/demo-viewer.html` — visor 360 en Three.js, standalone, con
  navegación entre ambientes por hotspots y minimapa
- `frontend/admin-panel.html` — panel donde el agente sube la foto y hace
  clic sobre la imagen para colocar los puntos de navegación (sin tener que
  calcular yaw/pitch a mano)

Tu trabajo es tomar esto como punto de partida y llevarlo a un producto
completo, prolijo y listo para mostrarle a inmobiliarias reales.

## Qué quiero que construyas (fase 1 completa)

1. **Conectar de verdad el frontend con el backend.** Ahora mismo
   `demo-viewer.html` usa datos hardcodeados y `admin-panel.html` simula el
   guardado. Reemplazá eso por llamadas reales `fetch` a la API, con manejo
   de errores visible para el usuario (no solo `console.error`).

2. **Autenticación.** Login de inmobiliaria/agente con JWT. Cada agente solo
   puede ver y editar las propiedades de su propia inmobiliaria
   (`inmobiliaria_id`). Passwords con bcrypt, nunca en texto plano.

3. **Panel de administración completo**, no solo el editor de hotspots:
   - Alta/edición/baja de propiedades (formulario con todos los campos del
     schema: tipo, operación, precio, m², ambientes, etc.)
   - Galería de fotos comunes de la propiedad (no 360), además del tour
   - Listado de propiedades con filtros por estado (borrador/publicada/pausada/vendida)
   - Panel de leads: ver quién dejó sus datos en cada propiedad, con fecha
     y poder marcarlos como contactados

4. **Página pública de la propiedad** (la que ve el comprador final):
   URL propia por propiedad (ej. `/propiedad/casa-barrio-norte-14`), con el
   visor 360 embebido, datos de la propiedad, galería de fotos, y el
   formulario de contacto que efectivamente guarda el lead en la base.

5. **Subida de fotos 360 real a almacenamiento externo**, no al disco del
   VPS — usá Cloudflare R2 (S3-compatible) para que esto escale a varios
   clientes sin llenar el disco del servidor. Si no tengo credenciales
   configuradas, dejalo andando con el disco local pero con la capa de
   abstracción lista para cambiar a R2 con una variable de entorno.

6. **Responsive real**, mobile-first en el visor público (la mayoría de la
   gente va a entrar desde el celular, compartido por WhatsApp).

7. **Multi-tenant desde el diseño**: tiene que quedar preparado para vender
   esto a más de una inmobiliaria sin tocar código — cada una con su propio
   subdominio o slug (ej. `solucionesinmobiliarias.tudominio.com` o
   `tudominio.com/solucionesinmobiliarias`), decidí vos cuál es más simple
   de operar y explicame por qué.

## Cómo quiero que trabajes (esto es innegociable para mí)

- **Preguntame antes de asumir** cuando haya una decisión de arquitectura
  con trade-offs reales (ej. subdominios vs. slugs, qué proveedor de
  storage, qué librería de mapas de hotspots). No inventes en silencio algo
  que después sea difícil de deshacer.
- **Explicame las decisiones técnicas en criollo**, como si me las tuvieras
  que justificar a mí, no a otro desarrollador senior. Soy estudiante
  avanzado de la carrera de IA y vengo de desarrollo web, pero no soy experto
  en arquitectura de sistemas grandes — priorizá que entienda el por qué.
- **Entregá cambios incrementales**, no reescribas todo el proyecto de
  una. Cuando modifiques algo que ya existe, decime exactamente qué archivo
  cambiaste y por qué, no me tires el proyecto entero de nuevo.
- **Commits de git chicos y descriptivos** en español, uno por
  funcionalidad terminada y probada, no un commit gigante al final.
- **Nada de dependencias innecesarias.** Si podés resolver algo con lo que
  ya está instalado, no sumes una librería nueva "por las dudas".
- **Priorizá que funcione y sea mantenible por mí solo** por sobre que sea
  técnicamente impresionante. Voy a ser yo el que le dé soporte a esto
  después, no un equipo.
- Contame si algo del esqueleto que te paso está mal pensado o te parece
  que hay una forma mejor de resolverlo — no lo sigas al pie de la letra
  solo porque ya está escrito.

## Estándar de calidad esperado

- Sin errores en consola del navegador ni warnings de Node en condiciones
  normales de uso.
- Validación de datos tanto en frontend como en backend (no confiar solo en
  el formulario).
- Manejo de estados de carga y error visibles para el usuario en cada
  pantalla (no pantallas en blanco mientras algo tarda o falla).
- Los mensajes de error, botones y textos de la interfaz, todos en español
  rioplatense, tono claro y directo, sin tecnicismos innecesarios para el
  usuario final (el agente inmobiliario, no el desarrollador).
- Antes de dar por terminada una funcionalidad, probala vos mismo
  end-to-end (crear una propiedad de prueba, subir una foto de prueba,
  simular un lead) y contame qué probaste.

## Qué NO quiero en esta fase

- No implementes el visor de modelo 3D/GLB para constructoras todavía —
  eso es fase 2, pero dejá el campo `tours.tipo` y `tours.modelo_url` del
  schema tal como están para no tener que migrar la base después.
- No integres pasarela de pagos todavía (no es necesaria para esta fase).
- No hagas diseño de marketing/landing de venta de la plataforma en sí —
  eso lo pienso yo después. Enfocate en el producto funcional.

## Primer paso

Antes de escribir código, leé todos los archivos que te copié, y dame:
1. Un resumen de si el esqueleto actual te parece una base sólida o si
   cambiarías algo estructural antes de seguir
2. Un plan de trabajo en etapas chicas (no todo de una)
3. Las preguntas de arquitectura que necesitás que te responda antes de
   arrancar (storage, subdominios, lo que sea)

---

## Instrucciones de uso (esto no es parte del prompt, es para vos)

1. Creá la carpeta del proyecto en tu compu, separada de todo lo demás:

   ```bash
   mkdir ~/Proyectos/tours360-inmobiliarias
   cd ~/Proyectos/tours360-inmobiliarias
   git init
   ```

   (en Windows con PowerShell: `mkdir $HOME\Proyectos\tours360-inmobiliarias`)

2. Copiá adentro los archivos del esqueleto que ya armamos
   (`backend/`, `frontend/`, `README.md`, este mismo prompt como
   `PROMPT_INICIAL.md` para que quede documentado).

3. Abrí Claude Code parado en esa carpeta:

   ```bash
   claude
   ```

4. Pegale el contenido de la sección de arriba (desde "## Contexto" hasta
   "## Primer paso") como tu primer mensaje.

5. Dejá que te haga las preguntas de arquitectura antes de que empiece a
   picar código — es a propósito, para que no tengas que deshacer nada.
