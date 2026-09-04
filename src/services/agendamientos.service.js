const { all, get, run } = require('../database/connection');

function normalize(data = {}) {
  const clienteId =
    data.clienteId === null ||
    data.clienteId === undefined ||
    data.clienteId === ''
      ? null
      : Number(data.clienteId);

  const vehiculoId =
    data.vehiculoId === null ||
    data.vehiculoId === undefined ||
    data.vehiculoId === ''
      ? null
      : Number(data.vehiculoId);

  return {
    clienteId,
    vehiculoId,

    clienteNombre: String(
      data.clienteNombre || ''
    ).trim(),

    clienteTelefono: String(
      data.clienteTelefono || ''
    ).trim(),

    vehiculoDescripcion: String(
      data.vehiculoDescripcion || ''
    ).trim(),

    fecha: String(data.fecha || '').trim(),
    hora: String(data.hora || '').trim(),

    observaciones: String(
      data.observaciones || ''
    ).trim()
  };
}

function validate(data) {
  if (!data.fecha || !data.hora) {
    return 'Fecha y hora son obligatorios.';
  }

  const tieneClienteRegistrado = Boolean(data.clienteId);
  const tieneClienteLibre = Boolean(data.clienteNombre);

  if (!tieneClienteRegistrado && !tieneClienteLibre) {
    return 'Seleccione un cliente o ingrese el nombre del cliente.';
  }

  if (!data.vehiculoId && !data.vehiculoDescripcion) {
    return 'Seleccione un vehículo o escriba la descripción del vehículo.';
  }

  return null;
}

const BASE_SELECT = `
  SELECT
    a.*,

    COALESCE(
      c.nombre,
      a.cliente_nombre
    ) AS clienteNombre,

    COALESCE(
      c.whatsapp,
      c.telefono,
      a.cliente_telefono
    ) AS clienteTelefono,

    v.placa,
    v.marca,
    v.modelo,
    v.motor,

    COALESCE(
      CASE
        WHEN v.id IS NOT NULL THEN
          TRIM(
            COALESCE(v.marca, '') || ' ' ||
            COALESCE(v.modelo, '') || ' ' ||
            COALESCE(v.placa, '')
          )
        ELSE NULL
      END,
      a.vehiculo_descripcion
    ) AS vehiculoDescripcion,

    o.numero_os AS numeroOs

  FROM agendamientos a

  LEFT JOIN clientes c
    ON c.id = a.cliente_id

  LEFT JOIN vehiculos v
    ON v.id = a.vehiculo_id

  LEFT JOIN ordenes_trabajo o
    ON o.id = a.orden_id
`;

async function listAgendamientos(filters = {}) {
  const search = String(filters.search || '').trim();
  const params = [];
  let where = '1=1';
  if (search) {
    where += `
  AND (
    c.nombre LIKE ?
    OR a.cliente_nombre LIKE ?
    OR v.placa LIKE ?
    OR v.modelo LIKE ?
    OR a.vehiculo_descripcion LIKE ?
  )
`;

params.push(like, like, like, like, like);
  }
  return all(`${BASE_SELECT} WHERE ${where} ORDER BY CASE WHEN a.estado IN ('Pendiente', 'En proceso') THEN 0 ELSE 1 END ASC, a.fecha ASC, a.hora ASC, a.id ASC`, params);
}

async function listProximosAgendamientos(limit = 12) {
  const today = new Date().toISOString().slice(0, 10);
  return all(
    `${BASE_SELECT}
      WHERE a.fecha >= ? AND a.estado = 'Pendiente'
      ORDER BY CASE WHEN a.estado IN ('Pendiente', 'En proceso') THEN 0 ELSE 1 END ASC, a.fecha ASC, a.hora ASC, a.id ASC
      LIMIT ?`,
    [today, Number(limit) || 12]
  );
}

async function getAgendamiento(id) {
  return get(`${BASE_SELECT} WHERE a.id = ?`, [id]);
}

async function createAgendamiento(payload) {
  const data = normalize(payload);
  const error = validate(data);

  if (error) {
    return { ok: false, error };
  }

  const result = await run(
    `INSERT INTO agendamientos (
      cliente_id,
      vehiculo_id,
      cliente_nombre,
      cliente_telefono,
      vehiculo_descripcion,
      fecha,
      hora,
      observaciones,
      estado
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')`,
    [
      data.clienteId,
      data.vehiculoId,
      data.clienteNombre || null,
      data.clienteTelefono || null,
      data.vehiculoDescripcion || null,
      data.fecha,
      data.hora,
      data.observaciones || null
    ]
  );

  return {
    ok: true,
    id: result.lastID 
  };
}

async function updateAgendamiento(id, payload) {
  const data = normalize(payload);
  const error = validate(data);
  if (error) return { ok: false, error };
  await run(
    `UPDATE agendamientos
        SET cliente_id = ?, vehiculo_id = ?, vehiculo_descripcion = ?, fecha = ?, hora = ?,
            observaciones = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [data.clienteId, data.vehiculoId, data.vehiculoDescripcion || null, data.fecha, data.hora, data.observaciones, id]
  );
  return { ok: true };
}

async function setEstadoAgendamiento(id, estado) {
  const permitidos = new Set(['Pendiente', 'En proceso', 'Finalizado', 'Cancelado']);
  if (!permitidos.has(estado)) return { ok: false, error: 'Estado inválido.' };
  await run('UPDATE agendamientos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [estado, id]);
  return { ok: true };
}

async function deleteAgendamiento(id) {
  await run('DELETE FROM agendamientos WHERE id = ?', [id]);
  return { ok: true };
}

module.exports = {
  listAgendamientos,
  listProximosAgendamientos,
  getAgendamiento,
  createAgendamiento,
  updateAgendamiento,
  setEstadoAgendamiento,
  deleteAgendamiento
};

