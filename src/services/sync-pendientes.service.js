const { get, all, run } = require('../database/connection');
const { syncCliente, syncVehiculo, syncOrden } = require('./railway-sync.service');

let running = false;
let intervalHandle = null;

function mapCliente(row) {
  return row && {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    documento: row.documento,
    telefono: row.telefono,
    whatsapp: row.whatsapp,
    email: row.email,
    direccion: row.direccion,
    ciudad: row.ciudad,
    observaciones: row.observaciones,
    ultimaVisita: row.ultima_visita
  };
}

function mapVehiculo(row) {
  return row && {
    id: row.id,
    codigo: row.codigo,
    clienteId: row.cliente_id,
    placa: row.placa,
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    color: row.color,
    motor: row.motor,
    combustible: row.combustible,
    chasis: row.chasis,
    kilometraje: row.kilometraje,
    observaciones: row.observaciones,
    qrCode: row.qr_code,
    dataGeracaoQr: row.data_geracao_qr
  };
}

function mapOrden(row) {
  return row && {
    id: row.id,
    numeroOs: row.numero_os,
    clienteId: row.cliente_id,
    vehiculoId: row.vehiculo_id,
    fecha: row.fecha,
    kilometraje: row.kilometraje,
    intervalo: row.intervalo,
    proximoKm: row.proximo_km,
    fechaVencimiento: row.fecha_vencimiento,
    observaciones: row.observaciones,
    estado: row.estado,
    numeroFactura: row.numero_factura
  };
}

async function getServicios(ordenId) {
  const rows = await all(
    `SELECT servicio, proximo_km
       FROM ordenes_servicios
      WHERE orden_id = ?
      ORDER BY servicio`,
    [ordenId]
  );
  return rows.map((row) => ({ id: row.servicio, proximoKm: row.proximo_km }));
}

async function marcarPendiente(ordenId) {
  await run(
    `UPDATE ordenes_trabajo
        SET sync_estado = CASE WHEN estado = 'Finalizada' THEN 'pendiente' ELSE 'no_aplica' END,
            sync_ultimo_error = NULL,
            sync_actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [ordenId]
  );
}

async function sincronizarOrden(row) {
  const orden = mapOrden(row);
  const cliente = mapCliente(await get('SELECT * FROM clientes WHERE id = ?', [orden.clienteId]));
  const vehiculo = mapVehiculo(await get('SELECT * FROM vehiculos WHERE id = ?', [orden.vehiculoId]));
  const servicios = await getServicios(orden.id);

  if (!cliente || !vehiculo) {
    throw new Error('Cliente o vehículo local no encontrado.');
  }

  // Garante que as dependências existam no portal antes da ordem.
  await syncCliente(cliente);
  await syncVehiculo(vehiculo);
  await syncOrden(orden, servicios);

  await run(
    `UPDATE ordenes_trabajo
        SET sync_estado = 'sincronizada',
            sync_ultimo_error = NULL,
            sync_actualizado_en = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [orden.id]
  );

  console.log('Orden sincronizada con Railway:', orden.numeroOs);
}

async function sincronizarPendientes() {
  if (running) return { ok: true, skipped: true };
  running = true;

  let sincronizadas = 0;
  let fallidas = 0;

  try {
    const pendientes = await all(
      `SELECT *
         FROM ordenes_trabajo
        WHERE estado = 'Finalizada'
          AND sync_estado IN ('pendiente', 'error', 'sincronizando')
        ORDER BY id ASC`
    );

    for (const row of pendientes) {
      await run(
        `UPDATE ordenes_trabajo
            SET sync_estado = 'sincronizando',
                sync_intentos = sync_intentos + 1,
                sync_actualizado_en = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [row.id]
      );

      try {
        await sincronizarOrden(row);
        sincronizadas += 1;
      } catch (error) {
        fallidas += 1;
        const message = String(error?.message || error).slice(0, 500);
        await run(
          `UPDATE ordenes_trabajo
              SET sync_estado = 'error',
                  sync_ultimo_error = ?,
                  sync_actualizado_en = CURRENT_TIMESTAMP
            WHERE id = ?`,
          [message, row.id]
        );
        console.error('No se pudo sincronizar la orden:', row.numero_os, message);
      }
    }

    return { ok: true, sincronizadas, fallidas, total: pendientes.length };
  } finally {
    running = false;
  }
}

async function getEstadoSincronizacion() {
  const row = await get(
    `SELECT
       SUM(CASE WHEN sync_estado IN ('pendiente','error','sincronizando') AND estado='Finalizada' THEN 1 ELSE 0 END) AS pendientes,
       SUM(CASE WHEN sync_estado='sincronizada' AND estado='Finalizada' THEN 1 ELSE 0 END) AS sincronizadas
     FROM ordenes_trabajo`
  );
  return {
    ejecutando: running,
    pendientes: Number(row?.pendientes || 0),
    sincronizadas: Number(row?.sincronizadas || 0)
  };
}

function startAutoSync() {
  if (intervalHandle) return;
  setTimeout(() => sincronizarPendientes().catch(() => {}), 2500);
  intervalHandle = setInterval(() => {
    sincronizarPendientes().catch(() => {});
  }, 30000);
}

function stopAutoSync() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = {
  marcarPendiente,
  sincronizarPendientes,
  getEstadoSincronizacion,
  startAutoSync,
  stopAutoSync
};
