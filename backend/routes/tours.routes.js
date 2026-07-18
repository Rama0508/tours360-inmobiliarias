const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(auth);

async function buscarPropiedadPropia(propiedadId, inmobiliariaId) {
  const [filas] = await db.query('SELECT id FROM propiedades WHERE id = ? AND inmobiliaria_id = ?', [
    propiedadId,
    inmobiliariaId,
  ]);
  return filas[0] || null;
}

// GET /api/admin/propiedades/:propiedadId/tour — trae el tour con sus escenas y hotspots
router.get('/', async (req, res) => {
  const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedad.id]);
  if (tours.length === 0) {
    return res.json({ tour: null });
  }
  const tour = tours[0];

  const [escenas] = await db.query('SELECT * FROM escenas WHERE tour_id = ? ORDER BY orden, id', [tour.id]);
  const [hotspots] = await db.query(
    `SELECT h.* FROM hotspots h JOIN escenas e ON h.escena_id = e.id WHERE e.tour_id = ?`,
    [tour.id]
  );

  res.json({ tour: { ...tour, escenas, hotspots } });
});

// POST /api/admin/propiedades/:propiedadId/tour — crea el tour si no existe (una propiedad = un tour)
router.post('/', async (req, res) => {
  const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const [existente] = await db.query('SELECT id FROM tours WHERE propiedad_id = ?', [propiedad.id]);
  if (existente.length > 0) {
    return res.status(400).json({ error: 'Esta propiedad ya tiene un tour creado' });
  }

  const [resultado] = await db.query('INSERT INTO tours (propiedad_id) VALUES (?)', [propiedad.id]);
  const [tours] = await db.query('SELECT * FROM tours WHERE id = ?', [resultado.insertId]);
  res.status(201).json({ tour: tours[0] });
});

module.exports = router;
