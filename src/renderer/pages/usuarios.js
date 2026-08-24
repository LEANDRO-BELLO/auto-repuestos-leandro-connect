import { escapeHtml } from '../utils/dom.js';

let pageRoot = null;
let searchTimeout = null;
let editingId = null;
let currentUserId = null;

function formatActivo(activo) {
  return Number(activo) === 1 ? 'Activo' : 'Inactivo';
}

function renderTableRows(usuarios) {
  if (!usuarios.length) {
    return `
      <tr>
        <td class="dashboard-table__empty" colspan="6">No hay usuarios registrados.</td>
      </tr>
    `;
  }

  return usuarios.map((item) => {
    const isSelf = Number(item.id) === Number(currentUserId);
    const isActive = Number(item.activo) === 1;
    const badgeClass = isActive ? 'done' : 'waiting';

    return `
      <tr data-id="${item.id}">
        <td>${escapeHtml(item.nombre)}</td>
        <td>${escapeHtml(item.usuario)}</td>
        <td>${escapeHtml(item.whatsapp || '—')}</td>
        <td>${escapeHtml(item.perfil)}</td>
        <td>
          <span class="dashboard-badge dashboard-badge--${badgeClass}">${formatActivo(item.activo)}</span>
        </td>
        <td>
          <div class="usuarios-actions">
            <button type="button" class="usuarios-action-btn usuarios-action-btn--edit" data-action="edit" data-id="${item.id}" title="Editar">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Editar
            </button>
            ${isSelf ? '' : `
              <button
                type="button"
                class="usuarios-action-btn ${isActive ? 'usuarios-action-btn--disable' : 'usuarios-action-btn--enable'}"
                data-action="toggle-activo"
                data-id="${item.id}"
                data-activo="${isActive ? '1' : '0'}"
                title="${isActive ? 'Desactivar' : 'Activar'}"
              >
                ${isActive ? 'Desactivar' : 'Activar'}
              </button>
            `}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderFormModal(isEdit = false) {
  return `
    <div class="usuarios-modal" id="usuarios-modal" role="dialog" aria-modal="true" aria-labelledby="usuarios-modal-title">
      <div class="usuarios-modal__backdrop" data-action="close-modal"></div>
      <div class="usuarios-modal__dialog">
        <header class="usuarios-modal__header">
          <h2 id="usuarios-modal-title">${isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          <button type="button" class="usuarios-modal__close" data-action="close-modal" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </header>

        <form class="usuarios-form" id="usuarios-form" novalidate>
          <div class="usuarios-form__grid">
            <div class="usuarios-form__field usuarios-form__field--full">
              <label for="usuario-nombre">Nombre <span class="usuarios-required">*</span></label>
              <input id="usuario-nombre" name="nombre" type="text" placeholder="Nombre completo" required />
            </div>
            <div class="usuarios-form__field">
              <label for="usuario-usuario">Usuario <span class="usuarios-required">*</span></label>
              <input id="usuario-usuario" name="usuario" type="text" placeholder="nombre.acceso" autocomplete="off" required />
            </div>
            <div class="usuarios-form__field">
              <label for="usuario-whatsapp">WhatsApp <span class="usuarios-required">*</span></label>
              <input id="usuario-whatsapp" name="whatsapp" type="tel" placeholder="+595 981 123456" required />
            </div>
            <div class="usuarios-form__field">
              <label for="usuario-perfil">Rol <span class="usuarios-required">*</span></label>
              <select id="usuario-perfil" name="perfil" required>
                <option value="Usuario">Usuario</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
            <div class="usuarios-form__field">
              <label for="usuario-activo">Estado</label>
              <select id="usuario-activo" name="activo">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
            <div class="usuarios-form__field usuarios-form__field--full">
              <label for="usuario-password">Contraseña ${isEdit ? '' : '<span class="usuarios-required">*</span>'}</label>
              <input id="usuario-password" name="password" type="password" autocomplete="new-password" placeholder="${isEdit ? 'Dejar vacío para mantener la actual' : 'Mínimo 4 caracteres'}" ${isEdit ? '' : 'required'} />
            </div>
          </div>

          <p class="usuarios-form__error" id="usuarios-form-error" role="alert"></p>

          <footer class="usuarios-form__footer">
            <button type="button" class="btn-ghost" data-action="close-modal">Cancelar</button>
            <button type="submit" class="btn-primary" id="usuarios-form-submit">Guardar</button>
          </footer>
        </form>
      </div>
    </div>
  `;
}

function renderPageHtml() {
  return `
    <div class="usuarios-page">
      <div class="usuarios-toolbar">
        <button type="button" class="btn-primary usuarios-btn-new" id="usuarios-btn-new">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Nuevo Usuario
        </button>
        <div class="usuarios-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input type="search" id="usuarios-search" placeholder="Buscar usuario..." autocomplete="off" />
        </div>
      </div>

      <section class="usuarios-panel dashboard-panel">
        <div class="usuarios-panel__body dashboard-panel__body">
          <table class="dashboard-table usuarios-table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Usuario</th>
                <th scope="col">WhatsApp</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody id="usuarios-table-body">
              <tr><td class="dashboard-table__empty" colspan="6">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

async function loadUsuarios(search = '') {
  const tbody = pageRoot?.querySelector('#usuarios-table-body');
  if (!tbody) {
    return;
  }

  try {
    const usuarios = await window.api.listUsuarios(search);
    tbody.innerHTML = renderTableRows(usuarios);
  } catch (error) {
    console.error('No se pudieron cargar los usuarios:', error);
    tbody.innerHTML = '<tr><td class="dashboard-table__empty" colspan="6">No se pudieron cargar los usuarios.</td></tr>';
  }
}

function openModal(usuario = null) {
  editingId = usuario?.id ?? null;
  pageRoot.querySelector('#usuarios-modal')?.remove();
  pageRoot.insertAdjacentHTML('beforeend', renderFormModal(Boolean(usuario)));

  const modal = pageRoot.querySelector('#usuarios-modal');
  const form = pageRoot.querySelector('#usuarios-form');

  if (usuario) {
    form.nombre.value = usuario.nombre || '';
    form.usuario.value = usuario.usuario || '';
    form.whatsapp.value = usuario.whatsapp || '';
    form.perfil.value = usuario.perfil || 'Usuario';
    form.activo.value = Number(usuario.activo) === 1 ? '1' : '0';
  }

  form.nombre.focus();
  modal.querySelectorAll('[data-action="close-modal"]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });
  form.addEventListener('submit', handleFormSubmit);
}

function closeModal() {
  editingId = null;
  pageRoot?.querySelector('#usuarios-modal')?.remove();
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const errorBox = pageRoot.querySelector('#usuarios-form-error');
  const submitBtn = pageRoot.querySelector('#usuarios-form-submit');

  errorBox.textContent = '';
  const data = {
    nombre: form.nombre.value,
    usuario: form.usuario.value,
    whatsapp: form.whatsapp.value,
    perfil: form.perfil.value,
    activo: Number(form.activo.value),
    password: form.password.value
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  try {
    const result = editingId
      ? await window.api.updateUsuario(editingId, data)
      : await window.api.createUsuario(data);

    if (!result.ok) {
      errorBox.textContent = result.error || 'No se pudo guardar el usuario.';
      return;
    }

    closeModal();
    const search = pageRoot.querySelector('#usuarios-search')?.value || '';
    await loadUsuarios(search);
  } catch (error) {
    console.error('No se pudo guardar el usuario:', error);
    errorBox.textContent = 'No se pudo guardar el usuario.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar';
  }
}

async function handleEdit(id) {
  try {
    const usuario = await window.api.getUsuario(id);
    if (!usuario) {
      window.alert('Usuario no encontrado.');
      return;
    }
    openModal(usuario);
  } catch (error) {
    console.error('No se pudo abrir el usuario:', error);
    window.alert('No se pudo abrir el usuario.');
  }
}

async function handleToggleActivo(id, activoActual) {
  const nextActivo = Number(activoActual) === 1 ? 0 : 1;
  const accion = nextActivo === 1 ? 'activar' : 'desactivar';

  const confirmed = window.confirm(`¿Desea ${accion} este usuario?`);
  if (!confirmed) {
    return;
  }

  try {
    const result = await window.api.setUsuarioActivo(id, nextActivo);
    if (!result.ok) {
      window.alert(result.error || 'No se pudo cambiar el estado del usuario.');
      return;
    }

    const search = pageRoot.querySelector('#usuarios-search')?.value || '';
    await loadUsuarios(search);
  } catch (error) {
    console.error('No se pudo cambiar el estado del usuario:', error);
    window.alert('No se pudo cambiar el estado del usuario.');
  }
}

function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button || !pageRoot?.contains(button)) {
    return;
  }

  const { action, id, activo } = button.dataset;
  if (action === 'edit' && id) {
    handleEdit(Number(id));
  } else if (action === 'toggle-activo' && id) {
    handleToggleActivo(Number(id), activo);
  }
}

function handleSearchInput(event) {
  clearTimeout(searchTimeout);
  const term = event.target.value;
  searchTimeout = setTimeout(() => loadUsuarios(term), 300);
}

export async function mountUsuariosPage(container) {
  pageRoot = container;
  const session = await window.api.getCurrentUser();
  currentUserId = session?.id ?? null;
  container.innerHTML = renderPageHtml();
  container.querySelector('#usuarios-btn-new').addEventListener('click', () => openModal());
  container.querySelector('#usuarios-search').addEventListener('input', handleSearchInput);
  container.addEventListener('click', handleTableClick);
  await loadUsuarios();
}

export function unmountUsuariosPage() {
  clearTimeout(searchTimeout);
  searchTimeout = null;
  editingId = null;
  currentUserId = null;
  pageRoot = null;
}
