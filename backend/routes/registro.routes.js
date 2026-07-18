const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const asyncHandler = require('../lib/asyncHandler');
const { camposFaltantes, emailValido } = require('../lib/validar');
const { generarSlug } = require('../lib/slugs');

const router = express.Router();

// Slugs que no puede usar una inmobiliaria porque colisionan con rutas fijas de la app.
const SLUGS_RESERVADOS = [
  'admin', 'api', 'login', 'uploads', 'shared', 'public', 'superadmin',
  'health', 'registro', 'recuperar', 'resetear', 'terminos', 'propiedad',
];

router.post('/', asyncHandler(async (req, res) => {
  const faltantes = camposFaltantes(req.body, ['nombre_inmobiliaria', 'nombre_agente', 'email', 'password']);
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Completá todos los campos obligatorios' });
  }
  if (!req.body.acepto_terminos) {
    return res.status(400).json({ error: 'Tenés que aceptar los términos para registrarte' });
  }

  const { nombre_inmobiliaria, nombre_agente, email, password, telefono } = req.body;

  if (!emailValido(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña tiene que tener al menos 8 caracteres' });
  }

  const [emailExistente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (emailExistente.length > 0) {
    return res.status(400).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const slugBase = generarSlug(nombre_inmobiliaria) || 'inmobiliaria';
  let slug = slugBase;
  let intento = 1;
  while (true) {
    if (!SLUGS_RESERVADOS.includes(slug)) {
      const [existe] = await db.query('SELECT id FROM inmobiliarias WHERE slug = ?', [slug]);
      if (existe.length === 0) break;
    }
    intento += 1;
    slug = `${slugBase}-${intento}`;
  }

  const [resultadoInmobiliaria] = await db.query(
    'INSERT INTO inmobiliarias (nombre, slug, email_contacto, telefono) VALUES (?, ?, ?, ?)',
    [nombre_inmobiliaria.trim(), slug, email, telefono || null]
  );
  const inmobiliariaId = resultadoInmobiliaria.insertId;

  const passwordHash = await bcrypt.hash(password, 10);
  const [resultadoUsuario] = await db.query(
    'INSERT INTO usuarios (inmobiliaria_id, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [inmobiliariaId, nombre_agente.trim(), email, passwordHash, 'admin']
  );

  const token = jwt.sign(
    { id: resultadoUsuario.insertId, inmobiliaria_id: inmobiliariaId, rol: 'admin', nombre: nombre_agente.trim() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.status(201).json({
    token,
    usuario: { id: resultadoUsuario.insertId, nombre: nombre_agente.trim(), email, rol: 'admin' },
    inmobiliaria: { slug },
  });
}));

module.exports = router;
