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
  limits: { fileSize: 8 * 1024 * 1024 },
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

router.get('/', asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const [fotos] = await db.query(
    'SELECT id, storage_key, orden FROM fotos_propiedad WHERE propiedad_id = ? ORDER BY orden, id',
    [propiedad.id]
  );
  res.json({ fotos: fotos.map((f) => ({ id: f.id, url: storage.getUrl(f.storage_key), orden: f.orden })) });
}));

router.post('/', (req, res, next) => {
  upload.single('foto')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tenés que adjuntar una foto' });
    }

    (async () => {
      const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
      if (!propiedad) {
        return res.status(404).json({ error: 'No encontramos esa propiedad' });
      }

      const storageKey = await storage.upload(req.file.buffer, {
        folder: `propiedades/${propiedad.id}/fotos`,
        mimetype: req.file.mimetype,
      });

      const [resultado] = await db.query(
        'INSERT INTO fotos_propiedad (propiedad_id, storage_key) VALUES (?, ?)',
        [propiedad.id, storageKey]
      );

      res.status(201).json({ foto: { id: resultado.insertId, url: storage.getUrl(storageKey) } });
    })().catch(next);
  });
});

router.delete('/:fotoId', asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPropia(req.params.propiedadId, req.usuario.inmobiliaria_id);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const [filas] = await db.query('SELECT storage_key FROM fotos_propiedad WHERE id = ? AND propiedad_id = ?', [
    req.params.fotoId,
    propiedad.id,
  ]);
  const foto = filas[0];
  if (!foto) {
    return res.status(404).json({ error: 'No encontramos esa foto' });
  }

  await db.query('DELETE FROM fotos_propiedad WHERE id = ?', [req.params.fotoId]);
  await storage.delete(foto.storage_key);
  res.status(204).send();
}));

module.exports = router;
