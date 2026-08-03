-- Define 9 x 6 cm como tamaño oficial de la etiqueta QR.
UPDATE config_etiqueta_qr
SET tamano_etiqueta = '9x6',
    actualizado_en = CURRENT_TIMESTAMP
WHERE id = 1;
