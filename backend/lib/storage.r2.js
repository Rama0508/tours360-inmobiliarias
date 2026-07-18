// Mismo contrato que storage.local.js (upload/getUrl/delete), pendiente de implementar
// cuando haya credenciales de Cloudflare R2. Ahí se suma @aws-sdk/client-s3 como dependencia.

function noImplementado() {
  throw new Error(
    'STORAGE_DRIVER=r2 está configurado pero storage.r2.js todavía no está implementado. ' +
    'Volvé a STORAGE_DRIVER=local o completá este archivo con las credenciales de R2.'
  );
}

module.exports = {
  upload: noImplementado,
  getUrl: noImplementado,
  delete: noImplementado,
};
