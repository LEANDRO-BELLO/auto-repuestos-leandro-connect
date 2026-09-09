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
  .doc-section { margin-bottom: 5mm; }
  .doc-section h2 {
    margin: 0 0 2.2mm;
    font-size: 9.8pt;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #b68d17;
    border-bottom: .35mm solid #d4af37;
    padding-bottom: 1.2mm;
  }
  .doc-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.3mm 7mm; }
  .doc-field { display: flex; flex-direction: column; gap: .6mm; min-width: 0; }
  .doc-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .04em; color: #666; font-weight: 700; }
  .doc-value { font-size: 10pt; color: #111; overflow-wrap: anywhere; }
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

function formatAnio(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function formatVehiculo(vehiculo) {
  return [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ') || '—';
}

function formatServicios(labels) {
  if (!labels?.length) {
    return '—';
  }

  return labels.join(', ');
}

function renderRows(items) {
  if (!items.length) {
    return `
      <tr>
        <td class="doc-empty" colspan="4">No hay órdenes finalizadas en el período seleccionado.</td>
      </tr>
    `;
  }

  return items.map((item) => `
    <tr>
      <td>${formatFecha(item.fecha)}</td>
      <td>${escapeHtml(formatKm(item.kilometraje))}</td>
      <td>${escapeHtml(formatServicios(item.serviciosLabels))}</td>
      <td>${escapeHtml(item.numeroOs || '—')}</td>
    </tr>
  `).join('');
}

export function buildRelatorioHistorialVehiculoHtml({
  empresa,
  vehiculo,
  items,
  fechaDesde,
  fechaHasta,
  totalOrdenes,
  totalServicios
}) {
  const periodo = `Período: ${formatFecha(fechaDesde)} a ${formatFecha(fechaHasta)}`;

  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <title>HISTORIAL DEL VEHÍCULO</title>
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

    <div class="doc-title">HISTORIAL DEL VEHÍCULO</div>
    <p class="doc-period">${escapeHtml(periodo)}</p>

    <section class="doc-section">
      <h2>Datos del vehículo</h2>
      <div class="doc-grid">
        <div class="doc-field"><span class="doc-label">Cliente</span><span class="doc-value">${escapeHtml(vehiculo?.clienteNombre || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Vehículo</span><span class="doc-value">${escapeHtml(formatVehiculo(vehiculo))}</span></div>
        <div class="doc-field"><span class="doc-label">Chapa</span><span class="doc-value">${escapeHtml(vehiculo?.placa || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Año</span><span class="doc-value">${escapeHtml(formatAnio(vehiculo?.anio))}</span></div>
        <div class="doc-field"><span class="doc-label">Motor</span><span class="doc-value">${escapeHtml(vehiculo?.motor || '—')}</span></div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Km</th>
          <th>Servicios realizados</th>
          <th>N° OS</th>
        </tr>
      </thead>
      <tbody>
        ${renderRows(items)}
      </tbody>
    </table>

    <footer class="doc-footer">
      Total de órdenes: ${escapeHtml(String(totalOrdenes))}
      &nbsp; | &nbsp;
      Total de servicios: ${escapeHtml(String(totalServicios))}
    </footer>
  </div>
</body>
</html>`;
}

export async function exportRelatorioHistorialVehiculoPdf({
  vehiculo,
  fechaDesde,
  fechaHasta
}) {
  const [resultado, empresa] = await Promise.all([
    window.api.listServiciosRealizados({
      vehiculoId: vehiculo.id,
      fechaDesde,
      fechaHasta
    }),
    window.api.getEmpresa()
  ]);

  const items = [...(resultado.items || [])].sort((a, b) => {
    const fechaDiff = String(a.fecha || '').localeCompare(String(b.fecha || ''));
    if (fechaDiff !== 0) {
      return fechaDiff;
    }

    return String(a.numeroOs || '').localeCompare(String(b.numeroOs || ''));
  });

  const totalServicios = items.reduce((total, item) => (
    total + (Array.isArray(item.servicios) ? item.servicios.length : 0)
  ), 0);

  const html = buildRelatorioHistorialVehiculoHtml({
    empresa,
    vehiculo,
    items,
    fechaDesde,
    fechaHasta,
    totalOrdenes: items.length,
    totalServicios
  });

  const agora = new Date();
  const pad = (valor) => String(valor).padStart(2, '0');
  const suggestedFilename = `reporte-historial-vehiculo-${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}-${pad(agora.getHours())}-${pad(agora.getMinutes())}-${pad(agora.getSeconds())}.pdf`;
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
