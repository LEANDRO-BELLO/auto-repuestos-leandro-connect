function formatFecha(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatKm(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return `${new Intl.NumberFormat('es-PY').format(value)} km`;
}

export function normalizeWhatsAppPhone(raw) {
  if (!raw) {
    return null;
  }

  let digits = String(raw).replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  if (digits.startsWith('595')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (digits.length === 9 && digits.startsWith('9')) {
    return `595${digits}`;
  }

  if (digits.length >= 10) {
    return digits;
  }

  return null;
}

export function buildOrdenWhatsAppMessage({ empresa, cliente, orden, serviciosLabels = [] }) {
  const vehiculo = [orden.vehiculoMarca, orden.vehiculoModelo].filter(Boolean).join(' ') || '—';
  const serviciosText = serviciosLabels.length ? serviciosLabels.join(', ') : '—';
  const lines = [
    `Hola${cliente?.nombre ? ` ${cliente.nombre}` : ''}!`,
    '',
    'Le informamos que su servicio fue finalizado correctamente.',
    '',
    empresa?.nombre || 'Auto Repuestos Leandro S.A.',
    `Nº OS: ${orden.numeroOs}`,
    orden.numeroFactura ? `Nº Factura: ${orden.numeroFactura}` : null,
    `Vehículo: ${vehiculo} (${orden.vehiculoPlaca || '—'})`,
    `KM actual: ${formatKm(orden.kilometraje)}`,
    `Próximo KM: ${formatKm(orden.proximoKm)}`,
    orden.fechaVencimiento ? `Próxima revisión: ${formatFecha(orden.fechaVencimiento)}` : null,
    `Servicios: ${serviciosText}`,
    '',
    'Gracias por confiar en nosotros.'
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildWhatsAppUrl(phone, message) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
