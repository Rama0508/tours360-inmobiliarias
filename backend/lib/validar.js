function camposFaltantes(body, campos) {
  return campos.filter((campo) => body[campo] === undefined || body[campo] === null || body[campo] === '');
}

function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { camposFaltantes, emailValido };
