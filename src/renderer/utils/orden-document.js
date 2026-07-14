import { getProximaRevisionItems } from './proxima-revision.js';

export const SERVICIOS_CATALOGO = [
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
  { id: 'fluido_radiador', label: 'Cambio de fluido de radiador' },
  { id: 'fluido_freno', label: 'Cambio de fluido de freno' },
  { id: 'engrase_crucetas', label: 'Engrase de crucetas' },
  { id: 'filtro_caja_automatica', label: 'Filtro caja automática' }
];

const LABEL_BY_ID = Object.fromEntries(SERVICIOS_CATALOGO.map((s) => [s.id, s.label]));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatFecha(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
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
  return new Intl.NumberFormat('es-PY').format(value) + ' km';
}

function formatVehiculo(orden) {
  return [orden.vehiculoMarca, orden.vehiculoModelo].filter(Boolean).join(' ') || '—';
}

const DOCUMENT_STYLES = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 11pt;
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { max-width: 180mm; margin: 0 auto; }
  .doc-header {
    display: flex;
    gap: 16px;
    align-items: center;
    padding-bottom: 14px;
    border-bottom: 3px solid #d4af37;
    margin-bottom: 18px;
  }
  .doc-logo {
    width: 72px;
    height: 72px;
    border: 2px solid #d4af37;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 22px;
    color: #d4af37;
    background: #0a0a0a;
    flex-shrink: 0;
  }
  .doc-empresa h1 {
    margin: 0 0 6px;
    font-size: 16pt;
    color: #0a0a0a;
  }
  .doc-empresa p {
    margin: 2px 0;
    font-size: 9.5pt;
    color: #444;
  }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: 700;
    color: #d4af37;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 16px;
    padding: 8px;
    background: #0a0a0a;
    border-radius: 6px;
  }
  .doc-section {
    margin-bottom: 16px;
  }
  .doc-section h2 {
    margin: 0 0 8px;
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #d4af37;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 4px;
  }
  .doc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  }
  .doc-field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .doc-field--full { grid-column: 1 / -1; }
  .doc-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #666;
    font-weight: 600;
  }
  .doc-value {
    font-size: 10.5pt;
    color: #111;
  }
  .doc-list {
    margin: 0;
    padding-left: 18px;
  }
  .doc-list li {
    margin-bottom: 4px;
    color: #222;
  }
  .doc-list--revision {
    list-style: none;
    padding-left: 0;
  }
  .doc-list--revision li {
    padding: 5px 0;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .doc-list--revision li:last-child { border-bottom: none; }
  .doc-km { color: #b8860b; font-weight: 700; }
  .doc-obs {
    white-space: pre-wrap;
    color: #333;
    font-size: 10pt;
    line-height: 1.45;
  }
  .doc-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 8pt;
    color: #888;
    border-top: 1px solid #eee;
    padding-top: 10px;
  }
`;

export function buildOrdenDocumentHtml({
  empresa,
  cliente,
  orden,
  catalog = SERVICIOS_CATALOGO
}) {
  const documentTitle = 'Servicios Realizados';
  const serviciosRealizados = (orden.servicios || []).map(
    (id) => LABEL_BY_ID[id] || catalog.find((s) => s.id === id)?.label || id
  );
  const revisionItems = getProximaRevisionItems(orden, catalog);

  const serviciosHtml = serviciosRealizados.length
    ? `<ul class="doc-list">${serviciosRealizados.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '<p class="doc-value">—</p>';

  const revisionHtml = revisionItems.length
    ? `<ul class="doc-list doc-list--revision">${revisionItems.map((item) => `
        <li>
          <span>${escapeHtml(item.label)}</span>
          <span class="doc-km">${escapeHtml(formatKm(item.proximoKm))}</span>
        </li>
      `).join('')}</ul>`
    : '<p class="doc-value">—</p>';

  const facturaBlock = orden.numeroFactura
    ? `<div class="doc-field"><span class="doc-label">Nº Factura</span><span class="doc-value">${escapeHtml(orden.numeroFactura)}</span></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(orden.numeroOs)} — Auto Repuestos Leandro</title>
  <style>${DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <header class="doc-header">
      <div class="doc-logo" aria-hidden="true">ARL</div>
      <div class="doc-empresa">
        <h1>${escapeHtml(empresa?.nombre || 'Auto Repuestos Leandro S.A.')}</h1>
        <p>${escapeHtml(empresa?.direccion || 'Katueté – Canindeyú – Paraguay')}</p>
        <p>Tel: ${escapeHtml(empresa?.telefono || '—')} · WhatsApp: ${escapeHtml(empresa?.whatsapp || '—')}</p>
        <p>Email: ${escapeHtml(empresa?.email || '—')} · RUC: ${escapeHtml(empresa?.ruc || '—')}</p>
      </div>
    </header>

    <div class="doc-title">${escapeHtml(documentTitle)}</div>

    <section class="doc-section">
      <h2>Datos de la orden</h2>
      <div class="doc-grid">
        <div class="doc-field"><span class="doc-label">Nº Orden</span><span class="doc-value">${escapeHtml(orden.numeroOs)}</span></div>
        <div class="doc-field"><span class="doc-label">Fecha</span><span class="doc-value">${formatFecha(orden.fecha)}</span></div>
        ${facturaBlock}
        <div class="doc-field"><span class="doc-label">Estado</span><span class="doc-value">${escapeHtml(orden.estado || '—')}</span></div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Cliente</h2>
      <div class="doc-grid">
        <div class="doc-field doc-field--full"><span class="doc-label">Nombre</span><span class="doc-value">${escapeHtml(orden.clienteNombre || cliente?.nombre || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Documento</span><span class="doc-value">${escapeHtml(cliente?.documento || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Teléfono</span><span class="doc-value">${escapeHtml(cliente?.telefono || cliente?.whatsapp || '—')}</span></div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Vehículo</h2>
      <div class="doc-grid">
        <div class="doc-field"><span class="doc-label">Vehículo</span><span class="doc-value">${escapeHtml(formatVehiculo(orden))}</span></div>
        <div class="doc-field"><span class="doc-label">Chapa</span><span class="doc-value">${escapeHtml(orden.vehiculoPlaca || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">KM actual</span><span class="doc-value">${escapeHtml(formatKm(orden.kilometraje))}</span></div>
        <div class="doc-field"><span class="doc-label">Próximo KM</span><span class="doc-value doc-km">${escapeHtml(formatKm(orden.proximoKm))}</span></div>
        <div class="doc-field doc-field--full"><span class="doc-label">Fecha de la próxima revisión</span><span class="doc-value">${formatFecha(orden.fechaVencimiento)}</span></div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Servicios realizados</h2>
      ${serviciosHtml}
    </section>

    <section class="doc-section">
      <h2>Próxima revisión — KM individuales</h2>
      ${revisionHtml}
    </section>

    ${orden.observaciones ? `
    <section class="doc-section">
      <h2>Observaciones</h2>
      <p class="doc-obs">${escapeHtml(orden.observaciones)}</p>
    </section>
    ` : ''}

    <footer class="doc-footer">
      Auto Repuestos Leandro Connect · Documento generado el ${formatFecha(new Date().toISOString().slice(0, 10))}
    </footer>
  </div>
</body>
</html>`;
}
