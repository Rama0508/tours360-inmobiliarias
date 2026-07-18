function exigirSesion() {
  if (!api.getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function cerrarSesion() {
  api.setToken(null);
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}

function nombreEstado(estado) {
  const nombres = {
    borrador: 'Borrador',
    publicada: 'Publicada',
    pausada: 'Pausada',
    vendida: 'Vendida',
  };
  return nombres[estado] || estado;
}

function formatearPrecio(precio, moneda) {
  if (precio === null || precio === undefined) return 'Sin precio';
  const simbolo = moneda === 'USD' ? 'US$' : '$';
  return `${simbolo} ${Number(precio).toLocaleString('es-AR')}`;
}

function pintarBarraAdmin(activo) {
  const contenedor = document.getElementById('barra-admin');
  if (!contenedor) return;
  const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || 'null');
  contenedor.innerHTML = `
    <div class="barra-admin">
      <span class="barra-admin-marca">Tours 360</span>
      <nav>
        <a href="/admin/propiedades.html" class="${activo === 'propiedades' ? 'activo' : ''}">Propiedades</a>
        <a href="/admin/leads.html" class="${activo === 'leads' ? 'activo' : ''}">Leads</a>
        <a href="/admin/inmobiliaria.html" class="${activo === 'inmobiliaria' ? 'activo' : ''}">Mi inmobiliaria</a>
        <a href="/admin/facturacion.html" class="${activo === 'facturacion' ? 'activo' : ''}">Facturación</a>
      </nav>
      <div class="barra-admin-usuario">
        <span>${usuarioGuardado ? usuarioGuardado.nombre : ''}</span>
        <button type="button" onclick="cerrarSesion()">Salir</button>
      </div>
    </div>
  `;
}
