import { escapeHtml } from '../utils/dom.js';

let root = null;
let editingId = null;
let clientes = [];
let vehiculos = [];

function fmtDate(value) {
  if (!value) return 'â€”';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function rows(items) {
  if (!items.length) return '<tr><td colspan="6" class="dashboard-table__empty">No hay agendamientos registrados.</td></tr>';
  return items.map((a) => {
    const pending = a.estado === 'Pendiente';
    return `<tr>
      <td><strong>${fmtDate(a.fecha)}</strong><br>${escapeHtml(a.hora)}</td>
      <td>${escapeHtml(a.clienteNombre || a.cliente_nombre || "")}<br><span class="dashboard-muted">${a.cliente_id ? "" : "Sin cadastro"}</span></td>
      <td>${escapeHtml(a.vehiculo_id ? ([a.marca, a.modelo].filter(Boolean).join(' ') || 'â€”') : (a.vehiculo_descripcion || 'VehÃ­culo sin registrar'))}<br><span class="dashboard-muted">${escapeHtml(a.vehiculo_id ? (a.placa || '') : 'Sin cadastro')}</span></td>
      <td>${escapeHtml(a.observaciones || 'â€”')}</td>
      <td><span class="agenda-badge agenda-badge--${a.estado.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(a.estado)}</span></td>
      <td><div class="agenda-actions">
        ${pending ? `<button data-action="reschedule" data-id="${a.id}">Remarcar</button><button data-action="start" data-id="${a.id}">Iniciar OT</button><button data-action="cancel" data-id="${a.id}">Cancelar</button>` : ''}
        <button data-action="delete" data-id="${a.id}" class="agenda-delete">Eliminar</button>
      </div></td>
    </tr>`;
  }).join('');
}

function modal(a = null) {
  const tipoRapido = !a?.cliente_id;

  return `
    <div class="agenda-modal" id="agenda-modal">
      <div
        class="agenda-modal__backdrop"
        data-action="close"
      ></div>

      <div class="agenda-modal__dialog">
        <header>
          <h2>
            ${a ? 'Remarcar Agendamiento' : 'Nuevo Agendamiento'}
          </h2>

          <button type="button" data-action="close">Ã—</button>
        </header>

        <form id="agenda-form">
          <div class="agenda-grid">
            <label class="agenda-full">
              Tipo de agendamiento

              <div style="display:flex; gap:24px; margin-top:8px;">
                <span>
                  <input
                    type="radio"
                    name="tipoAgendamiento"
                    value="rapido"
                    ${tipoRapido ? 'checked' : ''}
                  >
                  Agendamiento rÃ¡pido
                </span>

                <span>
                  <input
                    type="radio"
                    name="tipoAgendamiento"
                    value="cadastrado"
                    ${tipoRapido ? '' : 'checked'}
                  >
                  Cliente cadastrado
                </span>
              </div>
            </label>

            <div
              id="agenda-campos-rapido"
              class="agenda-full"
              style="${tipoRapido ? '' : 'display:none'}"
            >
              <div class="agenda-grid">
                <label>
                  Nombre del cliente
                  <input
                    type="text"
                    name="clienteNombre"
                    value="${escapeHtml(a?.cliente_nombre || '')}"
                  >
                </label>

                <label>
                  TelÃ©fono / WhatsApp
                  <input
                    type="text"
                    name="clienteTelefono"
                    value="${escapeHtml(a?.cliente_telefono || '')}"
                  >
                </label>

                <label class="agenda-full">
                  VehÃ­culo
                  <input
                    type="text"
                    name="vehiculoDescripcion"
                    value="${escapeHtml(a?.vehiculo_descripcion || '')}"
                    placeholder="Ej.: Toyota Hilux, chapa pendiente"
                  >
                </label>
              </div>
            </div>

            <div
              id="agenda-campos-cadastrado"
              class="agenda-full"
              style="${tipoRapido ? 'display:none' : ''}"
            >
              <div class="agenda-grid">
                <label>
                  Cliente
                  <select
                    name="clienteId"
                    id="agenda-cliente"
                  >
                    <option value="">Seleccionar...</option>

                    ${clientes
                      .map(
                        (c) => `
                          <option
                            value="${c.id}"
                            ${a?.cliente_id === c.id ? 'selected' : ''}
                          >
                            ${escapeHtml(c.nombre)}
                          </option>
                        `
                      )
                      .join('')}
                  </select>
                </label>

                <label>
                  VehÃ­culo
                  <select
                    name="vehiculoId"
                    id="agenda-vehiculo"
                  >
                    <option value="">Seleccionar cliente...</option>
                  </select>
                </label>
              </div>
            </div>

            <label>
              Fecha
              <input
                type="date"
                name="fecha"
                value="${escapeHtml(a?.fecha || '')}"
                required
              >
            </label>

            <label>
              Hora
              <input
                type="time"
                name="hora"
                value="${escapeHtml(a?.hora || '')}"
                required
              >
            </label>

            <label class="agenda-full">
              Observaciones
              <textarea name="observaciones" rows="3">${escapeHtml(
                a?.observaciones || ''
              )}</textarea>
            </label>
          </div>

          <p id="agenda-error" class="agenda-error"></p>

          <footer>
            <button type="button" data-action="close">
              Cancelar
            </button>

            <button type="submit" class="btn-primary">
              Guardar
            </button>
          </footer>
        </form>
      </div>
    </div>
  `;
}

async function load(search = '') {
  const items = await window.api.listAgendamientos({ search });
  root.querySelector('#agenda-body').innerHTML = rows(items);
}

async function loadVehicles(clienteId, selectedId = null) {
  vehiculos = clienteId ? await window.api.listVehiculosByCliente(Number(clienteId)) : [];
  const select = root.querySelector('#agenda-vehiculo');
  if (!select) return;
  select.innerHTML = '<option value="">Seleccionar...</option>' + vehiculos.map(v => `<option value="${v.id}" ${Number(selectedId) === v.id ? 'selected' : ''}>${escapeHtml([v.marca, v.modelo, v.placa].filter(Boolean).join(' â€” '))}</option>`).join('');
}

async function open(a = null) {
  editingId = a?.id || null;
  clientes = await window.api.listClientes('');
  root.insertAdjacentHTML('beforeend', modal(a));
  if (a?.cliente_id) await loadVehicles(a.cliente_id, a.vehiculo_id);
  if (a && !a.vehiculo_id) {
    const select = root.querySelector('#agenda-vehiculo');
    if (select) select.disabled = true;
    const input = root.querySelector('#agenda-vehiculo-descripcion');
    if (input) input.required = true;
  }
}

function close() {
  root.querySelector('#agenda-modal')?.remove();
  editingId = null;
}

async function click(event) {
  const b = event.target.closest('[data-action]');
  if (!b) return;
  const id = Number(b.dataset.id);
  if (b.dataset.action === 'new') return open();
  if (b.dataset.action === 'close') return close();
  if (b.dataset.action === 'reschedule') return open(await window.api.getAgendamiento(id));
  if (b.dataset.action === 'cancel') { if (confirm('Â¿Cancelar este agendamiento?')) { await window.api.setEstadoAgendamiento(id, 'Cancelado'); await load(); } return; }
  if (b.dataset.action === 'delete') { if (confirm('Â¿Eliminar definitivamente este agendamiento?')) { await window.api.deleteAgendamiento(id); await load(); } return; }
  if (b.dataset.action === 'start') {
    window.dispatchEvent(new CustomEvent('arl:navigate', { detail: { page: 'ordenes', agendamientoId: id } }));
  }
}

async function change(event) {
  if (event.target.name === 'tipoAgendamiento') {
    const tipo = event.target.value;
  
    const rapido = root.querySelector('#agenda-campos-rapido');
    const cadastrado = root.querySelector('#agenda-campos-cadastrado');
  
    if (rapido) {
      rapido.style.display = tipo === 'rapido' ? '' : 'none';
    }
  
    if (cadastrado) {
      cadastrado.style.display =
        tipo === 'cadastrado' ? '' : 'none';
    }
  
    return;
  }
  if (event.target.id === 'agenda-cliente') await loadVehicles(event.target.value);
  if (event.target.id === 'agenda-sin-vehiculo') {
    const checked = event.target.checked;
    const select = root.querySelector('#agenda-vehiculo');
    const wrap = root.querySelector('#agenda-descripcion-wrap');
    const input = root.querySelector('#agenda-vehiculo-descripcion');
    if (select) { select.disabled = checked; if (checked) select.value = ''; }
    if (wrap) wrap.style.display = checked ? '' : 'none';
    if (input) input.required = checked;
  }
}

async function submit(event) {
  if (event.target.id !== 'agenda-form') {
    return;
  }

  event.preventDefault();

  const form = new FormData(event.target);
  const tipo = form.get('tipoAgendamiento') || 'rapido';

  const payload = {
    tipo,
    fecha: form.get('fecha'),
    hora: form.get('hora'),
    observaciones: form.get('observaciones') || ''
  };

  if (tipo === 'rapido') {
    payload.clienteId = null;
    payload.vehiculoId = null;
    payload.clienteNombre = String(
      form.get('clienteNombre') || ''
    ).trim();
    payload.clienteTelefono = String(
      form.get('clienteTelefono') || ''
    ).trim();
    payload.vehiculoDescripcion = String(
      form.get('vehiculoDescripcion') || ''
    ).trim();

    if (!payload.clienteNombre) {
      root.querySelector('#agenda-error').textContent =
        'Ingrese el nombre del cliente.';
      return;
    }

    if (!payload.vehiculoDescripcion) {
      root.querySelector('#agenda-error').textContent =
        'Ingrese la descripciÃ³n del vehÃ­culo.';
      return;
    }
  } else {
    payload.clienteId = form.get('clienteId');
    payload.vehiculoId = form.get('vehiculoId');
    payload.clienteNombre = '';
    payload.clienteTelefono = '';
    payload.vehiculoDescripcion = '';

    if (!payload.clienteId) {
      root.querySelector('#agenda-error').textContent =
        'Seleccione un cliente.';
      return;
    }

    if (!payload.vehiculoId) {
      root.querySelector('#agenda-error').textContent =
        'Seleccione un vehÃ­culo.';
      return;
    }
  }

  const result = editingId
    ? await window.api.updateAgendamiento(editingId, payload)
    : await window.api.createAgendamiento(payload);

  if (!result?.ok) {
    root.querySelector('#agenda-error').textContent =
      result?.error || 'No se pudo guardar.';
    return;
  }

  close();
  await load();
}

export async function mountAgendamientosPage(container) {
  root = container;
  root.innerHTML = `<div class="agenda-page"><div class="agenda-toolbar"><button class="btn-primary" data-action="new">Nuevo Agendamiento</button><input id="agenda-search" type="search" placeholder="Buscar cliente, vehÃ­culo o chapa..."></div>
  <section class="dashboard-panel"><div class="dashboard-panel__body"><table class="dashboard-table"><thead><tr><th>Fecha / Hora</th><th>Cliente</th><th>VehÃ­culo</th><th>Observaciones</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="agenda-body"></tbody></table></div></section></div>`;
  root.addEventListener('click', click); root.addEventListener('change', change); root.addEventListener('submit', submit);
  root.querySelector('#agenda-search').addEventListener('input', (e) => load(e.target.value));
  await load();
}

export function unmountAgendamientosPage() {
  if (root) { root.removeEventListener('click', click); root.removeEventListener('change', change); root.removeEventListener('submit', submit); }
  root = null;
}

