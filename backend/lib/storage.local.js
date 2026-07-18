const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function upload(buffer, { folder, mimetype }) {
  const extension = (mimetype && mimetype.split('/')[1]) || 'bin';
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const carpetaDestino = path.join(UPLOADS_DIR, folder);

  await fs.mkdir(carpetaDestino, { recursive: true });
  await fs.writeFile(path.join(carpetaDestino, nombreArchivo), buffer);

  return `${folder}/${nombreArchivo}`;
}

function getUrl(storageKey) {
  return `/uploads/${storageKey}`;
}

async function del(storageKey) {
  const ruta = path.join(UPLOADS_DIR, storageKey);
  try {
    await fs.unlink(ruta);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { upload, getUrl, delete: del };
