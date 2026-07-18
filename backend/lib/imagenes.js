const sharp = require('sharp');

// Fotos comunes de la galería: alcanza con un ancho razonable para verse
// bien en una tarjeta o lightbox, sin pesar varios MB por imagen subida tal cual.
async function optimizarFotoComun(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}

// Fotos 360: hay que mantener la relación de aspecto equirectangular
// (no forzar 2:1, solo limitar el tamaño máximo) para no deformar el panorama.
async function optimizarFoto360(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 4096, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}

module.exports = { optimizarFotoComun, optimizarFoto360 };
