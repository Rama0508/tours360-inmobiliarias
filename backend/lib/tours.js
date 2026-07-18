const db = require('./../config/db');

async function obtenerOCrearTour(propiedadId) {
  const [tours] = await db.query('SELECT * FROM tours WHERE propiedad_id = ?', [propiedadId]);
  if (tours.length > 0) return tours[0];

  const [resultado] = await db.query('INSERT INTO tours (propiedad_id) VALUES (?)', [propiedadId]);
  const [nuevo] = await db.query('SELECT * FROM tours WHERE id = ?', [resultado.insertId]);
  return nuevo[0];
}

module.exports = { obtenerOCrearTour };
