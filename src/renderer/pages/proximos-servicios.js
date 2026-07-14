import { escapeHtml } from '../utils/dom.js';

let pageRoot = null;
let searchTimeout = null;

const ESTADO_CLASS = {
  'En plazo': 'done',
  Próximo: 'progress',
  Vencido: 'waiting'
};

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

function formatVehiculo(item) {
  const marcaModelo = [item.vehiculoMarca, item.vehiculoModelo].filter(Boolean).join(' ');
  return marcaModelo || '—';
}

function getFilters() {
  return {
    search: pageRoot?.querySelector('#proximos-search')?.value || '',
    estado: pageRoot?.querySelector('#proximos-estado')?.value || 'Todos'
  };
}

function renderTableRows(items) {
  if (!items.length) {
    return `
      <tr>
        <td class="dashboard-table__empty" colspan="9">No hay próximos servicios registrados.</td>
      </tr>
    `;
  }

  return items.map((item) => {
    const estadoClass = ESTADO_CLASS[item.estado] || 'open';

    return `
      <tr data-id="${escapeHtml(item.id)}" data-orden-id="${item.ordenId}">
        <td>${escapeHtml(item.clienteNombre)}</td>
        <td>${escapeHtml(formatVehiculo(item))}</td>
        <td><span class="proximos-chapa">${escapeHtml(item.vehiculoPlaca || '—')}</span></td>
        <td>${escapeHtml(item.servicioLabel)}</td>
        <td>${formatKilometraje(item.ultimoKm)}</td>
        <td><span class="proximos-km">${formatKilometraje(item.proximoKm)}</span></td>
        <td>${formatFecha(item.fechaVencimiento)}</td>
        <td>
          <span class="dashboard-badge dashboard-badge--${estadoClass}">
            ${escapeHtml(item.estado)}
          </span>
        </td>
        <td>
          <div class="proximos-actions">
            <button type="button" class="proximos-action-btn proximos-action-btn--view" data-action="view" data-orden-id="${item.ordenId}" data-servicio-id="${escapeHtml(item.servicioId)}" title="Ver detalle">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
              Ver detalle
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDetailModal(item, orden) {
  const estadoClass = ESTADO_CLASS[item.estado] || 'open';

  return `
    <div class="proximos-modal" id="proximos-modal" role="dialog" aria-modal="true" aria-labelledby="proximos-modal-title">
      <div class="proximos-modal__backdrop" data-action="close-modal"></div>
      <div class="proximos-modal__dialog">
        <header class="proximos-modal__header">
          <h2 id="proximos-modal-title">Detalle — ${escapeHtml(item.servicioLabel)}</h2>
          <button type="button" class="proximos-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <div class="proximos-detail">
          <div class="proximos-detail__grid">
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Cliente</span>
              <span class="proximos-detail__value">${escapeHtml(item.clienteNombre)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Chapa</span>
              <span class="proximos-detail__value proximos-chapa">${escapeHtml(item.vehiculoPlaca || '—')}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Vehículo</span>
              <span class="proximos-detail__value">${escapeHtml(formatVehiculo(item))}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Servicio</span>
              <span class="proximos-detail__value">${escapeHtml(item.servicioLabel)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Último KM</span>
              <span class="proximos-detail__value">${formatKilometraje(item.ultimoKm)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Próximo KM</span>
              <span class="proximos-detail__value proximos-km">${formatKilometraje(item.proximoKm)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">KM actual del vehículo</span>
              <span class="proximos-detail__value">${formatKilometraje(item.vehiculoKmActual)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Fecha de vencimiento</span>
              <span class="proximos-detail__value">${formatFecha(item.fechaVencimiento)}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Estado</span>
              <span class="proximos-detail__value">
                <span class="dashboard-badge dashboard-badge--${estadoClass}">${escapeHtml(item.estado)}</span>
              </span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Nº OS</span>
              <span class="proximos-detail__value proximos-os">${escapeHtml(item.numeroOs || orden?.numeroOs || '—')}</span>
            </div>
            <div class="proximos-detail__field">
              <span class="proximos-detail__label">Nº Factura</span>
              <span class="proximos-detail__value">${escapeHtml(orden?.numeroFactura || '—')}</span>
            </div>
          </div>
        </div>

        <footer class="proximos-modal__footer">
          <button type="button" class="btn-primary" data-action="close-modal">Cerrar</button>
        </footer>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="proximos-page">
      <div class="proximos-toolbar">
        <div class="proximos-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="search" id="proximos-search" placeholder="Buscar por cliente, chapa, vehículo o servicio..." autocomplete="off" />
        </div>

        <div class="proximos-filter">
          <label for="proximos-estado">Estado</label>
          <select id="proximos-estado">
            <option value="Todos">Todos</option>
            <option value="Próximo">Próximo</option>
            <option value="Vencido">Vencido</option>
            <option value="En plazo">En plazo</option>
          </select>
        </div>
      </div>

      <section class="proximos-panel dashboard-panel">
        <div class="proximos-panel__body dashboard-panel__body">
          <table class="dashboard-table proximos-table">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Chapa</th>
                <th scope="col">Servicio</th>
                <th scope="col">Último KM</th>
                <th scope="col">Próximo KM</th>
                <th scope="col">Fecha de vencimiento</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="proximos-table-body">
              <tr><td class="dashboard-table__empty" colspan="9">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function closeModal() {
  pageRoot?.querySelector('#proximos-modal')?.remove();
}

function bindModalEvents() {
  pageRoot?.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });
}

async function loadProximosServicios() {
  const tbody = pageRoot?.querySelector('#proximos-table-body');
  if (!tbody) {
    return;
  }

  const result = await window.api.listProximosServicios(getFilters());
  tbody.innerHTML = renderTableRows(result.items || []);
}

function handleFilterChange() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadProximosServicios(), 300);
}

async function handleView(ordenId, servicioId) {
  const result = await window.api.listProximosServicios(getFilters());
  const item = (result.items || []).find(
    (row) => row.ordenId === ordenId && row.servicioId === servicioId
  );

  if (!item) {
    window.alert('No se pudo cargar el detalle del servicio.');
    return;
  }

  const orden = await window.api.getOrden(ordenId);

  pageRoot.querySelector('#proximos-modal')?.remove();
  pageRoot.insertAdjacentHTML('beforeend', renderDetailModal(item, orden));
  bindModalEvents();
}

function handleTableClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn || !pageRoot?.contains(btn)) {
    return;
  }

  const { action, ordenId, servicioId } = btn.dataset;
  if (action === 'view' && ordenId && servicioId) {
    handleView(Number(ordenId), servicioId);
  }
}

export async function mountProximosServiciosPage(container) {
  pageRoot = container;
  container.innerHTML = renderPageHtml();

  container.querySelector('#proximos-search').addEventListener('input', handleFilterChange);
  container.querySelector('#proximos-estado').addEventListener('change', handleFilterChange);
  container.addEventListener('click', handleTableClick);

  await loadProximosServicios();
}

export function unmountProximosServiciosPage() {
  clearTimeout(searchTimeout);
  searchTimeout = null;
  closeModal();
  pageRoot = null;
}
