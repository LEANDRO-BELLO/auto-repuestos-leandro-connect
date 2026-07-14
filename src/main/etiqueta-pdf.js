const fs = require('fs');
const path = require('path');
const { app, shell, dialog, BrowserWindow } = require('electron');
const { pathToFileURL } = require('url');
const logger = require('../utils/logger');
const { buildEtiquetaDocumentHtml } = require('../utils/etiqueta-template');

const { getPageConfig } = require('../utils/etiqueta-page-sizes');
const { parsePdfMediaBoxMm } = require('./document');

function writeTempFile(bufferOrText, prefix, extension) {
  const tempPath = path.join(app.getPath('temp'), `${prefix}-${Date.now()}.${extension}`);

  if (Buffer.isBuffer(bufferOrText)) {
    fs.writeFileSync(tempPath, bufferOrText);
  } else {
    fs.writeFileSync(tempPath, bufferOrText, 'utf8');
  }

  return tempPath;
}

function materializeQrSrc(qrDataUrl) {
  if (!qrDataUrl) {
    return null;
  }

  if (!qrDataUrl.startsWith('data:image/')) {
    return qrDataUrl;
  }

  const base64 = qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const tempPath = writeTempFile(Buffer.from(base64, 'base64'), 'etiqueta-qr-img', 'png');
  return pathToFileURL(tempPath).href;
}

function buildEtiquetaHtmlFromPayload(payload = {}) {
  const tamano = payload.tamano || payload.tamanoEtiqueta || payload.config?.tamanoEtiqueta || '10x7';
  const qrSrc = materializeQrSrc(payload.qrDataUrl || null);

  return {
    tamano,
    html: buildEtiquetaDocumentHtml({
      config: payload.config || {},
      vehiculo: payload.vehiculo || {},
      qrDataUrl: qrSrc,
      tamano
    })
  };
}

async function buildEtiquetaPdfFromPayload(payload = {}) {
  const { tamano, html } = buildEtiquetaHtmlFromPayload(payload);
  const page = getPageConfig(tamano);
  const htmlPath = writeTempFile(html, 'etiqueta-pdf-html', 'html');

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false
    }
  });

  await win.loadURL(pathToFileURL(htmlPath).href);

  const pdfBuffer = await win.webContents.printToPDF({
    printBackground: true,
    margins: { marginType: 'none' },
    pageSize: {
      width: page.widthMm / 25.4,
      height: page.heightMm / 25.4
    }
    

  });

  win.close();

  return { pdfBuffer: Buffer.from(pdfBuffer), tamano };
}




async function openEtiquetaPdfFromPayload(payload = {}) {
  const { pdfBuffer, tamano } = await buildEtiquetaPdfFromPayload(payload);
  const tempPath = writeTempFile(pdfBuffer, 'etiqueta-qr', 'pdf');
  const openError = await shell.openPath(tempPath);

  if (openError) {
    logger.error('PDF generado pero no se pudo abrir', new Error(openError));
    return { ok: false, error: `No se pudo abrir el PDF: ${openError}` };
  }

  return { ok: true, filePath: tempPath, tamano };
}

/** Preview HTML — mesmo CSS do modelo aprobado. */
async function previewEtiquetaHtmlFromPayload(payload = {}) {
  const { tamano, html } = buildEtiquetaHtmlFromPayload(payload);
  const tempPath = writeTempFile(html, 'etiqueta-preview', 'html');
  const page = getPageConfig(tamano);

  return {
    ok: true,
    previewUrl: pathToFileURL(tempPath).href,
    filePath: tempPath,
    tamano,
    widthMm: page.widthMm,
    heightMm: page.heightMm,
    format: 'html'
  };
}

async function downloadEtiquetaPdfFromPayload(event, payload = {}, suggestedName = 'etiqueta-qr.pdf') {
  const { pdfBuffer } = await buildEtiquetaPdfFromPayload(payload);
  const parentWindow = BrowserWindow.fromWebContents(event.sender);

  const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
    title: 'Guardar etiqueta PDF',
    defaultPath: suggestedName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });

  if (canceled || !filePath) {
    return { ok: false, canceled: true };
  }

  fs.writeFileSync(filePath, pdfBuffer);

const openError = await shell.openPath(filePath);
if (openError) {
  logger.error('PDF guardado pero no se pudo abrir', new Error(openError));
  return { ok: false, error: `PDF guardado, pero no se pudo abrir: ${openError}`, filePath };
}

return { ok: true, filePath };
}
module.exports = {
  parsePdfMediaBoxMm,
  buildEtiquetaHtmlFromPayload,
  buildEtiquetaPdfFromPayload,
  openEtiquetaPdfFromPayload,
  previewEtiquetaHtmlFromPayload,
  downloadEtiquetaPdfFromPayload
};
