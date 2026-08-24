-- Módulo de usuarios: WhatsApp personal de cada usuario.
-- El WhatsApp de la empresa permanece en la tabla empresa / config_etiqueta_qr.

ALTER TABLE usuarios ADD COLUMN whatsapp TEXT;
