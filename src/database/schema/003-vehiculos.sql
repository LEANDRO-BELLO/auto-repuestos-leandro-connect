-- Módulo Vehículos — Auto Repuestos Leandro Connect

CREATE TABLE IF NOT EXISTS vehiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL,
  placa TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  color TEXT,
  motor TEXT,
  combustible TEXT,
  chasis TEXT,
  kilometraje INTEGER,
  observaciones TEXT,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_marca ON vehiculos(marca);
