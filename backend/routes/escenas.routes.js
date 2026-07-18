const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const auth = require('../middleware/auth');
const storage = require('../lib/storage');
const asyncHandler = require('../lib/asyncHandler');

const router = express.Router({ mergeParams: true });
router.use(auth);

const MIMETYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Solo se permiten fotos JPG, PNG o WEBP'));
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

async function obtenerOCrearTour(propiedadId) {
  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedadId]);
  if (tours.length > 0) return tours[0];

  const [resultado] = await db.query('INSERT INTO tours (propiedad_id) VALUES (?)', [propiedadId]);
  const [nuevo] = await db.query('SELECT * FROM tours WHERE id = ?', [resultado.insertId]);
  return nuevo[0];
}

// escena_id -> tour_id -> propiedad_id -> inmobiliaria_id, para no confiar en el propiedadId de la URL
async function buscarEscenaPropia(escenaId, propiedadId, inmobiliariaId) {
  const [filas] = await db.query(
    `SELECT e.* FROM escenas e
     JOIN tours t ON e.tour_id = t.id
     JOIN propiedades p ON t.propiedad_id = p.id
     WHERE e.id = ? AND t.propiedad_id = ? AND p.inmobiliaria_id = ?`,
    [escenaId, propiedadId, inmobiliariaId]
  );
  return filas[0] || null;
}

router.post('/', (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tenés que adjuntar una foto 360' });
    }
    if (!req.body.nombre || !req.body.nombre.trim()) {
      return res.status(400).json({ error: 'Ponele un nombre al ambiente (ej. "Living")' });
    }

    (async () => {
      const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
      if (!propiedad) {
        return res.status(404).json({ error: 'No encontramos esa propiedad' });
      }

      const tour = await obtenerOCrearTour(propiedad.id);

      const storageKey = await storage.upload(req.file.buffer, {
        folder: `propiedades/${propiedad.id}/escenas`,
        mimetype: req.file.mimetype,
      });

      const [resultado] = await db.query(
        'INSERT INTO escenas (tour_id, nombre, storage_key) VALUES (?, ?, ?)',
        [tour.id, req.body.nombre.trim(), storageKey]
      );

      if (!tour.escena_inicial_id) {
        await db.query('UPDATE tours SET escena_inicial_id = ? WHERE id = ?', [resultado.insertId, tour.id]);
      }

      const [escenas] = await db.query('SELECT * FROM escenas WHERE id = ?', [resultado.insertId]);
      const escena = escenas[0];
      res.status(201).json({ escena: { ...escena, url: storage.getUrl(escena.storage_key) } });
    })().catch(next);
  });
});

router.delete('/:escenaId', asyncHandler(async (req, res) => {
  const escena = await buscarEscenaPropia(req.params.escenaId, req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!escena) {
    return res.status(404).json({ error: 'No encontramos esa escena' });
  }

  await db.query('DELETE FROM escenas WHERE id = ?', [escena.id]);
  await storage.delete(escena.storage_key);
  res.status(204).send();
}));

module.exports = router;
