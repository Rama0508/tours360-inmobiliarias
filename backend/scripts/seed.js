require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/db');

const INMOBILIARIA = { nombre: 'Inmobiliaria Demo', slug: 'demo', email_contacto: 'contacto@demo.com' };
const AGENTE = { nombre: 'Agente Demo', email: 'agente@demo.com', password: 'demo1234' };

async function seed() {
  const [existente] = await db.query('SELECT id FROM inmobiliarias WHERE slug = ?', [INMOBILIARIA.slug]);
  if (existente.length > 0) {
    console.log('Ya existen datos de prueba (inmobiliaria "demo"). No se vuelve a sembrar.');
    process.exit(0);
  }

  const [resultInmobiliaria] = await db.query(
    'INSERT INTO inmobiliarias (nombre, slug, email_contacto) VALUES (?, ?, ?)',
    [INMOBILIARIA.nombre, INMOBILIARIA.slug, INMOBILIARIA.email_contacto]
  );
  const inmobiliariaId = resultInmobiliaria.insertId;

  const passwordHash = await bcrypt.hash(AGENTE.password, 10);
  await db.query(
    'INSERT INTO usuarios (inmobiliaria_id, nombre, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [inmobiliariaId, AGENTE.nombre, AGENTE.email, passwordHash, 'admin']
  );

  console.log('Datos de prueba creados:');
  console.log(`  Inmobiliaria: ${INMOBILIARIA.nombre} (slug: ${INMOBILIARIA.slug})`);
  console.log(`  Agente: ${AGENTE.email} / contraseña: ${AGENTE.password}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Falló la carga de datos de prueba:', err.message);
  process.exit(1);
});
