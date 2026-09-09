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
    margin: 0 0 5mm;
    padding: 2.2mm;
    background: #0a0a0a;
    border-radius: 1.5mm;
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
  if (!vehiculo) {
    return '—';
  }

  return [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '—';
}

function compareTexto(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'es', {
    sensitivity: 'base'
  });
}

export function buildClientesVehiculosRows(clientes, vehiculos, ordenarPor = 'cliente') {
  const vehiculosPorCliente = new Map();

  for (const vehiculo of vehiculos) {
    const key = String(vehiculo.clienteId);
    if (!vehiculosPorCliente.has(key)) {
      vehiculosPorCliente.set(key, []);
    }
    vehiculosPorCliente.get(key).push(vehiculo);
  }

  const rows = [];

  for (const cliente of clientes) {
    const lista = [...(vehiculosPorCliente.get(String(cliente.id)) || [])];

    if (!lista.length) {
      rows.push({ cliente, vehiculo: null });
      continue;
    }

    for (const vehiculo of lista) {
      rows.push({ cliente, vehiculo });
    }
  }

  if (ordenarPor === 'vehiculo') {
    return rows.sort((a, b) => compareTexto(formatVehiculo(a.vehiculo), formatVehiculo(b.vehiculo)));
  }

  return rows.sort((a, b) => compareTexto(a.cliente?.nombre, b.cliente?.nombre));
}

function renderRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td class="doc-empty" colspan="8">No hay clientes ni vehículos registrados.</td>
      </tr>
    `;
  }

  return rows.map(({ cliente, vehiculo }) => `
    <tr>
      <td>${escapeHtml(cliente.nombre || '—')}</td>
      <td>${escapeHtml(cliente.documento || '—')}</td>
      <td>${escapeHtml(cliente.telefono || '—')}</td>
      <td>${escapeHtml(formatVehiculo(vehiculo))}</td>
      <td>${escapeHtml(vehiculo?.placa || '—')}</td>
      <td>${escapeHtml(formatAnio(vehiculo?.anio))}</td>
      <td>${escapeHtml(vehiculo?.motor || '—')}</td>
      <td>${escapeHtml(formatKm(vehiculo?.kilometraje))}</td>
    </tr>
  `).join('');
}

export function buildRelatorioClientesVehiculosHtml({
  empresa,
  rows,
  totalClientes,
  totalVehiculos
}) {
  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <title>REPORTE DE CLIENTES Y VEHÍCULOS</title>
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

    <div class="doc-title">REPORTE DE CLIENTES Y VEHÍCULOS</div>

    <table>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Documento</th>
          <th>Teléfono</th>
          <th>Vehículo</th>
          <th>Chapa</th>
          <th>Año</th>
          <th>Motor</th>
          <th>Km actual</th>
        </tr>
      </thead>
      <tbody>
        ${renderRows(rows)}
      </tbody>
    </table>

    <footer class="doc-footer">
      Total de clientes: ${escapeHtml(String(totalClientes))}
      &nbsp; | &nbsp;
      Total de vehículos: ${escapeHtml(String(totalVehiculos))}
    </footer>
  </div>
</body>
</html>`;
}

export async function exportRelatorioClientesVehiculosPdf({ ordenarPor = 'cliente' } = {}) {
  const [clientes, vehiculos, empresa] = await Promise.all([
    window.api.listClientes(''),
    window.api.listVehiculos(''),
    window.api.getEmpresa()
  ]);

  const listaClientes = Array.isArray(clientes) ? clientes : [];
  const listaVehiculos = Array.isArray(vehiculos) ? vehiculos : [];
  const rows = buildClientesVehiculosRows(listaClientes, listaVehiculos, ordenarPor);
  const html = buildRelatorioClientesVehiculosHtml({
    empresa,
    rows,
    totalClientes: listaClientes.length,
    totalVehiculos: listaVehiculos.length
  });

  const agora = new Date();
  const pad = (valor) => String(valor).padStart(2, '0');
  const suggestedFilename = `reporte-clientes-vehiculos-${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}-${pad(agora.getHours())}-${pad(agora.getMinutes())}-${pad(agora.getSeconds())}.pdf`;
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
