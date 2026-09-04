import { canonicalServicioId, resolveServicioLabel, SERVICIO_ALIASES } from './servicios-labels.js';

const ACEITE_MOTOR_ID = 'aceite_motor';

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
    if (servicio.id === ACEITE_MOTOR_ID) {
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

  return items;
}

export { ACEITE_MOTOR_ID };
