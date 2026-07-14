const { buildEtiquetaDocumentHtml } = require('./etiqueta-template');
const path = require('path');
const { jsPDF } = require('jspdf');
const { getEtiquetaLayout } = require('./etiqueta-layout');
const { buildContactLines, splitScanText, formatVehiculoNombre } = require('./etiqueta-markup');
const { getProjectRoot } = require('./paths');

const GOLD = { r: 212, g: 175, b: 55 };
const GOLD_DARK = { r: 184, g: 148, b: 47 };
const BLACK = { r: 10, g: 10, b: 10 };
const WHITE = { r: 255, g: 255, b: 255 };
const TEXT = { r: 245, g: 245, b: 245 };
const FOOTER_TEXT = { r: 229, g: 229, b: 229 };

function getLogoPath() {
  const candidates = [
    path.join(getProjectRoot(), 'assets', 'logo-oficial.png'),
    path.join(__dirname, '../renderer/assets/logo-oficial.png')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getLogoDataUrl() {
  const logoPath = getLogoPath();
  if (!logoPath) {
    return null;
  }

  return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
}

function readLogoAspectRatio() {
  const logoPath = getLogoPath();
  if (!logoPath) {
    return 1;
  }

  const buffer = fs.readFileSync(logoPath);
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16) || 1;
    const height = buffer.readUInt32BE(20) || 1;
    return width / height;
  }

  return 1;
}

function createEtiquetaPdfDocument(tamano = '10x7') {
  const { page } = getEtiquetaLayout(tamano);

  return new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [page.widthMm, page.heightMm],
    compress: true
  });
}

function mm(value, layout, axis = 'scale') {
  if (axis === 'x') {
    return value * layout.scaleX;
  }

  if (axis === 'y') {
    return value * layout.scaleY;
  }

  return value * layout.scale;
}

function drawIconBox(doc, x, y, size, layout) {
  const radius = mm(1.2, layout);
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.25, layout));
  doc.roundedRect(x, y, size, size, radius, radius, 'S');
}

function drawCarIcon(doc, x, y, size, layout) {
  drawIconBox(doc, x, y, size, layout);
  const pad = size * 0.22;
  const ix = x + pad;
  const iy = y + pad;
  const iw = size - pad * 2;
  const ih = size - pad * 2;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.22, layout));
  doc.roundedRect(ix, iy + ih * 0.28, iw, ih * 0.42, mm(0.35, layout), mm(0.35, layout), 'S');
  doc.line(ix + iw * 0.12, iy + ih * 0.28, ix + iw * 0.22, iy + ih * 0.08);
  doc.line(ix + iw * 0.88, iy + ih * 0.28, ix + iw * 0.78, iy + ih * 0.08);
}

function drawPlateIcon(doc, x, y, size, layout) {
  drawIconBox(doc, x, y, size, layout);
  const pad = size * 0.22;
  const ix = x + pad;
  const iy = y + pad;
  const iw = size - pad * 2;
  const ih = size - pad * 2;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.22, layout));
  doc.roundedRect(ix, iy + ih * 0.18, iw, ih * 0.64, mm(0.35, layout), mm(0.35, layout), 'S');
  doc.line(ix + iw * 0.15, iy + ih * 0.52, ix + iw * 0.85, iy + ih * 0.52);
}

function drawMotorIcon(doc, x, y, size, layout) {
  drawIconBox(doc, x, y, size, layout);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.18;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.22, layout));
  doc.circle(cx, cy, r, 'S');
  doc.line(cx, y + size * 0.18, cx, y + size * 0.3);
  doc.line(cx, y + size * 0.7, cx, y + size * 0.82);
  doc.line(x + size * 0.18, cy, x + size * 0.3, cy);
  doc.line(x + size * 0.7, cy, x + size * 0.82, cy);
}

const ICON_DRAWERS = {
  vehiculo: drawCarIcon,
  chapa: drawPlateIcon,
  motor: drawMotorIcon
};

function drawInfoRow(doc, x, y, iconKey, label, value, maxWidth, layout) {
  const iconSize = mm(layout.spec.iconBoxMm, layout);
  const gap = mm(1.5, layout);
  const textX = x + iconSize + gap;
  const textMaxW = maxWidth - iconSize - gap;
  const labelSize = mm(layout.spec.labelFontMm, layout);
  const valueSize = mm(layout.spec.valueFontMm, layout);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(labelSize);
  const labelBaseline = mm(2.2, layout);

  doc.setFontSize(valueSize);
  const valueLines = doc.splitTextToSize(String(value), textMaxW);
  const valueLineH = mm(2.6, layout);
  const valueBaseline = labelBaseline + mm(2.1, layout);
  const textBlockH = valueBaseline + valueLines.length * valueLineH;
  const blockH = Math.max(iconSize, textBlockH);
  const iconY = y + (blockH - iconSize) / 2;

  ICON_DRAWERS[iconKey](doc, x, iconY, iconSize, layout);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(labelSize);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.text(label, textX, y + labelBaseline);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(valueSize);
  doc.setTextColor(TEXT.r, TEXT.g, TEXT.b);
  doc.text(valueLines, textX, y + valueBaseline);

  return y + blockH + mm(layout.spec.infoGapMm, layout);
}

function drawLogo(doc, x, y, maxWidth, maxHeight, logoDataUrl, layout) {
  const aspect = readLogoAspectRatio();
  let drawW = maxWidth;
  let drawH = drawW / aspect;

  if (drawH > maxHeight) {
    drawH = maxHeight;
    drawW = drawH * aspect;
  }

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', x, y, drawW, drawH, undefined, 'MEDIUM');
  }

  return y + drawH;
}

function buildEtiquetaPdfBuffer({ config, vehiculo, qrDataUrl, tamano = '10x7' }) {
  const layout = getEtiquetaLayout(tamano);
  const spec = layout.spec;
  const { page, pad, footerH, bodyH, leftW, rightW, leftX, rightX, bodyY } = (() => {
    const innerW = layout.page.widthMm - layout.pad * 2;
    const innerH = layout.page.heightMm - layout.pad * 2;
    const gap = layout.gap;
    const leftColumnW = innerW * spec.leftRatio;
    const rightColumnW = innerW * spec.rightRatio;

    return {
      page: layout.page,
      pad: layout.pad,
      footerH: layout.footerH,
      bodyH: innerH - layout.footerH,
      leftW: leftColumnW,
      rightW: rightColumnW,
      leftX: layout.pad,
      rightX: layout.pad + leftColumnW + gap,
      bodyY: layout.pad
    };
  })();

  const doc = createEtiquetaPdfDocument(tamano);
  const contact = buildContactLines(config);
  const scanParts = splitScanText(contact.texto);
  const logoDataUrl = getLogoDataUrl();

  doc.setFillColor(BLACK.r, BLACK.g, BLACK.b);
  doc.rect(0, 0, page.widthMm, page.heightMm, 'F');

  const borderInset = mm(0.75, layout);
  const borderRadius = mm(2.65, layout);
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.8, layout));
  doc.roundedRect(
    borderInset,
    borderInset,
    page.widthMm - borderInset * 2,
    page.heightMm - borderInset * 2,
    borderRadius,
    borderRadius,
    'S'
  );

  let leftCursorY = drawLogo(
    doc,
    leftX,
    bodyY,
    leftW,
    layout.logoMaxH,
    logoDataUrl,
    layout
  );

  leftCursorY += mm(1, layout);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(mm(spec.sloganFontMm, layout));
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.text('INNOVACION Y CALIDAD', leftX + leftW / 2, leftCursorY, { align: 'center' });
  leftCursorY += mm(2.2, layout);

  const infoRows = [
    ['vehiculo', 'VEHÍCULO', formatVehiculoNombre(vehiculo)],
    ['chapa', 'CHAPA', vehiculo?.placa || '—'],
    ['motor', 'MOTOR', vehiculo?.motor || '—']
  ];

  infoRows.forEach(([iconKey, label, value]) => {
    leftCursorY = drawInfoRow(doc, leftX, leftCursorY, iconKey, label, value, leftW, layout);
  });

  const bandH = mm(7.5, layout, 'y');
  const qrGap = mm(spec.qrGapMm, layout);
  const qrSize = Math.min(rightW, bodyH - bandH - qrGap * 2 - mm(1, layout));
  const qrX = rightX + (rightW - qrSize) / 2;
  const qrY = bodyY + mm(0.5, layout, 'y');

  doc.setFillColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(spec.qrBorderMm, layout));
  doc.roundedRect(
    qrX - mm(spec.qrPaddingMm, layout),
    qrY - mm(spec.qrPaddingMm, layout),
    qrSize + mm(spec.qrPaddingMm, layout) * 2,
    qrSize + mm(spec.qrPaddingMm, layout) * 2,
    mm(1.2, layout),
    mm(1.2, layout),
    'FD'
  );

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
  }

  const bandY = qrY + qrSize + qrGap;
  const bandW = rightW;

  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.roundedRect(rightX, bandY, bandW, bandH, mm(1, layout), mm(1, layout), 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(mm(spec.scanTitleFontMm, layout));
  doc.setTextColor(BLACK.r, BLACK.g, BLACK.b);
  doc.text(scanParts.title.toUpperCase(), rightX + bandW / 2, bandY + mm(2.6, layout, 'y'), {
    align: 'center',
    maxWidth: bandW - mm(2, layout)
  });

  if (scanParts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(mm(spec.scanSubtitleFontMm, layout));
    doc.text(scanParts.subtitle, rightX + bandW / 2, bandY + mm(5.2, layout, 'y'), {
      align: 'center',
      maxWidth: bandW - mm(2, layout)
    });
  }

  const footerY = bodyY + bodyH;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(mm(0.2, layout));
  doc.line(leftX, footerY, leftX + page.widthMm - pad * 2, footerY);

  const footerLines = [
    ['WhatsApp', contact.whatsappLine],
    ['E-mail', contact.emailLine],
    ['Ubicación', contact.ubicacion]
  ];

  const footerFont = mm(spec.footerFontMm, layout);
  const labelW = mm(spec.footerLabelWidthMm, layout, 'x');
  const lineStep = footerH / footerLines.length;

  footerLines.forEach(([label, value], index) => {
    const lineY = footerY + lineStep * (index + 0.72);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(footerFont);
    doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
    doc.text(label, leftX + mm(0.5, layout, 'x'), lineY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(footerFont);
    doc.setTextColor(FOOTER_TEXT.r, FOOTER_TEXT.g, FOOTER_TEXT.b);
    doc.text(String(value), leftX + labelW, lineY, {
      maxWidth: page.widthMm - pad * 2 - labelW - mm(1, layout, 'x')
    });
  });

  return Buffer.from(doc.output('arraybuffer'));
}

module.exports = {
  createEtiquetaPdfDocument,
  buildEtiquetaPdfBuffer
};
