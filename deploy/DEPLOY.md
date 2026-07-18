# Guía de deploy — VPS Hostinger + Nginx + PM2

Esta guía asume el stack habitual: VPS Hostinger, Node vía PM2, Nginx como
proxy reverso, Let's Encrypt (certbot) o Cloudflare para HTTPS, MySQL en el
mismo VPS o uno separado.

## 0. Lo que necesitás antes de arrancar

- [ ] Acceso SSH al VPS (IP, usuario, forma de autenticarte)
- [ ] Un dominio apuntando al VPS (registro DNS tipo A a la IP del servidor,
      o proxy de Cloudflare si lo usás)
- [ ] MySQL instalado en el VPS (o accesible desde ahí)
- [ ] Node.js 20+ y PM2 instalados en el VPS
- [ ] Nginx instalado

## 1. Preparar la base de datos en el VPS

```bash
mysql -u root -p < backend/schema.sql
```

Igual que en desarrollo, creá un usuario dedicado (no uses root desde la app):

```sql
CREATE USER 'tours360_user'@'localhost' IDENTIFIED BY 'una-contraseña-fuerte';
GRANT ALL PRIVILEGES ON tours360.* TO 'tours360_user'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Clonar y configurar el proyecto

```bash
git clone https://github.com/Rama0508/tours360-inmobiliarias.git
cd tours360-inmobiliarias
npm install --omit=dev
cp .env.example .env
```

Editá `.env` con los valores reales de producción:
- `DB_*`: las credenciales del paso 1
- `JWT_SECRET`: generá uno nuevo, distinto al de desarrollo (`openssl rand -hex 32`)
- `RESEND_API_KEY` / `EMAIL_FROM`: para que los emails salgan de verdad —
  en este punto conviene verificar un dominio propio en Resend para no
  quedar limitado a mandar solo a tu propia casilla
- `MP_ACCESS_TOKEN` / `MP_PUBLIC_KEY`: credenciales de **producción** de
  Mercado Pago (no las de test)
- `STORAGE_DRIVER=local` (o `r2` si en algún momento se migra)

## 3. Crear el primer superadmin

```bash
node -e "
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  });
  const hash = await bcrypt.hash('CAMBIAR-ESTA-CONTRASEÑA', 10);
  await db.query('INSERT INTO superadmins (email, password_hash) VALUES (?, ?)', ['tu-email@ejemplo.com', hash]);
  await db.end();
})();
"
```

## 4. Arrancar con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # sigue las instrucciones que imprime, para que arranque solo si se reinicia el VPS
```

Verificá que está vivo:

```bash
curl http://localhost:3000/health
```

## 5. Nginx

Copiá `deploy/nginx.conf` a `/etc/nginx/sites-available/tours360`, reemplazá
`tudominio.com` por el dominio real y la ruta de `/uploads/` por la ruta real
del proyecto en el VPS. Después:

```bash
sudo ln -s /etc/nginx/sites-available/tours360 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. HTTPS

Con certbot (si no usás el proxy de Cloudflare):

```bash
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

Si usás Cloudflare como proxy, alcanza con activar "Full" o "Full (strict)"
en el modo SSL de Cloudflare y dejar que Nginx corra en HTTP puro puertas
adentro (Cloudflare maneja el HTTPS de cara al usuario).

## 7. Confirmar que quedó bien

- `https://tudominio.com/health` → `{"status":"ok","db":"conectada"}`
- `https://tudominio.com/registro.html` → se puede crear una inmobiliaria de prueba
- `https://tudominio.com/superadmin/login.html` → entra con la cuenta del paso 3
- Compartir el link de una propiedad por WhatsApp y confirmar que aparece la
  vista previa (título, descripción, foto)

## Actualizar el deploy después de un cambio

```bash
cd tours360-inmobiliarias
git pull
npm install --omit=dev
pm2 restart tours360
```

Si el cambio incluye una migración de base de datos (columnas nuevas), corré
el `ALTER TABLE` correspondiente a mano antes del `pm2 restart` — este
proyecto no tiene todavía un sistema de migraciones automáticas.
