const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { enviarEmail } = require('../lib/email');
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
    `SELECT u.id, u.inmobiliaria_id, u.nombre, u.email, u.password_hash, u.rol
     FROM usuarios u
     JOIN inmobiliarias i ON u.inmobiliaria_id = i.id
     WHERE u.email = ? AND u.activo = 1 AND i.activa = 1`,
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

const MENSAJE_GENERICO_RESET = 'Si ese email está registrado, te enviamos un link para restablecer tu contraseña.';

router.post('/solicitar-reset', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!emailValido(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  const [filas] = await db.query('SELECT id, nombre FROM usuarios WHERE email = ? AND activo = 1', [email]);
  const usuario = filas[0];

  // Siempre respondemos lo mismo, exista o no el email, para no dejar
  // adivinar qué emails están registrados.
  if (!usuario) {
    return res.json({ mensaje: MENSAJE_GENERICO_RESET });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await db.query('UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE id = ?', [
    token,
    expira,
    usuario.id,
  ]);

  const urlReset = `${req.protocol}://${req.get('host')}/resetear.html?token=${token}`;

  try {
    await enviarEmail({
      para: email,
      asunto: 'Restablecer tu contraseña — Tours 360',
      html: `
        <p>Hola ${usuario.nombre},</p>
        <p>Pediste restablecer tu contraseña. Este link vale por 1 hora:</p>
        <p><a href="${urlReset}">${urlReset}</a></p>
        <p>Si no fuiste vos, ignorá este email.</p>
      `,
    });
  } catch (error) {
    console.error('No se pudo enviar el email de recuperación:', error.message);
  }

  res.json({ mensaje: MENSAJE_GENERICO_RESET });
}));

router.post('/resetear-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const faltantes = camposFaltantes(req.body, ['token', 'password']);
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Faltan datos para restablecer la contraseña' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres' });
  }

  const [filas] = await db.query(
    'SELECT id FROM usuarios WHERE reset_token = ? AND reset_token_expira > NOW()',
    [token]
  );
  const usuario = filas[0];
  if (!usuario) {
    return res.status(400).json({ error: 'El link venció o ya se usó. Pedí uno nuevo.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.query('UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expira = NULL WHERE id = ?', [
    passwordHash,
    usuario.id,
  ]);

  res.json({ mensaje: 'Contraseña actualizada. Ya podés iniciar sesión.' });
}));

module.exports = router;
