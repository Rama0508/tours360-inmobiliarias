const express = require('express');
const db = require('../config/db');
const resolveTenant = require('../middleware/resolveTenant');
const storage = require('../lib/storage');
const { camposFaltantes } = require('../lib/validar');
const asyncHandler = require('../lib/asyncHandler');
const { buscarPropiedadPublicada } = require('../lib/propiedadPublica');

const router = express.Router();

router.get('/:slug/propiedades/:propiedadSlug', resolveTenant, asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPublicada(req.inmobiliaria.id, req.params.propiedadSlug);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad, puede que ya no esté disponible' });
  }

  const [fotos] = await db.query(
    'SELECT id, storage_key, orden FROM fotos_propiedad WHERE propiedad_id = ? ORDER BY orden, id',
    [propiedad.id]
  );

  let tour = null;
  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedad.id]);
  if (tours.length > 0) {
    tour = tours[0];
    const [escenas] = await db.query('SELECT * FROM escenas WHERE tour_id = ? ORDER BY orden, id', [tour.id]);
    const [hotspots] = await db.query(
      'SELECT h.* FROM hotspots h JOIN escenas e ON h.escena_id = e.id WHERE e.tour_id = ?',
      [tour.id]
    );
    tour = {
      ...tour,
      escenas: escenas.map((e) => ({ ...e, url: storage.getUrl(e.storage_key) })),
      hotspots,
    };
  }

  res.json({
    inmobiliaria: {
      nombre: req.inmobiliaria.nombre,
      logo_url: req.inmobiliaria.logo_url,
      color_primario: req.inmobiliaria.color_primario,
    },
    propiedad,
    fotos: fotos.map((f) => ({ id: f.id, url: storage.getUrl(f.storage_key) })),
    tour,
  });
}));

router.post('/:slug/propiedades/:propiedadSlug/leads', resolveTenant, asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPublicada(req.inmobiliaria.id, req.params.propiedadSlug);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad, puede que ya no esté disponible' });
  }

  const faltantes = camposFaltantes(req.body, ['nombre', 'telefono']);
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Completá tu nombre y tu teléfono para que te podamos contactar' });
  }

  const { nombre, telefono, email, mensaje } = req.body;

  await db.query(
    'INSERT INTO leads (propiedad_id, inmobiliaria_id, nombre, telefono, email, mensaje) VALUES (?, ?, ?, ?, ?, ?)',
    [propiedad.id, req.inmobiliaria.id, nombre, telefono, email || null, mensaje || null]
  );

  res.status(201).json({ mensaje: 'Gracias, ya recibimos tu consulta. Te van a contactar a la brevedad.' });
}));

module.exports = router;
