import { escapeHtml } from '../utils/dom.js';
import { getProximaRevisionItems } from '../utils/proxima-revision.js';
import { exportOrdenDocumentPdf } from '../utils/orden-document-export.js';
import { buildOrdenWhatsAppMessage, buildWhatsAppUrl } from '../utils/whatsapp-orden.js';
import { resolveServicioLabel } from '../utils/servicios-labels.js';
import { hasPermission, PERMISSIONS } from '../utils/permisos.js';

let pageRoot = null;
let searchTimeout = null;
let vehiculoSearchTimeout = null;
let editingId = null;
let modalMode = 'create';
let selectedVehiculo = null;
let vehiculoSearchResults = [];
let selectedServicios = [];
let selectedServiciosKm = {};
let currentOrden = null;
let currentAgendamientoId = null;
let currentAgendamiento = null;
let currentUser = null;

const SERVICIOS_CON_KM = new Set([
  'aceite_caja_cambio',
  'aceite_caja_transferencia',
  'aceite_dif_del',
  'aceite_dif_tras',
  'aceite_direccion',
  'fluido_radiador',
  'fluido_freno'
]);

const SERVICIOS_CATALOGO = [
  { id: 'aceite_motor', label: 'Cambio de aceite motor' },
  { id: 'filtro_aceite', label: 'Filtro de aceite' },
  { id: 'filtro_aire', label: 'Filtro de aire' },
  { id: 'filtro_combustible', label: 'Filtro de combustible' },
  { id: 'filtro_secundario', label: 'Filtro secundario' },
  { id: 'filtro_aire_ac', label: 'Filtro de aire acondicionado' },
  { id: 'aceite_caja_cambio', label: 'Cambio de aceite caja de cambio' },
  { id: 'aceite_caja_transferencia', label: 'Cambio de aceite caja de transferencia' },
  { id: 'aceite_dif_del', label: 'Cambio de aceite diferencial delantero' },
  { id: 'aceite_dif_tras', label: 'Cambio de aceite diferencial trasero' },
  { id: 'aceite_direccion', label: 'Cambio de aceite de dirección' },
  { id: 'fluido_radiador', label: 'Cambio de fluido de radiador' },
  { id: 'fluido_freno', label: 'Cambio de fluido de freno' },
  { id: 'pastilla_freno_delantera', label: 'Cambio de pastilla de freno delantera' },
  { id: 'pastilla_freno_trasera', label: 'Cambio de pastilla de freno trasera' },
  { id: 'engrase_crucetas', label: 'Engrase de crucetas' },
  { id: 'filtro_caja_automatica', label: 'Filtro caja automática' }
];

const ESTADO_CLASS = {
  Abierta: 'open',
  'En proceso': 'progress',
  Finalizada: 'done'
};

const INTERVAL_PRESET = {
  KM_5000_6: '5000_6',
  KM_10000_12: '10000_12',
  PERSONALIZADO: 'personalizado'
};

const FACTURA_REGEX = /^\d{3}-\d{3}-\d{7}$/;

function formatFecha(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatKilometraje(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return new Intl.NumberFormat('es-PY').format(value) + ' km';
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFacturaInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 13);
  let result = digits.slice(0, 3);

  if (digits.length > 3) {
    result += `-${digits.slice(3, 6)}`;
  }
  if (digits.length > 6) {
    result += `-${digits.slice(6, 13)}`;
  }

  return result;
}

function isValidFactura(value) {
  return FACTURA_REGEX.test(String(value || '').trim());
}

function showToast(message) {
  pageRoot?.querySelector('#ordenes-toast')?.remove();

  pageRoot?.insertAdjacentHTML('beforeend', `
    <div class="ordenes-toast" id="ordenes-toast" role="status">
      ${escapeHtml(message)}
    </div>
  `);

  setTimeout(() => {
    pageRoot?.querySelector('#ordenes-toast')?.remove();
  }, 3200);
}

function renderTableRows(ordenes) {
  if (!ordenes.length) {
    return `
      <tr>
        <td class="dashboard-table__empty" colspan="8">No hay órdenes registradas.</td>
      </tr>
    `;
  }

  return ordenes.map((o) => {
    const estadoClass = ESTADO_CLASS[o.estado] || 'open';
    return `
      <tr data-id="${o.id}">
        <td><span class="ordenes-os">${escapeHtml(o.numeroOs)}</span></td>
        <td>${formatFecha(o.fecha)}</td>
        <td>${escapeHtml(o.clienteNombre)}</td>
        <td>${escapeHtml(o.vehiculoPlaca)} — ${escapeHtml(o.vehiculoMarca)} ${escapeHtml(o.vehiculoModelo)}</td>
        <td>${formatKilometraje(o.kilometraje)}</td>
        <td><span class="ordenes-factura">${escapeHtml(o.numeroFactura || '—')}</span></td>
        <td>
          <span class="dashboard-badge dashboard-badge--${estadoClass}">
            ${escapeHtml(o.estado)}
          </span>
        </td>
        <td>
          <div class="ordenes-actions">
            <button type="button" class="ordenes-action-btn ordenes-action-btn--open" data-action="open" data-id="${o.id}" title="Abrir">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8v8H8z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
              Abrir
            </button>
            <button type="button" class="ordenes-action-btn ordenes-action-btn--edit" data-action="edit" data-id="${o.id}" title="Editar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Editar
            </button>
            ${hasPermission(currentUser, PERMISSIONS.ELIMINAR_ORDEN) ? `
            <button type="button" class="ordenes-action-btn ordenes-action-btn--delete" data-action="delete" data-id="${o.id}" title="Eliminar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Eliminar
            </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSelectedVehiculoCard() {
  if (!selectedVehiculo) {
    return '<div class="ordenes-selected ordenes-selected--empty">Ningún vehículo seleccionado</div>';
  }

  return `
    <div class="ordenes-selected">
      <div class="ordenes-selected__main">
        <span class="ordenes-selected__codigo">${escapeHtml(selectedVehiculo.placa)}</span>
        <span class="ordenes-selected__nombre">${escapeHtml(selectedVehiculo.marca)} ${escapeHtml(selectedVehiculo.modelo)}</span>
      </div>
      <div class="ordenes-selected__cliente">${escapeHtml(selectedVehiculo.clienteNombre)} (${escapeHtml(selectedVehiculo.clienteCodigo)})</div>
      ${modalMode !== 'view' ? '<button type="button" class="ordenes-selected__clear" data-action="clear-vehiculo" title="Quitar">×</button>' : ''}
    </div>
  `;
}

function renderVehiculoSelectOptions() {
  if (!vehiculoSearchResults.length) {
    return '<option value="">— Busque y seleccione un vehículo —</option>';
  }

  const options = vehiculoSearchResults.map((v) => `
    <option value="${v.id}" ${selectedVehiculo?.id === v.id ? 'selected' : ''}>
      ${escapeHtml(v.placa)} — ${escapeHtml(v.clienteNombre)} — ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}
    </option>
  `).join('');

  return `<option value="">— Seleccionar vehículo —</option>${options}`;
}

function renderServicioKmField(servicio, isView) {
  if (!SERVICIOS_CON_KM.has(servicio.id) || isView) {
    return '';
  }

  const checked = selectedServicios.includes(servicio.id);
  const kmValue = selectedServiciosKm[servicio.id] ?? '';

  return `
    <div class="ordenes-servicio-km${checked ? '' : ' hidden'}" data-servicio-km-for="${servicio.id}">
      <label for="servicio-km-${servicio.id}">KM para próximo cambio</label>
      <input
        id="servicio-km-${servicio.id}"
        type="number"
        min="0"
        placeholder="0"
        value="${kmValue !== null && kmValue !== undefined && kmValue !== '' ? escapeHtml(String(kmValue)) : ''}"
      />
    </div>
  `;
}

function renderProximaRevisionSection(orden = null) {
  if (modalMode !== 'view' || !orden) {
    return '';
  }

  const items = getProximaRevisionItems(orden, SERVICIOS_CATALOGO);

  if (!items.length) {
    return `
      <fieldset class="ordenes-form__section ordenes-form__section--revision">
        <legend>Próxima revisión</legend>
        <p class="ordenes-revision__empty">Sin próximas revisiones registradas.</p>
      </fieldset>
    `;
  }

  return `
    <fieldset class="ordenes-form__section ordenes-form__section--revision">
      <legend>Próxima revisión</legend>
      <ul class="ordenes-revision__list">
        ${items.map((item) => `
          <li>
            <span class="ordenes-revision__label">${escapeHtml(item.label)}:</span>
            <span class="ordenes-revision__km">${formatKilometraje(item.proximoKm)}</span>
          </li>
        `).join('')}
      </ul>
    </fieldset>
  `;
}

function renderServiciosSection() {
  const disabled = modalMode === 'view' ? 'disabled' : '';
  const isView = modalMode === 'view';

  return `
    <fieldset class="ordenes-form__section ordenes-form__section--servicios">
      <legend>Servicios realizados</legend>
      <div class="ordenes-servicios-grid">
        ${SERVICIOS_CATALOGO.map((servicio) => `
          <div class="ordenes-servicio-item">
            <label class="ordenes-servicio-check">
              <input
                type="checkbox"
                name="servicios"
                value="${servicio.id}"
                ${selectedServicios.includes(servicio.id) ? 'checked' : ''}
                ${disabled}
              />
              <span>${escapeHtml(servicio.label)}</span>
            </label>
            ${renderServicioKmField(servicio, isView)}
          </div>
        `).join('')}
      </div>
    </fieldset>
  `;
}

function renderFormModal() {
  const isView = modalMode === 'view';
  const isEdit = modalMode === 'edit';
  const title = isView ? 'Detalle de Orden' : isEdit ? 'Editar Orden' : 'Nueva Orden';
  const readonly = isView ? 'readonly' : '';
  const disabled = isView ? 'disabled' : '';

  return `
    <div class="ordenes-modal" id="ordenes-modal" role="dialog" aria-modal="true" aria-labelledby="ordenes-modal-title">
      <div class="ordenes-modal__backdrop" data-action="close-modal"></div>
      <div class="ordenes-modal__dialog">
        <header class="ordenes-modal__header">
          <h2 id="ordenes-modal-title">${title}</h2>
          <button type="button" class="ordenes-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <form class="ordenes-form" id="ordenes-form" novalidate>
          <fieldset class="ordenes-form__section" ${isView ? 'disabled' : ''}>
            <div class="ordenes-form__grid">
              ${isView ? '' : `
              <div class="ordenes-form__field ordenes-form__field--full">
                <label for="orden-buscar">Buscar por cliente o chapa</label>
                <div class="ordenes-search-inline">
                  <input id="orden-buscar" type="search" placeholder="Nombre del cliente o chapa del vehículo..." autocomplete="off" />
                  <div class="ordenes-search-results hidden" id="ordenes-buscar-results"></div>
                </div>
              </div>
              <div class="ordenes-form__field ordenes-form__field--full">
                <label for="orden-select-vehiculo">Seleccionar vehículo</label>
                <select id="orden-select-vehiculo" name="selectVehiculo">
                  ${renderVehiculoSelectOptions()}
                </select>
              </div>
              `}
              <div class="ordenes-form__field ordenes-form__field--full">
                <label>Vehículo</label>
                <div id="ordenes-vehiculo-selected-wrap">${renderSelectedVehiculoCard()}</div>
              </div>
            </div>
          </fieldset>

          ${currentAgendamiento ? `
          <div class="ordenes-agenda-origin">
            <strong>Orden iniciada desde Agendamiento</strong>
            <span>${escapeHtml(currentAgendamiento.clienteNombre || '')} · ${escapeHtml(currentAgendamiento.vehiculo_id ? ([currentAgendamiento.marca, currentAgendamiento.modelo].filter(Boolean).join(' ')) : (currentAgendamiento.vehiculo_descripcion || 'Vehículo sin registrar'))}</span>
            ${!currentAgendamiento.vehiculo_id ? '<small>Antes de guardar la OT, seleccione un vehículo ya registrado para este cliente.</small>' : ''}
          </div>` : ''}

          <fieldset class="ordenes-form__section">
            <div class="ordenes-form__grid">
              <div class="ordenes-form__field ordenes-form__field--full">
                <label for="orden-observaciones">Observaciones</label>
                <textarea id="orden-observaciones" name="observaciones" rows="3" ${readonly}></textarea>
              </div>
              <div class="ordenes-form__field">
                <label for="orden-km-actual">KM actual</label>
                <input id="orden-km-actual" name="kilometraje" type="number" min="0" placeholder="0" ${readonly} />
              </div>
              <div class="ordenes-form__field">
                <label for="orden-intervalo-preset">Intervalo</label>
                <select id="orden-intervalo-preset" name="intervaloPreset" ${disabled}>
                  <option value="">— Seleccionar intervalo —</option>
                  <option value="5000_6">5.000 km / 6 meses</option>
                  <option value="10000_12">10.000 km / 12 meses</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              <div class="ordenes-form__field">
                <label for="orden-proximo-km">Próximo KM</label>
                <input id="orden-proximo-km" name="proximoKm" type="number" min="0" placeholder="0" readonly tabindex="-1" class="ordenes-input--locked" />
                <span class="ordenes-field-hint">Cambio de aceite motor</span>
              </div>
              <div class="ordenes-form__field">
                <label for="orden-fecha-vencimiento">Fecha de vencimiento</label>
                <input id="orden-fecha-vencimiento" name="fechaVencimiento" type="date" readonly class="ordenes-input--locked" />
              </div>
              ${isView ? `
              <div class="ordenes-form__field">
                <label>Nº Factura</label>
                <input type="text" value="${escapeHtml(currentOrden?.numeroFactura || '—')}" readonly class="ordenes-input--locked" />
              </div>
              ` : ''}
            </div>
            <input type="hidden" id="orden-estado" name="estado" value="Abierta" />
          </fieldset>

          ${renderServiciosSection()}
          ${renderProximaRevisionSection(currentOrden)}

          <p class="ordenes-form__error" id="ordenes-form-error" role="alert"></p>

          <footer class="ordenes-form__footer">
            ${isView ? `
              <button type="button" class="btn-ghost" data-action="close-modal">Cerrar</button>
              <div class="ordenes-form__footer-actions">
                <button type="button" class="btn-primary ordenes-btn-pdf" data-action="export-pdf-orden" data-id="${editingId || ''}">Exportar PDF</button>
              </div>
            ` : `
              <button type="button" class="btn-ghost" data-action="close-modal">Cancelar</button>
              <div class="ordenes-form__footer-actions">
                <button type="submit" class="btn-primary" id="ordenes-form-submit">Guardar</button>
                <button type="button" class="btn-primary ordenes-btn-finalizar" id="ordenes-form-finalizar">Finalizar servicio</button>
              </div>
            `}
          </footer>
        </form>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="ordenes-page">
      <div class="ordenes-toolbar">
        <button type="button" class="btn-primary ordenes-btn-new" id="ordenes-btn-new">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Nueva Orden
        </button>

        <div class="ordenes-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="search" id="ordenes-search" placeholder="Buscar..." autocomplete="off" />
        </div>
      </div>

      <section class="ordenes-panel dashboard-panel">
        <div class="ordenes-panel__body dashboard-panel__body">
          <table class="dashboard-table ordenes-table">
            <thead>
              <tr>
                <th scope="col">Nº OS</th>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Kilometraje</th>
                <th scope="col">Nº Factura</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="ordenes-table-body">
              <tr><td class="dashboard-table__empty" colspan="8">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function addMonthsIsoDate(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getKmActualValue() {
  const km = parseInt(pageRoot?.querySelector('#orden-km-actual')?.value, 10);
  return Number.isNaN(km) ? 0 : km;
}

function detectIntervalPreset(orden) {
  if (orden.intervalo === 5000) {
    return INTERVAL_PRESET.KM_5000_6;
  }
  if (orden.intervalo === 10000) {
    return INTERVAL_PRESET.KM_10000_12;
  }
  return INTERVAL_PRESET.PERSONALIZADO;
}

function setProximoFechaManualMode(isManual) {
  const proximoInput = pageRoot?.querySelector('#orden-proximo-km');
  const fechaInput = pageRoot?.querySelector('#orden-fecha-vencimiento');

  if (!proximoInput || !fechaInput || modalMode === 'view') {
    return;
  }

  if (isManual) {
    proximoInput.removeAttribute('readonly');
    proximoInput.classList.remove('ordenes-input--locked');
    fechaInput.removeAttribute('readonly');
    fechaInput.classList.remove('ordenes-input--locked');
  } else {
    proximoInput.setAttribute('readonly', '');
    proximoInput.classList.add('ordenes-input--locked');
    fechaInput.setAttribute('readonly', '');
    fechaInput.classList.add('ordenes-input--locked');
  }
}

function applyIntervalPreset(preset) {
  const proximoInput = pageRoot?.querySelector('#orden-proximo-km');
  const fechaInput = pageRoot?.querySelector('#orden-fecha-vencimiento');

  if (!proximoInput || !fechaInput) {
    return;
  }

  const km = getKmActualValue();

  if (preset === INTERVAL_PRESET.KM_5000_6) {
    proximoInput.value = km + 5000;
    fechaInput.value = addMonthsIsoDate(6);
    setProximoFechaManualMode(false);
    return;
  }

  if (preset === INTERVAL_PRESET.KM_10000_12) {
    proximoInput.value = km + 10000;
    fechaInput.value = addMonthsIsoDate(12);
    setProximoFechaManualMode(false);
    return;
  }

  if (preset === INTERVAL_PRESET.PERSONALIZADO) {
    setProximoFechaManualMode(true);
    return;
  }

  proximoInput.value = '';
  fechaInput.value = '';
  setProximoFechaManualMode(false);
}

function updateIntervalFromKmChange() {
  const preset = pageRoot?.querySelector('#orden-intervalo-preset')?.value;

  if (preset === INTERVAL_PRESET.KM_5000_6 || preset === INTERVAL_PRESET.KM_10000_12) {
    applyIntervalPreset(preset);
  }
}

function getIntervaloForSave(preset, kmActual, proximoKm) {
  if (preset === INTERVAL_PRESET.KM_5000_6) {
    return 5000;
  }
  if (preset === INTERVAL_PRESET.KM_10000_12) {
    return 10000;
  }

  const km = parseInt(kmActual, 10);
  const prox = parseInt(proximoKm, 10);

  if (!Number.isNaN(km) && !Number.isNaN(prox) && prox > km) {
    return prox - km;
  }

  return null;
}

function syncIntervalPresetUI(orden = null) {
  const presetSelect = pageRoot?.querySelector('#orden-intervalo-preset');
  if (!presetSelect) {
    return;
  }

  const preset = orden ? detectIntervalPreset(orden) : presetSelect.value;
  presetSelect.value = preset;
  setProximoFechaManualMode(preset === INTERVAL_PRESET.PERSONALIZADO);
}

function updateVehiculoSelectedUI() {
  const wrap = pageRoot?.querySelector('#ordenes-vehiculo-selected-wrap');
  if (wrap) {
    wrap.innerHTML = renderSelectedVehiculoCard();
    wrap.querySelector('[data-action="clear-vehiculo"]')?.addEventListener('click', clearVehiculo);
  }

  const select = pageRoot?.querySelector('#orden-select-vehiculo');
  if (select) {
    select.innerHTML = renderVehiculoSelectOptions();
    if (selectedVehiculo) {
      select.value = String(selectedVehiculo.id);
    }
  }

  const kmInput = pageRoot?.querySelector('#orden-km-actual');
  if (kmInput && selectedVehiculo && !kmInput.value && selectedVehiculo.kilometraje != null) {
    kmInput.value = selectedVehiculo.kilometraje;
    updateIntervalFromKmChange();
  }
}

function clearVehiculo() {
  selectedVehiculo = null;
  updateVehiculoSelectedUI();
}

function renderVehiculoResults(vehiculos) {
  if (!vehiculos.length) {
    return '<div class="ordenes-search-results__empty">No se encontraron vehículos.</div>';
  }

  return vehiculos.map((v) => `
    <button type="button" class="ordenes-search-results__item" data-vehiculo-id="${v.id}">
      <span class="ordenes-search-results__codigo">${escapeHtml(v.placa)}</span>
      <span>${escapeHtml(v.clienteNombre)} — ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</span>
    </button>
  `).join('');
}

function selectVehiculoById(id) {
  selectedVehiculo = vehiculoSearchResults.find(
    (v) => Number(v.id) === Number(id)
  ) || null;

  if (!selectedVehiculo && id) {
    return;
  }

  updateVehiculoSelectedUI();
}

async function searchVehiculosUnified(term) {
  const resultsEl = pageRoot?.querySelector('#ordenes-buscar-results');
  if (!resultsEl) {
    return;
  }

  if (!term.trim()) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    vehiculoSearchResults = [];
    updateVehiculoSelectedUI();
    return;
  }

  vehiculoSearchResults = await window.api.searchVehiculosForOrden(term);
  resultsEl.innerHTML = renderVehiculoResults(vehiculoSearchResults);
  resultsEl.classList.remove('hidden');
  updateVehiculoSelectedUI();
}

function handleBuscarResultsClick(event) {
  const item = event.target.closest('[data-vehiculo-id]');
  if (!item) {
    return;
  }

  selectVehiculoById(Number(item.dataset.vehiculoId));
  pageRoot.querySelector('#orden-buscar').value = '';
  pageRoot.querySelector('#ordenes-buscar-results')?.classList.add('hidden');
}

async function loadOrdenes(search = '') {
  const tbody = pageRoot?.querySelector('#ordenes-table-body');
  if (!tbody) {
    return;
  }

  const ordenes = await window.api.listOrdenes(search);
  tbody.innerHTML = renderTableRows(ordenes);
}

function collectServicios(form) {
  const mainProximoKm = form.proximoKm?.value ?? null;

  return Array.from(form.querySelectorAll('input[name="servicios"]:checked')).map((el) => {
    const id = el.value;
    const kmInput = form.querySelector(`#servicio-km-${id}`);

    return {
      id,
      proximoKm: id === 'aceite_motor' ? mainProximoKm : (kmInput?.value ?? null)
    };
  });
}

function toggleServicioKmField(servicioId, checked) {
  const kmWrap = pageRoot?.querySelector(`[data-servicio-km-for="${servicioId}"]`);
  if (!kmWrap) {
    return;
  }

  kmWrap.classList.toggle('hidden', !checked);

  if (!checked) {
    const input = kmWrap.querySelector('input');
    if (input) {
      input.value = '';
    }
    delete selectedServiciosKm[servicioId];
  }
}

function handleServicioCheckChange(event) {
  const checkbox = event.target;
  if (checkbox.name !== 'servicios') {
    return;
  }

  const id = checkbox.value;

  if (checkbox.checked) {
    if (!selectedServicios.includes(id)) {
      selectedServicios.push(id);
    }
  } else {
    selectedServicios = selectedServicios.filter((s) => s !== id);
    delete selectedServiciosKm[id];
  }

  toggleServicioKmField(id, checkbox.checked);
}

function buildOrdenData(form, { finalize = false, numeroFactura = null } = {}) {
  const preset = form.intervaloPreset.value;

  const data = {
    vehiculoId: selectedVehiculo.id,
    fecha: editingId ? undefined : todayIsoDate(),
    kilometraje: form.kilometraje.value,
    intervalo: getIntervaloForSave(preset, form.kilometraje.value, form.proximoKm.value),
    proximoKm: form.proximoKm.value,
    fechaVencimiento: form.fechaVencimiento.value,
    estado: finalize ? 'Finalizada' : form.estado.value,
    observaciones: form.observaciones?.value || '',
    agendamientoId: currentAgendamientoId,
    servicios: collectServicios(form)
  };

  if (finalize && numeroFactura) {
    data.numeroFactura = numeroFactura;
  }

  return data;
}

function renderFacturaModal(existingFactura = '') {
  return `
    <div class="ordenes-factura-modal" id="ordenes-factura-modal" role="dialog" aria-modal="true" aria-labelledby="ordenes-factura-modal-title">
      <div class="ordenes-factura-modal__backdrop" data-action="close-factura-modal"></div>
      <div class="ordenes-factura-modal__dialog">
        <header class="ordenes-factura-modal__header">
          <h2 id="ordenes-factura-modal-title">Número de Factura</h2>
          <button type="button" class="ordenes-factura-modal__close" data-action="close-factura-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <div class="ordenes-factura-modal__body">
          <p class="ordenes-factura-modal__hint">Ingrese el número de factura para finalizar el servicio.</p>
          <div class="ordenes-form__field">
            <label for="orden-factura-input">Número de Factura <span class="ordenes-required">*</span></label>
            <input
              id="orden-factura-input"
              type="text"
              inputmode="numeric"
              placeholder="001-001-0000123"
              maxlength="15"
              autocomplete="off"
              value="${escapeHtml(existingFactura)}"
            />
            <span class="ordenes-factura-modal__format">Formato: XXX-XXX-XXXXXXX</span>
          </div>
          <p class="ordenes-form__error" id="orden-factura-error" role="alert"></p>
        </div>

        <footer class="ordenes-factura-modal__footer">
          <button type="button" class="btn-ghost" data-action="close-factura-modal">Cancelar</button>
          <button type="button" class="btn-primary" id="ordenes-factura-confirm">Confirmar y finalizar</button>
        </footer>
      </div>
    </div>
  `;
}

function closeFacturaModal() {
  pageRoot?.querySelector('#ordenes-factura-modal')?.remove();
}

function renderFinalizeSuccessModal() {
  return `
    <div class="ordenes-success-modal" id="ordenes-success-modal" role="dialog" aria-modal="true" aria-labelledby="ordenes-success-modal-title">
      <div class="ordenes-success-modal__backdrop" data-action="close-success-modal"></div>
      <div class="ordenes-success-modal__dialog">
        <div class="ordenes-success-modal__body">
          <div class="ordenes-success-modal__icon" aria-hidden="true">✓</div>
          <h2 class="ordenes-success-modal__title" id="ordenes-success-modal-title">Orden finalizada correctamente</h2>
          <div class="ordenes-success-modal__actions">
            <button type="button" class="btn-primary" data-action="success-view-pdf">Ver PDF</button>
            <button type="button" class="ordenes-btn-whatsapp" data-action="success-send-whatsapp">Enviar WhatsApp</button>
            <button type="button" class="btn-ghost" data-action="close-success-modal">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function closeFinalizeSuccessModal() {
  pageRoot?.querySelector('#ordenes-success-modal')?.remove();
}

function openFinalizeSuccessModal(ordenId) {
  closeFinalizeSuccessModal();
  pageRoot.insertAdjacentHTML('beforeend', renderFinalizeSuccessModal());
  bindFinalizeSuccessModalEvents(ordenId);
}

function bindFinalizeSuccessModalEvents(ordenId) {
  pageRoot?.querySelectorAll('[data-action="close-success-modal"]').forEach((el) => {
    el.addEventListener('click', closeFinalizeSuccessModal);
  });

  pageRoot?.querySelector('[data-action="success-view-pdf"]')?.addEventListener('click', async () => {
    try {
      await exportOrdenDocumentPdf(ordenId);
    } catch (error) {
      window.alert(error.message || 'No se pudo exportar el PDF.');
    }
  });

  pageRoot?.querySelector('[data-action="success-send-whatsapp"]')?.addEventListener('click', async () => {
    const btn = pageRoot?.querySelector('[data-action="success-send-whatsapp"]');

    if (btn) {
      btn.disabled = true;
    }

    try {
      const orden = await window.api.getOrden(ordenId);

      if (!orden) {
        window.alert('Orden no encontrada.');
        return;
      }

      const [empresa, cliente] = await Promise.all([
        window.api.getEmpresa(),
        window.api.getCliente(orden.clienteId)
      ]);

      const phone = cliente?.whatsapp || cliente?.telefono;
      const serviciosLabels = (orden.servicios || []).map((id) =>
        resolveServicioLabel(id, SERVICIOS_CATALOGO)
      );
      const message = buildOrdenWhatsAppMessage({ empresa, cliente, orden, serviciosLabels });
      const url = buildWhatsAppUrl(phone, message);

      if (!url) {
        window.alert('El cliente no tiene WhatsApp ni teléfono registrado.');
        return;
      }

      const result = await window.api.openExternal(url);

      if (!result.ok) {
        window.alert(result.error || 'No se pudo abrir WhatsApp.');
      }
    } catch (error) {
      window.alert(error.message || 'No se pudo abrir WhatsApp.');
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  });
}

function bindFacturaModalEvents() {
  pageRoot?.querySelectorAll('[data-action="close-factura-modal"]').forEach((el) => {
    el.addEventListener('click', closeFacturaModal);
  });

  const input = pageRoot?.querySelector('#orden-factura-input');
  input?.addEventListener('input', (event) => {
    const formatted = formatFacturaInput(event.target.value);
    event.target.value = formatted;
    pageRoot.querySelector('#orden-factura-error').textContent = '';
  });

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmFacturaAndFinalize();
    }
  });

  pageRoot?.querySelector('#ordenes-factura-confirm')?.addEventListener('click', confirmFacturaAndFinalize);
  input?.focus();
}

function openFacturaModal() {
  closeFacturaModal();
  const existingFactura = currentOrden?.numeroFactura || '';
  pageRoot.insertAdjacentHTML('beforeend', renderFacturaModal(existingFactura));
  bindFacturaModalEvents();
}

function confirmFacturaAndFinalize() {
  const input = pageRoot?.querySelector('#orden-factura-input');
  const errorBox = pageRoot?.querySelector('#orden-factura-error');

  if (!input || !errorBox) {
    return;
  }

  const factura = input.value.trim();

  if (!factura) {
    errorBox.textContent = 'Ingrese el número de factura.';
    input.focus();
    return;
  }

  if (!isValidFactura(factura)) {
    errorBox.textContent = 'Formato inválido. Use XXX-XXX-XXXXXXX (ej: 001-001-0000123).';
    input.focus();
    return;
  }

  closeFacturaModal();
  saveOrdenData({ finalize: true, numeroFactura: factura });
}

function requestFinalize() {
  const form = pageRoot?.querySelector('#ordenes-form');
  const errorBox = pageRoot?.querySelector('#ordenes-form-error');

  if (!form || !errorBox) {
    return;
  }

  errorBox.textContent = '';

  if (!selectedVehiculo) {
    errorBox.textContent = 'Seleccione un vehículo.';
    return;
  }

  openFacturaModal();
}

async function saveOrdenData({ finalize = false, numeroFactura = null } = {}) {
  const form = pageRoot?.querySelector('#ordenes-form');
  const errorBox = pageRoot?.querySelector('#ordenes-form-error');
  const submitBtn = pageRoot?.querySelector('#ordenes-form-submit');
  const finalizarBtn = pageRoot?.querySelector('#ordenes-form-finalizar');

  if (!form || !errorBox) {
    return;
  }

  errorBox.textContent = '';

  if (!selectedVehiculo) {
    errorBox.textContent = 'Seleccione un vehículo.';
    return;
  }

  const data = buildOrdenData(form, { finalize, numeroFactura });
  const wasEdit = Boolean(editingId);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';
  }
  if (finalizarBtn) {
    finalizarBtn.disabled = true;
  }

  try {
    const result = editingId
      ? await window.api.updateOrden(editingId, data)
      : await window.api.createOrden(data);

    if (!result.ok) {
      errorBox.textContent = result.error || 'No se pudo guardar la orden.';
      return;
    }

    closeModal();
    const search = pageRoot.querySelector('#ordenes-search')?.value || '';
    await loadOrdenes(search);

    if (finalize) {
      openFinalizeSuccessModal(result.orden.id);
    } else {
      showToast(wasEdit ? 'Orden actualizada correctamente.' : 'Orden creada correctamente.');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Guardar';
    }
    if (finalizarBtn) {
      finalizarBtn.disabled = false;
    }
  }
}

function bindViewDocumentActions() {
  pageRoot.querySelector('[data-action="export-pdf-orden"]')?.addEventListener('click', async () => {
    if (!editingId) {
      return;
    }

    try {
      const result = await exportOrdenDocumentPdf(editingId);
      if (result.ok) {
        showToast('PDF exportado correctamente.');
      }
    } catch (error) {
      window.alert(error.message || 'No se pudo exportar el PDF.');
    }
  });
}

function bindFormEvents(form) {
  pageRoot.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  if (modalMode === 'view') {
    bindViewDocumentActions();
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveOrdenData({ finalize: false });
  });

  pageRoot.querySelector('#ordenes-form-finalizar')?.addEventListener('click', requestFinalize);

  form.addEventListener('change', handleServicioCheckChange);

  pageRoot.querySelector('#orden-buscar')?.addEventListener('input', (e) => {
    clearTimeout(vehiculoSearchTimeout);
    vehiculoSearchTimeout = setTimeout(() => searchVehiculosUnified(e.target.value), 250);
  });

  pageRoot.querySelector('#ordenes-buscar-results')?.addEventListener('click', handleBuscarResultsClick);

  pageRoot.querySelector('#orden-select-vehiculo')?.addEventListener('change', (e) => {
    selectVehiculoById(Number(e.target.value));
  });

  pageRoot.querySelector('#orden-km-actual')?.addEventListener('input', updateIntervalFromKmChange);

  pageRoot.querySelector('#orden-intervalo-preset')?.addEventListener('change', (e) => {
    applyIntervalPreset(e.target.value);
  });
}

function openModal(orden = null, mode = 'create') {
  closeFinalizeSuccessModal();
  editingId = orden?.id ?? null;
  modalMode = mode;
  currentOrden = orden;

  selectedVehiculo = orden
    ? {
        id: orden.vehiculoId,
        clienteId: orden.clienteId,
        clienteNombre: orden.clienteNombre,
        clienteCodigo: orden.clienteCodigo,
        placa: orden.vehiculoPlaca,
        marca: orden.vehiculoMarca,
        modelo: orden.vehiculoModelo,
        kilometraje: orden.kilometraje
      }
    : (currentAgendamiento ? selectedVehiculo : null);

  selectedServicios = orden?.servicios ? [...orden.servicios] : [];
  selectedServiciosKm = orden?.serviciosKm ? { ...orden.serviciosKm } : {};
  vehiculoSearchResults = selectedVehiculo ? [selectedVehiculo] : [];

  pageRoot.querySelector('#ordenes-modal')?.remove();
  pageRoot.insertAdjacentHTML('beforeend', renderFormModal());

  const form = pageRoot.querySelector('#ordenes-form');

  if (orden) {
    form.kilometraje.value = orden.kilometraje ?? '';
    form.proximoKm.value = orden.proximoKm ?? '';
    form.fechaVencimiento.value = orden.fechaVencimiento || '';
    form.estado.value = orden.estado || 'Abierta';
    if (form.observaciones) form.observaciones.value = orden.observaciones || '';
  } else if (currentAgendamiento && form.observaciones) {
    form.observaciones.value = currentAgendamiento.observaciones || '';
  }

  updateVehiculoSelectedUI();
  bindFormEvents(form);
  syncIntervalPresetUI(orden);

  if (modalMode === 'view') {
    setProximoFechaManualMode(false);
    pageRoot.querySelector('#orden-proximo-km')?.setAttribute('readonly', '');
    pageRoot.querySelector('#orden-fecha-vencimiento')?.setAttribute('readonly', '');
  }

  pageRoot.querySelector('#orden-buscar')?.focus();
}

function closeModal() {
  clearTimeout(vehiculoSearchTimeout);
  closeFacturaModal();
  editingId = null;
  modalMode = 'create';
  currentOrden = null;
  currentAgendamientoId = null;
  currentAgendamiento = null;
  selectedVehiculo = null;
  vehiculoSearchResults = [];
  selectedServicios = [];
  selectedServiciosKm = {};
  pageRoot?.querySelector('#ordenes-modal')?.remove();
}

async function handleOpen(id) {
  const orden = await window.api.getOrden(id);
  if (orden) {
    openModal(orden, 'view');
  }
}

async function handleEdit(id) {
  const orden = await window.api.getOrden(id);
  if (orden) {
    openModal(orden, 'edit');
  }
}

async function handleDelete(id) {
  if (!hasPermission(currentUser, PERMISSIONS.ELIMINAR_ORDEN)) {
    window.alert('No autorizado.');
    return;
  }

  const orden = await window.api.getOrden(id);
  if (!orden) {
    return;
  }

  const confirmed = window.confirm(
    `¿Eliminar la orden "${orden.numeroOs}"?\n\nEsta acción no se puede deshacer.`
  );

  if (!confirmed) {
    return;
  }

  const result = await window.api.deleteOrden(id);

  if (!result.ok) {
    window.alert(result.error || 'No se pudo eliminar la orden.');
    return;
  }

  const search = pageRoot.querySelector('#ordenes-search')?.value || '';
  await loadOrdenes(search);
  showToast('Orden eliminada correctamente.');
}

function handleTableClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn || !pageRoot?.contains(btn)) {
    return;
  }

  const { action, id } = btn.dataset;
  if (action === 'open' && id) {
    handleOpen(Number(id));
  } else if (action === 'edit' && id) {
    handleEdit(Number(id));
  } else if (action === 'delete' && id) {
    handleDelete(Number(id));
  }
}

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadOrdenes(event.target.value), 300);
}

export async function mountOrdenesPage(container, options = {}) {
  pageRoot = container;
  currentUser = await window.api.getCurrentUser();
  container.innerHTML = renderPageHtml();

  container.querySelector('#ordenes-btn-new').addEventListener('click', () => openModal());
  container.querySelector('#ordenes-search').addEventListener('input', handleSearchInput);
  container.addEventListener('click', handleTableClick);

  await loadOrdenes();

  if (options.agendamientoId) {
    currentAgendamientoId = Number(options.agendamientoId);
    currentAgendamiento = await window.api.getAgendamiento(currentAgendamientoId);

    if (currentAgendamiento?.orden_id) {
      const existing = await window.api.getOrden(currentAgendamiento.orden_id);
      if (existing) { openModal(existing, existing.estado === 'Finalizada' ? 'view' : 'edit'); return; }
    }

    if (currentAgendamiento?.vehiculo_id) {
      const items = await window.api.listVehiculosByCliente(currentAgendamiento.cliente_id);
      selectedVehiculo = items.find((v) => v.id === currentAgendamiento.vehiculo_id) || null;
      if (selectedVehiculo) {
        selectedVehiculo.clienteNombre = currentAgendamiento.clienteNombre;
        selectedVehiculo.clienteCodigo = selectedVehiculo.clienteCodigo || '';
        vehiculoSearchResults = [selectedVehiculo];
      }
    }

    openModal();
    const searchInput = pageRoot.querySelector('#orden-buscar');
    if (!currentAgendamiento?.vehiculo_id && searchInput) {
      searchInput.value = currentAgendamiento?.clienteNombre || '';
      await searchVehiculosUnified(searchInput.value);
    }
  }
}

export function unmountOrdenesPage() {
  clearTimeout(searchTimeout);
  clearTimeout(vehiculoSearchTimeout);
  searchTimeout = null;
  vehiculoSearchTimeout = null;
  editingId = null;
  modalMode = 'create';
  selectedVehiculo = null;
  vehiculoSearchResults = [];
  selectedServicios = [];
  selectedServiciosKm = {};
  currentOrden = null;
  currentAgendamientoId = null;
  currentAgendamiento = null;
  currentUser = null;
  pageRoot = null;
}
