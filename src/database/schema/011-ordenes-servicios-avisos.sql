ALTER TABLE ordenes_servicios
ADD COLUMN avisado INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ordenes_servicios
ADD COLUMN fecha_aviso TEXT;