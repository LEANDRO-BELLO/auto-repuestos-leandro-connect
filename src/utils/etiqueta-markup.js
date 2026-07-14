const TEXTO_ETIQUETA_DEFAULT =
  'ESCANEA ESTE CÓDIGO y accede al historial completo de mantenimiento de tu vehículo.';

const LOGO_RELATIVE_SRC = '../../assets/logo-oficial.png';

const ICONS = {
  vehiculo: `<svg class="etiqueta-preview__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11l1.2-3.2A2 2 0 0 1 8.1 6h7.8a2 2 0 0 1 1.9 1.8L19 11M5 11v6h1.4a1.6 1.6 0 0 0 3.2 0h5.8a1.6 1.6 0 0 0 3.2 0H19v-6M8 16.5h.01M16 16.5h.01" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chapa: `<svg class="etiqueta-preview__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h7A1.5 1.5 0 0 1 17 5.5V7M8 12h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  motor: `<svg class="etiqueta-preview__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2M7.05 7.05 5.64 5.64M18.36 18.36l-1.41-1.41M7.05 16.95l-1.41 1.41M18.36 5.64l-1.41 1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatVehiculoNombre(vehiculo) {
  return [vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ') || '—';
}

function buildContactLines(config) {
  const whatsappLine = [config.telefonoWhatsapp, config.telefonoAlternativo].filter(Boolean).join(' · ');
  const emailLine = [config.email, config.emailAlternativo].filter(Boolean).join(' · ');

  return {
    whatsappLine: whatsappLine || '—',
    emailLine: emailLine || '—',
    ubicacion: config.direccionUbicacion || '—',
    texto: config.textoEtiqueta?.trim() || TEXTO_ETIQUETA_DEFAULT
  };
}

function splitScanText(texto) {
  const text = texto?.trim() || TEXTO_ETIQUETA_DEFAULT;
  const splitIndex = text.indexOf(' y ');

  if (splitIndex === -1) {
    return { title: text, subtitle: '' };
  }

  return {
    title: text.slice(0, splitIndex).trim(),
    subtitle: text.slice(splitIndex + 1).trim()
  };
}

function buildScanBandHtml(texto) {
  const { title, subtitle } = splitScanText(texto);

  return `
    <div class="etiqueta-preview__scan-band">
      <strong class="etiqueta-preview__scan-title">${escapeHtml(title)}</strong>
      ${subtitle ? `<span class="etiqueta-preview__scan-subtitle">${escapeHtml(subtitle)}</span>` : ''}
    </div>
  `;
}

function buildInfoBlock(icon, label, value) {
  return `
    <div class="etiqueta-preview__info-block">
      <div class="etiqueta-preview__info-icon">${icon}</div>
      <div class="etiqueta-preview__info-content">
        <span class="etiqueta-preview__info-label">${escapeHtml(label)}</span>
        <span class="etiqueta-preview__info-value">${escapeHtml(value)}</span>
      </div>
    </div>
  `;
}

function buildEtiquetaMarkup({ config, vehiculo, qrDataUrl = null, tamano = '10x7', logoSrc }) {
  const contact = buildContactLines(config);

    return `
  <div class="etiqueta-preview etiqueta-preview--${escapeHtml(tamano)} etiqueta-template-fixed">

     <img class="etiqueta-template-bg" src="${logoSrc}" alt="Etiqueta Base Limpa" />


    <div class="etiqueta-dado veiculo">${escapeHtml(formatVehiculoNombre(vehiculo))}</div>
    <div class="etiqueta-dado chapa">${escapeHtml(vehiculo?.placa || '—')}</div>
    <div class="etiqueta-dado motor">${escapeHtml(vehiculo?.motor || '—')}</div>

    <div class="etiqueta-qr-dinamico">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
    </div>

      <div class="etiqueta-footer-whatsapp">${escapeHtml(contact.whatsappLine)}</div>
      <div class="etiqueta-footer-email">${escapeHtml(contact.emailLine)}</div>
      <div class="etiqueta-footer-ubicacion">${escapeHtml(contact.ubicacion)}</div>
    </div>
  `;
}


module.exports = {
  TEXTO_ETIQUETA_DEFAULT,
  LOGO_RELATIVE_SRC,
  escapeHtml,
  formatVehiculoNombre,
  buildContactLines,
  splitScanText,
  buildEtiquetaMarkup
};
