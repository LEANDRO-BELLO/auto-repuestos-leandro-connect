import { escapeHtml } from '../utils/dom.js';
import { hasPermission, PERMISSIONS } from '../utils/permisos.js';
import {
  buildAvisoProximoWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone
} from '../utils/whatsapp-orden.js';

let pageRoot = null;
let searchTimeout = null;
let currentItems = [];
let canAvisarCliente = false;
const pendingRegistro = new Map();
const avisosEnCurso = new Set();

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

function formatFechaHora(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function avisoKey(item) {
  return `${item.vehiculoId}:${item.servicioId}`;
}

function daysUntilVencimiento(fechaVencimiento) {
  if (!fechaVencimiento) {
    return null;
  }

  const fecha = new Date(`${fechaVencimiento}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((fecha - today) / (1000 * 60 * 60 * 24));
}

function debeMostrarBotonAvisar(item) {
  if (!canAvisarCliente || !item) {
    return false;
  }

  if (item.estado === 'Vencido') {
    return true;
  }

  const days = daysUntilVencimiento(item.fechaVencimiento);
  return days !== null && days >= 0 && days <= 15;
}

function renderUltimoAviso(item) {
  if (!item.ultimoAviso?.avisadoEn) {
    return '';
  }

  const when = formatFechaHora(item.ultimoAviso.avisadoEn);
  const who = item.ultimoAviso.usuarioNombre || '';
  const meta = [when, who].filter(Boolean).join(' · ');

  return `
    <span class="proximos-aviso-status">
      <span class="proximos-aviso-badge">Avisado</span>
      ${meta ? `<span class="proximos-aviso-meta">${escapeHtml(meta)}</span>` : ''}
    </span>
  `;
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
            ${debeMostrarBotonAvisar(item) ? `
            <button type="button" class="proximos-action-btn proximos-action-btn--whatsapp" data-action="avisar" data-vehiculo-id="${item.vehiculoId}" data-servicio-id="${escapeHtml(item.servicioId)}" title="Avisar cliente">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 1.7c-3.2-1.7-5.8-4.3-7.5-7.5l1.7-2.2c.3-.3.4-.7.2-1C8.7 6.4 8.5 5.2 8.5 4c0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z" fill="currentColor"/></svg>
              Avisar cliente
            </button>
            ` : ''}
            ${renderUltimoAviso(item)}
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
  currentItems = result.items || [];
  tbody.innerHTML = renderTableRows(currentItems);
}

function buildAvisoPayload(item, telefonoUsado) {
  return {
    ordenId: item.ordenId,
    numeroOs: item.numeroOs,
    clienteId: item.clienteId,
    clienteNombre: item.clienteNombre,
    vehiculoId: item.vehiculoId,
    vehiculoPlaca: item.vehiculoPlaca,
    vehiculoMarca: item.vehiculoMarca,
    vehiculoModelo: item.vehiculoModelo,
    servicioId: item.servicioId,
    servicioLabel: item.servicioLabel,
    telefonoUsado
  };
}

async function registrarAvisoPendiente(item, payload) {
  const result = await window.api.registrarAvisoProximoServicio(payload);

  if (!result?.ok) {
    pendingRegistro.set(avisoKey(item), payload);
    window.alert(
      result?.error
        || 'WhatsApp se abrió, pero no se pudo registrar el aviso. Pulse de nuevo "Avisar cliente" para reintentar solo el registro.'
    );
    return false;
  }

  pendingRegistro.delete(avisoKey(item));
  await loadProximosServicios();
  return true;
}

async function handleAvisar(vehiculoId, servicioId, button) {
  if (!canAvisarCliente) {
    window.alert('No autorizado.');
    return;
  }

  const item = currentItems.find(
    (row) => Number(row.vehiculoId) === Number(vehiculoId) && row.servicioId === servicioId
  );

  if (!item) {
    window.alert('No se pudo cargar el servicio para avisar al cliente.');
    return;
  }

  const key = avisoKey(item);
  const pending = pendingRegistro.get(key);

  if (avisosEnCurso.has(key)) {
    return;
  }

  avisosEnCurso.add(key);

  if (button) {
    button.disabled = true;
  }

  try {
    if (pending) {
      await registrarAvisoPendiente(item, pending);
      return;
    }

    if (!debeMostrarBotonAvisar(item)) {
      window.alert('Este servicio aún no está en la ventana de aviso.');
      return;
    }

    const phone = item.clienteWhatsapp;
    const url = buildWhatsAppUrl(
      phone,
      buildAvisoProximoWhatsAppMessage({
        empresa: await window.api.getEmpresa(),
        item
      })
    );

    if (!url || !normalizeWhatsAppPhone(phone)) {
      window.alert('El cliente no tiene WhatsApp ni teléfono registrado.');
      return;
    }

    const opened = await window.api.openExternal(url);

    if (!opened?.ok) {
      window.alert(opened?.error || 'No se pudo abrir WhatsApp.');
      return;
    }

    await registrarAvisoPendiente(item, buildAvisoPayload(item, normalizeWhatsAppPhone(phone)));
  } catch (error) {
    window.alert(error.message || 'No se pudo avisar al cliente.');
  } finally {
    avisosEnCurso.delete(key);
    if (button) {
      button.disabled = false;
    }
  }
}

function handleFilterChange() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadProximosServicios(), 300);
}

function handleProximosInput(event) {
  if (event.target?.id === 'proximos-search') {
    handleFilterChange();
  }
}

function handleProximosChange(event) {
  if (event.target?.id === 'proximos-estado') {
    handleFilterChange();
  }
}

function bindPageListeners(container) {
  container.addEventListener('input', handleProximosInput);
  container.addEventListener('change', handleProximosChange);
  container.addEventListener('click', handleTableClick);
}

function unbindPageListeners(container) {
  if (!container) {
    return;
  }

  container.removeEventListener('input', handleProximosInput);
  container.removeEventListener('change', handleProximosChange);
  container.removeEventListener('click', handleTableClick);
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

  const { action, ordenId, servicioId, vehiculoId } = btn.dataset;
  if (action === 'view' && ordenId && servicioId) {
    handleView(Number(ordenId), servicioId);
    return;
  }

  if (action === 'avisar' && vehiculoId && servicioId) {
    handleAvisar(Number(vehiculoId), servicioId, btn);
  }
}

export async function mountProximosServiciosPage(container) {
  unbindPageListeners(pageRoot);
  pageRoot = container;
  const session = await window.api.getCurrentUser();
  canAvisarCliente = hasPermission(session, PERMISSIONS.AVISAR_CLIENTE);
  container.innerHTML = renderPageHtml();
  bindPageListeners(container);

  await loadProximosServicios();
}

export function unmountProximosServiciosPage() {
  clearTimeout(searchTimeout);
  searchTimeout = null;
  pendingRegistro.clear();
  avisosEnCurso.clear();
  currentItems = [];
  canAvisarCliente = false;
  closeModal();
  unbindPageListeners(pageRoot);
  pageRoot = null;
}
