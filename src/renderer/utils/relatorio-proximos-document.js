import { escapeHtml } from './dom.js';

const LOGO_OFICIAL_URL = new URL('../assets/logo-oficial.png', import.meta.url).href;

const DOCUMENT_STYLES = `
  @page { size: A4 landscape; margin: 10mm 10mm 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 9pt;
    color: #161616;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc { width: 100%; }
  .doc-header {
    display: grid;
    grid-template-columns: 28mm 1fr;
    gap: 5mm;
    align-items: center;
    padding: 0 0 4mm;
    border-bottom: 1.2mm solid #d4af37;
    margin-bottom: 4mm;
  }
  .doc-logo-wrap {
    width: 28mm;
    height: 20mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #050505;
    border-radius: 2mm;
  }
  .doc-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
  .doc-empresa h1 { margin: 0 0 1mm; font-size: 14pt; line-height: 1.05; color: #111; }
  .doc-empresa p { margin: .5mm 0; font-size: 8.5pt; line-height: 1.25; color: #333; }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: 800;
    color: #d4af37;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin: 0 0 2mm;
    padding: 2.2mm;
    background: #0a0a0a;
    border-radius: 1.5mm;
  }
  .doc-period {
    text-align: center;
    margin: 0 0 5mm;
    font-size: 10pt;
    font-weight: 700;
    color: #333;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  th, td {
    padding: 1.6mm 1.4mm;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  th {
    background: #0a0a0a;
    color: #d4af37;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: .03em;
  }
  td {
    border-bottom: .25mm solid #eee;
    font-size: 8.5pt;
    color: #111;
  }
  .doc-empty {
    text-align: center;
    padding: 8mm 2mm;
    color: #666;
  }
  .doc-footer {
    margin-top: 5mm;
    text-align: center;
    font-size: 8pt;
    color: #555;
    border-top: .35mm solid #d4af37;
    padding-top: 2.4mm;
  }
`;

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

function formatVehiculo(item) {
  return [item.vehiculoMarca, item.vehiculoModelo].filter(Boolean).join(' ') || '—';
}

function renderRows(items) {
  if (!items.length) {
    return `
      <tr>
        <td class="doc-empty" colspan="8">No hay próximos servicios en el período seleccionado.</td>
      </tr>
    `;
  }

  return items.map((item) => `
    <tr>
      <td>${escapeHtml(item.clienteNombre || '—')}</td>
      <td>${escapeHtml(formatVehiculo(item))}</td>
      <td>${escapeHtml(item.vehiculoPlaca || '—')}</td>
      <td>${escapeHtml(item.servicioLabel || '—')}</td>
      <td>${escapeHtml(formatKm(item.ultimoKm))}</td>
      <td>${escapeHtml(formatKm(item.proximoKm))}</td>
      <td>${formatFecha(item.fechaVencimiento)}</td>
      <td>${escapeHtml(item.estado || '—')}</td>
    </tr>
  `).join('');
}

export function buildRelatorioProximosHtml({ empresa, items, fechaDesde, fechaHasta }) {
  const periodo = `Período: ${formatFecha(fechaDesde)} a ${formatFecha(fechaHasta)}`;

  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de próximos servicios</title>
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
      </div>
    </header>

    <div class="doc-title">Reporte de próximos servicios</div>
    <p class="doc-period">${escapeHtml(periodo)}</p>

    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Vehículo</th>
          <th>Chapa</th>
          <th>Servicio</th>
          <th>Último km</th>
          <th>Próximo km</th>
          <th>Fecha de vencimiento</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${renderRows(items)}
      </tbody>
    </table>

    <footer class="doc-footer">
      ${escapeHtml(String(items.length))} registro(s) en el período seleccionado.
    </footer>
  </div>
</body>
</html>`;
}

function inPeriodo(fechaVencimiento, fechaDesde, fechaHasta) {
  const fecha = String(fechaVencimiento || '').slice(0, 10);
  return Boolean(fecha && fecha >= fechaDesde && fecha <= fechaHasta);
}

export async function exportRelatorioProximosPdf({ fechaDesde, fechaHasta }) {
  const [activos, avisados, empresa] = await Promise.all([
    window.api.listProximosServicios({}),
    window.api.listProximosServicios({ estado: 'Avisado' }),
    window.api.getEmpresa()
  ]);

  const items = [...(activos.items || []), ...(avisados.items || [])]
    .filter((item) => inPeriodo(item.fechaVencimiento, fechaDesde, fechaHasta))
    .sort((a, b) => String(a.fechaVencimiento || '').localeCompare(String(b.fechaVencimiento || '')));

  const html = buildRelatorioProximosHtml({ empresa, items, fechaDesde, fechaHasta });
  const agora = new Date();
  const pad = (valor) => String(valor).padStart(2, '0');
  const suggestedFilename = `reporte-proximos-servicios-${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}-${pad(agora.getHours())}-${pad(agora.getMinutes())}-${pad(agora.getSeconds())}.pdf`;
  const result = await window.api.exportDocumentPdf({
    html,
    suggestedFilename,
    landscape: true
  });

  if (result.canceled) {
    return { ok: false, canceled: true };
  }

  if (!result.ok) {
    window.alert(result.error || 'No se pudo generar el PDF.');
    return result;
  }

  return result;
}
