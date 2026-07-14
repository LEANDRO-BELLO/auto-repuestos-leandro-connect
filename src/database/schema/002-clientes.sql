-- Módulo Clientes — Auto Repuestos Leandro Connect

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  documento TEXT,
  telefono TEXT,
  whatsapp TEXT,
  email TEXT,
  direccion TEXT,
  ciudad TEXT,
  observaciones TEXT,
  ultima_visita TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
