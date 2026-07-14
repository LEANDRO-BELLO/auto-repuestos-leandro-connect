const { get, all, run } = require('../database/connection');
const { generateQrCodeValue } = require('../utils/qr-code');
const { syncCliente, syncVehiculo } = require('./railway-sync.service');

async function generateCodigo() {
  const row = await get(
    "SELECT codigo FROM vehiculos WHERE codigo LIKE 'VEH-%' ORDER BY CAST(SUBSTR(codigo, 5) AS INTEGER) DESC LIMIT 1"
  );

  if (!row) return 'VEH-0001';

  const next = parseInt(row.codigo.replace('VEH-', ''), 10) + 1;
  return `VEH-${String(next).padStart(4, '0')}`;
}

function mapVehiculo(row) {
  if (!row) return null;

  return {
    id: row.id,
    codigo: row.codigo,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre || '',
    clienteCodigo: row.cliente_codigo || '',
    placa: row.placa,
    marca: row.marca || '',
    modelo: row.modelo || '',
    anio: row.anio ?? null,
    color: row.color || '',
    motor: row.motor || '',
    combustible: row.combustible || '',
    chasis: row.chasis || '',
    kilometraje: row.kilometraje ?? null,
    observaciones: row.observaciones || '',
    qrCode: row.qr_code || null,
    dataGeracaoQr: row.data_geracao_qr || null,
    ultimaImpressaoQr: row.ultima_impressao_qr || null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function mapClienteSync(row) {
  if (!row) return null;
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    documento: row.documento || '',
    telefono: row.telefono || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    direccion: row.direccion || '',
    ciudad: row.ciudad || '',
    observaciones: row.observaciones || '',
    ultimaVisita: row.ultima_visita || null
  };
}

async function syncVehiculoRailway(vehiculo) {
  if (!vehiculo) return false;

  try {
    const clienteRow = await get(
      `SELECT id, codigo, nombre, documento, telefono, whatsapp, email,
              direccion, ciudad, observaciones, ultima_visita
       FROM clientes WHERE id = ?`,
      [vehiculo.clienteId]
    );

    const cliente = mapClienteSync(clienteRow);
    if (!cliente) throw new Error('Cliente local no encontrado.');

    await syncCliente(cliente);
    await syncVehiculo(vehiculo);

    console.log('Vehículo sincronizado con Railway:', vehiculo.placa);
    return true;
  } catch (error) {
    console.error('No se pudo sincronizar el vehículo:', error.message);
    return false;
  }
}

const BASE_SELECT = `
  SELECT v.id, v.codigo, v.cliente_id, v.placa, v.marca, v.modelo, v.anio,
         v.color, v.motor, v.combustible, v.chasis, v.kilometraje,
         v.observaciones, v.qr_code, v.data_geracao_qr, v.ultima_impressao_qr,
         v.creado_en, v.actualizado_en,
         c.nombre AS cliente_nombre, c.codigo AS cliente_codigo
  FROM vehiculos v
  INNER JOIN clientes c ON c.id = v.cliente_id
`;

async function listVehiculos(search = '') {
  const term = search.trim();

  if (!term) {
    const rows = await all(`${BASE_SELECT} ORDER BY v.placa COLLATE NOCASE ASC`);
    return rows.map(mapVehiculo);
  }

  const like = `%${term}%`;
  const rows = await all(
    `${BASE_SELECT}
     WHERE v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?
        OR v.codigo LIKE ? OR c.nombre LIKE ?
     ORDER BY v.placa COLLATE NOCASE ASC`,
    [like, like, like, like, like]
  );

  return rows.map(mapVehiculo);
}

async function ensureQrCodeForVehiculo(id) {
  const row = await get('SELECT id, qr_code FROM vehiculos WHERE id = ?', [id]);
  if (!row || row.qr_code) return;

  const qrCode = generateQrCodeValue();
  const now = new Date().toISOString();

  await run(
    `UPDATE vehiculos SET qr_code = ?, data_geracao_qr = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
    [qrCode, now, id]
  );
}

async function getVehiculo(id) {
  await ensureQrCodeForVehiculo(id);
  const row = await get(`${BASE_SELECT} WHERE v.id = ?`, [id]);
  return mapVehiculo(row);
}

async function createVehiculo(data) {
  const placa = data.placa?.trim();
  const clienteId = data.clienteId;

  if (!clienteId) return { ok: false, error: 'Seleccione un cliente.' };
  if (!placa) return { ok: false, error: 'La placa es obligatoria.' };

  const cliente = await get('SELECT id FROM clientes WHERE id = ?', [clienteId]);
  if (!cliente) return { ok: false, error: 'Cliente no encontrado.' };

  const placaExistente = await get(
    'SELECT id FROM vehiculos WHERE UPPER(placa) = UPPER(?)',
    [placa]
  );
  if (placaExistente) return { ok: false, error: 'Ya existe un vehículo con esa placa.' };

  const codigo = await generateCodigo();
  const anio = data.anio ? parseInt(data.anio, 10) : null;
  const kilometraje = data.kilometraje ? parseInt(data.kilometraje, 10) : null;
  const qrCode = generateQrCodeValue();
  const qrGeneratedAt = new Date().toISOString();

  const result = await run(
    `INSERT INTO vehiculos (
       codigo, cliente_id, placa, marca, modelo, anio, color, motor,
       combustible, chasis, kilometraje, observaciones,
       qr_code, data_geracao_qr, actualizado_en
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      codigo,
      clienteId,
      placa,
      data.marca?.trim() || null,
      data.modelo?.trim() || null,
      Number.isNaN(anio) ? null : anio,
      data.color?.trim() || null,
      data.motor?.trim() || null,
      data.combustible?.trim() || null,
      data.chasis?.trim() || null,
      Number.isNaN(kilometraje) ? null : kilometraje,
      data.observaciones?.trim() || null,
      qrCode,
      qrGeneratedAt
    ]
  );

  const vehiculo = await getVehiculo(result.lastID);
  await syncVehiculoRailway(vehiculo);
  return { ok: true, vehiculo };
}

async function updateVehiculo(id, data) {
  const existing = await getVehiculo(id);
  if (!existing) return { ok: false, error: 'Vehículo no encontrado.' };

  const placa = data.placa?.trim();
  const clienteId = data.clienteId;

  if (!clienteId) return { ok: false, error: 'Seleccione un cliente.' };
  if (!placa) return { ok: false, error: 'La placa es obligatoria.' };

  const placaExistente = await get(
    'SELECT id FROM vehiculos WHERE UPPER(placa) = UPPER(?) AND id != ?',
    [placa, id]
  );
  if (placaExistente) return { ok: false, error: 'Ya existe un vehículo con esa placa.' };

  const anio = data.anio ? parseInt(data.anio, 10) : null;
  const kilometraje = data.kilometraje ? parseInt(data.kilometraje, 10) : null;

  await run(
    `UPDATE vehiculos SET
       cliente_id = ?, placa = ?, marca = ?, modelo = ?, anio = ?, color = ?,
       motor = ?, combustible = ?, chasis = ?, kilometraje = ?, observaciones = ?,
       actualizado_en = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      clienteId,
      placa,
      data.marca?.trim() || null,
      data.modelo?.trim() || null,
      Number.isNaN(anio) ? null : anio,
      data.color?.trim() || null,
      data.motor?.trim() || null,
      data.combustible?.trim() || null,
      data.chasis?.trim() || null,
      Number.isNaN(kilometraje) ? null : kilometraje,
      data.observaciones?.trim() || null,
      id
    ]
  );

  const vehiculo = await getVehiculo(id);
  await syncVehiculoRailway(vehiculo);
  return { ok: true, vehiculo };
}

async function deleteVehiculo(id) {
  const existing = await getVehiculo(id);
  if (!existing) return { ok: false, error: 'Vehículo no encontrado.' };

  await run('DELETE FROM vehiculos WHERE id = ?', [id]);
  return { ok: true };
}

async function recordEtiquetaPrint(id) {
  const existing = await getVehiculo(id);
  if (!existing) return { ok: false, error: 'Vehículo no encontrado.' };

  await run(
    `UPDATE vehiculos SET ultima_impressao_qr = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`,
    [new Date().toISOString(), id]
  );

  return { ok: true, vehiculo: await getVehiculo(id) };
}

async function getVehiculoByQrCode(qrCode) {
  if (!qrCode) return null;
  const row = await get(`${BASE_SELECT} WHERE v.qr_code = ?`, [qrCode]);
  return mapVehiculo(row);
}

module.exports = {
  listVehiculos,
  getVehiculo,
  getVehiculoByQrCode,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo,
  recordEtiquetaPrint,
  syncVehiculoRailway
};
