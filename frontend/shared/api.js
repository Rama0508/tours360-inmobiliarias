const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

async function apiFetch(path, opciones = {}) {
  const esFormData = opciones.body instanceof FormData;
  const headers = { ...(esFormData ? {} : { 'Content-Type': 'application/json' }), ...(opciones.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}${path}`, { ...opciones, headers });
  } catch (err) {
    throw new Error('No se pudo conectar con el servidor. Revisá tu conexión a internet.');
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // la respuesta no trae cuerpo JSON (ej. 204)
  }

  if (!respuesta.ok) {
    throw new Error((datos && datos.error) || 'Ocurrió un error inesperado. Probá de nuevo.');
  }

  return datos;
}

window.api = { apiFetch, getToken, setToken };
