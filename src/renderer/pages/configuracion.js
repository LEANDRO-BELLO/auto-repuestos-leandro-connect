import { escapeHtml } from '../utils/dom.js';
import { mountEtiquetaPreview } from '../utils/etiqueta-preview.js';
import { hasPermission, PERMISSIONS } from '../utils/permisos.js';

const TEXTO_ETIQUETA_DEFAULT =
  'ESCANEA ESTE CÓDIGO y accede al historial completo de mantenimiento de tu vehículo.';

let pageRoot = null;

const TAMANOS = [
  { value: '9x6', label: '9 x 6 cm', hint: 'Tamaño oficial' },
  { value: '10x7', label: '10 x 7 cm', hint: 'Anterior' },
  { value: '12x8', label: '12 x 8 cm', hint: 'Premium' },
  { value: '8x5', label: '8 x 5 cm', hint: 'Compacto' }
];

function renderTamanoOptions(selected) {
  return TAMANOS.map((item) => `
    <label class="config-radio">
      <input type="radio" name="tamanoEtiqueta" value="${item.value}" ${selected === item.value ? 'checked' : ''} />
      <span class="config-radio__content">
        <span class="config-radio__label">${escapeHtml(item.label)}</span>
        <span class="config-radio__hint">— ${escapeHtml(item.hint)}</span>
      </span>
    </label>
  `).join('');
}

function getFormValues(form) {
  const tamanoEl = form.querySelector('input[name="tamanoEtiqueta"]:checked');

  return {
    tamanoEtiqueta: tamanoEl?.value || '9x6',
    telefonoWhatsapp: form.telefonoWhatsapp.value,
    telefonoAlternativo: form.telefonoAlternativo.value,
    email: form.email.value,
    emailAlternativo: form.emailAlternativo.value,
    direccionUbicacion: form.direccionUbicacion.value,
    textoEtiqueta: form.textoEtiqueta.value
  };
}

async function updatePreview(form) {
  const previewEl = pageRoot?.querySelector('#config-etiqueta-preview');
  if (!previewEl || !form) {
    return;
  }

  const values = getFormValues(form);
  await mountEtiquetaPreview(previewEl, values, values.tamanoEtiqueta);
}

function showToast(message) {
  pageRoot?.querySelector('#config-toast')?.remove();

  pageRoot?.insertAdjacentHTML('beforeend', `
    <div class="config-toast" id="config-toast" role="status">
      ${escapeHtml(message)}
    </div>
  `);

  setTimeout(() => {
    pageRoot?.querySelector('#config-toast')?.remove();
  }, 3200);
}

function renderPageHtml(config) {
  return `
    <div class="config-page">
      <nav class="config-tabs" aria-label="Secciones de configuración">
        <button type="button" class="config-tabs__item config-tabs__item--active" data-tab="etiqueta-qr">
          Impresión QR y Etiqueta
        </button>
      </nav>

      <div class="config-layout">
        <section class="config-panel dashboard-panel">
          <header class="config-panel__header dashboard-panel__header">
            <h2>Impresión QR y Etiqueta</h2>
            <p>Configure el tamaño, contacto y texto de las etiquetas QR para vehículos.</p>
          </header>

          <form class="config-form" id="config-etiqueta-form" novalidate>
            <fieldset class="config-form__section">
              <legend>Tamaño de etiqueta</legend>
              <div class="config-form__radios">
                ${renderTamanoOptions(config.tamanoEtiqueta)}
              </div>
            </fieldset>

            <fieldset class="config-form__section">
              <legend>Información de contacto</legend>
              <div class="config-form__grid">
                <div class="config-form__field">
                  <label for="config-telefono-whatsapp">Teléfono / WhatsApp</label>
                  <input id="config-telefono-whatsapp" name="telefonoWhatsapp" type="tel" value="${escapeHtml(config.telefonoWhatsapp)}" placeholder="+595 986 773 222" />
                </div>
                <div class="config-form__field">
                  <label for="config-telefono-alt">Teléfono alternativo</label>
                  <input id="config-telefono-alt" name="telefonoAlternativo" type="tel" value="${escapeHtml(config.telefonoAlternativo)}" placeholder="+595 9XX XXX XXX" />
                </div>
                <div class="config-form__field">
                  <label for="config-email">E-mail</label>
                  <input id="config-email" name="email" type="email" value="${escapeHtml(config.email)}" placeholder="correo@empresa.com" />
                </div>
                <div class="config-form__field">
                  <label for="config-email-alt">E-mail alternativo</label>
                  <input id="config-email-alt" name="emailAlternativo" type="email" value="${escapeHtml(config.emailAlternativo)}" placeholder="correo2@empresa.com" />
                </div>
                <div class="config-form__field config-form__field--full">
                  <label for="config-direccion">Dirección / Ubicación</label>
                  <input id="config-direccion" name="direccionUbicacion" type="text" value="${escapeHtml(config.direccionUbicacion)}" placeholder="Katueté – Canindeyú – Paraguay" />
                </div>
              </div>
            </fieldset>

            <fieldset class="config-form__section">
              <legend>Texto de la etiqueta</legend>
              <div class="config-form__field config-form__field--full">
                <label for="config-texto-etiqueta" class="sr-only">Texto de la etiqueta</label>
                <textarea id="config-texto-etiqueta" name="textoEtiqueta" rows="3">${escapeHtml(config.textoEtiqueta || TEXTO_ETIQUETA_DEFAULT)}</textarea>
              </div>
            </fieldset>

            <p class="config-form__note">
              El QR Code es único para cada vehículo y no cambiará. Solo se actualizará el historial cada vez que se realice un nuevo servicio.
            </p>

            <p class="config-form__error" id="config-form-error" role="alert"></p>

            <footer class="config-form__footer">
              <button type="submit" class="btn-primary" id="config-form-submit">Guardar configuración</button>
            </footer>
          </form>
        </section>

        <aside class="config-preview dashboard-panel">
          <header class="config-panel__header dashboard-panel__header">
            <h2>Vista previa de la etiqueta</h2>
            <p>Misma etiqueta PDF generada con jsPDF. Datos de demostración.</p>
          </header>
          <div class="config-preview__wrap" id="config-etiqueta-preview"></div>
        </aside>
      </div>
    </div>
  `;
}

function bindFormEvents(form) {
  form.addEventListener('input', () => updatePreview(form));
  form.addEventListener('change', () => updatePreview(form));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const errorBox = pageRoot?.querySelector('#config-form-error');
    const submitBtn = pageRoot?.querySelector('#config-form-submit');

    if (errorBox) {
      errorBox.textContent = '';
    }

    const data = getFormValues(form);

    if (!data.textoEtiqueta.trim()) {
      if (errorBox) {
        errorBox.textContent = 'Ingrese el texto de la etiqueta.';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';
    }

    try {
      const result = await window.api.updateConfigEtiqueta(data);

      if (!result.ok) {
        if (errorBox) {
          errorBox.textContent = result.error || 'No se pudo guardar la configuración.';
        }
        return;
      }

      showToast('Configuración guardada correctamente.');
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.message || 'No se pudo guardar la configuración.';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar configuración';
      }
    }
  });
}

export async function mountConfiguracionPage(container) {
  const user = await window.api.getCurrentUser();
  if (!hasPermission(user, PERMISSIONS.MENU_CONFIG)) {
    container.innerHTML = '<p>No autorizado.</p>';
    return;
  }

  pageRoot = container;

  const config = await window.api.getConfigEtiqueta();

  container.innerHTML = renderPageHtml(config || {
    tamanoEtiqueta: '10x7',
    telefonoWhatsapp: '',
    telefonoAlternativo: '',
    email: '',
    emailAlternativo: '',
    direccionUbicacion: '',
    textoEtiqueta: TEXTO_ETIQUETA_DEFAULT
  });

  const form = container.querySelector('#config-etiqueta-form');
  if (form) {
    bindFormEvents(form);
    await updatePreview(form);
  }
}

export function unmountConfiguracionPage() {
  pageRoot = null;
}
