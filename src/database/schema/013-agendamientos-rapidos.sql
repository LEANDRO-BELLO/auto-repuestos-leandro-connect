PRAGMA foreign_keys = OFF;

CREATE TABLE agendamientos_nuevo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  cliente_id INTEGER,
  vehiculo_id INTEGER,

  cliente_nombre TEXT,
  cliente_telefono TEXT,
  vehiculo_descripcion TEXT,

  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  observaciones TEXT,

  estado TEXT NOT NULL DEFAULT 'Pendiente',

  creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id)
);

INSERT INTO agendamientos_nuevo (
  id,
  cliente_id,
  vehiculo_id,
  fecha,
  hora,
  observaciones,
  estado,
  creado_en,
  actualizado_en
)
SELECT
  id,
  cliente_id,
  vehiculo_id,
  fecha,
  hora,
  observaciones,
  estado,
  creado_en,
  actualizado_en
FROM agendamientos;

DROP TABLE agendamientos;

ALTER TABLE agendamientos_nuevo
RENAME TO agendamientos;

CREATE INDEX IF NOT EXISTS idx_agendamientos_fecha
ON agendamientos(fecha);

CREATE INDEX IF NOT EXISTS idx_agendamientos_cliente
ON agendamientos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_agendamientos_vehiculo
ON agendamientos(vehiculo_id);

PRAGMA foreign_keys = ON;