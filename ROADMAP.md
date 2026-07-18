# Hoja de ruta — Tours 360 Inmobiliarias

Proyecto de largo plazo (semanas/meses), no un MVP descartable. Este archivo
es la fuente de verdad de en qué fase estamos y qué falta — se actualiza a
medida que se cierra cada etapa, para que cualquier sesión de trabajo futura
(con memoria nueva) pueda retomar sin perder contexto.

## Fase 1 — Producto funcional de una sola inmobiliaria ✅ TERMINADA

Backend Express + MySQL, login JWT, CRUD de propiedades, galería de fotos,
editor de tours 360 con hotspots, página pública con visor 360 (Three.js,
giroscopio, pantalla completa, transición estilo Street View), panel de
leads, manejo centralizado de errores. Ver historial de commits para el
detalle etapa por etapa.

## Fase 2 — Pulido profesional (que no dé vergüenza mostrarlo a un cliente real)

- [ ] Vista previa al compartir por WhatsApp (meta tags Open Graph: título,
      descripción, imagen de portada) — crítico porque todo el producto se
      comparte por link de WhatsApp y hoy no muestra nada.
- [ ] Branding por inmobiliaria: logo y color propio en la página pública y
      el panel (hoy todo dice "Tours 360" genérico).
- [ ] Recuperar contraseña (hoy si un agente se la olvida, no hay forma sin
      entrar a la base a mano).
- [ ] Notificación de lead nuevo por email (o WhatsApp) al agente.
- [ ] Optimización automática de imágenes al subir (redimensionar/comprimir,
      hoy se guarda tal cual la suba el agente, puede pesar varios MB).

## Fase 3 — Planos y medidas

- [ ] Subida de un plano de la propiedad (imagen).
- [ ] Marcar cada ambiente sobre el plano (editor similar al de hotspots,
      pero en 2D sobre el plano en vez de sobre la foto 360).
- [ ] Reemplazar (o complementar) el selector de ambientes en lista por un
      plano interactivo clickeable en la página pública.

## Fase 4 — Infraestructura de negocio (multi-tenant real, vender a muchas inmobiliarias)

- [ ] Registro self-service de inmobiliarias (hoy las creo yo a mano en la base).
- [ ] Panel de superadmin (ver todas las inmobiliarias, activar/desactivar, uso).
- [ ] Términos y condiciones + consentimiento de datos personales en el
      formulario de lead (Ley 25.326, Argentina).
- [ ] Facturación / suscripciones — pendiente decidir proveedor de pagos
      (MercadoPago es lo natural para Argentina).

## Fase 5 — Producción

- [ ] Deploy al VPS Hostinger con dominio propio y HTTPS (Nginx, PM2,
      Let's Encrypt/Cloudflare — el stack habitual del usuario).
- [ ] Backups automáticos (base de datos + fotos subidas).
- [ ] Monitoreo de errores en producción.
- [ ] Migrar storage de disco local a Cloudflare R2 (la capa de abstracción
      ya está lista desde la fase 1, falta implementar `storage.r2.js` con
      credenciales reales).

## Fase 6 — Mudanza virtual (poner tus muebles dentro de la propiedad)

- [ ] Versión simple: recorte tipo "sticker" de una foto propia, arrastrable
      y escalable a mano sobre la foto 360. Sin perspectiva real, pero rápido
      de construir y ya es un diferencial de marketing fuerte.
- [ ] Versión avanzada (aparte, más adelante): perspectiva y escala reales
      usando estimación de profundidad por IA — este es un proyecto en sí
      mismo, no una tarea chica.

## Fase 7 — Tours 3D/GLB para constructoras (fase 2 original del prompt, pendiente de confirmar si entra en el roadmap)

Explícitamente excluida al arrancar el proyecto. El schema ya tiene los
campos (`tours.tipo`, `tours.modelo_url`) reservados para esto. A confirmar
con el usuario si se suma acá o queda para después de vender la fase 1.

---

## Decisiones de arquitectura ya tomadas (no volver a discutir sin motivo)

- Multi-tenant por slug en la URL, no subdominios.
- Storage con capa de abstracción: disco local hoy, R2 vía variable de entorno después.
- Varios agentes por inmobiliaria, email de login único global.
- Frontend HTML/JS vanilla, sin build step ni framework.
- Un tour por propiedad (no varios simultáneos).
- Transición entre ambientes: cross-fade + zoom (estilo Street View), sin
  geometría 3D real para caminar dentro de un ambiente.
