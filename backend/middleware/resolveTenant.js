const db = require('../config/db');
const asyncHandler = require('../lib/asyncHandler');

const resolveTenant = asyncHandler(async (req, res, next) => {
  const [filas] = await db.query('SELECT id, nombre, slug FROM inmobiliarias WHERE slug = ? AND activa = 1', [
    req.params.slug,
  ]);
  if (filas.length === 0) {
    return res.status(404).json({ error: 'No encontramos esa inmobiliaria' });
  }
  req.inmobiliaria = filas[0];
  next();
});

module.exports = resolveTenant;
