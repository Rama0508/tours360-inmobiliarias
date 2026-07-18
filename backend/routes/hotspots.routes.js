const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(auth);

async function buscarEscenaPropia(escenaId, propiedadId, inmobiliariaId) {
  const [filas] = await db.query(
    `SELECT e.*, t.id AS tour_id FROM escenas e
     JOIN tours t ON e.tour_id = t.id
     JOIN propiedades p ON t.propiedad_id = p.id
     WHERE e.id = ? AND t.propiedad_id = ? AND p.inmobiliaria_id = ?`,
    [escenaId, propiedadId, inmobiliariaId]
  );
  return filas[0] || null;
}

router.post('/', async (req, res) => {
  const escena = await buscarEscenaPropia(req.params.escenaId, req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!escena) {
    return res.status(404).json({ error: 'No encontramos esa escena' });
  }

  const { yaw, pitch, escena_destino_id, etiqueta, tipo } = req.body;

  if (typeof yaw !== 'number' || yaw < -180 || yaw > 180) {
    return res.status(400).json({ error: 'El yaw tiene que ser un número entre -180 y 180' });
  }
  if (typeof pitch !== 'number' || pitch < -90 || pitch > 90) {
    return res.status(400).json({ error: 'El pitch tiene que ser un número entre -90 y 90' });
  }

  let escenaDestinoId = null;
  if (escena_destino_id) {
    const [destino] = await db.query('SELECT id FROM escenas WHERE id = ? AND tour_id = ?', [
      escena_destino_id,
      escena.tour_id,
    ]);
    if (destino.length === 0) {
      return res.status(400).json({ error: 'La escena de destino no pertenece a este tour' });
    }
    escenaDestinoId = escena_destino_id;
  }

  const [resultado] = await db.query(
    'INSERT INTO hotspots (escena_id, escena_destino_id, tipo, yaw, pitch, etiqueta) VALUES (?, ?, ?, ?, ?, ?)',
    [escena.id, escenaDestinoId, tipo === 'info' ? 'info' : 'navegacion', yaw, pitch, etiqueta || null]
  );

  const [hotspots] = await db.query('SELECT * FROM hotspots WHERE id = ?', [resultado.insertId]);
  res.status(201).json({ hotspot: hotspots[0] });
});

router.delete('/:hotspotId', async (req, res) => {
  const escena = await buscarEscenaPropia(req.params.escenaId, req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!escena) {
    return res.status(404).json({ error: 'No encontramos esa escena' });
  }

  const [resultado] = await db.query('DELETE FROM hotspots WHERE id = ? AND escena_id = ?', [
    req.params.hotspotId,
    escena.id,
  ]);
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ error: 'No encontramos ese hotspot' });
  }
  res.status(204).send();
});

module.exports = router;
