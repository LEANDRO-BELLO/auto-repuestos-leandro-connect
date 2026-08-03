/** Tamanhos reais da etiqueta em milímetros (sem pixels, sem DPI). */
const PAGE_MARGIN_MM = 3;

const ETIQUETA_PAGE_SIZES = {
  '9x6': {
    widthMm: 90,
    heightMm: 60,
    css: '90mm 60mm',
    aspectRatio: '9 / 6'
  },
  '10x7': {
    widthMm: 100,
    heightMm: 70,
    css: '100mm 70mm',
    aspectRatio: '10 / 7'
  },
  '12x8': {
    widthMm: 120,
    heightMm: 80,
    css: '120mm 80mm',
    aspectRatio: '12 / 8'
  },
  '8x5': {
    widthMm: 80,
    heightMm: 50,
    css: '80mm 50mm',
    aspectRatio: '8 / 5'
  }
};

function getPageConfig(tamano = '9x6') {
  return ETIQUETA_PAGE_SIZES[tamano] || ETIQUETA_PAGE_SIZES['9x6'];
}

/** Electron printToPDF: largura/altura em microns (1 mm = 1000 microns). */
function getPageSizeMicrons(tamano = '9x6') {
  const page = getPageConfig(tamano);
  return {
    width: Math.round(page.widthMm * 1000),
    height: Math.round(page.heightMm * 1000)
  };
}

/** Pontos PDF (pt) — referência: 100 mm = 283.46 pt, 70 mm = 198.43 pt. */
function mmToPdfPoints(mm) {
  return (mm / 25.4) * 72;
}

function getPageSizePoints(tamano = '9x6') {
  const page = getPageConfig(tamano);
  return {
    width: mmToPdfPoints(page.widthMm),
    height: mmToPdfPoints(page.heightMm)
  };
}

function mmToCss(mm) {
  return `${mm}mm`;
}

function getContentSizeCss(tamano = '9x6') {
  const page = getPageConfig(tamano);
  return {
    width: mmToCss(page.widthMm - PAGE_MARGIN_MM * 2),
    height: mmToCss(page.heightMm - PAGE_MARGIN_MM * 2)
  };
}

module.exports = {
  PAGE_MARGIN_MM,
  ETIQUETA_PAGE_SIZES,
  getPageConfig,
  getPageSizeMicrons,
  getPageSizePoints,
  mmToPdfPoints,
  mmToCss,
  getContentSizeCss
};
