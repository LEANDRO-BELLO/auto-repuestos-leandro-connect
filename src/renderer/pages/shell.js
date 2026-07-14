import { escapeHtml } from '../utils/dom.js';
import { renderDashboardContent } from './dashboard.js';
import { mountClientesPage, unmountClientesPage } from './clientes.js';
import { mountVehiculosPage, unmountVehiculosPage } from './vehiculos.js';
import { mountOrdenesPage, unmountOrdenesPage } from './ordenes.js';
import { mountServiciosRealizadosPage, unmountServiciosRealizadosPage } from './servicios-realizados.js';
import { mountProximosServiciosPage, unmountProximosServiciosPage } from './proximos-servicios.js';
import { mountConfiguracionPage, unmountConfiguracionPage } from './configuracion.js';
import { abrirHistorialVehiculo } from './historial-vehiculo-qr.js';

const MENU_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car' },
  { id: 'ordenes', label: 'Órdenes de Trabajo', icon: 'clipboard' },
  { id: 'servicios', label: 'Servicios Realizados', icon: 'check' },
  { id: 'proximos', label: 'Próximos Servicios', icon: 'calendar' },
  { id: 'empresa', label: 'Empresa', icon: 'building' },
  { id: 'config', label: 'Configuración', icon: 'settings' }
];

const PAGE_HEADERS = {
  inicio: { title: 'Panel de Inicio', showDate: true },
  clientes: { title: 'Gestión de Clientes', showDate: false },
  vehiculos: { title: 'Gestión de Vehículos', showDate: false },
  ordenes: { title: 'Órdenes de Trabajo', showDate: false },
  servicios: { title: 'Servicios Realizados', showDate: false },
  proximos: { title: 'Próximos Servicios', showDate: false },
  empresa: { title: 'Empresa', showDate: false },
  config: { title: 'Configuración', showDate: false }
};

const ICONS = {
  home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  users: '<path d="M17 19a4 4 0 0 0-8 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 19a3 3 0 0 0-5.5-1.7M3 19a3 3 0 0 1 5.5-1.7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  car: '<path d="M5 17h14M7 17l-1-4 2-5h8l2 5-1 4M9 17v1M15 17v1M6 12h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  check: '<path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  building: '<path d="M4 20V8l8-4 8 4v12H4zM9 20v-5h6v5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  settings: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
};

function svgIcon(name) {
  const content = ICONS[name] || '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
}

function formatDateParaguay() {
  return new Intl.DateTimeFormat('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
}

function renderNavItems(activePage) {
  return MENU_ITEMS.map((item) => `
    <li>
      <button
        type="button"
        class="dashboard-nav__item${item.id === activePage ? ' dashboard-nav__item--active' : ''}"
        data-nav="${item.id}"
        aria-current="${item.id === activePage ? 'page' : 'false'}"
      >
        ${svgIcon(item.icon)}
        ${escapeHtml(item.label)}
      </button>
    </li>
  `).join('');
}

function renderPlaceholder(pageId) {
  const header = PAGE_HEADERS[pageId] || { title: 'Módulo' };
  return `
    <div class="shell-placeholder">
      <p>El módulo <strong>${escapeHtml(header.title)}</strong> estará disponible próximamente.</p>
    </div>
  `;
}

let shellState = {
  currentPage: 'inicio',
  user: null,
  empresa: null,
  onLogout: null
};

function updateHeader(pageId, empresaNombre) {
  const headerEl = document.querySelector('.dashboard-header');
  if (!headerEl) {
    return;
  }

  const config = PAGE_HEADERS[pageId] || PAGE_HEADERS.inicio;

  headerEl.innerHTML = `
    <div class="dashboard-header__greeting">
      <h1>${escapeHtml(config.title)}</h1>
      <p>${escapeHtml(empresaNombre)}</p>
    </div>
    ${config.showDate ? `
      <div class="dashboard-header__date">
        ${svgIcon('calendar')}
        <span>${escapeHtml(formatDateParaguay())}</span>
      </div>
    ` : ''}
  `;
}

function updateNavActive(pageId) {
  document.querySelectorAll('.dashboard-nav__item').forEach((btn) => {
    const isActive = btn.dataset.nav === pageId;
    btn.classList.toggle('dashboard-nav__item--active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

async function navigateTo(pageId) {
  const contentEl = document.querySelector('.dashboard-content');
  if (!contentEl) {
    return;
  }

  const previousPage = shellState.currentPage;

  try {
    if (previousPage === 'clientes' && pageId !== 'clientes') {
      unmountClientesPage();
    }

    if (previousPage === 'vehiculos' && pageId !== 'vehiculos') {
      unmountVehiculosPage();
    }

    if (previousPage === 'ordenes' && pageId !== 'ordenes') {
      unmountOrdenesPage();
    }

    if (previousPage === 'servicios' && pageId !== 'servicios') {
      unmountServiciosRealizadosPage();
    }

    if (previousPage === 'proximos' && pageId !== 'proximos') {
      unmountProximosServiciosPage();
    }

    if (previousPage === 'config' && pageId !== 'config') {
      unmountConfiguracionPage();
    }

    updateNavActive(pageId);
    updateHeader(pageId, shellState.empresa?.nombre || 'Auto Repuestos Leandro S.A.');

    switch (pageId) {
      case 'inicio':
        contentEl.innerHTML = renderDashboardContent();
        break;
      case 'clientes':
        contentEl.innerHTML = '';
        await mountClientesPage(contentEl);
        break;
      case 'vehiculos':
        contentEl.innerHTML = '';
        await mountVehiculosPage(contentEl);
        break;
      case 'ordenes':
        contentEl.innerHTML = '';
        await mountOrdenesPage(contentEl);
        break;
      case 'servicios':
        contentEl.innerHTML = '';
        await mountServiciosRealizadosPage(contentEl);
        break;
      case 'proximos':
        contentEl.innerHTML = '';
        await mountProximosServiciosPage(contentEl);
        break;
      case 'config':
        contentEl.innerHTML = '';
        await mountConfiguracionPage(contentEl);
        break;
        case 'historial-vehiculo-qr':
          contentEl.innerHTML = '';
          await abrirHistorialVehiculo(shellState.qrCode);
          break;
      default:
        contentEl.innerHTML = renderPlaceholder(pageId);
        break;
    }

    shellState.currentPage = pageId;
  } catch (error) {
    console.error(`Error al navegar a "${pageId}":`, error);
    shellState.currentPage = previousPage;
    updateNavActive(previousPage);
    updateHeader(previousPage, shellState.empresa?.nombre || 'Auto Repuestos Leandro S.A.');
    contentEl.innerHTML = `
      <div class="shell-placeholder">
        <p>No se pudo abrir el módulo. Reinicie la aplicación e intente nuevamente.</p>
      </div>
    `;
  }
}

function bindNavigation() {
  const navList = document.querySelector('.dashboard-nav__list');
  if (!navList) {
    return;
  }

  navList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-nav]');
    if (!btn) {
      return;
    }

    const pageId = btn.dataset.nav;
    if (pageId) {
      navigateTo(pageId);
    }
  });
}

export function renderAppShell({ user, empresa, onLogout, page = 'inicio' }) {
  const root = document.getElementById('app-root');

  shellState = {
    currentPage: 'historial-vehiculo-qr',
    user,
    empresa,
    onLogout,
    qrCode: 'COLE_AQUI_O_QR_CODE_DO_VEICULO'
  };

  root.innerHTML = `
    <div class="dashboard-shell">
      <aside class="dashboard-sidebar" aria-label="Menú principal">
        <div class="dashboard-sidebar__brand">
          <div class="dashboard-sidebar__logo" aria-hidden="true">ARL</div>
          <p class="dashboard-sidebar__title">AUTO REPUESTOS<br>LEANDRO CONNECT</p>
          <p class="dashboard-sidebar__subtitle">Katueté – Canindeyú – Paraguay</p>
        </div>

        <nav class="dashboard-nav">
          <ul class="dashboard-nav__list">
            ${renderNavItems(page)}
          </ul>
        </nav>

        <div class="dashboard-sidebar__user">
          <span class="dashboard-sidebar__user-name">${escapeHtml(user.nombre)}</span>
          <span class="dashboard-sidebar__user-role">${escapeHtml(user.perfil)}</span>
          <button class="btn-ghost dashboard-sidebar__logout" type="button" id="logout-button">Salir</button>
        </div>
      </aside>

      <div class="dashboard-main">
        <header class="dashboard-header"></header>
        <main class="dashboard-content"></main>
      </div>

      <footer class="dashboard-footer">
        <span class="dashboard-footer__status">
          <span class="dashboard-footer__dot" aria-hidden="true"></span>
          Base de datos SQLite conectada
        </span>
        <span class="dashboard-footer__version" id="dashboard-version">Versión 1.0 Comercial</span>
      </footer>
    </div>
  `;

  root.querySelector('#logout-button').addEventListener('click', onLogout);
  bindNavigation();
  navigateTo(page);

  window.api.getVersion().then((version) => {
    const versionEl = root.querySelector('#dashboard-version');
    if (versionEl) {
      versionEl.textContent = `Versión ${version} Comercial`;
    }
  });
}
