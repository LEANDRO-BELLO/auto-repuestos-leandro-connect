ALTER TABLE vehiculos ADD COLUMN qr_code TEXT;
ALTER TABLE vehiculos ADD COLUMN data_geracao_qr TEXT;
ALTER TABLE vehiculos ADD COLUMN ultima_impressao_qr TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehiculos_qr_code ON vehiculos(qr_code);
