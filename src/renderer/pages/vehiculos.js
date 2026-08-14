import { escapeHtml } from '../utils/dom.js';
import { openVehiculoQrViewer } from '../utils/vehiculos-qr-viewer.js';
import { openVehiculoEtiquetaViewer } from '../utils/vehiculos-etiqueta-viewer.js';

let pageRoot = null;
let searchTimeout = null;
let clienteSearchTimeout = null;
let editingId = null;
let selectedCliente = null;
let clienteSearchResults = [];

function formatKilometraje(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return new Intl.NumberFormat('es-PY').format(value) + ' km';
}

function formatAnio(value) {
  return value ?? '—';
}

function renderTableRows(vehiculos) {
  if (!vehiculos.length) {
    return `
      <tr>
        <td class="dashboard-table__empty" colspan="9">No hay vehículos registrados.</td>
      </tr>
    `;
  }

  return vehiculos.map((v) => `
    <tr data-id="${v.id}">
      <td><span class="vehiculos-codigo">${escapeHtml(v.codigo)}</span></td>
      <td>${escapeHtml(v.clienteNombre)}</td>
      <td><span class="vehiculos-placa">${escapeHtml(v.placa)}</span></td>
      <td>${escapeHtml(v.marca || '—')}</td>
      <td>${escapeHtml(v.modelo || '—')}</td>
      <td>${formatAnio(v.anio)}</td>
      <td>${escapeHtml(v.motor || '—')}</td>
      <td>${formatKilometraje(v.kilometraje)}</td>
      <td>
        <div class="vehiculos-actions">
          <button type="button" class="vehiculos-action-btn vehiculos-action-btn--edit" data-action="edit" data-id="${v.id}" title="Editar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Editar
          </button>
          <button type="button" class="vehiculos-action-btn vehiculos-action-btn--delete" data-action="delete" data-id="${v.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderClienteSelected() {
  if (!selectedCliente) {
    return `
      <div class="vehiculos-cliente-selected vehiculos-cliente-selected--empty" id="vehiculos-cliente-selected">
        Ningún cliente seleccionado
      </div>
    `;
  }

  return `
    <div class="vehiculos-cliente-selected" id="vehiculos-cliente-selected">
      <span class="vehiculos-cliente-selected__codigo">${escapeHtml(selectedCliente.codigo)}</span>
      <span class="vehiculos-cliente-selected__nombre">${escapeHtml(selectedCliente.nombre)}</span>
      <button type="button" class="vehiculos-cliente-selected__clear" data-action="clear-cliente" title="Quitar cliente">×</button>
    </div>
  `;
}

function renderFormModal(vehiculo = null) {
  const isEdit = Boolean(vehiculo?.id);

  return `
    <div class="vehiculos-modal" id="vehiculos-modal" role="dialog" aria-modal="true" aria-labelledby="vehiculos-modal-title">
      <div class="vehiculos-modal__backdrop" data-action="close-modal"></div>
      <div class="vehiculos-modal__dialog">
        <header class="vehiculos-modal__header">
          <h2 id="vehiculos-modal-title">${isEdit ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h2>
          <button type="button" class="vehiculos-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <form class="vehiculos-form" id="vehiculos-form" novalidate>
          <div class="vehiculos-form__grid">
            <div class="vehiculos-form__field vehiculos-form__field--full vehiculos-form__field--cliente">
              <label for="vehiculo-buscar-cliente">Buscar Cliente</label>
              <div class="vehiculos-cliente-search">
                <input
                  id="vehiculo-buscar-cliente"
                  type="search"
                  placeholder="Escriba el nombre del cliente..."
                  autocomplete="off"
                />
                <div class="vehiculos-cliente-results hidden" id="vehiculos-cliente-results"></div>
              </div>
            </div>

            <div class="vehiculos-form__field vehiculos-form__field--full">
              <label>Cliente seleccionado</label>
              ${renderClienteSelected()}
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-placa">Placa <span class="vehiculos-required">*</span></label>
              <input id="vehiculo-placa" name="placa" type="text" placeholder="Ej: ABC 123" required />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-marca">Marca</label>
              <input id="vehiculo-marca" name="marca" type="text" placeholder="Ej: Toyota" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-modelo">Modelo</label>
              <input id="vehiculo-modelo" name="modelo" type="text" placeholder="Ej: Hilux" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-anio">Año</label>
              <input id="vehiculo-anio" name="anio" type="number" min="1900" max="2100" placeholder="2020" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-color">Color</label>
              <input id="vehiculo-color" name="color" type="text" placeholder="Ej: Blanco" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-motor">Motor</label>
              <input id="vehiculo-motor" name="motor" type="text" placeholder="Ej: 2.8 Diesel" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-combustible">Combustible</label>
              <select id="vehiculo-combustible" name="combustible">
                <option value="">— Seleccionar —</option>
                <option value="Nafta">Nafta</option>
                <option value="Diésel">Diésel</option>
                <option value="GNV">GNV</option>
                <option value="Eléctrico">Eléctrico</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Flex">Flex</option>
              </select>
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-chasis">Chasis</label>
              <input id="vehiculo-chasis" name="chasis" type="text" placeholder="Número de chasis" />
            </div>

            <div class="vehiculos-form__field">
              <label for="vehiculo-kilometraje">Kilometraje actual</label>
              <input id="vehiculo-kilometraje" name="kilometraje" type="number" min="0" placeholder="0" />
            </div>

            <div class="vehiculos-form__field vehiculos-form__field--full">
              <label for="vehiculo-observaciones">Observaciones</label>
              <textarea id="vehiculo-observaciones" name="observaciones" rows="3" placeholder="Notas adicionales"></textarea>
            </div>
          </div>

          <p class="vehiculos-form__error" id="vehiculos-form-error" role="alert"></p>

          <footer class="vehiculos-form__footer">
            ${isEdit ? `
              <div class="vehiculos-form__etiqueta-actions">
                <button type="button" class="btn-ghost" data-action="view-qr-modal" data-id="${vehiculo.id}">
                  Visualizar QR
                </button>
                <button type="button" class="btn-ghost" data-action="view-etiqueta-modal" data-id="${vehiculo.id}">
                  Visualizar Etiqueta
                </button>
                <button type="button" class="btn-ghost" data-action="download-etiqueta-modal" data-id="${vehiculo.id}">
                  Baixar PDF
                </button>
                <button type="button" class="btn-ghost" data-action="print-etiqueta-modal" data-id="${vehiculo.id}">
                  Imprimir
                </button>
              </div>
            ` : ''}
            <button type="button" class="btn-ghost" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn-primary" id="vehiculos-form-submit">Guardar</button>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="vehiculos-page">
      <div class="vehiculos-toolbar">
        <button type="button" class="btn-primary vehiculos-btn-new" id="vehiculos-btn-new">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Nuevo Vehículo
        </button>

        <div class="vehiculos-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input
            type="search"
            id="vehiculos-search"
            placeholder="Buscar por placa o cliente..."
            autocomplete="off"
          />
        </div>
      </div>

      <section class="vehiculos-panel dashboard-panel">
        <div class="vehiculos-panel__body dashboard-panel__body">
          <table class="dashboard-table vehiculos-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Cliente</th>
                <th scope="col">Placa</th>
                <th scope="col">Marca</th>
                <th scope="col">Modelo</th>
                <th scope="col">Año</th>
                <th scope="col">Motor</th>
                <th scope="col">Kilometraje</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="vehiculos-table-body">
              <tr><td class="dashboard-table__empty" colspan="9">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function updateClienteSelectedUI() {
  const el = pageRoot?.querySelector('#vehiculos-cliente-selected');
  if (!el) {
    return;
  }

  if (!selectedCliente) {
    el.className = 'vehiculos-cliente-selected vehiculos-cliente-selected--empty';
    el.innerHTML = 'Ningún cliente seleccionado';
    return;
  }

  el.className = 'vehiculos-cliente-selected';
  el.innerHTML = `
    <span class="vehiculos-cliente-selected__codigo">${escapeHtml(selectedCliente.codigo)}</span>
    <span class="vehiculos-cliente-selected__nombre">${escapeHtml(selectedCliente.nombre)}</span>
    <button type="button" class="vehiculos-cliente-selected__clear" data-action="clear-cliente" title="Quitar cliente">×</button>
  `;

  el.querySelector('[data-action="clear-cliente"]')?.addEventListener('click', () => {
    selectedCliente = null;
    updateClienteSelectedUI();
  });
}

function renderClienteResults(clientes) {
  if (!clientes.length) {
    return '<div class="vehiculos-cliente-results__empty">No se encontraron clientes.</div>';
  }

  return clientes.map((c) => `
    <button type="button" class="vehiculos-cliente-results__item" data-cliente-id="${c.id}">
      <span class="vehiculos-cliente-results__codigo">${escapeHtml(c.codigo)}</span>
      <span>${escapeHtml(c.nombre)}</span>
    </button>
  `).join('');
}

async function searchClientes(term) {
  const resultsEl = pageRoot?.querySelector('#vehiculos-cliente-results');
  if (!resultsEl) {
    return;
  }

  if (!term.trim()) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    return;
  }

  const clientes = await window.api.listClientes(term);
  clienteSearchResults = clientes;
  resultsEl.innerHTML = renderClienteResults(clientes);
  resultsEl.classList.remove('hidden');
}

function handleClienteResultsClick(event) {
  const item = event.target.closest('[data-cliente-id]');
  if (!item) {
    return;
  }

  selectedCliente = clienteSearchResults.find(
    (c) => Number(c.id) === Number(item.dataset.clienteId)
  ) || null;
  if (!selectedCliente) {
    return;
  }

  const searchInput = pageRoot.querySelector('#vehiculo-buscar-cliente');
  const resultsEl = pageRoot.querySelector('#vehiculos-cliente-results');

  if (searchInput) {
    searchInput.value = '';
  }
  if (resultsEl) {
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
  }

  updateClienteSelectedUI();
}

async function loadVehiculos(search = '') {
  const tbody = pageRoot?.querySelector('#vehiculos-table-body');
  if (!tbody) {
    return;
  }

  if (typeof window.api.listVehiculos !== 'function') {
    tbody.innerHTML = `
      <tr>
        <td class="dashboard-table__empty" colspan="9">Reinicie la aplicación para cargar el módulo de vehículos.</td>
      </tr>
    `;
    return;
  }

  const vehiculos = await window.api.listVehiculos(search);
  tbody.innerHTML = renderTableRows(vehiculos);
}

async function handleDownloadEtiqueta(vehiculoId, triggerBtn = null) {
  if (!vehiculoId) {
    window.alert('Vehículo no identificado.');
    return;
  }

  if (typeof window.api?.downloadVehiculoEtiqueta !== 'function') {
    window.alert('Descarga de PDF no disponible. Reinicie la aplicación.');
    return;
  }

  const originalLabel = triggerBtn?.textContent || '';

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Guardando...';
  }

  try {
    const result = await window.api.downloadVehiculoEtiqueta(vehiculoId);

    if (result?.canceled) {
      return;
    }

    if (!result?.ok) {
      window.alert(result?.error || 'No se pudo guardar el PDF.');
    }
  } catch (error) {
    window.alert(error.message || 'No se pudo guardar el PDF.');
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalLabel || 'Baixar PDF';
    }
  }
}

async function handlePrintEtiqueta(vehiculoId, triggerBtn = null) {
  if (!vehiculoId) {
    window.alert('Vehículo no identificado.');
    return;
  }

  if (typeof window.api?.printVehiculoEtiqueta !== 'function') {
    window.alert('Función de impresión no disponible. Reinicie la aplicación.');
    return;
  }

  const originalLabel = triggerBtn?.textContent || '';

  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Generando PDF...';
  }

  try {
    const result = await window.api.printVehiculoEtiqueta(vehiculoId);

    if (!result?.ok) {
      window.alert(result?.error || 'No se pudo generar la etiqueta PDF.');
    }
  } catch (error) {
    window.alert(error.message || 'No se pudo generar la etiqueta PDF.');
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalLabel || 'Imprimir';
    }
  }
}

function closeModal() {
  clearTimeout(clienteSearchTimeout);
  editingId = null;
  selectedCliente = null;
  pageRoot?.querySelector('#vehiculos-modal')?.remove();
}

function openModal(vehiculo = null) {
  editingId = vehiculo?.id ?? null;
  selectedCliente = vehiculo
    ? { id: vehiculo.clienteId, codigo: vehiculo.clienteCodigo, nombre: vehiculo.clienteNombre }
    : null;

  pageRoot.querySelector('#vehiculos-modal')?.remove();
  pageRoot.insertAdjacentHTML('beforeend', renderFormModal(vehiculo));

  const modal = pageRoot.querySelector('#vehiculos-modal');
  const form = pageRoot.querySelector('#vehiculos-form');
  const clienteSearch = pageRoot.querySelector('#vehiculo-buscar-cliente');
  const resultsEl = pageRoot.querySelector('#vehiculos-cliente-results');

  if (vehiculo) {
    form.placa.value = vehiculo.placa || '';
    form.marca.value = vehiculo.marca || '';
    form.modelo.value = vehiculo.modelo || '';
    form.anio.value = vehiculo.anio ?? '';
    form.color.value = vehiculo.color || '';
    form.motor.value = vehiculo.motor || '';
    form.combustible.value = vehiculo.combustible || '';
    form.chasis.value = vehiculo.chasis || '';
    form.kilometraje.value = vehiculo.kilometraje ?? '';
    form.observaciones.value = vehiculo.observaciones || '';
  }

  modal.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  modal.querySelector('[data-action="view-qr-modal"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    openVehiculoQrViewer(Number(btn.dataset.id), {
      onPrint: (vehiculoId) => handlePrintEtiqueta(vehiculoId)
    });
  });

  modal.querySelector('[data-action="view-etiqueta-modal"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    openVehiculoEtiquetaViewer(Number(btn.dataset.id), {
      onPrint: (vehiculoId) => handlePrintEtiqueta(vehiculoId),
      onDownload: (vehiculoId) => handleDownloadEtiqueta(vehiculoId)
    });
  });

  modal.querySelector('[data-action="download-etiqueta-modal"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    handleDownloadEtiqueta(Number(btn.dataset.id), btn);
  });

  modal.querySelector('[data-action="print-etiqueta-modal"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.currentTarget;
    handlePrintEtiqueta(Number(btn.dataset.id), btn);
  });

  form.addEventListener('submit', handleFormSubmit);

  clienteSearch.addEventListener('input', (event) => {
    clearTimeout(clienteSearchTimeout);
    clienteSearchTimeout = setTimeout(() => searchClientes(event.target.value), 250);
  });

  resultsEl.addEventListener('click', handleClienteResultsClick);

  updateClienteSelectedUI();
  form.placa.focus();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const errorBox = pageRoot.querySelector('#vehiculos-form-error');
  const submitBtn = pageRoot.querySelector('#vehiculos-form-submit');

  errorBox.textContent = '';

  if (!selectedCliente) {
    errorBox.textContent = 'Seleccione un cliente.';
    return;
  }

  const data = {
    clienteId: selectedCliente.id,
    placa: form.placa.value,
    marca: form.marca.value,
    modelo: form.modelo.value,
    anio: form.anio.value,
    color: form.color.value,
    motor: form.motor.value,
    combustible: form.combustible.value,
    chasis: form.chasis.value,
    kilometraje: form.kilometraje.value,
    observaciones: form.observaciones.value
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const result = editingId
      ? await window.api.updateVehiculo(editingId, data)
      : await window.api.createVehiculo(data);

    if (!result.ok) {
      errorBox.textContent = result.error || 'No se pudo guardar el vehículo.';
      return;
    }

    closeModal();
    const search = pageRoot.querySelector('#vehiculos-search')?.value || '';
    await loadVehiculos(search);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }
}

async function handleEdit(id) {
  const vehiculo = await window.api.getVehiculo(id);
  if (vehiculo) {
    openModal(vehiculo);
  }
}

async function handleDelete(id) {
  const vehiculo = await window.api.getVehiculo(id);
  if (!vehiculo) {
    return;
  }

  const confirmed = window.confirm(
    `¿Eliminar el vehículo "${vehiculo.placa}" (${vehiculo.codigo})?\n\nEsta acción no se puede deshacer.`
  );

  if (!confirmed) {
    return;
  }

  const result = await window.api.deleteVehiculo(id);

  if (!result.ok) {
    window.alert(result.error || 'No se pudo eliminar el vehículo.');
    return;
  }

  const search = pageRoot.querySelector('#vehiculos-search')?.value || '';
  await loadVehiculos(search);
}

function handleTableClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn || !pageRoot?.contains(btn)) {
    return;
  }

  const { action, id } = btn.dataset;
  if (action === 'edit' && id) {
    handleEdit(Number(id));
  } else if (action === 'delete' && id) {
    handleDelete(Number(id));
  }
}

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadVehiculos(event.target.value), 300);
}

export async function mountVehiculosPage(container) {
  pageRoot = container;
  container.innerHTML = renderPageHtml();

  container.querySelector('#vehiculos-btn-new').addEventListener('click', () => openModal());
  container.querySelector('#vehiculos-search').addEventListener('input', handleSearchInput);
  container.addEventListener('click', handleTableClick);

  await loadVehiculos();
}

export function unmountVehiculosPage() {
  clearTimeout(searchTimeout);
  clearTimeout(clienteSearchTimeout);
  searchTimeout = null;
  clienteSearchTimeout = null;
  editingId = null;
  selectedCliente = null;
  clienteSearchResults = [];
  pageRoot = null;
}
