import { escapeHtml } from '../utils/dom.js';
import { getProximaRevisionItems } from '../utils/proxima-revision.js';
import { exportServiciosDocumentPdf } from '../utils/orden-document-export.js';

let pageRoot = null;
let searchTimeout = null;
let hasFinalizadas = false;

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
  { id: 'fluido_radiador', label: 'Cambio de fluido de radiador' },
  { id: 'fluido_freno', label: 'Cambio de fluido de freno' },
  { id: 'engrase_crucetas', label: 'Engrase de crucetas' },
  { id: 'filtro_caja_automatica', label: 'Filtro caja automática' }
];

const LABEL_BY_ID = Object.fromEntries(SERVICIOS_CATALOGO.map((s) => [s.id, s.label]));

const ESTADO_CLASS = {
  Finalizada: 'done'
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

function formatVehiculo(o) {
  const marcaModelo = [o.vehiculoMarca, o.vehiculoModelo].filter(Boolean).join(' ');
  return marcaModelo || '—';
}

function formatServicios(labels) {
  if (!labels?.length) {
    return '—';
  }
  return labels.join(', ');
}

function getFilters() {
  return {
    search: pageRoot?.querySelector('#servicios-search')?.value || '',
    fechaDesde: pageRoot?.querySelector('#servicios-fecha-desde')?.value || '',
    fechaHasta: pageRoot?.querySelector('#servicios-fecha-hasta')?.value || ''
  };
}

function hasActiveFilters(filters) {
  return Boolean(filters.search || filters.fechaDesde || filters.fechaHasta);
}

function renderTableRows(items, filters) {
  if (!items.length) {
    const message = !hasFinalizadas
      ? 'No hay servicios realizados.'
      : hasActiveFilters(filters)
        ? 'No se encontraron resultados con los filtros aplicados.'
        : 'No hay servicios realizados.';

    return `
      <tr>
        <td class="dashboard-table__empty" colspan="10">${message}</td>
      </tr>
    `;
  }

  return items.map((o) => {
    const estadoClass = ESTADO_CLASS[o.estado] || 'done';
    const serviciosText = formatServicios(o.serviciosLabels);

    return `
      <tr data-id="${o.id}">
        <td>${formatFecha(o.fecha)}</td>
        <td>${escapeHtml(o.clienteNombre)}</td>
        <td>${escapeHtml(formatVehiculo(o))}</td>
        <td><span class="servicios-chapa">${escapeHtml(o.vehiculoPlaca || '—')}</span></td>
        <td>${formatKilometraje(o.kilometraje)}</td>
        <td class="servicios-cell-servicios" title="${escapeHtml(serviciosText)}">${escapeHtml(serviciosText)}</td>
        <td><span class="servicios-os">${escapeHtml(o.numeroOs)}</span></td>
        <td><span class="servicios-factura">${escapeHtml(o.numeroFactura || '—')}</span></td>
        <td>
          <span class="dashboard-badge dashboard-badge--${estadoClass}">
            ${escapeHtml(o.estado)}
          </span>
        </td>
        <td>
          <div class="servicios-actions">
            <button type="button" class="servicios-action-btn servicios-action-btn--view" data-action="view" data-id="${o.id}" title="Ver detalle">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
              Ver detalle
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderServiciosList(servicios, serviciosLabels) {
  if (!servicios?.length) {
    return '<p class="servicios-detail__empty">Sin servicios registrados.</p>';
  }

  return `
    <ul class="servicios-detail__list">
      ${servicios.map((id, index) => `
        <li>${escapeHtml(serviciosLabels?.[index] || id)}</li>
      `).join('')}
    </ul>
  `;
}

function servicioLabel(id) {
  return LABEL_BY_ID[id] || id;
}

function renderProximaRevisionList(orden) {
  const items = getProximaRevisionItems(orden, SERVICIOS_CATALOGO);

  if (!items.length) {
    return '<p class="servicios-detail__empty">Sin próximas revisiones registradas.</p>';
  }

  return `
    <ul class="servicios-detail__list servicios-detail__list--revision">
      ${items.map((item) => `
        <li>
          <span class="servicios-revision__label">${escapeHtml(item.label)}:</span>
          <span class="servicios-revision__km">${formatKilometraje(item.proximoKm)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderDetailModal(orden) {
  const labels = (orden.servicios || []).map(servicioLabel);

  return `
    <div class="servicios-modal" id="servicios-modal" role="dialog" aria-modal="true" aria-labelledby="servicios-modal-title">
      <div class="servicios-modal__backdrop" data-action="close-modal"></div>
      <div class="servicios-modal__dialog">
        <header class="servicios-modal__header">
          <h2 id="servicios-modal-title">Detalle — ${escapeHtml(orden.numeroOs)}</h2>
          <button type="button" class="servicios-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <div class="servicios-detail">
          <div class="servicios-detail__grid">
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Fecha</span>
              <span class="servicios-detail__value">${formatFecha(orden.fecha)}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Nº OS</span>
              <span class="servicios-detail__value servicios-os">${escapeHtml(orden.numeroOs)}</span>
            </div>
            <div class="servicios-detail__field servicios-detail__field--full">
              <span class="servicios-detail__label">Cliente</span>
              <span class="servicios-detail__value">${escapeHtml(orden.clienteNombre)} (${escapeHtml(orden.clienteCodigo || '—')})</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Chapa</span>
              <span class="servicios-detail__value servicios-chapa">${escapeHtml(orden.vehiculoPlaca || '—')}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Vehículo</span>
              <span class="servicios-detail__value">${escapeHtml(formatVehiculo(orden))}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Kilometraje</span>
              <span class="servicios-detail__value">${formatKilometraje(orden.kilometraje)}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Nº Factura</span>
              <span class="servicios-detail__value servicios-factura">${escapeHtml(orden.numeroFactura || '—')}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Estado</span>
              <span class="servicios-detail__value">
                <span class="dashboard-badge dashboard-badge--done">${escapeHtml(orden.estado)}</span>
              </span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Próximo KM</span>
              <span class="servicios-detail__value servicios-revision__km">${formatKilometraje(orden.proximoKm)}</span>
            </div>
            <div class="servicios-detail__field">
              <span class="servicios-detail__label">Fecha de vencimiento</span>
              <span class="servicios-detail__value">${formatFecha(orden.fechaVencimiento)}</span>
            </div>
            <div class="servicios-detail__field servicios-detail__field--full">
              <span class="servicios-detail__label">Servicios realizados</span>
              ${renderServiciosList(orden.servicios || [], labels)}
            </div>
            <div class="servicios-detail__field servicios-detail__field--full servicios-detail__field--print">
              <span class="servicios-detail__label">Próxima revisión</span>
              ${renderProximaRevisionList(orden)}
            </div>
            ${orden.observaciones ? `
              <div class="servicios-detail__field servicios-detail__field--full">
                <span class="servicios-detail__label">Observaciones</span>
                <span class="servicios-detail__value servicios-detail__obs">${escapeHtml(orden.observaciones)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <footer class="servicios-modal__footer">
          <button type="button" class="btn-ghost" data-action="close-modal">Cerrar</button>
          <div class="servicios-modal__footer-actions">
            <button type="button" class="btn-primary servicios-btn-pdf" data-action="export-pdf-orden" data-orden-id="${orden.id}">Exportar PDF</button>
          </div>
        </footer>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="servicios-page">
      <div class="servicios-toolbar">
        <div class="servicios-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="search" id="servicios-search" placeholder="Buscar por cliente, chapa, vehículo o servicio..." autocomplete="off" />
        </div>

        <div class="servicios-filters">
          <div class="servicios-filter">
            <label for="servicios-fecha-desde">Fecha desde</label>
            <input type="date" id="servicios-fecha-desde" />
          </div>
          <div class="servicios-filter">
            <label for="servicios-fecha-hasta">Fecha hasta</label>
            <input type="date" id="servicios-fecha-hasta" />
          </div>
          <button type="button" class="btn-ghost servicios-filter-clear" id="servicios-clear-filters">Limpiar</button>
        </div>
      </div>

      <section class="servicios-panel dashboard-panel">
        <div class="servicios-panel__body dashboard-panel__body">
          <table class="dashboard-table servicios-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Chapa</th>
                <th scope="col">KM</th>
                <th scope="col">Servicios realizados</th>
                <th scope="col">Nº OS</th>
                <th scope="col">Nº Factura</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="servicios-table-body">
              <tr><td class="dashboard-table__empty" colspan="10">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function closeModal() {
  pageRoot?.querySelector('#servicios-modal')?.remove();
}

function bindModalEvents(ordenId) {
  pageRoot?.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  pageRoot?.querySelector('[data-action="export-pdf-orden"]')?.addEventListener('click', async () => {
    try {
      const result = await exportServiciosDocumentPdf(ordenId);
      if (result.ok) {
        window.alert('PDF exportado correctamente.');
      }
    } catch (error) {
      window.alert(error.message || 'No se pudo exportar el PDF.');
    }
  });
}

async function loadServiciosRealizados() {
  const tbody = pageRoot?.querySelector('#servicios-table-body');
  if (!tbody) {
    return;
  }

  const filters = getFilters();
  const result = await window.api.listServiciosRealizados(filters);
  hasFinalizadas = (result.totalFinalizadas ?? 0) > 0;
  tbody.innerHTML = renderTableRows(result.items || [], filters);
}

function handleFilterChange() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadServiciosRealizados(), 300);
}

function clearFilters() {
  const search = pageRoot?.querySelector('#servicios-search');
  const desde = pageRoot?.querySelector('#servicios-fecha-desde');
  const hasta = pageRoot?.querySelector('#servicios-fecha-hasta');

  if (search) {
    search.value = '';
  }
  if (desde) {
    desde.value = '';
  }
  if (hasta) {
    hasta.value = '';
  }

  loadServiciosRealizados();
}

async function handleView(id) {
  const orden = await window.api.getOrden(id);

  if (!orden || orden.estado !== 'Finalizada') {
    window.alert('No se pudo cargar el detalle del servicio.');
    return;
  }

  pageRoot.querySelector('#servicios-modal')?.remove();
  pageRoot.insertAdjacentHTML('beforeend', renderDetailModal(orden));
  bindModalEvents(orden.id);
}

function handleTableClick(event) {
  const btn = event.target.closest('[data-action]');
  if (!btn || !pageRoot?.contains(btn)) {
    return;
  }

  const { action, id } = btn.dataset;
  if (action === 'view' && id) {
    handleView(Number(id));
  }
}

export async function mountServiciosRealizadosPage(container) {
  pageRoot = container;
  container.innerHTML = renderPageHtml();

  container.querySelector('#servicios-search').addEventListener('input', handleFilterChange);
  container.querySelector('#servicios-fecha-desde').addEventListener('change', handleFilterChange);
  container.querySelector('#servicios-fecha-hasta').addEventListener('change', handleFilterChange);
  container.querySelector('#servicios-clear-filters').addEventListener('click', clearFilters);
  container.addEventListener('click', handleTableClick);

  await loadServiciosRealizados();
}

export function unmountServiciosRealizadosPage() {
  clearTimeout(searchTimeout);
  searchTimeout = null;
  hasFinalizadas = false;
  closeModal();
  pageRoot = null;
}
