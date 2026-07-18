const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const superadminAuth = require('../middleware/superadminAuth');
const asyncHandler = require('../lib/asyncHandler');
const { camposFaltantes, emailValido } = require('../lib/validar');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const faltantes = camposFaltantes(req.body, ['email', 'password']);
  if (faltantes.length > 0 || !emailValido(email)) {
    return res.status(400).json({ error: 'Ingresá tu email y tu contraseña' });
  }

  const [filas] = await db.query('SELECT id, email, password_hash FROM superadmins WHERE email = ?', [email]);
  const superadmin = filas[0];
  if (!superadmin || !(await bcrypt.compare(password, superadmin.password_hash))) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  const token = jwt.sign({ tipo: 'superadmin', id: superadmin.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, superadmin: { id: superadmin.id, email: superadmin.email } });
}));

router.use(superadminAuth);

// GET /api/superadmin/inmobiliarias — todas, con estadísticas básicas de uso
router.get('/inmobiliarias', asyncHandler(async (req, res) => {
  const [inmobiliarias] = await db.query(`
    SELECT
      i.id, i.nombre, i.slug, i.email_contacto, i.telefono, i.activa, i.creado_en,
      (SELECT COUNT(*) FROM usuarios u WHERE u.inmobiliaria_id = i.id) AS cantidad_usuarios,
      (SELECT COUNT(*) FROM propiedades p WHERE p.inmobiliaria_id = i.id) AS cantidad_propiedades,
      (SELECT COUNT(*) FROM leads l WHERE l.inmobiliaria_id = i.id) AS cantidad_leads
    FROM inmobiliarias i
    ORDER BY i.creado_en DESC
  `);
  res.json({ inmobiliarias });
}));

router.put('/inmobiliarias/:id/activa', asyncHandler(async (req, res) => {
  if (typeof req.body.activa !== 'boolean') {
    return res.status(400).json({ error: 'Falta indicar el nuevo estado (activa: true/false)' });
  }

  const [resultado] = await db.query('UPDATE inmobiliarias SET activa = ? WHERE id = ?', [
    req.body.activa ? 1 : 0,
    req.params.id,
  ]);
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ error: 'No encontramos esa inmobiliaria' });
  }

  res.json({ mensaje: req.body.activa ? 'Inmobiliaria activada' : 'Inmobiliaria desactivada' });
}));

module.exports = router;
