const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');

const router = express.Router();
router.use(auth);

// GET /api/admin/leads?contactado=0
router.get('/', asyncHandler(async (req, res) => {
  const { contactado } = req.query;
  const params = [req.usuario.inmobiliaria_id];
  let sql = `
    SELECT l.*, p.titulo AS propiedad_titulo, p.slug AS propiedad_slug
    FROM leads l
    JOIN propiedades p ON l.propiedad_id = p.id
    WHERE l.inmobiliaria_id = ?
  `;

  if (contactado === '0' || contactado === '1') {
    sql += ' AND l.contactado = ?';
    params.push(contactado);
  }
  sql += ' ORDER BY l.creado_en DESC';

  const [leads] = await db.query(sql, params);
  res.json({ leads });
}));

router.put('/:id/contactado', asyncHandler(async (req, res) => {
  const [resultado] = await db.query('UPDATE leads SET contactado = 1 WHERE id = ? AND inmobiliaria_id = ?', [
    req.params.id,
    req.usuario.inmobiliaria_id,
  ]);
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ error: 'No encontramos ese lead' });
  }
  res.json({ mensaje: 'Lead marcado como contactado' });
}));

module.exports = router;
