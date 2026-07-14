const ACEITE_MOTOR_ID = 'aceite_motor';

function parseKm(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getLabel(catalog, id) {
  return catalog.find((item) => item.id === id)?.label || id;
}

export function getProximaRevisionItems(orden, catalog) {
  const mainProximoKm = parseKm(orden.proximoKm);
  const serviciosKm = orden.serviciosKm || {};
  const servicioIds = new Set(orden.servicios || []);
  const items = [];

  if (servicioIds.has(ACEITE_MOTOR_ID) && mainProximoKm !== null) {
    items.push({
      id: ACEITE_MOTOR_ID,
      label: getLabel(catalog, ACEITE_MOTOR_ID),
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

    const individualKm = parseKm(serviciosKm[servicio.id]);

    if (individualKm === null) {
      continue;
    }

    if (mainProximoKm !== null && individualKm === mainProximoKm) {
      continue;
    }

    items.push({
      id: servicio.id,
      label: servicio.label,
      proximoKm: individualKm
    });
  }

  return items;
}

export { ACEITE_MOTOR_ID };
