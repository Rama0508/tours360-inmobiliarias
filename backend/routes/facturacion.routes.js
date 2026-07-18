const express = require('express');
const db = require('../config/db');
const auth = require('../middleware/auth');
const asyncHandler = require('../lib/asyncHandler');
const { crearSuscripcion } = require('../lib/mercadopago');

const router = express.Router();
router.use(auth);

router.get('/', asyncHandler(async (req, res) => {
  const [filas] = await db.query(
    'SELECT suscripcion_estado, suscripcion_actualizada_en FROM inmobiliarias WHERE id = ?',
    [req.usuario.inmobiliaria_id]
  );
  res.json({
    ...filas[0],
    precio_mensual: Number(process.env.SUSCRIPCION_PRECIO_ARS || 15000),
    moneda: 'ARS',
  });
}));

router.post('/crear', asyncHandler(async (req, res) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador de la inmobiliaria puede gestionar la suscripción' });
  }
  if (!process.env.MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Todavía no está configurado el cobro. Contactanos.' });
  }

  const [filas] = await db.query('SELECT email FROM usuarios WHERE id = ?', [req.usuario.id]);
  const email = filas[0].email;

  const backUrl = `${req.protocol}://${req.get('host')}/admin/facturacion.html`;
  const suscripcion = await crearSuscripcion({
    email,
    externalReference: `inmobiliaria_${req.usuario.inmobiliaria_id}`,
    backUrl,
  });

  await db.query(
    'UPDATE inmobiliarias SET mp_preapproval_id = ?, suscripcion_estado = ?, suscripcion_actualizada_en = NOW() WHERE id = ?',
    [suscripcion.id, 'pendiente', req.usuario.inmobiliaria_id]
  );

  res.status(201).json({ url_pago: suscripcion.init_point });
}));

module.exports = router;
