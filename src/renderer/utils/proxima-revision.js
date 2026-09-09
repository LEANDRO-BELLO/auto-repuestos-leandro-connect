import { canonicalServicioId, resolveServicioLabel, SERVICIO_ALIASES } from './servicios-labels.js';

const ACEITE_MOTOR_ID = 'aceite_motor';
const CAMBIO_BATERIA_ID = 'cambio_bateria';

function parseFecha(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function fechaForBateria(orden) {
  const serviciosFechas = orden.serviciosFechas || {};
  return parseFecha(serviciosFechas[CAMBIO_BATERIA_ID]) || parseFecha(orden.fechaVencimiento);
}

function parseKm(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function kmForServicio(serviciosKm, catalogId) {
  const direct = parseKm(serviciosKm[catalogId]);

  if (direct !== null) {
    return direct;
  }

  for (const [alias, canonical] of Object.entries(SERVICIO_ALIASES)) {
    if (canonical === catalogId) {
      const aliased = parseKm(serviciosKm[alias]);
      if (aliased !== null) {
        return aliased;
      }
    }
  }

  return null;
}

export function getProximaRevisionItems(orden, catalog) {
  const mainProximoKm = parseKm(orden.proximoKm);
  const serviciosKm = orden.serviciosKm || {};
  const servicioIds = new Set((orden.servicios || []).map(canonicalServicioId).filter(Boolean));
  const items = [];

  if (servicioIds.has(ACEITE_MOTOR_ID) && mainProximoKm !== null) {
    items.push({
      id: ACEITE_MOTOR_ID,
      label: resolveServicioLabel(ACEITE_MOTOR_ID, catalog),
      proximoKm: mainProximoKm
    });
  }

  for (const servicio of catalog) {
    if (servicio.id === ACEITE_MOTOR_ID || servicio.id === CAMBIO_BATERIA_ID) {
      continue;
    }

    if (!servicioIds.has(servicio.id)) {
      continue;
    }

    const individualKm = kmForServicio(serviciosKm, servicio.id);

    if (individualKm === null) {
      continue;
    }

    if (mainProximoKm !== null && individualKm === mainProximoKm) {
      continue;
    }

    items.push({
      id: servicio.id,
      label: resolveServicioLabel(servicio.id, catalog),
      proximoKm: individualKm
    });
  }

  const fechaBateria = fechaForBateria(orden);

  if (servicioIds.has(CAMBIO_BATERIA_ID) && fechaBateria) {
    items.push({
      id: CAMBIO_BATERIA_ID,
      label: resolveServicioLabel(CAMBIO_BATERIA_ID, catalog),
      proximoKm: null,
      fechaVencimiento: fechaBateria
    });
  }

  return items;
}

export function formatProximaRevisionValue(item, { formatKm, formatFecha }) {
  if (item?.id === CAMBIO_BATERIA_ID) {
    return formatFecha(item.fechaVencimiento);
  }

  return formatKm(item?.proximoKm);
}

export { ACEITE_MOTOR_ID, CAMBIO_BATERIA_ID };
