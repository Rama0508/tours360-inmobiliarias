const db = require('../config/db');
const storage = require('./storage');

async function buscarInmobiliariaPorSlug(slug) {
  const [filas] = await db.query('SELECT id, nombre, slug FROM inmobiliarias WHERE slug = ? AND activa = 1', [slug]);
  return filas[0] || null;
}

async function buscarPropiedadPublicada(inmobiliariaId, propiedadSlug) {
  const [filas] = await db.query(
    'SELECT * FROM propiedades WHERE inmobiliaria_id = ? AND slug = ? AND estado = ?',
    [inmobiliariaId, propiedadSlug, 'publicada']
  );
  return filas[0] || null;
}

// Portada para compartir (ej. vista previa de WhatsApp): la foto de portada
// si el agente la eligió, si no la primera foto de la galería, si no la
// primera escena del tour.
async function obtenerUrlPortada(propiedad) {
  if (propiedad.foto_portada_url) return propiedad.foto_portada_url;

  const [fotos] = await db.query(
    'SELECT storage_key FROM fotos_propiedad WHERE propiedad_id = ? ORDER BY orden, id LIMIT 1',
    [propiedad.id]
  );
  if (fotos[0]) return storage.getUrl(fotos[0].storage_key);

  const [escenas] = await db.query(
    `SELECT e.storage_key FROM escenas e JOIN tours t ON e.tour_id = t.id
     WHERE t.propiedad_id = ? ORDER BY e.orden, e.id LIMIT 1`,
    [propiedad.id]
  );
  if (escenas[0]) return storage.getUrl(escenas[0].storage_key);

  return null;
}

module.exports = { buscarInmobiliariaPorSlug, buscarPropiedadPublicada, obtenerUrlPortada };
