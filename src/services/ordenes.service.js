const { get, all, run } = require('../database/connection');
const { syncCliente, syncVehiculo, syncOrden } = require('./railway-sync.service');

const ESTADOS = ['Abierta', 'En proceso', 'Finalizada'];
const FACTURA_REGEX = /^\d{3}-\d{3}-\d{7}$/;

const SERVICIOS_CATALOGO = [
  { id: 'aceite_motor', label: 'Cambio de aceite motor' },
  { id: 'filtro_aceite', label: 'Filtro de aceite' },
  { id: 'filtro_aire', label: 'Filtro de aire' },
  { id: 'filtro_combustible', label: 'Filtro de combustible' },
  { id: 'filtro_secundario', label: 'Filtro secundario' },
  { id: 'filtro_aire_ac', label: 'Filtro de aire acondicionado' },
  { id: 'aceite_caja_cambio', label: 'Cambio de aceite caja de cambio' },
  { id: 'aceite_caja_transferencia', label: 'Cambio de aceite caja de transferencia' },
  { id: 'aceite_dif_del', label: 'Cambio de aceite diferencial delantero' },
  { id: 'aceite_dif_tras', label: 'Cambio de aceite diferencial trasero' },
  { id: 'fluido_radiador', label: 'Cambio de fluido de radiador' },
  { id: 'fluido_freno', label: 'Cambio de fluido de freno' },
  { id: 'engrase_crucetas', label: 'Engrase de crucetas' },
  { id: 'filtro_caja_automatica', label: 'Filtro caja automática' }
];

const SERVICIO_IDS = new Set(SERVICIOS_CATALOGO.map((s) => s.id));

async function generateNumeroOs() {
  const row = await get(
    "SELECT numero_os FROM ordenes_trabajo WHERE numero_os LIKE 'OS-%' ORDER BY CAST(SUBSTR(numero_os, 4) AS INTEGER) DESC LIMIT 1"
  );
  if (!row) return 'OS-0001';

  const next = parseInt(row.numero_os.replace('OS-', ''), 10) + 1;
  return `OS-${String(next).padStart(4, '0')}`;
}

function mapOrden(row) {
  if (!row) return null;

  return {
    id: row.id,
    numeroOs: row.numero_os,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre || '',
    clienteCodigo: row.cliente_codigo || '',
    vehiculoId: row.vehiculo_id,
    vehiculoPlaca: row.vehiculo_placa || '',
    vehiculoMarca: row.vehiculo_marca || '',
    vehiculoModelo: row.vehiculo_modelo || '',
    fecha: row.fecha,
    kilometraje: row.kilometraje ?? null,
    intervalo: row.intervalo ?? null,
    proximoKm: row.proximo_km ?? null,
    fechaVencimiento: row.fecha_vencimiento || null,
    observaciones: row.observaciones || '',
    estado: row.estado,
    numeroFactura: row.numero_factura || null,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

const BASE_SELECT = `
  SELECT o.id, o.numero_os, o.cliente_id, o.vehiculo_id, o.fecha, o.kilometraje,
         o.intervalo, o.proximo_km, o.fecha_vencimiento,
         o.observaciones, o.estado, o.numero_factura, o.creado_en, o.actualizado_en,
         c.nombre AS cliente_nombre, c.codigo AS cliente_codigo,
         v.placa AS vehiculo_placa, v.marca AS vehiculo_marca, v.modelo AS vehiculo_modelo
  FROM ordenes_trabajo o
  INNER JOIN clientes c ON c.id = o.cliente_id
  INNER JOIN vehiculos v ON v.id = o.vehiculo_id
`;

async function listOrdenes(search = '') {
  const term = search.trim();

  if (!term) {
    const rows = await all(`${BASE_SELECT} ORDER BY o.fecha DESC, o.id DESC`);
    return rows.map(mapOrden);
  }

  const like = `%${term}%`;
  const rows = await all(
    `${BASE_SELECT}
     WHERE o.numero_os LIKE ? OR c.nombre LIKE ? OR v.placa LIKE ?
        OR v.marca LIKE ? OR v.modelo LIKE ? OR o.estado LIKE ?
        OR o.numero_factura LIKE ?
     ORDER BY o.fecha DESC, o.id DESC`,
    [like, like, like, like, like, like, like]
  );

  return rows.map(mapOrden);
}

async function getServiciosByOrden(ordenId) {
  const rows = await all(
    'SELECT servicio, proximo_km FROM ordenes_servicios WHERE orden_id = ? ORDER BY servicio ASC',
    [ordenId]
  );
  return rows.map((row) => ({ id: row.servicio, proximoKm: row.proximo_km ?? null }));
}

async function saveServiciosForOrden(ordenId, servicios = []) {
  await run('DELETE FROM ordenes_servicios WHERE orden_id = ?', [ordenId]);

  for (const item of servicios) {
    const id = typeof item === 'string' ? item : item.id;
    const proximoKm = typeof item === 'string' ? null : parseIntOrNull(item.proximoKm);

    if (!SERVICIO_IDS.has(id)) continue;

    await run(
      'INSERT INTO ordenes_servicios (orden_id, servicio, proximo_km) VALUES (?, ?, ?)',
      [ordenId, id, proximoKm]
    );
  }
}

async function getOrden(id) {
  const row = await get(`${BASE_SELECT} WHERE o.id = ?`, [id]);
  const orden = mapOrden(row);
  if (!orden) return null;

  const serviciosRows = await getServiciosByOrden(id);
  orden.servicios = serviciosRows.map((s) => s.id);
  orden.serviciosKm = Object.fromEntries(serviciosRows.map((s) => [s.id, s.proximoKm]));
  return orden;
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

function mapVehiculoSync(row) {
  if (!row) return null;
  return {
    id: row.id,
    codigo: row.codigo,
    clienteId: row.cliente_id,
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
    qrCode: row.qr_code,
    dataGeracaoQr: row.data_geracao_qr || null
  };
}

async function syncOrdenRailway(orden) {
  if (!orden || orden.estado !== 'Finalizada') return false;

  try {
    const clienteRow = await get(
      `SELECT id, codigo, nombre, documento, telefono, whatsapp, email,
              direccion, ciudad, observaciones, ultima_visita
       FROM clientes WHERE id = ?`,
      [orden.clienteId]
    );
    const vehiculoRow = await get(
      `SELECT id, codigo, cliente_id, placa, marca, modelo, anio, color, motor,
              combustible, chasis, kilometraje, observaciones, qr_code, data_geracao_qr
       FROM vehiculos WHERE id = ?`,
      [orden.vehiculoId]
    );

    const cliente = mapClienteSync(clienteRow);
    const vehiculo = mapVehiculoSync(vehiculoRow);
    if (!cliente || !vehiculo) throw new Error('Cliente o vehículo local no encontrado.');

    await syncCliente(cliente);
    await syncVehiculo(vehiculo);

    const servicios = await getServiciosByOrden(orden.id);
    await syncOrden(orden, servicios);

    console.log('Orden sincronizada con Railway:', orden.numeroOs);
    return true;
  } catch (error) {
    console.error('No se pudo sincronizar la orden:', error.message);
    return false;
  }
}

async function listVehiculosByCliente(clienteId) {
  if (!clienteId) return [];

  const rows = await all(
    `SELECT v.id, v.codigo, v.cliente_id, v.placa, v.marca, v.modelo, v.anio,
            v.kilometraje, c.nombre AS cliente_nombre, c.codigo AS cliente_codigo
     FROM vehiculos v
     INNER JOIN clientes c ON c.id = v.cliente_id
     WHERE v.cliente_id = ?
     ORDER BY v.placa COLLATE NOCASE ASC`,
    [clienteId]
  );

  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre,
    clienteCodigo: row.cliente_codigo,
    placa: row.placa,
    marca: row.marca || '',
    modelo: row.modelo || '',
    anio: row.anio ?? null,
    kilometraje: row.kilometraje ?? null
  }));
}

async function searchVehiculosForOrden(search = '') {
  const term = search.trim();
  if (!term) return [];

  const like = `%${term}%`;
  const rows = await all(
    `SELECT v.id, v.cliente_id, v.placa, v.marca, v.modelo, v.kilometraje,
            c.nombre AS cliente_nombre, c.codigo AS cliente_codigo
     FROM vehiculos v
     INNER JOIN clientes c ON c.id = v.cliente_id
     WHERE c.nombre LIKE ? OR v.placa LIKE ? OR c.codigo LIKE ?
        OR v.marca LIKE ? OR v.modelo LIKE ?
     ORDER BY v.placa COLLATE NOCASE ASC LIMIT 25`,
    [like, like, like, like, like]
  );

  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre,
    clienteCodigo: row.cliente_codigo,
    placa: row.placa,
    marca: row.marca || '',
    modelo: row.modelo || '',
    kilometraje: row.kilometraje ?? null
  }));
}

function validateNumeroFactura(value, required = false) {
  const factura = value?.trim() || '';

  if (!factura) {
    return required
      ? { ok: false, error: 'Ingrese el número de factura.' }
      : { ok: true, value: null };
  }

  if (!FACTURA_REGEX.test(factura)) {
    return { ok: false, error: 'Formato inválido. Use XXX-XXX-XXXXXXX (ej: 001-001-0000123).' };
  }

  return { ok: true, value: factura };
}

function resolveNumeroFactura(data, existing = null, estado) {
  if (estado === 'Finalizada') return validateNumeroFactura(data.numeroFactura, true);
  if (existing?.numeroFactura) return { ok: true, value: existing.numeroFactura };
  return validateNumeroFactura(data.numeroFactura, false);
}

function parseIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function createOrden(data) {
  const vehiculoId = data.vehiculoId;
  if (!vehiculoId) return { ok: false, error: 'Seleccione un vehículo.' };

  const vehiculo = await get(
    'SELECT v.id, v.cliente_id, v.placa FROM vehiculos v WHERE v.id = ?',
    [vehiculoId]
  );
  if (!vehiculo) return { ok: false, error: 'Vehículo no encontrado.' };

  const estado = ESTADOS.includes(data.estado) ? data.estado : 'Abierta';
  const facturaResult = resolveNumeroFactura(data, null, estado);
  if (!facturaResult.ok) return { ok: false, error: facturaResult.error };

  const kilometraje = parseIntOrNull(data.kilometraje);
  const intervalo = parseIntOrNull(data.intervalo);
  const proximoKm = parseIntOrNull(data.proximoKm);
  const fecha = data.fecha?.trim() || new Date().toISOString().slice(0, 10);
  const fechaVencimiento = data.fechaVencimiento?.trim() || null;
  const numeroOs = await generateNumeroOs();

  const result = await run(
    `INSERT INTO ordenes_trabajo (
       numero_os, cliente_id, vehiculo_id, fecha, kilometraje, intervalo,
       proximo_km, fecha_vencimiento, observaciones, estado, numero_factura, actualizado_en
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      numeroOs,
      vehiculo.cliente_id,
      vehiculoId,
      fecha,
      kilometraje,
      intervalo,
      proximoKm,
      fechaVencimiento,
      data.observaciones?.trim() || null,
      estado,
      facturaResult.value
    ]
  );

  await saveServiciosForOrden(result.lastID, data.servicios || []);
  const orden = await getOrden(result.lastID);
  await syncOrdenRailway(orden);
  return { ok: true, orden };
}

async function updateOrden(id, data) {
  const existing = await getOrden(id);
  if (!existing) return { ok: false, error: 'Orden no encontrada.' };

  const vehiculoId = data.vehiculoId;
  if (!vehiculoId) return { ok: false, error: 'Seleccione un vehículo.' };

  const vehiculo = await get(
    'SELECT v.id, v.cliente_id FROM vehiculos v WHERE v.id = ?',
    [vehiculoId]
  );
  if (!vehiculo) return { ok: false, error: 'Vehículo no encontrado.' };

  const estado = ESTADOS.includes(data.estado) ? data.estado : existing.estado;
  const facturaResult = resolveNumeroFactura(data, existing, estado);
  if (!facturaResult.ok) return { ok: false, error: facturaResult.error };

  const kilometraje = parseIntOrNull(data.kilometraje);
  const intervalo = parseIntOrNull(data.intervalo);
  const proximoKm = parseIntOrNull(data.proximoKm);
  const fecha = data.fecha?.trim() || existing.fecha;
  const fechaVencimiento = data.fechaVencimiento?.trim() || null;

  await run(
    `UPDATE ordenes_trabajo SET
       cliente_id = ?, vehiculo_id = ?, fecha = ?, kilometraje = ?, intervalo = ?,
       proximo_km = ?, fecha_vencimiento = ?, observaciones = ?, estado = ?,
       numero_factura = ?, actualizado_en = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      vehiculo.cliente_id,
      vehiculoId,
      fecha,
      kilometraje,
      intervalo,
      proximoKm,
      fechaVencimiento,
      data.observaciones?.trim() || null,
      estado,
      facturaResult.value,
      id
    ]
  );

  await saveServiciosForOrden(id, data.servicios || []);
  const orden = await getOrden(id);
  await syncOrdenRailway(orden);
  return { ok: true, orden };
}

async function deleteOrden(id) {
  const existing = await getOrden(id);
  if (!existing) return { ok: false, error: 'Orden no encontrada.' };

  await run('DELETE FROM ordenes_trabajo WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = {
  listOrdenes,
  getOrden,
  createOrden,
  updateOrden,
  deleteOrden,
  listVehiculosByCliente,
  searchVehiculosForOrden,
  SERVICIOS_CATALOGO,
  ESTADOS,
  FACTURA_REGEX,
  syncOrdenRailway
};
