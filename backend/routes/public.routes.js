const express = require('express');
const db = require('../config/db');
const resolveTenant = require('../middleware/resolveTenant');
const storage = require('../lib/storage');
const { camposFaltantes } = require('../lib/validar');
const asyncHandler = require('../lib/asyncHandler');
const { buscarPropiedadPublicada } = require('../lib/propiedadPublica');
const { enviarEmail } = require('../lib/email');

const router = express.Router();

router.get('/:slug/propiedades/:propiedadSlug', resolveTenant, asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPublicada(req.inmobiliaria.id, req.params.propiedadSlug);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad, puede que ya no esté disponible' });
  }

  const [fotos] = await db.query(
    'SELECT id, storage_key, orden FROM fotos_propiedad WHERE propiedad_id = ? ORDER BY orden, id',
    [propiedad.id]
  );

  let tour = null;
  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedad.id]);
  if (tours.length > 0) {
    tour = tours[0];
    const [escenas] = await db.query('SELECT * FROM escenas WHERE tour_id = ? ORDER BY orden, id', [tour.id]);
    const [hotspots] = await db.query(
      'SELECT h.* FROM hotspots h JOIN escenas e ON h.escena_id = e.id WHERE e.tour_id = ?',
      [tour.id]
    );
    tour = {
      ...tour,
      plano_url: tour.plano_storage_key ? storage.getUrl(tour.plano_storage_key) : null,
      escenas: escenas.map((e) => ({ ...e, url: storage.getUrl(e.storage_key) })),
      hotspots,
    };
  }

  res.json({
    inmobiliaria: {
      nombre: req.inmobiliaria.nombre,
      logo_url: req.inmobiliaria.logo_url,
      color_primario: req.inmobiliaria.color_primario,
    },
    propiedad,
    fotos: fotos.map((f) => ({ id: f.id, url: storage.getUrl(f.storage_key) })),
    tour,
  });
}));

router.post('/:slug/propiedades/:propiedadSlug/leads', resolveTenant, asyncHandler(async (req, res) => {
  const propiedad = await buscarPropiedadPublicada(req.inmobiliaria.id, req.params.propiedadSlug);
  if (!propiedad) {
    return res.status(404).json({ error: 'No encontramos esa propiedad, puede que ya no esté disponible' });
  }

  const faltantes = camposFaltantes(req.body, ['nombre', 'telefono']);
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Completá tu nombre y tu teléfono para que te podamos contactar' });
  }
  if (!req.body.acepto_terminos) {
    return res.status(400).json({ error: 'Tenés que aceptar el tratamiento de tus datos para continuar' });
  }

  const { nombre, telefono, email, mensaje } = req.body;

  await db.query(
    'INSERT INTO leads (propiedad_id, inmobiliaria_id, nombre, telefono, email, mensaje, acepto_terminos) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [propiedad.id, req.inmobiliaria.id, nombre, telefono, email || null, mensaje || null]
  );

  // Si falla el email no arruinamos la respuesta al comprador: el lead ya
  // quedó guardado, que es lo que importa. El agente igual lo va a ver en
  // el panel de leads.
  try {
    const [agentes] = await db.query('SELECT nombre, email FROM usuarios WHERE id = ?', [propiedad.agente_id]);
    const agente = agentes[0];
    if (agente) {
      const urlPanelLeads = `${req.protocol}://${req.get('host')}/admin/leads.html`;
      await enviarEmail({
        para: agente.email,
        asunto: `Nueva consulta: ${propiedad.titulo}`,
        html: `
          <p>Hola ${agente.nombre},</p>
          <p><strong>${nombre}</strong> dejó una consulta sobre <strong>${propiedad.titulo}</strong>:</p>
          <ul>
            <li>Teléfono: ${telefono}</li>
            ${email ? `<li>Email: ${email}</li>` : ''}
            ${mensaje ? `<li>Mensaje: ${mensaje}</li>` : ''}
          </ul>
          <p><a href="${urlPanelLeads}">Ver en el panel de leads</a></p>
        `,
      });
    }
  } catch (error) {
    console.error('No se pudo enviar la notificación de lead nuevo:', error.message);
  }

  res.status(201).json({ mensaje: 'Gracias, ya recibimos tu consulta. Te van a contactar a la brevedad.' });
}));

module.exports = router;
