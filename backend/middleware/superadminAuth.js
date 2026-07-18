const jwt = require('jsonwebtoken');

// Separado de middleware/auth.js a propósito: un token de agente (tenant)
// no tiene que poder usarse acá, y viceversa — son dos sistemas de
// identidad distintos aunque compartan el mismo JWT_SECRET.
function superadminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Tenés que iniciar sesión' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.tipo !== 'superadmin') {
      return res.status(403).json({ error: 'No tenés acceso a esto' });
    }
    req.superadmin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Tu sesión venció o es inválida, iniciá sesión de nuevo' });
  }
}

module.exports = superadminAuth;
