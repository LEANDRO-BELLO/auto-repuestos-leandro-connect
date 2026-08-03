const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { getRendererPath, getProjectRoot } = require('./paths');
const {
  TEXTO_ETIQUETA_DEFAULT,
  LOGO_RELATIVE_SRC,
  buildEtiquetaMarkup
} = require('./etiqueta-markup');

const {
  ETIQUETA_PAGE_SIZES,
  mmToCss,
  getPageConfig
} = require('./etiqueta-page-sizes');

const ETIQUETA_CSS_PATH = path.join(__dirname, '../renderer/styles/etiqueta-qr.css');

let cachedLogoNaturalSize = null;

function getLogoFileCandidates() {
  return [
    path.join(getProjectRoot(), 'assets', 'logo-oficial.png'),
    getRendererPath('assets', 'logo-oficial.png')
  ];
}

function readLogoNaturalSize() {
  if (cachedLogoNaturalSize) {
    return cachedLogoNaturalSize;
  }

  for (const candidate of getLogoFileCandidates()) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    const buffer = fs.readFileSync(candidate);
    if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      cachedLogoNaturalSize = {
        width: width || 1,
        height: height || 1,
        aspectRatio: `${width || 1} / ${height || 1}`
      };
      return cachedLogoNaturalSize;
    }
  }

  cachedLogoNaturalSize = { width: 1, height: 1, aspectRatio: '1 / 1' };
  return cachedLogoNaturalSize;
}

function resolveLogoFileUrl() {
  for (const candidate of getLogoFileCandidates()) {
    if (fs.existsSync(candidate)) {
      return pathToFileURL(candidate).href;
    }
  }

  return null;
}

function resolveLogoDataUrl() {
  for (const candidate of getLogoFileCandidates()) {
    if (fs.existsSync(candidate)) {
      const buffer = fs.readFileSync(candidate);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  }

  return null;
}
function resolveEtiquetaBaseDataUrl() {
  const candidates = [
    path.join(getProjectRoot(), 'assets', 'etiqueta-aprovada.png'),
    getRendererPath('assets', 'etiqueta-aprovada.png')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const buffer = fs.readFileSync(candidate);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  }

  return null;
}
/** PDF e preview via arquivo HTML: file:// preserva proporção sem inflar o documento. */
function resolveLogoSrc() {
  return resolveEtiquetaBaseDataUrl() || resolveLogoFileUrl() || resolveLogoDataUrl() || LOGO_RELATIVE_SRC;
}

function readEtiquetaLayoutCss() {
  return fs.readFileSync(ETIQUETA_CSS_PATH, 'utf8');
}

function getEtiquetaStyles(tamano = '9x6') {
  const page = getPageConfig(tamano);
  const layoutCss = readEtiquetaLayoutCss();
  const logoSize = readLogoNaturalSize();

  return `
  @page { size: ${page.css}; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${mmToCss(page.widthMm)};
    height: ${mmToCss(page.heightMm)};
    background: #0a0a0a;
    font-family: 'Segoe UI', system-ui, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    overflow: hidden;
  }
  .etiqueta-page {
    width: ${mmToCss(page.widthMm)};
    height: ${mmToCss(page.heightMm)};
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  .etiqueta-preview,
  .etiqueta-preview--9x6,
  .etiqueta-preview--10x7,
  .etiqueta-preview--12x8,
  .etiqueta-preview--8x5 {
    max-width: none;
    width: 100%;
    height: 100%;
    aspect-ratio: auto !important;
    box-shadow: none;
  }
  .etiqueta-preview__logo-img {
    aspect-ratio: ${logoSize.aspectRatio};
  }
  ${layoutCss}
  `;
}

const PREVIEW_VEHICULO_DEMO = {
  marca: 'Toyota',
  modelo: 'Hilux',
  placa: 'ABC 123',
  motor: '2.8 Diesel'
};

function buildEtiquetaDocumentHtml({ config, vehiculo, qrDataUrl, tamano = '9x6', logoSrc }) {
  const markup = buildEtiquetaMarkup({
    config,
    vehiculo,
    qrDataUrl,
    tamano,
    logoSrc: logoSrc || resolveEtiquetaBaseDataUrl() || resolveLogoSrc()
  });

  return `<!DOCTYPE html>
<html lang="es-PY">
<head>
  <meta charset="UTF-8" />
  <title>Etiqueta QR — ${String(vehiculo?.placa || '').replace(/[<>&"]/g, '')}</title>
  <style>${getEtiquetaStyles(tamano)}</style>
</head>
<body>
  <div class="etiqueta-page">${markup}</div>
</body>
</html>`;
}



function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function buildEtiquetaPreImpressaDocumentHtml({ vehiculo = {}, qrDataUrl, tamano = '9x6' }) {
  const page = getPageConfig(tamano);
  const modelo = vehiculo.modelo || vehiculo.marca || 'VEHÍCULO';
  const chapa = vehiculo.placa || '';
  const motor = vehiculo.motor || '';
  return `<!DOCTYPE html>
<html lang="es-PY"><head><meta charset="UTF-8" /><title>Impresión etiqueta QR</title>
<style>
@page{size:${page.css};margin:0}*{box-sizing:border-box}html,body{margin:0;width:${mmToCss(page.widthMm)};height:${mmToCss(page.heightMm)};overflow:hidden;background:#fff;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact}
/*
 * Sobreimpresión para la etiqueta física 90 × 60 mm.
 * Las coordenadas corresponden a los espacios vacíos del arte aprobado:
 * vehículo, chapa, motor y área azul del QR. No imprime fondo, logo ni marcos.
 *
 * Para una calibración fina de impresora, alterar solamente --offset-x y
 * --offset-y. Los cuatro elementos se desplazan juntos sin deformar el diseño.
 */
:root{--offset-x:0mm;--offset-y:0mm}
.preprinted{position:relative;width:90mm;height:60mm;color:#000;transform:translate(var(--offset-x),var(--offset-y))}
.preprinted__field{position:absolute;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;white-space:nowrap;line-height:1;font-family:Arial,sans-serif;font-weight:800;text-transform:uppercase}
/* Centro exacto del rectángulo VEHÍCULO del fondo preimpreso. */
.preprinted__vehicle{left:16.50mm;top:26.70mm;width:25.60mm;height:4.80mm;font-size:12pt}
/* Centro exacto del rectángulo CHAPA del fondo preimpreso. */
.preprinted__plate{left:16.50mm;top:35.05mm;width:25.60mm;height:4.85mm;font-size:12pt;letter-spacing:.25mm}
/* Centro exacto del rectángulo MOTOR del fondo preimpreso. */
.preprinted__motor{left:16.50mm;top:43.75mm;width:25.60mm;height:4.85mm;font-size:10.5pt}
/* Área reservada exclusivamente al QR en el lado derecho. */
.preprinted__qr{position:absolute;left:47.70mm;top:4.30mm;width:35.90mm;height:35.90mm;display:flex;align-items:center;justify-content:center;overflow:hidden}
.preprinted__qr img{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
</style></head><body><div class="preprinted"><div class="preprinted__field preprinted__vehicle">${escapeText(modelo)}</div><div class="preprinted__field preprinted__plate">${escapeText(chapa)}</div><div class="preprinted__field preprinted__motor">${escapeText(motor)}</div><div class="preprinted__qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}</div></div></body></html>`;
}

/** Mismo documento HTML/CSS que se usa para generar el PDF. */
function buildEtiquetaPreviewDocumentHtml({
  config,
  tamano = '9x6',
  vehiculo = PREVIEW_VEHICULO_DEMO,
  qrDataUrl = null,
  logoSrc
}) {
  return buildEtiquetaDocumentHtml({
    config,
    vehiculo,
    qrDataUrl,
    tamano,
    logoSrc
  });
}

module.exports = {
  ETIQUETA_PAGE_SIZES,
  TEXTO_ETIQUETA_DEFAULT,
  LOGO_RELATIVE_SRC,
  PREVIEW_VEHICULO_DEMO,
  readLogoNaturalSize,
  resolveLogoFileUrl,
  resolveLogoDataUrl,
  resolveEtiquetaBaseDataUrl,
  resolveLogoSrc,
  getEtiquetaStyles,
  buildEtiquetaMarkup,
  buildEtiquetaDocumentHtml,
  buildEtiquetaPreImpressaDocumentHtml,
  buildEtiquetaPreviewDocumentHtml
};
