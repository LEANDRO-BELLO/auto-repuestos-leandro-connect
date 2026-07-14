const {
  all,
  closeDatabase
} = require('../src/database/connection');

const {
  syncCliente,
  syncVehiculo,
  syncOrden
} = require('../src/services/railway-sync.service');

function mapCliente(row) {
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

function mapVehiculo(row) {
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

function mapOrden(row) {
  return {
    id: row.id,
    numeroOs: row.numero_os,
    clienteId: row.cliente_id,
    vehiculoId: row.vehiculo_id,
    fecha: row.fecha,
    kilometraje: row.kilometraje ?? null,
    intervalo: row.intervalo ?? null,
    proximoKm: row.proximo_km ?? null,
    fechaVencimiento: row.fecha_vencimiento || null,
    observaciones: row.observaciones || '',
    estado: row.estado,
    numeroFactura: row.numero_factura || null
  };
}

async function main() {
  const clientes = await all(
    'SELECT * FROM clientes ORDER BY id'
  );

  const vehiculos = await all(
    'SELECT * FROM vehiculos ORDER BY id'
  );

  const ordenes = await all(
    `SELECT *
     FROM ordenes_trabajo
     WHERE estado = 'Finalizada'
     ORDER BY id`
  );

  const servicios = await all(
    `SELECT orden_id, servicio, proximo_km
     FROM ordenes_servicios
     ORDER BY orden_id, id`
  );

  console.log(
    `Sincronizando ${clientes.length} clientes...`
  );

  for (const row of clientes) {
    try {
      await syncCliente(mapCliente(row));

      console.log(
        `  Cliente OK: ${row.nombre} (id ${row.id})`
      );
    } catch (error) {
      console.error(
        `  CLIENTE FALHOU: ${row.nombre}`,
        `id: ${row.id}`,
        `erro: ${error.message}`
      );

      throw error;
    }
  }

  console.log(
    `Sincronizando ${vehiculos.length} vehículos...`
  );

  for (const row of vehiculos) {
    try {
      await syncVehiculo(mapVehiculo(row));

      console.log(
        `  Vehículo OK: ${row.placa} (id ${row.id}, cliente ${row.cliente_id})`
      );
    } catch (error) {
      console.error(
        `  VEHÍCULO FALHOU: ${row.placa}`,
        `id: ${row.id}`,
        `cliente_id: ${row.cliente_id}`,
        `erro: ${error.message}`
      );

      throw error;
    }
  }

  console.log(
    `Sincronizando ${ordenes.length} órdenes finalizadas...`
  );
  
  for (const row of ordenes) {
    const clienteRow = clientes.find(
      (cliente) => cliente.id === row.cliente_id
    );
  
    const vehiculoRow = vehiculos.find(
      (vehiculo) => vehiculo.id === row.vehiculo_id
    );
  
    if (!clienteRow) {
      console.error(
        `CLIENTE LOCAL NÃO ENCONTRADO para ${row.numero_os}:`,
        row.cliente_id
      );
      continue;
    }
  
    if (!vehiculoRow) {
      console.error(
        `VEÍCULO LOCAL NÃO ENCONTRADO para ${row.numero_os}:`,
        row.vehiculo_id
      );
      continue;
    }
  
    const ordenServicios = servicios
      .filter((servicio) => servicio.orden_id === row.id)
      .map((servicio) => ({
        id: servicio.servicio,
        proximoKm: servicio.proximo_km ?? null
      }));
  
    try {
      // Garante primeiro as dependências da ordem.
      await syncCliente(mapCliente(clienteRow));
  
      await syncVehiculo(mapVehiculo(vehiculoRow));
  
      // Somente depois envia a ordem.
      await syncOrden(
        mapOrden(row),
        ordenServicios
      );
  
      console.log(
        `  Orden OK: ${row.numero_os} ` +
        `(id ${row.id}, cliente ${row.cliente_id}, vehículo ${row.vehiculo_id})`
      );
    } catch (error) {
      console.error(
        `  ORDEN FALHOU: ${row.numero_os}`,
        `id: ${row.id}`,
        `cliente_id: ${row.cliente_id}`,
        `vehiculo_id: ${row.vehiculo_id}`,
        `erro: ${error.message}`
      );
  
      throw error;
    }
  }
  console.log('Sincronización completa.');
}

main()
  .catch((error) => {
    console.error(
      'Error de sincronización:',
      error.message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeDatabase();
    } catch {
      // Ignorar erro ao fechar banco.
    }
  });