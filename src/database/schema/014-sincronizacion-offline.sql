ALTER TABLE ordenes_trabajo ADD COLUMN sync_estado TEXT NOT NULL DEFAULT 'no_aplica';
ALTER TABLE ordenes_trabajo ADD COLUMN sync_intentos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ordenes_trabajo ADD COLUMN sync_ultimo_error TEXT;
ALTER TABLE ordenes_trabajo ADD COLUMN sync_actualizado_en TEXT;

UPDATE ordenes_trabajo
   SET sync_estado = CASE WHEN estado = 'Finalizada' THEN 'pendiente' ELSE 'no_aplica' END
 WHERE sync_estado IS NULL OR sync_estado = 'no_aplica';

CREATE INDEX IF NOT EXISTS idx_ordenes_sync_estado
  ON ordenes_trabajo(sync_estado, estado);
