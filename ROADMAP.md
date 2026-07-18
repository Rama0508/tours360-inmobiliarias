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

## Fase 2 — Pulido profesional (que no dé vergüenza mostrarlo a un cliente real) ✅ TERMINADA

- [x] Vista previa al compartir por WhatsApp (Open Graph server-side: título,
      descripción, imagen de portada).
- [x] Branding por inmobiliaria: logo y color propio en la página pública
      (panel "Mi inmobiliaria", solo el rol admin puede editarlo).
- [x] Recuperar contraseña por email (Resend).
- [x] Notificación de lead nuevo por email al agente dueño de la propiedad.
- [x] Optimización automática de imágenes al subir (sharp: fotos comunes
      máx. 1600px, fotos 360 máx. 4096x2048, todo a JPEG calidad 82).

**Pendiente para producción (fase 5):** Resend en modo sandbox solo permite
mandar emails a la casilla del dueño de la cuenta — falta verificar un
dominio propio para poder notificar a cualquier agente/comprador real.

## Fase 3 — Planos y medidas ✅ TERMINADA

- [x] Subida de un plano de la propiedad (tours.plano_storage_key).
- [x] Marcar cada ambiente sobre el plano (escenas.pos_x_plano/pos_y_plano,
      editor en tour-editor.html, mismo patrón que los hotspots pero en 2D).
- [x] Plano interactivo clickeable en la página pública, complementando
      (no reemplazando) el selector de ambientes en lista.

Las "medidas" (m², ambientes, dormitorios, baños) ya existían desde la fase 1
a nivel propiedad — esta fase se enfocó en la ubicación visual de cada
ambiente sobre un plano, no en medidas por ambiente individual.

## Fase 4 — Infraestructura de negocio (multi-tenant real, vender a muchas inmobiliarias) 🔨 CASI TERMINADA

- [x] Registro self-service de inmobiliarias (/registro.html).
- [x] Panel de superadmin (/superadmin, listar/activar/desactivar inmobiliarias
      con estadísticas básicas).
- [x] Términos y condiciones + consentimiento de datos personales en el
      formulario de lead y en el registro (Ley 25.326, Argentina).
- [x] Infraestructura de facturación con Mercado Pago (suscripciones
      recurrentes vía preapproval, webhook de cambio de estado). Precio
      configurable por variable de entorno ($15.000 ARS/mes de arranque).

**Pendiente:** probar el flujo de pago real end-to-end — necesita las
credenciales de Mercado Pago (Access Token + Public Key) del usuario, y el
webhook necesita una URL pública para probarse de verdad (no funciona contra
localhost). Se retoma cuando haya despliegue real (fase 5) o un túnel
temporal (ngrok) para probar antes.

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

## Fase 7 — Tours 3D/GLB para constructoras — QUEDA AFUERA POR AHORA

Decisión confirmada: foco en inmobiliarias primero, esto se retoma después
de vender la fase 1. El schema ya tiene los campos (`tours.tipo`,
`tours.modelo_url`) reservados para no tener que migrar cuando llegue el momento.

---

## Decisiones de arquitectura ya tomadas (no volver a discutir sin motivo)

- Multi-tenant por slug en la URL, no subdominios.
- Storage con capa de abstracción: disco local hoy, R2 vía variable de entorno después.
- Varios agentes por inmobiliaria, email de login único global.
- Frontend HTML/JS vanilla, sin build step ni framework.
- Un tour por propiedad (no varios simultáneos).
- Transición entre ambientes: cross-fade + zoom (estilo Street View), sin
  geometría 3D real para caminar dentro de un ambiente.
