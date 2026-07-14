const { get, run } = require('../database/connection');

const TAMANOS_VALIDOS = new Set(['10x7', '12x8', '8x5']);

const TEXTO_ETIQUETA_DEFAULT =
  'ESCANEA ESTE CÓDIGO y accede al historial completo de mantenimiento de tu vehículo.';

function mapConfig(row) {
  if (!row) {
    return null;
  }

  return {
    tamanoEtiqueta: row.tamano_etiqueta || '10x7',
    telefonoWhatsapp: row.telefono_whatsapp || '',
    telefonoAlternativo: row.telefono_alternativo || '',
    email: row.email || '',
    emailAlternativo: row.email_alternativo || '',
    direccionUbicacion: row.direccion_ubicacion || '',
    textoEtiqueta: row.texto_etiqueta || TEXTO_ETIQUETA_DEFAULT,
    actualizadoEn: row.actualizado_en
  };
}

async function ensureDefaultConfig() {
  const existing = await get('SELECT id FROM config_etiqueta_qr WHERE id = 1');

  if (existing) {
    return;
  }

  const empresa = await get('SELECT telefono, whatsapp, email, direccion FROM empresa WHERE id = 1');

  await run(
    `INSERT INTO config_etiqueta_qr (
       id, tamano_etiqueta, telefono_whatsapp, telefono_alternativo,
       email, email_alternativo, direccion_ubicacion, texto_etiqueta
     ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    [
      '10x7',
      empresa?.whatsapp || empresa?.telefono || '+595 986 773 222',
      empresa?.telefono || '',
      empresa?.email || 'autorepuestosleandrosa@hotmail.com',
      '',
      empresa?.direccion || 'Katueté – Canindeyú – Paraguay',
      TEXTO_ETIQUETA_DEFAULT
    ]
  );
}

async function getConfigEtiqueta() {
  await ensureDefaultConfig();
  const row = await get('SELECT * FROM config_etiqueta_qr WHERE id = 1');
  return mapConfig(row);
}

async function updateConfigEtiqueta(data = {}) {
  await ensureDefaultConfig();

  const tamanoEtiqueta = TAMANOS_VALIDOS.has(data.tamanoEtiqueta)
    ? data.tamanoEtiqueta
    : '10x7';

  const textoEtiqueta = data.textoEtiqueta?.trim() || TEXTO_ETIQUETA_DEFAULT;

  await run(
    `UPDATE config_etiqueta_qr SET
       tamano_etiqueta = ?,
       telefono_whatsapp = ?,
       telefono_alternativo = ?,
       email = ?,
       email_alternativo = ?,
       direccion_ubicacion = ?,
       texto_etiqueta = ?,
       actualizado_en = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      tamanoEtiqueta,
      data.telefonoWhatsapp?.trim() || null,
      data.telefonoAlternativo?.trim() || null,
      data.email?.trim() || null,
      data.emailAlternativo?.trim() || null,
      data.direccionUbicacion?.trim() || null,
      textoEtiqueta
    ]
  );

  return { ok: true, config: await getConfigEtiqueta() };
}

module.exports = {
  getConfigEtiqueta,
  updateConfigEtiqueta,
  TAMANOS_VALIDOS,
  TEXTO_ETIQUETA_DEFAULT
};
