PRAGMA foreign_keys = OFF;

CREATE TABLE agendamientos_nuevo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  vehiculo_id INTEGER,
  vehiculo_descripcion TEXT,
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

INSERT INTO agendamientos_nuevo (
  id, cliente_id, vehiculo_id, fecha, hora, observaciones,
  estado, orden_id, created_at, updated_at
)
SELECT
  id, cliente_id, vehiculo_id, fecha, hora, observaciones,
  estado, orden_id, created_at, updated_at
FROM agendamientos;

DROP TABLE agendamientos;
ALTER TABLE agendamientos_nuevo RENAME TO agendamientos;

CREATE INDEX IF NOT EXISTS idx_agendamientos_fecha_hora ON agendamientos(fecha, hora);
CREATE INDEX IF NOT EXISTS idx_agendamientos_estado ON agendamientos(estado);
CREATE INDEX IF NOT EXISTS idx_agendamientos_orden ON agendamientos(orden_id);

PRAGMA foreign_keys = ON;
