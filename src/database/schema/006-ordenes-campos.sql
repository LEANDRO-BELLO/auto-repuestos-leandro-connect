-- Campos de mantenimiento — Órdenes de Trabajo

ALTER TABLE ordenes_trabajo ADD COLUMN intervalo INTEGER;
ALTER TABLE ordenes_trabajo ADD COLUMN proximo_km INTEGER;
ALTER TABLE ordenes_trabajo ADD COLUMN fecha_vencimiento TEXT;
