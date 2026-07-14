const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, dialog, shell } = require('electron');
const logger = require('../utils/logger');

async function createDocumentWindow(html) {
  const tempPath = path.join(app.getPath('temp'), `doc-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tempPath, html, 'utf8');

  const docWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true
    }
  });

  await new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };

    const onFail = (_event, _code, description) => {
      cleanup();
      reject(new Error(description || 'No se pudo cargar el documento.'));
    };

    const cleanup = () => {
      docWindow.webContents.removeListener('did-finish-load', onLoad);
      docWindow.webContents.removeListener('did-fail-load', onFail);
    };

    docWindow.webContents.once('did-finish-load', onLoad);
    docWindow.webContents.once('did-fail-load', onFail);

    docWindow.loadFile(tempPath).catch((error) => {
      cleanup();
      reject(error);
    });
  });

  await new Promise((resolve) => {
    setTimeout(resolve, 600);
  });

  return { docWindow, tempPath };
}

async function renderHtmlToPdf(html, pageSize = 'A4') {
  const { docWindow } = await createDocumentWindow(html);

  try {
    const pdfOptions = {
      printBackground: true,
      margins: { marginType: 'none' }
    };

    if (typeof pageSize === 'string') {
      pdfOptions.pageSize = pageSize;
    } else if (pageSize?.width && pageSize?.height) {
      pdfOptions.pageSize = {
        width: pageSize.width,
        height: pageSize.height
      };
    } else {
      pdfOptions.pageSize = 'A4';
    }

    return await docWindow.webContents.printToPDF(pdfOptions);
  } finally {
    docWindow.destroy();
  }
}

/**
 * PDF de etiqueta com página retangular exata (100×70, 120×80 ou 80×50 mm).
 * O tamanho vem do @page em mm no CSS — evita PDF com dimensões incorretas.
 */
async function renderEtiquetaHtmlToPdf(html, _tamanoEtiqueta = '10x7') {
  const { docWindow } = await createDocumentWindow(html);

  try {
    return await docWindow.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'none' },
      preferCSSPageSize: true
    });
  } finally {
    docWindow.destroy();
  }
}

function parsePdfMediaBoxMm(pdfBuffer) {
  const PT_TO_MM = 25.4 / 72;
  const raw = pdfBuffer.toString('latin1');
  const match = raw.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/);

  if (!match) {
    return { widthMm: 0, heightMm: 0, mediaBoxPt: [] };
  }

  const widthPt = Math.abs(parseFloat(match[3]) - parseFloat(match[1]));
  const heightPt = Math.abs(parseFloat(match[4]) - parseFloat(match[2]));

  return {
    widthMm: widthPt * PT_TO_MM,
    heightMm: heightPt * PT_TO_MM,
    mediaBoxPt: [widthPt, heightPt]
  };
}

async function openPdfTemp(html, tamanoEtiqueta = '10x7') {
  const pdfBuffer = await renderEtiquetaHtmlToPdf(html, tamanoEtiqueta);
  const tempPath = path.join(app.getPath('temp'), `etiqueta-qr-${Date.now()}.pdf`);

  fs.writeFileSync(tempPath, pdfBuffer);

  const openError = await shell.openPath(tempPath);
  if (openError) {
    logger.error('PDF generado pero no se pudo abrir', new Error(openError));
    return { ok: false, error: `No se pudo abrir el PDF: ${openError}` };
  }

  return { ok: true, filePath: tempPath };
}

async function openHtmlPrintWindow(html) {
  const tempPath = path.join(app.getPath('temp'), `etiqueta-qr-${Date.now()}.html`);
  fs.writeFileSync(tempPath, html, 'utf8');

  const printWindow = new BrowserWindow({
    width: 920,
    height: 720,
    show: true,
    autoHideMenuBar: true,
    title: 'Etiqueta QR — Ctrl+P para imprimir',
    webPreferences: {
      sandbox: true,
      contextIsolation: true
    }
  });

  await printWindow.loadFile(tempPath);

  return { ok: true, filePath: tempPath };
}

function registerDocumentHandlers() {
  const { ipcMain } = require('electron');

  ipcMain.handle('document:exportPdf', async (event, payload = {}) => {
    try {
      const html = payload.html || '';
      const suggestedFilename = payload.suggestedFilename || 'orden.pdf';

      if (!html.trim()) {
        return { ok: false, error: 'No hay contenido para exportar.' };
      }

      const pdfBuffer = await renderHtmlToPdf(html);
      const parentWindow = BrowserWindow.fromWebContents(event.sender);

      const { filePath, canceled } = await dialog.showSaveDialog(parentWindow, {
        title: 'Guardar PDF',
        defaultPath: suggestedFilename,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (canceled || !filePath) {
        return { ok: false, canceled: true };
      }

      fs.writeFileSync(filePath, pdfBuffer);

      const openError = await shell.openPath(filePath);
      if (openError) {
        logger.warn('PDF guardado pero no se pudo abrir', { filePath, openError });
      }

      return { ok: true, filePath };
    } catch (error) {
      logger.error('Error en document:exportPdf', error);
      return { ok: false, error: 'No se pudo generar el PDF.' };
    }
  });

  ipcMain.handle('document:openPdf', async (_event, payload = {}) => {
    try {
      const html = payload.html || '';

      if (!html.trim()) {
        return { ok: false, error: 'No hay contenido para exportar.' };
      }

      return await openPdfTemp(html, payload.tamanoEtiqueta || '10x7');
    } catch (error) {
      logger.error('Error en document:openPdf', error);
      return { ok: false, error: 'No se pudo generar el PDF.' };
    }
  });
}

module.exports = {
  registerDocumentHandlers,
  openPdfTemp,
  openHtmlPrintWindow,
  renderHtmlToPdf,
  renderEtiquetaHtmlToPdf,
  parsePdfMediaBoxMm
};
