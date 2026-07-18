// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Probá de nuevo en unos segundos.' });
}

module.exports = errorHandler;
