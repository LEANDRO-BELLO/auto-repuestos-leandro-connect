CREATE TABLE IF NOT EXISTS agendamientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  vehiculo_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  orden_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id)
);

CREATE INDEX IF NOT EXISTS idx_agendamientos_fecha_hora ON agendamientos(fecha, hora);
CREATE INDEX IF NOT EXISTS idx_agendamientos_estado ON agendamientos(estado);

CREATE TABLE IF NOT EXISTS avisos_servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  fecha_aviso TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, fecha_aviso)
);
