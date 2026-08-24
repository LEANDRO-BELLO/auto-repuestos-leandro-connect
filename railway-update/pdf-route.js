/**
 * PDF/HTML oficial do Portal QR — Auto Repuestos Leandro Connect v1.0.3
 *
 * Uso no api/server.js do Railway:
 *   const path = require('path');
 *   const express = require('express');
 *   const installPdfRoute = require('./pdf-route');
 *
 *   app.use('/assets', express.static(path.join(__dirname, 'public')));
 *   installPdfRoute(app, db);
 */

const SERVICIOS = {
  aceite_motor: 'Cambio de aceite motor',
  filtro_aceite: 'Filtro de aceite',
  filtro_aire: 'Filtro de aire',
  filtro_combustible: 'Filtro de combustible',
  filtro_secundario: 'Filtro secundario',
  filtro_aire_ac: 'Filtro de aire acondicionado',
  aceite_caja_cambio: 'Cambio de aceite caja de cambio',
  aceite_caja_transferencia: 'Cambio de aceite caja de transferencia',
  aceite_dif_del: 'Cambio de aceite diferencial delantero',
  aceite_dif_tras: 'Cambio de aceite diferencial trasero',
  aceite_direccion: 'Cambio de aceite de dirección',
  fluido_radiador: 'Cambio de fluido de radiador',
  fluido_freno: 'Cambio de fluido de freno',
  pastilla_freno_delantera: 'Cambio de pastilla de freno delantera',
  pastilla_freno_trasera: 'Cambio de pastilla de freno trasera',
  engrase_crucetas: 'Engrase de crucetas',
  filtro_caja_automatica: 'Filtro caja automática'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFecha(value) {
  if (!value) return '—';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return escapeHtml(value);
}

function formatKm(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numero = Number(value);
  return `${Number.isFinite(numero) ? new Intl.NumberFormat('es-PY').format(numero) : escapeHtml(value)} km`;
}

function buildHtml(orden, servicios) {
  const vehiculo = [orden.marca, orden.modelo].filter(Boolean).join(' ') || '—';
  const serviciosHtml = servicios.length
    ? `<ul class="doc-list">${servicios.map((item) => `<li>${escapeHtml(SERVICIOS[item.servicio] || item.servicio)}</li>`).join('')}</ul>`
    : '<p class="doc-value">—</p>';

  const revisiones = servicios.filter((item) => item.proximo_km !== null && item.proximo_km !== undefined && item.proximo_km !== '');
  const revisionesHtml = revisiones.length
    ? `<ul class="doc-list doc-list--revision">${revisiones.map((item) => `
      <li><span>${escapeHtml(SERVICIOS[item.servicio] || item.servicio)}</span><span class="doc-km">${formatKm(item.proximo_km)}</span></li>
    `).join('')}</ul>`
    : '<p class="doc-value">—</p>';

  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(orden.numero_os || 'Servicios Realizados')} — Auto Repuestos Leandro</title>
  <style>
    @page { size: A4; margin: 11mm 13mm 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #161616; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc { width: 100%; max-width: 184mm; margin: 0 auto; }
    .doc-header { display: grid; grid-template-columns: 31mm 1fr; gap: 6mm; align-items: center; padding: 0 0 5mm; border-bottom: 1.2mm solid #d4af37; margin-bottom: 5mm; }
    .doc-logo-wrap { width: 31mm; height: 24mm; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #050505; border-radius: 2mm; }
    .doc-logo { width: 100%; height: 100%; object-fit: contain; display: block; }
    .doc-empresa h1 { margin: 0 0 1.5mm; font-size: 17pt; line-height: 1.05; color: #111; }
    .doc-empresa p { margin: .7mm 0; font-size: 9pt; line-height: 1.25; color: #333; }
    .doc-contact { margin-top: 1.6mm !important; font-weight: 600; }
    .doc-title { text-align: center; font-size: 13pt; font-weight: 800; color: #d4af37; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 5mm; padding: 2.5mm; background: #0a0a0a; border-radius: 1.5mm; }
    .doc-section { margin-bottom: 4.2mm; break-inside: avoid; }
    .doc-section h2 { margin: 0 0 2.2mm; font-size: 9.8pt; text-transform: uppercase; letter-spacing: .05em; color: #b68d17; border-bottom: .35mm solid #d4af37; padding-bottom: 1.2mm; }
    .doc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.3mm 7mm; }
    .doc-grid--four { grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2.3mm 4mm; }
    .doc-field { display: flex; flex-direction: column; gap: .6mm; min-width: 0; }
    .doc-field--full { grid-column: 1 / -1; }
    .doc-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .04em; color: #666; font-weight: 700; }
    .doc-value { font-size: 10pt; color: #111; overflow-wrap: anywhere; }
    .doc-list { margin: 0; padding-left: 5mm; }
    .doc-list li { margin-bottom: 1.3mm; color: #222; }
    .doc-list--revision { list-style: none; padding-left: 0; }
    .doc-list--revision li { padding: 1.5mm 0; border-bottom: .25mm solid #eee; display: flex; justify-content: space-between; gap: 4mm; }
    .doc-list--revision li:last-child { border-bottom: none; }
    .doc-km { color: #9c7410; font-weight: 800; }
    .doc-obs { white-space: pre-wrap; color: #333; font-size: 9.5pt; line-height: 1.4; }
    .doc-footer { margin-top: 6mm; text-align: center; font-size: 8pt; color: #555; border-top: .35mm solid #d4af37; padding-top: 2.8mm; line-height: 1.55; }
    .doc-footer strong { color: #111; }
    @media screen and (max-width: 720px) {
      body { padding: 10px; }
      .doc-header { grid-template-columns: 82px 1fr; gap: 12px; }
      .doc-logo-wrap { width: 82px; height: 64px; }
      .doc-grid, .doc-grid--four { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <header class="doc-header">
      <div class="doc-logo-wrap"><img class="doc-logo" src="/assets/logo-oficial.png" alt="Auto Repuestos Leandro S.A." /></div>
      <div class="doc-empresa">
        <h1>Auto Repuestos Leandro S.A.</h1>
        <p>Ventas de repuestos y accesorios</p>
        <p>Anexo: cambio de aceite y filtros en general</p>
        <p class="doc-contact">Tel: +595 986 773 222 &nbsp;&nbsp; Katueté - Canindeyú - Paraguay</p>
      </div>
    </header>

    <div class="doc-title">Servicios Realizados</div>

    <section class="doc-section">
      <h2>Datos de la orden</h2>
      <div class="doc-grid doc-grid--four">
        <div class="doc-field"><span class="doc-label">Nº Orden</span><span class="doc-value">${escapeHtml(orden.numero_os || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Fecha</span><span class="doc-value">${formatFecha(orden.fecha)}</span></div>
        <div class="doc-field"><span class="doc-label">Nº Factura</span><span class="doc-value">${escapeHtml(orden.numero_factura || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Estado</span><span class="doc-value">${escapeHtml(orden.estado || 'Finalizada')}</span></div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Cliente</h2>
      <div class="doc-grid">
        <div class="doc-field doc-field--full"><span class="doc-label">Nombre</span><span class="doc-value">${escapeHtml(orden.cliente_nombre || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Documento</span><span class="doc-value">${escapeHtml(orden.cliente_documento || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">Teléfono</span><span class="doc-value">${escapeHtml(orden.cliente_telefono || orden.cliente_whatsapp || '—')}</span></div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Vehículo</h2>
      <div class="doc-grid">
        <div class="doc-field"><span class="doc-label">Vehículo</span><span class="doc-value">${escapeHtml(vehiculo)}</span></div>
        <div class="doc-field"><span class="doc-label">Chapa</span><span class="doc-value">${escapeHtml(orden.placa || '—')}</span></div>
        <div class="doc-field"><span class="doc-label">KM actual</span><span class="doc-value">${formatKm(orden.kilometraje)}</span></div>
        <div class="doc-field"><span class="doc-label">Próximo servicio</span><span class="doc-value doc-km">${formatKm(orden.proximo_km)}</span></div>
        <div class="doc-field doc-field--full"><span class="doc-label">Fecha de la próxima revisión</span><span class="doc-value">${formatFecha(orden.fecha_vencimiento)}</span></div>
      </div>
    </section>

    <section class="doc-section"><h2>Servicios realizados</h2>${serviciosHtml}</section>
    <section class="doc-section"><h2>Próxima revisión — KM individuales</h2>${revisionesHtml}</section>

    ${orden.observaciones ? `<section class="doc-section"><h2>Observaciones</h2><p class="doc-obs">${escapeHtml(orden.observaciones)}</p></section>` : ''}

    <footer class="doc-footer">
      <strong>WhatsApp:</strong> +595 986 773 222 &nbsp; | &nbsp;
      <strong>E-mail:</strong> autorepuestosleandrosa@gmail.com &nbsp; | &nbsp;
      <strong>Ubicación:</strong> Katueté - Canindeyú - Paraguay
    </footer>
  </div>
</body>
</html>`;
}

module.exports = function installPdfRoute(app, db) {
  app.get('/os/:id/pdf', (req, res) => {
    try {
      const orden = db.prepare(`
        SELECT
          ot.*,
          c.nombre AS cliente_nombre,
          c.documento AS cliente_documento,
          c.telefono AS cliente_telefono,
          c.whatsapp AS cliente_whatsapp,
          v.placa,
          v.marca,
          v.modelo,
          v.motor
        FROM ordenes_trabajo ot
        JOIN clientes c ON c.id = ot.cliente_id
        JOIN vehiculos v ON v.id = ot.vehiculo_id
        WHERE ot.id = ?
      `).get(req.params.id);

      if (!orden) return res.status(404).send('Orden no encontrada.');

      const servicios = db.prepare(`
        SELECT servicio, proximo_km
        FROM ordenes_servicios
        WHERE orden_id = ?
        ORDER BY rowid ASC
      `).all(req.params.id);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buildHtml(orden, servicios));
    } catch (error) {
      console.error('Error al generar PDF/HTML oficial:', error);
      return res.status(500).send('No fue posible generar el documento.');
    }
  });
};
