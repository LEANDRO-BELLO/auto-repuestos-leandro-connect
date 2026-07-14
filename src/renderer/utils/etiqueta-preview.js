const PAGE_MM = {
  '10x7': [100, 70],
  '12x8': [120, 80],
  '8x5': [80, 50]
};

const MM_TO_PX = 96 / 25.4;

function fitPreviewToContainer(frame, container, tamano) {
  const [wMm, hMm] = PAGE_MM[tamano] || PAGE_MM['10x7'];
  const naturalW = wMm * MM_TO_PX;
  const naturalH = hMm * MM_TO_PX;
  const maxW = container.clientWidth;

  frame.style.width = `${wMm}mm`;
  frame.style.height = `${hMm}mm`;
  frame.style.transform = '';
  frame.style.transformOrigin = 'top center';
  frame.style.border = 'none';
  frame.style.display = 'block';
  container.style.height = `${naturalH}px`;

  if (naturalW > maxW && maxW > 0) {
    const scale = maxW / naturalW;
    frame.style.transform = `scale(${scale})`;
    container.style.height = `${naturalH * scale}px`;
  }
}

/**
 * Prévia idêntica ao PDF — mesmo HTML/CSS do modelo aprobado.
 */
export async function mountEtiquetaPreview(container, config, tamano = '10x7') {
  if (!container) {
    return;
  }

  if (typeof window.api?.buildEtiquetaPreviewHtml !== 'function') {
    container.innerHTML = '<p class="config-preview__error">Vista previa no disponible.</p>';
    return;
  }

  const result = await window.api.buildEtiquetaPreviewHtml({ config, tamano });

  if (!result?.ok || !result.previewUrl) {
    container.innerHTML = '<p class="config-preview__error">No se pudo cargar la vista previa.</p>';
    return;
  }

  container.innerHTML = `
    <iframe
      class="config-preview__embed"
      title="Vista previa de etiqueta"
      src="${result.previewUrl}"
      scrolling="no"
    ></iframe>
  `;

  const frame = container.querySelector('.config-preview__embed');
  const resolvedTamano = result.tamano || tamano;
  fitPreviewToContainer(frame, container, resolvedTamano);
  window.addEventListener('resize', () => fitPreviewToContainer(frame, container, resolvedTamano));
}
