import { escapeHtml } from '../utils/dom.js';

let pageRoot = null;
let searchTimeout = null;
let editingId = null;

function formatUltimaVisita(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function renderTableRows(clientes) {
  if (!clientes.length) {
    return `
      <tr>
        <td class="dashboard-table__empty" colspan="8">No hay clientes registrados.</td>
      </tr>
    `;
  }

  return clientes.map((cliente) => `
    <tr data-id="${cliente.id}">
      <td><span class="clientes-codigo">${escapeHtml(cliente.codigo)}</span></td>
      <td>${escapeHtml(cliente.nombre)}</td>
      <td>${escapeHtml(cliente.documento || '—')}</td>
      <td>${escapeHtml(cliente.telefono || '—')}</td>
      <td>${escapeHtml(cliente.whatsapp || '—')}</td>
      <td>${escapeHtml(cliente.ciudad || '—')}</td>
      <td>${formatUltimaVisita(cliente.ultimaVisita)}</td>
      <td>
        <div class="clientes-actions">
          <button type="button" class="clientes-action-btn clientes-action-btn--edit" data-action="edit" data-id="${cliente.id}" title="Editar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Editar
          </button>
          <button type="button" class="clientes-action-btn clientes-action-btn--delete" data-action="delete" data-id="${cliente.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 14h10l1-14" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderFormModal(isEdit = false) {
  return `
    <div class="clientes-modal" id="clientes-modal" role="dialog" aria-modal="true" aria-labelledby="clientes-modal-title">
      <div class="clientes-modal__backdrop" data-action="close-modal"></div>
      <div class="clientes-modal__dialog">
        <header class="clientes-modal__header">
          <h2 id="clientes-modal-title">${isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
          <button type="button" class="clientes-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <form class="clientes-form" id="clientes-form" novalidate>
          <div class="clientes-form__grid">
            <div class="clientes-form__field clientes-form__field--full">
              <label for="cliente-nombre">Nombre <span class="clientes-required">*</span></label>
              <input id="cliente-nombre" name="nombre" type="text" placeholder="Nombre completo" required />
            </div>

            <div class="clientes-form__field">
              <label for="cliente-documento">Documento (CI/RUC)</label>
              <input id="cliente-documento" name="documento" type="text" placeholder="Ej: 4.567.890" />
            </div>

            <div class="clientes-form__field">
              <label for="cliente-telefono">Teléfono</label>
              <input id="cliente-telefono" name="telefono" type="tel" placeholder="+595 9XX XXX XXX" />
            </div>

            <div class="clientes-form__field">
              <label for="cliente-whatsapp">WhatsApp</label>
              <input id="cliente-whatsapp" name="whatsapp" type="tel" placeholder="+595 9XX XXX XXX" />
            </div>

            <div class="clientes-form__field">
              <label for="cliente-email">Correo electrónico</label>
              <input id="cliente-email" name="email" type="email" placeholder="correo@ejemplo.com" />
            </div>

            <div class="clientes-form__field clientes-form__field--full">
              <label for="cliente-direccion">Dirección</label>
              <input id="cliente-direccion" name="direccion" type="text" placeholder="Dirección completa" />
            </div>

            <div class="clientes-form__field">
              <label for="cliente-ciudad">Ciudad</label>
              <input id="cliente-ciudad" name="ciudad" type="text" placeholder="Ej: Katueté" />
            </div>

            <div class="clientes-form__field clientes-form__field--full">
              <label for="cliente-observaciones">Observaciones</label>
              <textarea id="cliente-observaciones" name="observaciones" rows="3" placeholder="Notas adicionales"></textarea>
            </div>
          </div>

          <p class="clientes-form__error" id="clientes-form-error" role="alert"></p>

          <footer class="clientes-form__footer">
            <button type="button" class="btn-ghost" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn-primary" id="clientes-form-submit">Guardar</button>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="clientes-page">
      <div class="clientes-toolbar">
        <button type="button" class="btn-primary clientes-btn-new" id="clientes-btn-new">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Nuevo Cliente
        </button>

        <div class="clientes-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input
            type="search"
            id="clientes-search"
            placeholder="Buscar cliente..."
            autocomplete="off"
          />
        </div>
      </div>

      <section class="clientes-panel dashboard-panel">
        <div class="clientes-panel__body dashboard-panel__body">
          <table class="dashboard-table clientes-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Nombre</th>
                <th scope="col">Documento</th>
                <th scope="col">Teléfono</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Ciudad</th>
                <th scope="col">Última visita</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="clientes-table-body">
              <tr><td class="dashboard-table__empty" colspan="8">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

async function loadClientes(search = '') {
  const tbody = pageRoot?.querySelector('#clientes-table-body');
  if (!tbody) {
    return;
  }

  const clientes = await window.api.listClientes(search);
  tbody.innerHTML = renderTableRows(clientes);
}

function openModal(cliente = null) {
  editingId = cliente?.id ?? null;
  const existing = pageRoot.querySelector('#clientes-modal');
  if (existing) {
    existing.remove();
  }

  pageRoot.insertAdjacentHTML('beforeend', renderFormModal(Boolean(cliente)));

  const modal = pageRoot.querySelector('#clientes-modal');
  const form = pageRoot.querySelector('#clientes-form');

  if (cliente) {
    form.nombre.value = cliente.nombre || '';
    form.documento.value = cliente.documento || '';
    form.telefono.value = cliente.telefono || '';
    form.whatsapp.value = cliente.whatsapp || '';
    form.email.value = cliente.email || '';
    form.direccion.value = cliente.direccion || '';
    form.ciudad.value = cliente.ciudad || '';
    form.observaciones.value = cliente.observaciones || '';
  }

  form.nombre.focus();

  modal.querySelectorAll('[data-action="close-modal"]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  form.addEventListener('submit', handleFormSubmit);
}

function closeModal() {
  editingId = null;
  pageRoot?.querySelector('#clientes-modal')?.remove();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const errorBox = pageRoot.querySelector('#clientes-form-error');
  const submitBtn = pageRoot.querySelector('#clientes-form-submit');

  errorBox.textContent = '';

  const data = {
    nombre: form.nombre.value,
    documento: form.documento.value,
    telefono: form.telefono.value,
    whatsapp: form.whatsapp.value,
    email: form.email.value,
    direccion: form.direccion.value,
    ciudad: form.ciudad.value,
    observaciones: form.observaciones.value
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const result = editingId
      ? await window.api.updateCliente(editingId, data)
      : await window.api.createCliente(data);

    if (!result.ok) {
      errorBox.textContent = result.error || 'No se pudo guardar el cliente.';
      return;
    }

    closeModal();
    const search = pageRoot.querySelector('#clientes-search')?.value || '';
    await loadClientes(search);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }
}

async function handleEdit(id) {
  const cliente = await window.api.getCliente(id);

  if (!cliente) {
    window.alert('Cliente no encontrado.');
    return;
  }

  openModal(cliente);
}

async function handleDelete(id) {
  const cliente = await window.api.getCliente(id);

  if (!cliente) {
    window.alert('Cliente no encontrado.');
    return;
  }

  const confirmed = window.confirm(
    `¿Eliminar al cliente "${cliente.nombre}" (${cliente.codigo})?\n\nEsta acción no se puede deshacer.`
  );

  if (!confirmed) {
    return;
  }

  const result = await window.api.deleteCliente(id);

  if (!result.ok) {
    window.alert(result.error || 'No se pudo eliminar el cliente.');
    return;
  }

  const search =
    pageRoot.querySelector('#clientes-search')?.value || '';

  await loadClientes(search);
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
  const term = event.target.value;
  searchTimeout = setTimeout(() => loadClientes(term), 300);
}

export async function mountClientesPage(container) {
  pageRoot = container;
  container.innerHTML = renderPageHtml();

  container.querySelector('#clientes-btn-new').addEventListener('click', () => openModal());
  container.querySelector('#clientes-search').addEventListener('input', handleSearchInput);
  container.addEventListener('click', handleTableClick);

  await loadClientes();
}

export function unmountClientesPage() {
  clearTimeout(searchTimeout);
  searchTimeout = null;
  editingId = null;
  pageRoot = null;
}
