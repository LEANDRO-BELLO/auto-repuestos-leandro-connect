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

function getEtiquetaStyles(tamano = '10x7') {
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

function buildEtiquetaDocumentHtml({ config, vehiculo, qrDataUrl, tamano = '10x7', logoSrc }) {
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

/** Mismo documento HTML/CSS que se usa para generar el PDF. */
function buildEtiquetaPreviewDocumentHtml({
  config,
  tamano = '10x7',
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
  buildEtiquetaPreviewDocumentHtml
};
