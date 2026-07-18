const express = require('express');
const db = require('../config/db');
const asyncHandler = require('../lib/asyncHandler');
const { obtenerSuscripcion, MAPA_ESTADOS } = require('../lib/mercadopago');

const router = express.Router();

// Mercado Pago llama acá cuando cambia el estado de una suscripción
// (autorizada, pausada, cancelada). El aviso solo trae el id — hay que
// pedirle a la API el estado actual, nunca confiar en datos del webhook
// como si fueran el estado real.
router.post('/mercadopago', asyncHandler(async (req, res) => {
  const preapprovalId =
    req.body?.data?.id ||
    req.query.id ||
    (req.query.topic === 'preapproval' ? req.query.resource : null);

  if (!preapprovalId) {
    return res.status(200).send('ignorado');
  }

  try {
    const suscripcion = await obtenerSuscripcion(preapprovalId);
    const estado = MAPA_ESTADOS[suscripcion.status] || 'sin_suscripcion';

    await db.query(
      'UPDATE inmobiliarias SET suscripcion_estado = ?, suscripcion_actualizada_en = NOW() WHERE mp_preapproval_id = ?',
      [estado, preapprovalId]
    );
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error.message);
  }

  // Mercado Pago solo necesita un 200 para no reintentar. Los errores ya se
  // logueraron arriba; devolver 200 igual evita reintentos infinitos por un
  // webhook con datos que no podemos procesar.
  res.status(200).send('ok');
}));

module.exports = router;
