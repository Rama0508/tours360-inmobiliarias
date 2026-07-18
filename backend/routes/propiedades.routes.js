const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { camposFaltantes } = require('../lib/validar');

const router = express.Router();
router.use(auth);

const TIPOS = ['casa', 'departamento', 'ph', 'terreno', 'local', 'oficina', 'galpon', 'otro'];
const OPERACIONES = ['venta', 'alquiler', 'alquiler_temporal'];
const MONEDAS = ['ARS', 'USD'];
const ESTADOS = ['borrador', 'publicada', 'pausada', 'vendida'];

function generarSlug(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function validarPropiedad(body) {
  const faltantes = camposFaltantes(body, ['titulo', 'tipo', 'operacion']);
  if (faltantes.length > 0) {
    return `Faltan completar: ${faltantes.join(', ')}`;
  }
  if (!TIPOS.includes(body.tipo)) {
    return 'El tipo de propiedad no es válido';
  }
  if (!OPERACIONES.includes(body.operacion)) {
    return 'El tipo de operación no es válido';
  }
  if (body.moneda && !MONEDAS.includes(body.moneda)) {
    return 'La moneda no es válida';
  }
  if (body.estado && !ESTADOS.includes(body.estado)) {
    return 'El estado no es válido';
  }
  if (body.precio !== undefined && body.precio !== null && Number.isNaN(Number(body.precio))) {
    return 'El precio tiene que ser un número';
  }
  return null;
}

// GET /api/admin/propiedades?estado=publicada
router.get('/', asyncHandler(async (req, res) => {
  const { estado } = req.query;
  const params = [req.usuario.inmobiliaria_id];
  let sql = 'SELECT * FROM propiedades WHERE inmobiliaria_id = ?';

  if (estado) {
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'El estado del filtro no es válido' });
    }
    sql += ' AND estado = ?';
    params.push(estado);
  }
  sql += ' ORDER BY creado_en DESC';

  const [propiedades] = await db.query(sql, params);
  res.json({ propiedades });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const [filas] = await db.query('SELECT * FROM propiedades WHERE id = ? AND inmobiliaria_id = ?', [
    req.params.id,
    req.usuario.inmobiliaria_id,
  ]);
  if (filas.length === 0) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }
  res.json({ propiedad: filas[0] });
}));

router.post('/', asyncHandler(async (req, res) => {
  const error = validarPropiedad(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const {
    titulo, descripcion, tipo, operacion, precio, moneda, m2_cubiertos, m2_totales,
    ambientes, dormitorios, banos, cochera, direccion, localidad, provincia, estado,
  } = req.body;

  const slugBase = generarSlug(titulo);
  let slug = slugBase;
  let intento = 1;
  while (true) {
    const [existe] = await db.query('SELECT id FROM propiedades WHERE inmobiliaria_id = ? AND slug = ?', [
      req.usuario.inmobiliaria_id,
      slug,
    ]);
    if (existe.length === 0) break;
    intento += 1;
    slug = `${slugBase}-${intento}`;
  }

  const [resultado] = await db.query(
    `INSERT INTO propiedades
      (inmobiliaria_id, agente_id, slug, titulo, descripcion, tipo, operacion, precio, moneda,
       m2_cubiertos, m2_totales, ambientes, dormitorios, banos, cochera, direccion, localidad, provincia, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.usuario.inmobiliaria_id, req.usuario.id, slug, titulo, descripcion || null, tipo, operacion,
      precio || null, moneda || 'ARS', m2_cubiertos || null, m2_totales || null, ambientes || null,
      dormitorios || null, banos || null, cochera ? 1 : 0, direccion || null, localidad || null,
      provincia || null, estado || 'borrador',
    ]
  );

  const [filas] = await db.query('SELECT * FROM propiedades WHERE id = ?', [resultado.insertId]);
  res.status(201).json({ propiedad: filas[0] });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const error = validarPropiedad(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const [existente] = await db.query('SELECT id FROM propiedades WHERE id = ? AND inmobiliaria_id = ?', [
    req.params.id,
    req.usuario.inmobiliaria_id,
  ]);
  if (existente.length === 0) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }

  const {
    titulo, descripcion, tipo, operacion, precio, moneda, m2_cubiertos, m2_totales,
    ambientes, dormitorios, banos, cochera, direccion, localidad, provincia, estado,
  } = req.body;

  await db.query(
    `UPDATE propiedades SET
      titulo = ?, descripcion = ?, tipo = ?, operacion = ?, precio = ?, moneda = ?,
      m2_cubiertos = ?, m2_totales = ?, ambientes = ?, dormitorios = ?, banos = ?, cochera = ?,
      direccion = ?, localidad = ?, provincia = ?, estado = ?
     WHERE id = ? AND inmobiliaria_id = ?`,
    [
      titulo, descripcion || null, tipo, operacion, precio || null, moneda || 'ARS',
      m2_cubiertos || null, m2_totales || null, ambientes || null, dormitorios || null, banos || null,
      cochera ? 1 : 0, direccion || null, localidad || null, provincia || null, estado || 'borrador',
      req.params.id, req.usuario.inmobiliaria_id,
    ]
  );

  const [filas] = await db.query('SELECT * FROM propiedades WHERE id = ?', [req.params.id]);
  res.json({ propiedad: filas[0] });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const [resultado] = await db.query('DELETE FROM propiedades WHERE id = ? AND inmobiliaria_id = ?', [
    req.params.id,
    req.usuario.inmobiliaria_id,
  ]);
  if (resultado.affectedRows === 0) {
    return res.status(404).json({ error: 'No encontramos esa propiedad' });
  }
  res.status(204).send();
}));

module.exports = router;
