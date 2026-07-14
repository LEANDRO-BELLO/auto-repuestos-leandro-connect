-- Módulo Órdenes de Trabajo — Auto Repuestos Leandro Connect

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_os TEXT NOT NULL UNIQUE,
  cliente_id INTEGER NOT NULL,
  vehiculo_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  kilometraje INTEGER,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'Abierta',
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
);

CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_trabajo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_trabajo(fecha);
