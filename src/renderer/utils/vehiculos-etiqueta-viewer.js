import { escapeHtml } from './dom.js';

let activeViewer = null;

function closeEtiquetaViewer() {
  activeViewer?.remove();
  activeViewer = null;
}

const PAGE_MM = {
  '9x6': [90, 60],
  '10x7': [100, 70],
  '12x8': [120, 80],
  '8x5': [80, 50]
};

const MM_TO_PX = 96 / 25.4;

function fitEtiquetaFrame(frame, wrapper, tamano) {
  const [wMm, hMm] = PAGE_MM[tamano] || PAGE_MM['9x6'];
  const naturalW = wMm * MM_TO_PX;
  const naturalH = hMm * MM_TO_PX;
  const maxW = wrapper.clientWidth || naturalW;

  frame.style.width = `${wMm}mm`;
  frame.style.height = `${hMm}mm`;
  frame.style.transform = '';
  frame.style.transformOrigin = 'top center';
  frame.style.border = 'none';
  frame.style.display = 'block';

  if (naturalW > maxW && maxW > 0) {
    const scale = maxW / naturalW;
    frame.style.transform = `scale(${scale})`;
    wrapper.style.height = `${naturalH * scale}px`;
  } else {
    wrapper.style.height = `${naturalH}px`;
  }
}

/**
 * Visualização ampliada da etiqueta (mesmo HTML/CSS do PDF).
 */
export async function openVehiculoEtiquetaViewer(vehiculoId, { onPrint, onDownload } = {}) {
  if (!vehiculoId) {
    window.alert('Vehículo no identificado.');
    return;
  }

  if (typeof window.api?.previewVehiculoEtiqueta !== 'function') {
    window.alert('Vista previa de etiqueta no disponible. Reinicie la aplicación.');
    return;
  }

  closeEtiquetaViewer();

  const loading = document.createElement('div');
  loading.className = 'vehiculos-etiqueta-modal vehiculos-etiqueta-viewer';
  loading.innerHTML = `
    <div class="vehiculos-etiqueta-modal__backdrop"></div>
    <div class="vehiculos-etiqueta-modal__dialog">
      <header class="vehiculos-etiqueta-modal__header">
        <h2>Visualizar Etiqueta</h2>
      </header>
      <div class="vehiculos-etiqueta-viewer__body">
        <p class="vehiculos-qr-viewer__loading">Generando etiqueta...</p>
      </div>
    </div>
  `;
  document.body.appendChild(loading);
  activeViewer = loading;

  try {
    const result = await window.api.previewVehiculoEtiqueta(vehiculoId);

    if (!result?.ok || !result.previewUrl) {
      closeEtiquetaViewer();
      window.alert(result?.error || 'No se pudo cargar la etiqueta.');
      return;
    }

    const tamano = result.tamano || '9x6';

    loading.innerHTML = `
      <div class="vehiculos-etiqueta-modal__backdrop" data-action="close-etiqueta-viewer"></div>
      <div class="vehiculos-etiqueta-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="vehiculos-etiqueta-viewer-title">
        <header class="vehiculos-etiqueta-modal__header">
          <h2 id="vehiculos-etiqueta-viewer-title">Visualizar Etiqueta</h2>
          <button type="button" class="vehiculos-modal__close" data-action="close-etiqueta-viewer" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>
        <div class="vehiculos-etiqueta-viewer__body">
          <div class="vehiculos-etiqueta-viewer__frame">
            <iframe
              class="vehiculos-etiqueta-viewer__html"
              src="${result.previewUrl}"
              title="Etiqueta"
              scrolling="no"
            ></iframe>
          </div>
          <p class="vehiculos-etiqueta-viewer__meta">
            Tamaño: ${escapeHtml(String(result.widthMm || ''))} × ${escapeHtml(String(result.heightMm || ''))} mm
          </p>
        </div>
        <footer class="vehiculos-etiqueta-modal__footer vehiculos-etiqueta-viewer__footer">
          <button type="button" class="btn-ghost" data-action="close-etiqueta-viewer">Cerrar</button>
          <button type="button" class="btn-ghost" data-action="download-from-etiqueta-viewer">Baixar PDF</button>
          <button type="button" class="btn-primary" data-action="print-from-etiqueta-viewer">Imprimir</button>
        </footer>
      </div>
    `;

    const frame = loading.querySelector('.vehiculos-etiqueta-viewer__html');
    const wrapper = loading.querySelector('.vehiculos-etiqueta-viewer__frame');
    fitEtiquetaFrame(frame, wrapper, tamano);
    window.addEventListener('resize', () => fitEtiquetaFrame(frame, wrapper, tamano));

    loading.querySelectorAll('[data-action="close-etiqueta-viewer"]').forEach((el) => {
      el.addEventListener('click', closeEtiquetaViewer);
    });

    loading.querySelector('[data-action="print-from-etiqueta-viewer"]')?.addEventListener('click', async () => {
      if (typeof onPrint === 'function') {
        await onPrint(vehiculoId);
      }
    });

    loading.querySelector('[data-action="download-from-etiqueta-viewer"]')?.addEventListener('click', async () => {
      if (typeof onDownload === 'function') {
        await onDownload(vehiculoId);
      }
    });
  } catch (error) {
    closeEtiquetaViewer();
    window.alert(error.message || 'No se pudo cargar la etiqueta.');
  }
}

export { closeEtiquetaViewer };
