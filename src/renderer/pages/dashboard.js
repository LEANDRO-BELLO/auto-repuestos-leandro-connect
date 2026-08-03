import { escapeHtml } from '../utils/dom.js';

let root = null;

function fmtDate(value) {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function vehicle(item) {
  return [item.vehiculoMarca || item.marca, item.vehiculoModelo || item.modelo].filter(Boolean).join(' ') || item.vehiculo_descripcion || 'Vehículo sin registrar';
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('595') ? digits : `595${digits.replace(/^0+/, '')}`;
}

function appointmentsRows(items) {
  if (!items.length) return '<tr><td colspan="5" class="dashboard-table__empty">No hay agendamientos pendientes.</td></tr>';
  return items.map((item) => `
    <tr>
      <td><strong>${fmtDate(item.fecha)}</strong><br><span class="dashboard-muted">${escapeHtml(item.hora)}</span></td>
      <td>${escapeHtml(item.clienteNombre)}</td>
      <td>${escapeHtml(vehicle(item))}<br><span class="dashboard-muted">${escapeHtml(item.placa || (item.vehiculo_id ? '' : 'Sin cadastro'))}</span></td>
      <td><span class="dashboard-status dashboard-status--pending">${escapeHtml(item.estado)}</span></td>
      <td><button class="dashboard-action" data-action="start-ot" data-id="${item.id}">Iniciar OT</button></td>
    </tr>`).join('');
}

function servicesRows(items) {
  if (!items.length) return '<tr><td colspan="6" class="dashboard-table__empty">No hay servicios vencidos ni próximos en los siguientes 15 días.</td></tr>';
  return items.map((item) => `
    <tr class="dashboard-service-row dashboard-service-row--${item.estado === 'Vencido' ? 'overdue' : 'soon'}">
      <td>${escapeHtml(item.clienteNombre)}</td>
      <td>${escapeHtml(vehicle(item))}<br><span class="dashboard-muted">${escapeHtml(item.vehiculoPlaca)}</span></td>
      <td>${escapeHtml(item.servicioLabel)}</td>
      <td>${item.fechaVencimiento ? fmtDate(item.fechaVencimiento) : `${new Intl.NumberFormat('es-PY').format(item.proximoKm || 0)} km`}</td>
      <td><span class="dashboard-status dashboard-status--${item.estado === 'Vencido' ? 'overdue' : 'soon'}">${escapeHtml(item.estado)}</span></td>
      <td>
        <button class="dashboard-whatsapp" data-action="whatsapp" data-id="${escapeHtml(item.id)}"
          data-phone="${escapeHtml(item.clienteWhatsapp || '')}"
          data-client="${escapeHtml(item.clienteNombre)}"
          data-vehicle="${escapeHtml(vehicle(item))}"
          data-plate="${escapeHtml(item.vehiculoPlaca)}"
          data-service="${escapeHtml(item.servicioLabel)}"
          data-due="${escapeHtml(item.fechaVencimiento ? fmtDate(item.fechaVencimiento) : `${item.proximoKm || ''} km`)}"
          title="Abrir WhatsApp" aria-label="Abrir WhatsApp">WhatsApp</button>
      </td>
    </tr>`).join('');
}

function template() {
  return `
    <div class="dashboard-home">
      <section class="dashboard-panel dashboard-home__panel">
        <header class="dashboard-panel__header"><h2 class="dashboard-panel__title">Agendamientos</h2></header>
        <div class="dashboard-panel__body">
          <table class="dashboard-table"><thead><tr><th>Fecha / Hora</th><th>Cliente</th><th>Vehículo</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody id="dashboard-appointments"><tr><td colspan="5" class="dashboard-table__empty">Cargando...</td></tr></tbody></table>
        </div>
      </section>
      <section class="dashboard-panel dashboard-home__panel">
        <header class="dashboard-panel__header"><h2 class="dashboard-panel__title">Servicios vencidos y próximos (15 días)</h2></header>
        <div class="dashboard-panel__body">
          <table class="dashboard-table"><thead><tr><th>Cliente</th><th>Vehículo / Chapa</th><th>Servicio</th><th>Vencimiento</th><th>Estado</th><th>Contacto</th></tr></thead>
          <tbody id="dashboard-services"><tr><td colspan="6" class="dashboard-table__empty">Cargando...</td></tr></tbody></table>
        </div>
      </section>
    </div>`;
}

async function load() {
  const data = await window.api.getDashboard();
  root.querySelector('#dashboard-appointments').innerHTML = appointmentsRows(data.agendamientos || []);
  root.querySelector('#dashboard-services').innerHTML = servicesRows(data.servicios || []);
}

async function onClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'start-ot') {
    window.dispatchEvent(new CustomEvent('arl:navigate', { detail: { page: 'ordenes', agendamientoId: Number(button.dataset.id) } }));
    return;
  }
  if (button.dataset.action === 'whatsapp') {
    const phone = normalizePhone(button.dataset.phone);
    if (!phone) {
      alert('Este cliente no tiene un número de WhatsApp registrado.');
      return;
    }
    const message = `Hola ${button.dataset.client}, le recordamos que el servicio ${button.dataset.service} de su vehículo ${button.dataset.vehicle} (${button.dataset.plate}) está vencido o próximo a vencer: ${button.dataset.due}. Auto Repuestos Leandro S.A.`;
    const opened = await window.api.openExternal(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    if (opened?.ok) {
      await window.api.marcarServicioAvisado(button.dataset.id);
      button.closest('tr')?.remove();
      const tbody = root.querySelector('#dashboard-services');
      if (!tbody.querySelector('tr')) tbody.innerHTML = servicesRows([]);
    }
  }
}

export async function mountDashboardPage(container) {
  root = container;
  root.innerHTML = template();
  root.addEventListener('click', onClick);
  await load();
}

export function unmountDashboardPage() {
  if (root) root.removeEventListener('click', onClick);
  root = null;
}
