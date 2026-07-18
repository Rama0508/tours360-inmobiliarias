require('dotenv').config();
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

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('/:slug/propiedad/:propiedadSlug', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'propiedad.html'));
});

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
