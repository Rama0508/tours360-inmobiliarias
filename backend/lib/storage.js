// Contrato de storage: upload(buffer, opts) -> storageKey, getUrl(storageKey) -> url, delete(storageKey) -> void
// Selecciona la implementación según STORAGE_DRIVER para no acoplar el resto del código a disco o a R2.

const driver = process.env.STORAGE_DRIVER === 'r2'
  ? require('./storage.r2')
  : require('./storage.local');

module.exports = driver;
