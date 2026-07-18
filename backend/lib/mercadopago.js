// Contra la API REST de Mercado Pago directo con fetch nativo, sin sumar
// su SDK como dependencia — es un puñado de llamadas simples.
const MP_API = 'https://api.mercadopago.com';

async function crearSuscripcion({ email, externalReference, backUrl }) {
  const respuesta = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: 'Tours 360 — Suscripción mensual',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(process.env.SUSCRIPCION_PRECIO_ARS || 15000),
        currency_id: 'ARS',
      },
      back_url: backUrl,
      payer_email: email,
      external_reference: externalReference,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Mercado Pago respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

async function obtenerSuscripcion(preapprovalId) {
  const respuesta = await fetch(`${MP_API}/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Mercado Pago respondió ${respuesta.status}: ${detalle}`);
  }
  return respuesta.json();
}

// pending/authorized/paused/cancelled (MP) -> nuestro enum en español
const MAPA_ESTADOS = {
  pending: 'pendiente',
  authorized: 'activa',
  paused: 'pausada',
  cancelled: 'cancelada',
};

module.exports = { crearSuscripcion, obtenerSuscripcion, MAPA_ESTADOS };
