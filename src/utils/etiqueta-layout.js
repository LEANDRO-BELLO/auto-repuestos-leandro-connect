/**
 * Medidas fixas do modelo aprovado (referência original 10×7 cm),
 * escaladas proporcionalmente para o tamanho oficial 9×6 cm.
 * Única fonte de valores em mm — CSS e PDF derivam deste spec.
 */
const BASE = {
  paddingMm: 3,
  borderMm: 0.8,
  borderRadiusMm: 2.65,
  leftRatio: 0.55,
  rightRatio: 0.45,
  columnGapMm: 1.5,
  footerHeightMm: 10,
  logoMaxHeightMm: 30,
  sloganFontMm: 2.1,
  infoGapMm: 1.6,
  iconBoxMm: 7.5,
  iconSvgMm: 4.8,
  labelFontMm: 1.8,
  valueFontMm: 2.8,
  qrPaddingMm: 1,
  qrBorderMm: 0.55,
  qrGapMm: 1.2,
  scanBandPaddingMm: 1.2,
  scanTitleFontMm: 1.65,
  scanSubtitleFontMm: 1.45,
  footerFontMm: 1.8,
  footerLabelWidthMm: 16,
  footerGapMm: 0.6
};

const SIZE_OVERRIDES = {
  '9x6': {
    logoMaxHeightMm: 25.7,
    footerHeightMm: 8.6,
    columnGapMm: 1.35
  },
  '12x8': {
    logoMaxHeightMm: 34,
    footerHeightMm: 12,
    columnGapMm: 2,
    valueFontMm: 2.55,
    scanTitleFontMm: 1.8,
    scanSubtitleFontMm: 1.6,
    footerFontMm: 1.7
  },
  '8x5': {
    logoMaxHeightMm: 17,
    footerHeightMm: 7,
    columnGapMm: 1.2,
    sloganFontMm: 1.45,
    valueFontMm: 1.85,
    scanTitleFontMm: 1.35,
    scanSubtitleFontMm: 1.2,
    footerFontMm: 1.35,
    footerLabelWidthMm: 11,
    iconBoxMm: 4.5,
    iconSvgMm: 2.6
  }
};

function scaleMm(value, scale) {
  return value * scale;
}

function getEtiquetaLayout(tamano = '9x6') {
  const { getPageConfig } = require('./etiqueta-page-sizes');
  const page = getPageConfig(tamano);
  const scaleX = page.widthMm / 100;
  const scaleY = page.heightMm / 70;
  const scale = Math.min(scaleX, scaleY);
  const overrides = SIZE_OVERRIDES[tamano] || {};

  const spec = { ...BASE, ...overrides };
  const pad = scaleMm(spec.paddingMm, scale);
  const footerH = scaleMm(spec.footerHeightMm, scaleY);
  const innerW = page.widthMm - pad * 2;
  const innerH = page.heightMm - pad * 2;
  const bodyH = innerH - footerH;
  const gap = scaleMm(spec.columnGapMm, scale);
  const leftW = innerW * spec.leftRatio - gap / 2;
  const rightW = innerW * spec.rightRatio - gap / 2;

  return {
    page,
    tamano,
    scale,
    scaleX,
    scaleY,
    pad,
    innerW,
    innerH,
    bodyH,
    footerH,
    leftW,
    rightW,
    gap,
    spec,
    logoMaxH: scaleMm(spec.logoMaxHeightMm, scaleY),
    qrTargetW: rightW * 1.12
  };
}

module.exports = {
  BASE,
  SIZE_OVERRIDES,
  getEtiquetaLayout
};
