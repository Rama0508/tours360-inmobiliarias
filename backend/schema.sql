-- Modelo de datos: plataforma de tours virtuales 360 para inmobiliarias (fase 1)
-- Orden de creación pensado para respetar las foreign keys.

CREATE DATABASE IF NOT EXISTS tours360
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tours360;

CREATE TABLE inmobiliarias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  slug VARCHAR(60) NOT NULL UNIQUE,
  email_contacto VARCHAR(150),
  telefono VARCHAR(30),
  logo_url VARCHAR(500) NULL,
  color_primario VARCHAR(7) NULL, -- ej. #1d4ed8, se usa como acento de marca en la página pública
  activa TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inmobiliaria_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'agente') NOT NULL DEFAULT 'agente',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  reset_token VARCHAR(64) NULL,
  reset_token_expira DATETIME NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inmobiliaria_id) REFERENCES inmobiliarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE propiedades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inmobiliaria_id INT NOT NULL,
  agente_id INT NOT NULL,
  slug VARCHAR(180) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo ENUM('casa', 'departamento', 'ph', 'terreno', 'local', 'oficina', 'galpon', 'otro') NOT NULL,
  operacion ENUM('venta', 'alquiler', 'alquiler_temporal') NOT NULL,
  precio DECIMAL(14, 2),
  moneda ENUM('ARS', 'USD') NOT NULL DEFAULT 'ARS',
  m2_cubiertos DECIMAL(8, 2),
  m2_totales DECIMAL(8, 2),
  ambientes SMALLINT,
  dormitorios SMALLINT,
  banos SMALLINT,
  cochera TINYINT(1) NOT NULL DEFAULT 0,
  direccion VARCHAR(255),
  localidad VARCHAR(120),
  provincia VARCHAR(120),
  estado ENUM('borrador', 'publicada', 'pausada', 'vendida') NOT NULL DEFAULT 'borrador',
  foto_portada_url VARCHAR(500),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_propiedad_slug (inmobiliaria_id, slug),
  KEY idx_propiedades_estado (inmobiliaria_id, estado),
  FOREIGN KEY (inmobiliaria_id) REFERENCES inmobiliarias(id) ON DELETE CASCADE,
  FOREIGN KEY (agente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE fotos_propiedad (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propiedad_id INT NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- tours.escena_inicial_id se agrega con ALTER al final: apunta a escenas,
-- que todavía no existe en este punto del script (referencia circular).
CREATE TABLE tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propiedad_id INT NOT NULL UNIQUE,
  tipo ENUM('360', 'modelo3d') NOT NULL DEFAULT '360',
  modelo_url VARCHAR(500) NULL, -- reservado para fase 2 (tours de constructoras)
  escena_inicial_id INT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE escenas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE tours
  ADD FOREIGN KEY (escena_inicial_id) REFERENCES escenas(id) ON DELETE SET NULL;

CREATE TABLE hotspots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  escena_id INT NOT NULL,
  escena_destino_id INT NULL,
  tipo ENUM('navegacion', 'info') NOT NULL DEFAULT 'navegacion',
  yaw DECIMAL(6, 3) NOT NULL,
  pitch DECIMAL(6, 3) NOT NULL,
  etiqueta VARCHAR(120),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (escena_id) REFERENCES escenas(id) ON DELETE CASCADE,
  FOREIGN KEY (escena_destino_id) REFERENCES escenas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propiedad_id INT NOT NULL,
  inmobiliaria_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  mensaje TEXT,
  contactado TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_leads_contactado (inmobiliaria_id, contactado),
  FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE,
  FOREIGN KEY (inmobiliaria_id) REFERENCES inmobiliarias(id) ON DELETE CASCADE
) ENGINE=InnoDB;
