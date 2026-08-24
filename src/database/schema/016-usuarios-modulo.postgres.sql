-- Estructura de usuarios para PostgreSQL.
-- Compatible con la API central. No modifica arlc-central-api.
-- Aplicar en el banco cuando corresponda (ADD COLUMN IF NOT EXISTS es seguro).

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'Administrador',
  activo INTEGER NOT NULL DEFAULT 1,
  whatsapp TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;
