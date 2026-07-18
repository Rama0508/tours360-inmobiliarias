// Envuelve handlers async para que si la promesa rechaza (ej. falla MySQL),
// el error llegue a errorHandler.js en vez de quedar como rechazo sin capturar.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
