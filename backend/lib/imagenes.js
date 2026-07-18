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

// Logo de la inmobiliaria: se mantiene como PNG (no se convierte a JPEG)
// porque suele tener fondo transparente.
async function optimizarLogo(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90 })
    .toBuffer();
}

// Plano de la propiedad: suele tener texto/medidas, conviene dejarlo más
// grande que una foto común para que se lea bien.
async function optimizarPlano(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90 })
    .toBuffer();
}

module.exports = { optimizarFotoComun, optimizarFoto360, optimizarLogo, optimizarPlano };
