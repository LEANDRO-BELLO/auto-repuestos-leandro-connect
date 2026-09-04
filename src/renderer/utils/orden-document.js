import { getProximaRevisionItems } from './proxima-revision.js';
import { SERVICIOS_CATALOGO, resolveServicioLabel } from './servicios-labels.js';

export { SERVICIOS_CATALOGO };

const LOGO_OFICIAL_URL = new URL('../assets/logo-oficial.png', import.meta.url).href;

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
  @page { size: A4; margin: 11mm 13mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    color: #161616;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { width: 100%; max-width: 184mm; margin: 0 auto; }
  .doc-header {
    display: grid;
    grid-template-columns: 31mm 1fr;
    gap: 6mm;
    align-items: center;
    padding: 0 0 5mm;
    border-bottom: 1.2mm solid #d4af37;
    margin-bottom: 5mm;
  }
  .doc-logo-wrap {
    width: 31mm;
    height: 24mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #050505;
    border-radius: 2mm;
  }
  .doc-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
  .doc-empresa h1 { margin: 0 0 1.5mm; font-size: 17pt; line-height: 1.05; color: #111; }
  .doc-empresa p { margin: .7mm 0; font-size: 9pt; line-height: 1.25; color: #333; }
  .doc-contact { margin-top: 1.6mm !important; font-weight: 600; }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: 800;
    color: #d4af37;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin: 0 0 5mm;
    padding: 2.5mm;
    background: #0a0a0a;
    border-radius: 1.5mm;
  }
  .doc-section { margin-bottom: 4.2mm; break-inside: avoid; }
  .doc-section h2 {
    margin: 0 0 2.2mm;
    font-size: 9.8pt;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #b68d17;
    border-bottom: .35mm solid #d4af37;
    padding-bottom: 1.2mm;
  }
  .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.3mm 7mm; }
  .doc-grid--four { grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2.3mm 4mm; }
  .doc-field { display: flex; flex-direction: column; gap: .6mm; min-width: 0; }
  .doc-field--full { grid-column: 1 / -1; }
  .doc-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .04em; color: #666; font-weight: 700; }
  .doc-value { font-size: 10pt; color: #111; overflow-wrap: anywhere; }
  .doc-list { margin: 0; padding-left: 5mm; }
  .doc-list li { margin-bottom: 1.3mm; color: #222; }
  .doc-list--revision { list-style: none; padding-left: 0; }
  .doc-list--revision li {
    padding: 1.5mm 0;
    border-bottom: .25mm solid #eee;
    display: flex;
    justify-content: space-between;
    gap: 4mm;
  }
  .doc-list--revision li:last-child { border-bottom: none; }
  .doc-km { color: #9c7410; font-weight: 800; }
  .doc-obs { white-space: pre-wrap; color: #333; font-size: 9.5pt; line-height: 1.4; }
  .doc-footer {
    margin-top: 6mm;
    text-align: center;
    font-size: 8pt;
    color: #555;
    border-top: .35mm solid #d4af37;
    padding-top: 2.8mm;
    line-height: 1.55;
  }
  .doc-footer strong { color: #111; }
`;

export function buildOrdenDocumentHtml({
  empresa,
  cliente,
  orden,
  catalog = SERVICIOS_CATALOGO
}) {
  const documentTitle = 'Servicios Realizados';
  const serviciosRealizados = (orden.servicios || []).map((id) =>
    resolveServicioLabel(id, catalog)
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
      <div class="doc-logo-wrap"><img class="doc-logo" src="${LOGO_OFICIAL_URL}" alt="Auto Repuestos Leandro S.A." /></div>
      <div class="doc-empresa">
        <h1>${escapeHtml(empresa?.nombre || 'Auto Repuestos Leandro S.A.')}</h1>
        <p>Ventas de repuestos y accesorios</p>
        <p>Anexo: cambio de aceite y filtros en general</p>
        <p class="doc-contact">Tel: ${escapeHtml(empresa?.telefono || '+595 986 773 222')} &nbsp;&nbsp; Katuet&eacute; - Canindey&uacute; - Paraguay</p>
      </div>
    </header>

    <div class="doc-title">${escapeHtml(documentTitle)}</div>

    <section class="doc-section">
      <h2>Datos de la orden</h2>
      <div class="doc-grid doc-grid--four">
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
        <div class="doc-field"><span class="doc-label">Próximo servicio</span><span class="doc-value doc-km">${escapeHtml(formatKm(orden.proximoKm))}</span></div>
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
      <strong>WhatsApp:</strong> ${escapeHtml(empresa?.whatsapp || '+595 986 773 222')} &nbsp; | &nbsp;
      <strong>E-mail:</strong> ${escapeHtml(empresa?.email || 'autorepuestosleandrosa@gmail.com')} &nbsp; | &nbsp;
      <strong>Ubicación:</strong> Katuet&eacute; - Canindey&uacute; - Paraguay
    </footer>
  </div>
</body>
</html>`;
}
