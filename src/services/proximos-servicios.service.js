const { all } = require('../database/connection');
const { SERVICIOS_CATALOGO } = require('./ordenes.service');

const ACEITE_MOTOR_ID = 'aceite_motor';

const SERVICIOS_KM_INDIVIDUAL = new Set([
  'aceite_caja_cambio',
  'aceite_caja_transferencia',
  'aceite_dif_del',
  'aceite_dif_tras',
  'aceite_direccion',
  'fluido_radiador',
  'fluido_freno'
]);

const LABEL_BY_ID = Object.fromEntries(SERVICIOS_CATALOGO.map((s) => [s.id, s.label]));

const KM_PROXIMO_UMBRAL = 5000;

function parseKm(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function computeEstado(fechaVencimiento, proximoKm, vehiculoKmActual) {
  if (fechaVencimiento) {
    const fecha = new Date(`${fechaVencimiento}T12:00:00`);
    const today = todayStart();
    const diffDays = Math.ceil((fecha - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Vencido';
    }
    if (diffDays <= 30) {
      return 'Próximo';
    }
    return 'En plazo';
  }

  const proximo = parseKm(proximoKm);
  const actual = parseKm(vehiculoKmActual);

  if (proximo !== null && actual !== null) {
    const remaining = proximo - actual;

    if (remaining <= 0) {
      return 'Vencido';
    }
    if (remaining <= KM_PROXIMO_UMBRAL) {
      return 'Próximo';
    }
    return 'En plazo';
  }

  return 'En plazo';
}

function buildItemsFromOrden(row, serviciosRows) {
  const servicioIds = new Set(serviciosRows.map((s) => s.servicio));
  const serviciosKm = Object.fromEntries(
    serviciosRows.map((s) => [s.servicio, s.proximo_km ?? null])
  );
  const mainProximoKm = parseKm(row.proximo_km);
  const revisionItems = [];

  if (servicioIds.has(ACEITE_MOTOR_ID) && mainProximoKm !== null) {
    revisionItems.push({
      servicioId: ACEITE_MOTOR_ID,
      servicioLabel: LABEL_BY_ID[ACEITE_MOTOR_ID],
      proximoKm: mainProximoKm,
      fechaVencimiento: row.fecha_vencimiento || null
    });
  }

  for (const servicioId of SERVICIOS_KM_INDIVIDUAL) {
    if (!servicioIds.has(servicioId)) {
      continue;
    }

    const individualKm = parseKm(serviciosKm[servicioId]);

    if (individualKm === null) {
      continue;
    }

    if (mainProximoKm !== null && individualKm === mainProximoKm) {
      continue;
    }

    revisionItems.push({
      servicioId,
      servicioLabel: LABEL_BY_ID[servicioId] || servicioId,
      proximoKm: individualKm,
      fechaVencimiento: null
    });
  }

  return revisionItems.map((item) => ({
    id: `${row.orden_id}-${item.servicioId}`,
    ordenId: row.orden_id,
    numeroOs: row.numero_os,
    clienteNombre: row.cliente_nombre || '',
    clienteCodigo: row.cliente_codigo || '',
    clienteWhatsapp: row.whatsapp || row.telefono || '',
    vehiculoPlaca: row.placa || '',
    vehiculoMarca: row.marca || '',
    vehiculoModelo: row.modelo || '',
    vehiculoKmActual: row.vehiculo_km_actual ?? null,
    servicioId: item.servicioId,
    servicioLabel: item.servicioLabel,
    ultimoKm: row.kilometraje ?? null,
    proximoKm: item.proximoKm,
    fechaVencimiento: item.fechaVencimiento,
    estado: computeEstado(item.fechaVencimiento, item.proximoKm, row.vehiculo_km_actual)
  }));
}

function matchesSearch(item, term) {
  const lower = term.toLowerCase();
  const haystack = [
    item.clienteNombre,
    item.vehiculoPlaca,
    item.vehiculoMarca,
    item.vehiculoModelo,
    item.servicioLabel,
    item.numeroOs
  ].join(' ').toLowerCase();

  return haystack.includes(lower);
}

function sortItems(items) {
  const estadoOrder = { Vencido: 0, Próximo: 1, 'En plazo': 2 };

  return items.sort((a, b) => {
    const estadoDiff = (estadoOrder[a.estado] ?? 9) - (estadoOrder[b.estado] ?? 9);
    if (estadoDiff !== 0) {
      return estadoDiff;
    }

    if (a.fechaVencimiento && b.fechaVencimiento) {
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    }

    return (a.proximoKm ?? 0) - (b.proximoKm ?? 0);
  });
}

async function listProximosServicios(filters = {}) {
  const search = (filters.search || '').trim();
  const estado = (filters.estado || '').trim();

  const rows = await all(
    `SELECT o.id AS orden_id, o.numero_os, o.kilometraje, o.proximo_km, o.fecha_vencimiento,
            c.nombre AS cliente_nombre, c.codigo AS cliente_codigo, c.whatsapp, c.telefono,
            v.id AS vehiculo_id, v.placa, v.marca, v.modelo, v.kilometraje AS vehiculo_km_actual
     FROM ordenes_trabajo o
     INNER JOIN clientes c ON c.id = o.cliente_id
     INNER JOIN vehiculos v ON v.id = o.vehiculo_id
     WHERE o.estado = 'Finalizada'
     ORDER BY o.fecha DESC, o.id DESC`
  );

  const seenVehiculos = new Set();
  let items = [];

  for (const row of rows) {
    if (seenVehiculos.has(row.vehiculo_id)) {
      continue;
    }

    seenVehiculos.add(row.vehiculo_id);

    const serviciosRows = await all(
      'SELECT servicio, proximo_km FROM ordenes_servicios WHERE orden_id = ?',
      [row.orden_id]
    );

    items.push(...buildItemsFromOrden(row, serviciosRows));
  }

  if (search) {
    items = items.filter((item) => matchesSearch(item, search));
  }

  if (estado && estado !== 'Todos') {
    items = items.filter((item) => item.estado === estado);
  }

  return {
    items: sortItems(items),
    total: items.length
  };
}

module.exports = {
  listProximosServicios,
  computeEstado
};
