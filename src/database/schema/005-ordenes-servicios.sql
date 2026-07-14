-- Servicios realizados por orden — Auto Repuestos Leandro Connect

CREATE TABLE IF NOT EXISTS ordenes_servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orden_id INTEGER NOT NULL,
  servicio TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  UNIQUE(orden_id, servicio)
);

CREATE INDEX IF NOT EXISTS idx_ordenes_servicios_orden ON ordenes_servicios(orden_id);
