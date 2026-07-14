import { buildOrdenDocumentHtml } from './orden-document.js';

const VARIANT_ORDEN = 'orden';
const VARIANT_SERVICIOS = 'servicios';

async function loadDocumentPayload(ordenId, variant = VARIANT_ORDEN) {
  const orden = await window.api.getOrden(ordenId);

  if (!orden) {
    throw new Error('Orden no encontrada.');
  }

  const [empresa, cliente] = await Promise.all([
    window.api.getEmpresa(),
    window.api.getCliente(orden.clienteId)
  ]);

  const html = buildOrdenDocumentHtml({ empresa, cliente, orden });
  const prefix = variant === VARIANT_SERVICIOS ? 'servicios' : 'orden';
  const suggestedFilename = `${prefix}-${orden.numeroOs.replace(/[^\w-]+/g, '_')}.pdf`;

  return { html, suggestedFilename };
}

export async function exportOrdenDocumentPdf(ordenId) {
  const { html, suggestedFilename } = await loadDocumentPayload(ordenId, VARIANT_ORDEN);
  const result = await window.api.exportDocumentPdf({ html, suggestedFilename });

  if (result.canceled) {
    return { ok: false, canceled: true };
  }

  if (!result.ok) {
    window.alert(result.error || 'No se pudo exportar el PDF.');
    return result;
  }

  return result;
}

export async function exportServiciosDocumentPdf(ordenId) {
  const { html, suggestedFilename } = await loadDocumentPayload(ordenId, VARIANT_SERVICIOS);
  const result = await window.api.exportDocumentPdf({ html, suggestedFilename });

  if (result.canceled) {
    return { ok: false, canceled: true };
  }

  if (!result.ok) {
    window.alert(result.error || 'No se pudo exportar el PDF.');
    return result;
  }

  return result;
}
