/**
 * Conversão de identificadores internos → nombres visibles.
 * No altera los IDs guardados en la base.
 */

const SERVICIOS_CATALOGO = [
  { id: 'aceite_motor', label: 'Cambio de aceite motor' },
  { id: 'filtro_aceite', label: 'Filtro de aceite' },
  { id: 'filtro_aire', label: 'Filtro de aire' },
  { id: 'filtro_combustible', label: 'Filtro de combustible' },
  { id: 'filtro_secundario', label: 'Filtro secundario' },
  { id: 'filtro_aire_ac', label: 'Filtro de aire acondicionado' },
  { id: 'aceite_caja_cambio', label: 'Cambio de aceite caja de cambio' },
  { id: 'aceite_caja_transferencia', label: 'Cambio de aceite caja de transferencia' },
  { id: 'aceite_dif_del', label: 'Cambio de aceite diferencial delantero' },
  { id: 'aceite_dif_tras', label: 'Cambio de aceite diferencial trasero' },
  { id: 'aceite_direccion', label: 'Cambio de aceite de dirección' },
  { id: 'fluido_radiador', label: 'Cambio de fluido de radiador' },
  { id: 'fluido_freno', label: 'Cambio de fluido de freno' },
  { id: 'pastilla_freno_delantera', label: 'Cambio de pastilla de freno delantera' },
  { id: 'pastilla_freno_trasera', label: 'Cambio de pastilla de freno trasera' },
  { id: 'engrase_crucetas', label: 'Engrase de crucetas' },
  { id: 'filtro_caja_automatica', label: 'Filtro caja automática' }
];

const SERVICIO_ALIASES = {
  filtro_aire_acondicionado: 'filtro_aire_ac',
  filtro_aire_acond: 'filtro_aire_ac',
  aceite_diferencial_delantero: 'aceite_dif_del',
  aceite_diferencial_trasero: 'aceite_dif_tras',
  aceite_dif_delantero: 'aceite_dif_del',
  aceite_dif_trasero: 'aceite_dif_tras'
};

const LABEL_BY_ID = Object.fromEntries(
  SERVICIOS_CATALOGO.map((servicio) => [servicio.id, servicio.label])
);

for (const [alias, canonical] of Object.entries(SERVICIO_ALIASES)) {
  LABEL_BY_ID[alias] = LABEL_BY_ID[canonical];
}

function normalizeServicioId(value) {
  if (value && typeof value === 'object') {
    return String(value.id || value.servicio || '').trim();
  }

  return String(value || '').trim();
}

function canonicalServicioId(value) {
  const key = normalizeServicioId(value);
  return SERVICIO_ALIASES[key] || key;
}

function labelsFromCatalog(catalog) {
  if (!catalog) {
    return LABEL_BY_ID;
  }

  if (!Array.isArray(catalog)) {
    return { ...LABEL_BY_ID, ...catalog };
  }

  const labels = { ...LABEL_BY_ID };

  for (const servicio of catalog) {
    if (servicio?.id && servicio.label) {
      labels[servicio.id] = servicio.label;
    }
  }

  for (const [alias, canonical] of Object.entries(SERVICIO_ALIASES)) {
    if (!labels[alias] && labels[canonical]) {
      labels[alias] = labels[canonical];
    }
  }

  return labels;
}

function resolveServicioLabel(value, catalog) {
  const key = normalizeServicioId(value);

  if (!key) {
    return '—';
  }

  const labels = labelsFromCatalog(catalog);
  return labels[key] || labels[canonicalServicioId(key)] || key;
}

module.exports = {
  SERVICIOS_CATALOGO,
  SERVICIO_ALIASES,
  LABEL_BY_ID,
  normalizeServicioId,
  canonicalServicioId,
  resolveServicioLabel
};
