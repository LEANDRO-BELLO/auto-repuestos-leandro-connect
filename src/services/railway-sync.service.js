const RAILWAY_URL = 'https://auto-repuestos-leandro-connect-production.up.railway.app';
const TIMEOUT_MS = 15000;

async function postJson(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${RAILWAY_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        typeof data === 'object' && data?.error
          ? data.error
          : `HTTP ${response.status}: ${text || 'Sin respuesta'}`;
      throw new Error(message);
    }

    return data ?? { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

async function syncCliente(cliente) {
  if (!cliente) throw new Error('Cliente no disponible para sincronizar.');

  return postJson('/api/sync/cliente', {
    id: cliente.id,
    codigo: cliente.codigo,
    nombre: cliente.nombre,
    documento: cliente.documento || null,
    telefono: cliente.telefono || null,
    whatsapp: cliente.whatsapp || null,
    email: cliente.email || null,
    direccion: cliente.direccion || null,
    ciudad: cliente.ciudad || null,
    observaciones: cliente.observaciones || null,
    ultima_visita: cliente.ultimaVisita || null
  });
}

async function syncVehiculo(vehiculo) {
  if (!vehiculo) throw new Error('Vehículo no disponible para sincronizar.');

  return postJson('/api/sync/vehiculo', {
    id: vehiculo.id,
    codigo: vehiculo.codigo,
    cliente_id: vehiculo.clienteId,
    placa: vehiculo.placa,
    marca: vehiculo.marca || null,
    modelo: vehiculo.modelo || null,
    anio: vehiculo.anio ?? null,
    color: vehiculo.color || null,
    motor: vehiculo.motor || null,
    combustible: vehiculo.combustible || null,
    chasis: vehiculo.chasis || null,
    kilometraje: vehiculo.kilometraje ?? null,
    observaciones: vehiculo.observaciones || null,
    qr_code: vehiculo.qrCode,
    data_geracao_qr: vehiculo.dataGeracaoQr || null
  });
}

async function syncOrden(orden, servicios = []) {
  if (!orden) throw new Error('Orden no disponible para sincronizar.');

  return postJson('/api/sync/orden', {
    orden: {
      id: orden.id,
      numero_os: orden.numeroOs,
      cliente_id: orden.clienteId,
      vehiculo_id: orden.vehiculoId,
      fecha: orden.fecha,
      kilometraje: orden.kilometraje ?? null,
      intervalo: orden.intervalo ?? null,
      proximo_km: orden.proximoKm ?? null,
      fecha_vencimiento: orden.fechaVencimiento || null,
      observaciones: orden.observaciones || null,
      estado: orden.estado,
      numero_factura: orden.numeroFactura || null
    },
    servicios: servicios.map((servicio) => ({
      servicio: servicio.id,
      proximo_km: servicio.proximoKm ?? null
    }))
  });
}

module.exports = {
  RAILWAY_URL,
  syncCliente,
  syncVehiculo,
  syncOrden
};
