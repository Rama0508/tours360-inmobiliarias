# Tours 360 Inmobiliarias

Plataforma de tours virtuales 360° para inmobiliarias (fase 1). Node.js + Express + MySQL, frontend HTML/JS vanilla sin build step.

## Puesta en marcha local

1. Instalar dependencias:
   ```
   npm install
   ```
2. Copiar `.env.example` a `.env` y completar los datos de tu MySQL local.
3. Crear la base de datos y las tablas:
   ```
   mysql -u root -p < backend/schema.sql
   ```
4. Cargar datos de prueba (una inmobiliaria y un agente demo):
   ```
   npm run seed
   ```
5. Arrancar el servidor:
   ```
   npm start
   ```
   o, para desarrollo con recarga automática:
   ```
   npm run dev
   ```
6. Verificar que todo está conectado entrando a [http://localhost:3000/health](http://localhost:3000/health).

## Multi-tenant

Cada inmobiliaria tiene su propio `slug` y todas las URLs públicas van prefijadas con ese slug (`/mi-inmobiliaria/propiedad/...`). El panel de administración no usa el slug para nada: el token de sesión (JWT) ya identifica a qué inmobiliaria pertenece cada agente.

## Almacenamiento de fotos

Por defecto las fotos se guardan en disco (`backend/uploads/`). Para pasar a Cloudflare R2 más adelante, alcanza con completar `backend/lib/storage.r2.js` y cambiar `STORAGE_DRIVER=r2` en el `.env` — el resto del código no cambia.

## Deploy a producción

Ver [`deploy/DEPLOY.md`](deploy/DEPLOY.md) — VPS Hostinger + Nginx + PM2, el stack habitual del proyecto. Incluye la configuración de Nginx de referencia (`deploy/nginx.conf`) y el archivo de PM2 (`ecosystem.config.js`).

## Roadmap

Ver [`ROADMAP.md`](ROADMAP.md) para el estado de cada fase del proyecto.
