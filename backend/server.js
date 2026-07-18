require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const db = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const propiedadesRoutes = require('./routes/propiedades.routes');
const fotosRoutes = require('./routes/fotos.routes');
const toursRoutes = require('./routes/tours.routes');
const escenasRoutes = require('./routes/escenas.routes');
const hotspotsRoutes = require('./routes/hotspots.routes');
const publicRoutes = require('./routes/public.routes');
const leadsRoutes = require('./routes/leads.routes');
const errorHandler = require('./middleware/errorHandler');
const asyncHandler = require('./lib/asyncHandler');
const { buscarInmobiliariaPorSlug, buscarPropiedadPublicada, obtenerUrlPortada } = require('./lib/propiedadPublica');

const app = express();
const PORT = process.env.PORT || 3000;

// Detrás de Nginx/Cloudflare en producción, esto hace que req.protocol
// respete X-Forwarded-Proto en vez de reportar siempre "http".
app.set('trust proxy', true);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/admin/propiedades', propiedadesRoutes);
app.use('/api/admin/propiedades/:propiedadId/fotos', fotosRoutes);
app.use('/api/admin/propiedades/:propiedadId/tour', toursRoutes);
app.use('/api/admin/propiedades/:propiedadId/escenas', escenasRoutes);
app.use('/api/admin/propiedades/:propiedadId/escenas/:escenaId/hotspots', hotspotsRoutes);
app.use('/api/admin/leads', leadsRoutes);
app.use('/api', publicRoutes);

const RUTA_PLANTILLA_PROPIEDAD = path.join(__dirname, '..', 'frontend', 'public', 'propiedad.html');
const PLANTILLA_PROPIEDAD = fs.readFileSync(RUTA_PLANTILLA_PROPIEDAD, 'utf8');
const TITULO_PLANTILLA = '<title>Propiedad — Tours 360</title>';

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function truncarEnPalabra(texto, largoMaximo) {
  if (texto.length <= largoMaximo) return texto;
  const cortado = texto.slice(0, largoMaximo);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return `${cortado.slice(0, ultimoEspacio > 0 ? ultimoEspacio : largoMaximo)}...`;
}

// Sirve la página pública de la propiedad con las etiquetas Open Graph
// completadas server-side (título, descripción, foto de portada), para que
// al compartir el link por WhatsApp se vea la vista previa — el crawler de
// WhatsApp no ejecuta JavaScript, así que esto no puede resolverse solo del
// lado del cliente como el resto de los datos de la página.
app.get('/:slug/propiedad/:propiedadSlug', asyncHandler(async (req, res) => {
  const inmobiliaria = await buscarInmobiliariaPorSlug(req.params.slug);
  const propiedad = inmobiliaria && (await buscarPropiedadPublicada(inmobiliaria.id, req.params.propiedadSlug));

  if (!propiedad) {
    return res.send(PLANTILLA_PROPIEDAD);
  }

  const titulo = `${propiedad.titulo} — ${inmobiliaria.nombre}`;
  const descripcion = truncarEnPalabra(
    propiedad.descripcion || `Tour virtual 360° de ${propiedad.titulo}, publicado por ${inmobiliaria.nombre}.`,
    160
  );
  const urlPortadaRelativa = await obtenerUrlPortada(propiedad);
  const urlImagen = urlPortadaRelativa ? `${req.protocol}://${req.get('host')}${urlPortadaRelativa}` : null;
  const urlPagina = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  const metaTags = `<title>${escaparHtml(titulo)}</title>
    <meta name="description" content="${escaparHtml(descripcion)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escaparHtml(titulo)}" />
    <meta property="og:description" content="${escaparHtml(descripcion)}" />
    <meta property="og:url" content="${escaparHtml(urlPagina)}" />
    ${urlImagen ? `<meta property="og:image" content="${escaparHtml(urlImagen)}" />` : ''}
    <meta name="twitter:card" content="${urlImagen ? 'summary_large_image' : 'summary'}" />`;

  res.send(PLANTILLA_PROPIEDAD.replace(TITULO_PLANTILLA, metaTags));
}));

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      mensaje: 'No se pudo conectar a la base de datos. Revisá las variables DB_* en tu .env',
    });
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
