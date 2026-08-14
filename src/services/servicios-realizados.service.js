const { get, all } = require('../database/connection');
const { SERVICIOS_CATALOGO } = require('./ordenes.service');

const LABEL_BY_ID = Object.fromEntries(SERVICIOS_CATALOGO.map((s) => [s.id, s.label]));


function mapRow(row) {
  const servicioIds = row.servicios_ids
    ? row.servicios_ids.split(',').filter(Boolean)
    : [];

  const serviciosLabels = servicioIds.map((id) => LABEL_BY_ID[id] || id);

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
    servicios: servicioIds,
    serviciosLabels
  };
}

function getServicioIdsMatching(term) {
  const lower = term.toLowerCase();
  return SERVICIOS_CATALOGO.filter(
    (s) => s.label.toLowerCase().includes(lower) || s.id.replace(/_/g, ' ').includes(lower)
  ).map((s) => s.id);
}

async function countFinalizadas() {
  const row = await get(
    "SELECT COUNT(*) AS total FROM ordenes_trabajo WHERE estado = 'Finalizada'"
  );

  return Number(row?.total || 0);
}

async function listServiciosRealizados(filters = {}) {
  const search = (filters.search || '').trim();
  const fechaDesde = (filters.fechaDesde || '').trim();
  const fechaHasta = (filters.fechaHasta || '').trim();
  const vehiculoId = filters.vehiculoId || null;

  const conditions = [];
  const params = [];

  if (vehiculoId) {
    conditions.push('o.vehiculo_id = ?');
    params.push(vehiculoId);
  }

  if (fechaDesde) {
    conditions.push('o.fecha >= ?');
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    conditions.push('o.fecha <= ?');
    params.push(fechaHasta);
  }

  if (search) {
    const like = `%${search}%`;
    const servicioIds = getServicioIdsMatching(search);
    const servicioClauses = ['os2.servicio LIKE ?'];
    const servicioParams = [like];

    if (servicioIds.length) {
      servicioClauses.push(`os2.servicio IN (${servicioIds.map(() => '?').join(', ')})`);
      servicioParams.push(...servicioIds);
    }

    conditions.push(`(
      c.nombre LIKE ?
      OR v.placa LIKE ?
      OR v.marca LIKE ?
      OR v.modelo LIKE ?
      OR o.numero_os LIKE ?
      OR o.numero_factura LIKE ?
      OR EXISTS (
        SELECT 1 FROM ordenes_servicios os2
        WHERE os2.orden_id = o.id
        AND (${servicioClauses.join(' OR ')})
      )
    )`);
    params.push(like, like, like, like, like, like, ...servicioParams);
  }

  const whereParts = ["o.estado = 'Finalizada'", ...conditions];
  const whereClause = whereParts.join(' AND ');

  const rows = await all(
  `SELECT o.id, o.numero_os, o.cliente_id, o.vehiculo_id, o.fecha, o.kilometraje,
          o.intervalo, o.proximo_km, o.fecha_vencimiento,
          o.observaciones, o.estado, o.numero_factura,
          c.nombre AS cliente_nombre, c.codigo AS cliente_codigo,
          v.placa AS vehiculo_placa,
          v.marca AS vehiculo_marca,
          v.modelo AS vehiculo_modelo,
          STRING_AGG(os.servicio, ',') AS servicios_ids
   FROM ordenes_trabajo o
   INNER JOIN clientes c ON c.id = o.cliente_id
   INNER JOIN vehiculos v ON v.id = o.vehiculo_id
   LEFT JOIN ordenes_servicios os ON os.orden_id = o.id
   WHERE ${whereClause}
   GROUP BY
     o.id,
     o.numero_os,
     o.cliente_id,
     o.vehiculo_id,
     o.fecha,
     o.kilometraje,
     o.intervalo,
     o.proximo_km,
     o.fecha_vencimiento,
     o.observaciones,
     o.estado,
     o.numero_factura,
     c.nombre,
     c.codigo,
     v.placa,
     v.marca,
     v.modelo
   ORDER BY o.fecha DESC, o.id DESC`,
  params
);

  const totalFinalizadas = await countFinalizadas();

  return {
    items: rows.map(mapRow),
    totalFinalizadas
  };
}

module.exports = {
  listServiciosRealizados,
  SERVICIOS_CATALOGO
};
