const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const auth = require('../middleware/auth');
const storage = require('../lib/storage');
const asyncHandler = require('../lib/asyncHandler');
const { optimizarFoto360 } = require('../lib/imagenes');
const { obtenerOCrearTour } = require('../lib/tours');

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

      const bufferOptimizado = await optimizarFoto360(req.file.buffer);
      const storageKey = await storage.upload(bufferOptimizado, {
        folder: `propiedades/${propiedad.id}/escenas`,
        mimetype: 'image/jpeg',
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

router.put('/:escenaId/posicion-plano', asyncHandler(async (req, res) => {
  const escena = await buscarEscenaPropia(req.params.escenaId, req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!escena) {
    return res.status(404).json({ error: 'No encontramos esa escena' });
  }

  const { pos_x, pos_y } = req.body;
  if (typeof pos_x !== 'number' || pos_x < 0 || pos_x > 100 || typeof pos_y !== 'number' || pos_y < 0 || pos_y > 100) {
    return res.status(400).json({ error: 'La posición tiene que ser un porcentaje entre 0 y 100' });
  }

  await db.query('UPDATE escenas SET pos_x_plano = ?, pos_y_plano = ? WHERE id = ?', [pos_x, pos_y, escena.id]);
  res.json({ escena: { ...escena, pos_x_plano: pos_x, pos_y_plano: pos_y } });
}));

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
