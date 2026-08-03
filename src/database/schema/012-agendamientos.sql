CREATE TABLE IF NOT EXISTS agendamientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  vehiculo_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  observaciones TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
);

CREATE INDEX IF NOT EXISTS idx_agendamientos_fecha
ON agendamientos(fecha);

CREATE INDEX IF NOT EXISTS idx_agendamientos_cliente
ON agendamientos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_agendamientos_vehiculo
ON agendamientos(vehiculo_id);