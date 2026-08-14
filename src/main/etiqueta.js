const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { pathToFileURL } = require('url');
const { PREVIEW_VEHICULO_DEMO } = require('../utils/etiqueta-template');
const { createQrDataUrl } = require('../utils/qr-code');
const vehiculosService = require('../services/vehiculos.service');
const configEtiquetaService = require('../services/config-etiqueta.service');
const logger = require('../utils/logger');
const {
  openEtiquetaPdfFromPayload,
  previewEtiquetaHtmlFromPayload,
  downloadEtiquetaPdfFromPayload
} = require('./etiqueta-pdf');

let lastPreviewHtmlPath = null;

function cleanupPreviewHtml() {
  if (!lastPreviewHtmlPath) {
    return;
  }

  try {
    fs.unlinkSync(lastPreviewHtmlPath);
  } catch {
    /* ignore */
  }

  lastPreviewHtmlPath = null;
}

async function buildVehiculoEtiquetaPayload(vehiculoId) {
  const vehiculo = await vehiculosService.getVehiculo(vehiculoId);

  if (!vehiculo?.qrCode) {
    return {
      ok: false,
      error: 'QR Code no disponible para este vehículo.'
    };
  }

  const config = await configEtiquetaService.getConfigEtiqueta();

  const apiUrl = String(
    process.env.ARL_API_URL ||
    process.env.API_URL ||
    'https://arlc-central-api-production.up.railway.app'
  ).replace(/\/+$/, '');

  const qrUrl =
    `${apiUrl}/vehiculo/${encodeURIComponent(vehiculo.qrCode)}`;

  const qrDataUrl = await createQrDataUrl(qrUrl);

  const tamanho =
    config.tamanoEtiqueta ||
    config.tamanhoEtiqueta ||
    '10x7';

  return {
    ok: true,
    payload: {
      config,
      vehiculo,
      qrDataUrl,
      tamanho,
      tamano: tamanho,
      tamanoEtiqueta: tamanho
    },
    vehiculo
  };
}

async function getVehiculoQrDataUrl(vehiculoId) {
  const vehiculo = await vehiculosService.getVehiculo(vehiculoId);

  if (!vehiculo?.qrCode) {
    return {
      ok: false,
      error: 'QR Code no disponible para este vehículo.'
    };
  }

  const apiUrl = String(
    process.env.ARL_API_URL ||
    process.env.API_URL ||
    'https://arlc-central-api-production.up.railway.app'
  ).replace(/\/+$/, '');

  const qrUrl = `${apiUrl}/vehiculo/${encodeURIComponent(vehiculo.qrCode)}`;
  const dataUrl = await createQrDataUrl(qrUrl);

  return {
    ok: true,
    dataUrl,
    vehiculo
  };
}


function registerEtiquetaHandlers(ipcMain) {
  ipcMain.handle('etiqueta:buildPreviewHtml', async (_event, payload = {}) => {
    try {
      const config = payload.config || {};
      const tamanho = payload.tamanho || config.tamanoEtiqueta || '10x7';
      const qrDataUrl = payload.qrDataUrl || (await createQrDataUrl('PREVIEW-ETIQUETA-QR'));
      const preview = await previewEtiquetaHtmlFromPayload({
        config,
        tamanho,
        vehiculo: payload.vehiculo || PREVIEW_VEHICULO_DEMO,
        qrDataUrl
      });

      cleanupPreviewHtml();
      lastPreviewHtmlPath = preview.filePath;

      return preview;
    } catch (error) {
      logger.error('Error en etiqueta:buildPreviewHtml', error);
      return { ok: false, error: 'No se pudo generar la vista previa.' };
    }
  });

  ipcMain.handle('vehiculos:getQrDataUrl', async (_event, vehiculoId) => {
    try {
      return await getVehiculoQrDataUrl(vehiculoId);
    } catch (error) {
      logger.error('Error en vehiculos:getQrDataUrl', error);
      return { ok: false, error: 'No se pudo generar el QR Code.' };
    }
  });

  ipcMain.handle('vehiculos:previewEtiqueta', async (_event, vehiculoId) => {
    try {
      if (!vehiculoId) {
        return { ok: false, error: 'Vehículo no identificado.' };
      }

      const built = await buildVehiculoEtiquetaPayload(vehiculoId);
      if (!built.ok) {
        return built;
      }

      return await previewEtiquetaHtmlFromPayload(built.payload);
    } catch (error) {
      logger.error('Error en vehiculos:previewEtiqueta', error);
      return { ok: false, error: 'No se pudo generar la vista previa de la etiqueta.' };
    }
  });

  ipcMain.handle('vehiculos:downloadEtiqueta', async (event, vehiculoId) => {
    try {
      if (!vehiculoId) {
        return { ok: false, error: 'Vehículo no identificado.' };
      }

      const built = await buildVehiculoEtiquetaPayload(vehiculoId);
      if (!built.ok) {
        return built;
      }

      const placa = String(built.vehiculo?.placa || 'vehiculo').replace(/[^\w\-]+/g, '-');
      return await downloadEtiquetaPdfFromPayload(
        event,
        built.payload,
        `etiqueta-${placa}.pdf`
      );
    } catch (error) {
      logger.error('Error en vehiculos:downloadEtiqueta', error);
      return { ok: false, error: 'No se pudo guardar el PDF.' };
    }
  });

  ipcMain.handle('vehiculos:printEtiqueta', async (_event, vehiculoId) => {
    try {
      if (!vehiculoId) {
        return { ok: false, error: 'Vehículo no identificado.' };
      }

      const built = await buildVehiculoEtiquetaPayload(vehiculoId);
      if (!built.ok) {
        return built;
      }

      const openResult = await openEtiquetaPdfFromPayload({ ...built.payload, preprinted: true });
      if (!openResult.ok) {
        return openResult;
      }

      await vehiculosService.recordEtiquetaPrint(vehiculoId);
      return { ok: true, filePath: openResult.filePath };
    } catch (error) {
      logger.error('Error en vehiculos:printEtiqueta', error);
      return { ok: false, error: error.message || 'No se pudo generar la etiqueta PDF.' };
    }
  });
}

module.exports = { registerEtiquetaHandlers, getVehiculoQrDataUrl };
