CREATE TABLE IF NOT EXISTS config_etiqueta_qr (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  tamano_etiqueta TEXT NOT NULL DEFAULT '10x7',
  telefono_whatsapp TEXT,
  telefono_alternativo TEXT,
  email TEXT,
  email_alternativo TEXT,
  direccion_ubicacion TEXT,
  texto_etiqueta TEXT NOT NULL DEFAULT 'ESCANEA ESTE CÓDIGO y accede al historial completo de mantenimiento de tu vehículo.',
  actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
