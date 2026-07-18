const express = require('express');
const multer = require('multer');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const storage = require('../lib/storage');
const { optimizarLogo } = require('../lib/imagenes');

const router = express.Router();
router.use(auth);

const MIMETYPES_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!MIMETYPES_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('El logo tiene que ser PNG, JPG, WEBP o SVG'));
    }
    cb(null, true);
  },
});

function exigirAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador de la inmobiliaria puede cambiar estos datos' });
  }
  next();
}

router.get('/', asyncHandler(async (req, res) => {
  const [filas] = await db.query(
    'SELECT id, nombre, slug, email_contacto, telefono, logo_url, color_primario FROM inmobiliarias WHERE id = ?',
    [req.usuario.inmobiliaria_id]
  );
  res.json({ inmobiliaria: filas[0] });
}));

router.put('/', exigirAdmin, asyncHandler(async (req, res) => {
  const { nombre, email_contacto, telefono, color_primario } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre de la inmobiliaria no puede estar vacío' });
  }
  if (color_primario && !/^#[0-9a-fA-F]{6}$/.test(color_primario)) {
    return res.status(400).json({ error: 'El color tiene que tener formato #rrggbb' });
  }

  await db.query(
    'UPDATE inmobiliarias SET nombre = ?, email_contacto = ?, telefono = ?, color_primario = ? WHERE id = ?',
    [nombre.trim(), email_contacto || null, telefono || null, color_primario || null, req.usuario.inmobiliaria_id]
  );

  const [filas] = await db.query(
    'SELECT id, nombre, slug, email_contacto, telefono, logo_url, color_primario FROM inmobiliarias WHERE id = ?',
    [req.usuario.inmobiliaria_id]
  );
  res.json({ inmobiliaria: filas[0] });
}));

router.post('/logo', exigirAdmin, (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Tenés que adjuntar una imagen' });
    }

    (async () => {
      const esSvg = req.file.mimetype === 'image/svg+xml';
      const buffer = esSvg ? req.file.buffer : await optimizarLogo(req.file.buffer);

      const storageKey = await storage.upload(buffer, {
        folder: `inmobiliarias/${req.usuario.inmobiliaria_id}`,
        mimetype: esSvg ? 'image/svg+xml' : 'image/png',
      });

      const logoUrl = storage.getUrl(storageKey);
      await db.query('UPDATE inmobiliarias SET logo_url = ? WHERE id = ?', [logoUrl, req.usuario.inmobiliaria_id]);

      res.status(201).json({ logo_url: logoUrl });
    })().catch(next);
  });
});

module.exports = router;
