import { escapeHtml } from './dom.js';

let activeViewer = null;

function closeQrViewer() {
  activeViewer?.remove();
  activeViewer = null;
}

function formatVehiculoTitulo(vehiculo) {
  const nombre = [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ');
  return nombre || vehiculo?.placa || 'Vehículo';
}

/**
 * Abre visualização ampliada do QR Code do veículo.
 */
export async function openVehiculoQrViewer(vehiculoId, { onPrint } = {}) {
  if (!vehiculoId) {
    window.alert('Vehículo no identificado.');
    return;
  }

  if (typeof window.api?.getVehiculoQrDataUrl !== 'function') {
    window.alert('Visualización de QR no disponible. Reinicie la aplicación.');
    return;
  }

  closeQrViewer();

  const loading = document.createElement('div');
  loading.className = 'vehiculos-etiqueta-modal vehiculos-qr-viewer';
  loading.innerHTML = `
    <div class="vehiculos-etiqueta-modal__backdrop"></div>
    <div class="vehiculos-etiqueta-modal__dialog">
      <header class="vehiculos-etiqueta-modal__header">
        <h2>Visualizar QR</h2>
      </header>
      <div class="vehiculos-qr-viewer__body">
        <p class="vehiculos-qr-viewer__loading">Cargando código QR...</p>
      </div>
    </div>
  `;
  document.body.appendChild(loading);
  activeViewer = loading;

  try {
    const result = await window.api.getVehiculoQrDataUrl(vehiculoId);

    if (!result?.ok || !result.dataUrl) {
      closeQrViewer();
      window.alert(result?.error || 'No se pudo cargar el código QR.');
      return;
    }

    const vehiculo = result.vehiculo || {};
    const titulo = formatVehiculoTitulo(vehiculo);

    loading.innerHTML = `
      <div class="vehiculos-etiqueta-modal__backdrop" data-action="close-qr-viewer"></div>
      <div class="vehiculos-etiqueta-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="vehiculos-qr-viewer-title">
        <header class="vehiculos-etiqueta-modal__header">
          <h2 id="vehiculos-qr-viewer-title">Visualizar QR</h2>
          <button type="button" class="vehiculos-modal__close" data-action="close-qr-viewer" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>
        <div class="vehiculos-qr-viewer__body">
          <div class="vehiculos-qr-viewer__frame">
            <img
              class="vehiculos-qr-viewer__image"
              src="${result.dataUrl}"
              alt="Código QR del vehículo ${escapeHtml(vehiculo.placa || '')}"
              width="320"
              height="320"
            />
          </div>
          <p class="vehiculos-qr-viewer__meta">
            <strong>${escapeHtml(vehiculo.placa || '—')}</strong>
            · ${escapeHtml(titulo)}
          </p>
        </div>
        <footer class="vehiculos-etiqueta-modal__footer vehiculos-qr-viewer__footer">
          <button type="button" class="btn-ghost" data-action="close-qr-viewer">Cerrar</button>
          <button type="button" class="btn-primary" data-action="print-from-qr-viewer">Imprimir</button>
        </footer>
      </div>
    `;

    loading.querySelectorAll('[data-action="close-qr-viewer"]').forEach((el) => {
      el.addEventListener('click', closeQrViewer);
    });

    loading.querySelector('[data-action="print-from-qr-viewer"]')?.addEventListener('click', async () => {
      if (typeof onPrint === 'function') {
        await onPrint(vehiculoId);
      }
    });
  } catch (error) {
    closeQrViewer();
    window.alert(error.message || 'No se pudo cargar el código QR.');
  }
}

export { closeQrViewer };
