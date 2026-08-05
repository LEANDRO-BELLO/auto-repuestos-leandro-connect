const { query } = require('../database/postgres');
const {
  syncCliente,
  syncVehiculo,
  syncOrden
} = require('./railway-sync.service');

let running = false;
let intervalHandle = null;

function mapCliente(row) {
  return row && {
    id: Number(row.id),
    codigo: row.codigo || '',
    nombre: row.nombre || '',
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

function mapVehiculo(row) {
  return row && {
    id: Number(row.id),
    codigo: row.codigo || '',
    clienteId: Number(row.cliente_id),
    placa: row.placa || '',
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
    dataGeracaoQr: row.data_geracao_qr || null
  };
}

function mapOrden(row) {
  return row && {
    id: Number(row.id),
    numeroOs: row.numero_os || '',
    clienteId: Number(row.cliente_id),
    vehiculoId: Number(row.vehiculo_id),
    fecha: row.fecha || null,
    kilometraje: row.kilometraje ?? null,
    intervalo: row.intervalo ?? null,
    proximoKm: row.proximo_km ?? null,
    fechaVencimiento: row.fecha_vencimiento || null,
    observaciones: row.observaciones || '',
    estado: row.estado || '',
    numeroFactura: row.numero_factura || null
  };
}

async function listarClientes() {
  const result = await query(`
    SELECT *
    FROM clientes
    ORDER BY id ASC
  `);

  return result.rows.map(mapCliente);
}

async function listarVehiculos() {
  const result = await query(`
    SELECT *
    FROM vehiculos
    ORDER BY id ASC
  `);

  return result.rows.map(mapVehiculo);
}

async function listarOrdenesFinalizadas() {
  const result = await query(`
    SELECT *
    FROM ordenes_trabajo
    WHERE LOWER(TRIM(estado)) = LOWER('Finalizada')
    ORDER BY id ASC
  `);

  return result.rows.map(mapOrden);
}

async function getServicios(ordenId) {
  const result = await query(
    `
      SELECT servicio, proximo_km
      FROM ordenes_servicios
      WHERE orden_id = $1
      ORDER BY id ASC
    `,
    [Number(ordenId)]
  );

  return result.rows.map((row) => ({
    id: row.servicio,
    proximoKm: row.proximo_km ?? null
  }));
}

async function sincronizarColeccion(items, syncFn, tipo) {
  let sincronizados = 0;
  let fallidos = 0;
  const errores = [];

  for (const item of items) {
    try {
      await syncFn(item);
      sincronizados += 1;
    } catch (error) {
      fallidos += 1;
      const mensaje = String(error?.message || error).slice(0, 500);
      errores.push({
        tipo,
        id: item?.id,
        codigo: item?.codigo || item?.numeroOs || item?.placa || '',
        error: mensaje
      });
      console.error(
        `[SYNC INICIAL] No se pudo sincronizar ${tipo} ${item?.id}:`,
        mensaje
      );
    }
  }

  return { sincronizados, fallidos, errores };
}

async function sincronizarTodo() {
  if (running) {
    return { ok: true, skipped: true, reason: 'sync_en_ejecucion' };
  }

  running = true;

  try {
    console.log('[SYNC INICIAL] Iniciando sincronización completa con Railway...');

    const clientes = await listarClientes();
    const resultadoClientes = await sincronizarColeccion(
      clientes,
      syncCliente,
      'cliente'
    );

    const vehiculos = await listarVehiculos();
    const resultadoVehiculos = await sincronizarColeccion(
      vehiculos,
      syncVehiculo,
      'vehículo'
    );

    const ordenes = await listarOrdenesFinalizadas();
    let ordenesSincronizadas = 0;
    let ordenesFallidas = 0;
    const erroresOrdenes = [];

    for (const orden of ordenes) {
      try {
        const servicios = await getServicios(orden.id);
        await syncOrden(orden, servicios);
        ordenesSincronizadas += 1;
      } catch (error) {
        ordenesFallidas += 1;
        const mensaje = String(error?.message || error).slice(0, 500);
        erroresOrdenes.push({
          tipo: 'orden',
          id: orden.id,
          codigo: orden.numeroOs,
          error: mensaje
        });
        console.error(
          `[SYNC INICIAL] No se pudo sincronizar orden ${orden.numeroOs}:`,
          mensaje
        );
      }
    }

    const resultado = {
      ok:
        resultadoClientes.fallidos === 0 &&
        resultadoVehiculos.fallidos === 0 &&
        ordenesFallidas === 0,
      clientes: {
        total: clientes.length,
        ...resultadoClientes
      },
      vehiculos: {
        total: vehiculos.length,
        ...resultadoVehiculos
      },
      ordenes: {
        total: ordenes.length,
        sincronizados: ordenesSincronizadas,
        fallidos: ordenesFallidas,
        errores: erroresOrdenes
      }
    };

    console.log('[SYNC INICIAL] Resultado:', JSON.stringify({
      clientes: `${resultadoClientes.sincronizados}/${clientes.length}`,
      vehiculos: `${resultadoVehiculos.sincronizados}/${vehiculos.length}`,
      ordenes: `${ordenesSincronizadas}/${ordenes.length}`
    }));

    return resultado;
  } finally {
    running = false;
  }
}

// Mantiene compatibilidad con el nombre usado por el proyecto anterior.
async function sincronizarPendientes() {
  return sincronizarTodo();
}

async function marcarPendiente() {
  // Ya no es necesario marcar registros individualmente:
  // los upserts del portal permiten repetir la sincronización con seguridad.
  return { ok: true };
}

async function getEstadoSincronizacion() {
  return {
    ejecutando: running,
    modo: 'sincronizacion_completa_segura'
  };
}

function startAutoSync() {
  if (intervalHandle) {
    return;
  }

  // Primera sincronización al iniciar el Electron.
  setTimeout(() => {
    sincronizarTodo().catch((error) => {
      console.error('[SYNC INICIAL] Error general:', error);
    });
  }, 3500);

  // Revisión periódica para recuperar datos que no pudieron enviarse
  // por falta temporal de internet. Los endpoints usan UPSERT y no duplican.
  intervalHandle = setInterval(() => {
    sincronizarTodo().catch((error) => {
      console.error('[SYNC AUTOMÁTICO] Error general:', error);
    });
  }, 5 * 60 * 1000);
}

function stopAutoSync() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }

  intervalHandle = null;
}

module.exports = {
  marcarPendiente,
  sincronizarTodo,
  sincronizarPendientes,
  getEstadoSincronizacion,
  startAutoSync,
  stopAutoSync
};
