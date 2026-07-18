const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const storage = require('../lib/storage');
const { optimizarPlano } = require('../lib/imagenes');
const { obtenerOCrearTour } = require('../lib/tours');

const router = express.Router({ mergeParams: true });
router.use(auth);

const MIMETYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('El plano tiene que ser JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

async function buscarPropiedadPropia(propiedadId, inmobiliariaId) {
  const [filas] = await db.query('SELECT id FROM propiedades WHERE id = ? AND inmobiliaria_id = ?', [
    propiedadId,
    inmobiliariaId,
  ]);
  return filas[0] || null;
}

// GET /api/admin/propiedades/:propiedadId/tour — trae el tour con sus escenas y hotspots
router.get('/', asyncHandler(async (req, res) => {
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

  res.json({
    tour: {
      ...tour,
      plano_url: tour.plano_storage_key ? storage.getUrl(tour.plano_storage_key) : null,
      escenas,
      hotspots,
    },
  });
}));

// POST /api/admin/propiedades/:propiedadId/tour — crea el tour si no existe (una propiedad = un tour)
router.post('/', asyncHandler(async (req, res) => {
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
}));

// POST /api/admin/propiedades/:propiedadId/tour/plano — sube o reemplaza el plano
router.post('/plano', (req, res, next) => {
  upload.single('plano')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tenés que adjuntar una imagen del plano' });
    }

    (async () => {
      const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
      if (!propiedad) {
        return res.status(404).json({ error: 'No encontramos esa propiedad' });
      }

      const tour = await obtenerOCrearTour(propiedad.id);

      if (tour.plano_storage_key) {
        await storage.delete(tour.plano_storage_key);
      }

      const bufferOptimizado = await optimizarPlano(req.file.buffer);
      const storageKey = await storage.upload(bufferOptimizado, {
        folder: `propiedades/${propiedad.id}/plano`,
        mimetype: 'image/png',
      });

      await db.query('UPDATE tours SET plano_storage_key = ? WHERE id = ?', [storageKey, tour.id]);
      res.status(201).json({ plano_url: storage.getUrl(storageKey) });
    })().catch(next);
  });
});

router.delete('/plano', asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedad.id]);
  const tour = tours[0];
  if (!tour || !tour.plano_storage_key) {
    return res.status(404).json({ error: 'Esta propiedad no tiene un plano cargado' });
  }

  await storage.delete(tour.plano_storage_key);
  await db.query('UPDATE tours SET plano_storage_key = NULL WHERE id = ?', [tour.id]);
  res.status(204).send();
}));

module.exports = router;
