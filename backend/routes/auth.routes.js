const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { camposFaltantes, emailValido } = require('../lib/validar');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const faltantes = camposFaltantes(req.body, ['email', 'password']);
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Ingresá tu email y tu contraseña' });
  }
  if (!emailValido(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  const [filas] = await db.query(
    'SELECT id, inmobiliaria_id, nombre, email, password_hash, rol FROM usuarios WHERE email = ? AND activo = 1',
    [email]
  );
  const usuario = filas[0];

  if (!usuario) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  const passwordOk = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  const token = jwt.sign(
    { id: usuario.id, inmobiliaria_id: usuario.inmobiliaria_id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}));

router.get('/me', auth, (req, res) => {
  res.json({ usuario: req.usuario });
});

module.exports = router;
