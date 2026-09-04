import { escapeHtml } from '../utils/dom.js';
import { mountDashboardPage, unmountDashboardPage } from './dashboard.js';
import { mountClientesPage, unmountClientesPage } from './clientes.js';
import { mountVehiculosPage, unmountVehiculosPage } from './vehiculos.js';
import { mountOrdenesPage, unmountOrdenesPage } from './ordenes.js';
import { mountServiciosRealizadosPage, unmountServiciosRealizadosPage } from './servicios-realizados.js';
import { mountProximosServiciosPage, unmountProximosServiciosPage } from './proximos-servicios.js';
import { mountConfiguracionPage, unmountConfiguracionPage } from './configuracion.js';
import { mountUsuariosPage, unmountUsuariosPage } from './usuarios.js';
import { abrirHistorialVehiculo } from './historial-vehiculo-qr.js';
import {
  mountAgendamientosPage,
  unmountAgendamientosPage
} from './agendamientos.js';
import { hasPermission, PERMISSIONS } from '../utils/permisos.js';

const MENU_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: 'home', permission: PERMISSIONS.MENU_INICIO },
  { id: 'clientes', label: 'Clientes', icon: 'users', permission: PERMISSIONS.MENU_CLIENTES },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car', permission: PERMISSIONS.MENU_VEHICULOS },
  { id: 'ordenes', label: 'Órdenes de Trabajo', icon: 'clipboard', permission: PERMISSIONS.MENU_ORDENES },
  { id: 'agendamientos', label: 'Agendamientos', icon: 'calendar', permission: PERMISSIONS.MENU_AGENDAMIENTOS },
  { id: 'servicios', label: 'Servicios Realizados', icon: 'check', permission: PERMISSIONS.MENU_SERVICIOS },
  { id: 'proximos', label: 'Próximos Servicios', icon: 'calendar', permission: PERMISSIONS.MENU_PROXIMOS },
  { id: 'empresa', label: 'Empresa', icon: 'building', permission: PERMISSIONS.MENU_EMPRESA },
  { id: 'config', label: 'Configuración', icon: 'settings', permission: PERMISSIONS.MENU_CONFIG },
  { id: 'usuarios', label: 'Usuarios', icon: 'userCog', permission: PERMISSIONS.MENU_USUARIOS }
];

const PAGE_HEADERS = {
  inicio: { title: 'Panel de Inicio', showDate: true },
  clientes: { title: 'Gestión de Clientes', showDate: false },
  vehiculos: { title: 'Gestión de Vehículos', showDate: false },
  ordenes: { title: 'Órdenes de Trabajo', showDate: false },
  agendamientos: { title: 'Agendamientos', showDate: false },
  servicios: { title: 'Servicios Realizados', showDate: false },
  proximos: { title: 'Próximos Servicios', showDate: false },
  empresa: { title: 'Empresa', showDate: false },
  config: { title: 'Configuración', showDate: false },
  usuarios: { title: 'Usuarios', showDate: false }
};

const ICONS = {
  home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  users: '<path d="M17 19a4 4 0 0 0-8 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 19a3 3 0 0 0-5.5-1.7M3 19a3 3 0 0 1 5.5-1.7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  car: '<path d="M5 17h14M7 17l-1-4 2-5h8l2 5-1 4M9 17v1M15 17v1M6 12h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  check: '<path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  building: '<path d="M4 20V8l8-4 8 4v12H4zM9 20v-5h6v5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  settings: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  userCog: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M16 11h6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
};

function svgIcon(name) {
  const content = ICONS[name] || '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${content}</svg>`;
}

function formatDateParaguay(date = new Date()) {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatTimeParaguay(date = new Date()) {
  return new Intl.DateTimeFormat('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function canOpenPage(user, pageId) {
  const item = MENU_ITEMS.find((entry) => entry.id === pageId);

  if (item) {
    return hasPermission(user, item.permission);
  }

  if (pageId === 'historial-vehiculo-qr') {
    return hasPermission(user, PERMISSIONS.MENU_INICIO);
  }

  return false;
}

function getVisibleMenuItems(user) {
  return MENU_ITEMS.filter((item) => hasPermission(user, item.permission));
}

function renderNavItems(activePage, user) {
  return getVisibleMenuItems(user).map((item) => `
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
  onLogout: null,
  clockTimer: null
};

function updateHeader() {
  const dateEl = document.querySelector('#dashboard-current-date');
  const timeEl = document.querySelector('#dashboard-current-time');
  const now = new Date();

  if (dateEl) {
    dateEl.textContent = formatDateParaguay(now);
  }

  if (timeEl) {
    timeEl.textContent = formatTimeParaguay(now);
  }
}

function startHeaderClock() {
  if (shellState.clockTimer) {
    clearInterval(shellState.clockTimer);
  }

  updateHeader();
  shellState.clockTimer = setInterval(updateHeader, 1000);
}

function updateNavActive(pageId) {
  document.querySelectorAll('.dashboard-nav__item').forEach((btn) => {
    const isActive = btn.dataset.nav === pageId;
    btn.classList.toggle('dashboard-nav__item--active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

async function navigateTo(pageId, navigationDetail = {}) {
  const contentEl = document.querySelector('.dashboard-content');
  if (!contentEl) {
    return;
  }

  if (!canOpenPage(shellState.user, pageId)) {
    return;
  }

  const previousPage = shellState.currentPage;

  try {
    if (previousPage === 'inicio' && pageId !== 'inicio') {
      unmountDashboardPage();
    }

    if (previousPage === 'agendamientos' && pageId !== 'agendamientos') {
      unmountAgendamientosPage();
    }

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

    if (previousPage === 'usuarios' && pageId !== 'usuarios') {
      unmountUsuariosPage();
    }

    updateNavActive(pageId);
    updateHeader();

    switch (pageId) {
      case 'inicio':
        contentEl.innerHTML = '';
        await mountDashboardPage(contentEl);
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
        await mountOrdenesPage(contentEl, navigationDetail);
        break;
      case 'agendamientos':
        contentEl.innerHTML = '';
        await mountAgendamientosPage(contentEl);
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
      case 'usuarios':
        contentEl.innerHTML = '';
        await mountUsuariosPage(contentEl);
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
    updateHeader();
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
  const initialPage = canOpenPage(user, page) ? page : 'inicio';

  shellState = {
    currentPage: initialPage,
    user,
    empresa,
    onLogout,
    qrCode: 'COLE_AQUI_O_QR_CODE_DO_VEICULO',
    clockTimer: null
  };

  root.innerHTML = `
    <div class="dashboard-shell">
      <aside class="dashboard-sidebar" aria-label="Menú principal">
       <div class="dashboard-sidebar__brand">
  <img
    class="dashboard-sidebar__logo-image"
    src="./assets/logo-oficial.png"
    alt="Auto Repuestos Leandro S.A."
  />
</div>

        <nav class="dashboard-nav">
          <ul class="dashboard-nav__list">
            ${renderNavItems(initialPage, user)}
          </ul>
        </nav>

        <div class="dashboard-sidebar__user">
          <button class="dashboard-sidebar__logout" type="button" id="logout-button">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Salir
          </button>
        </div>
      </aside>

      <div class="dashboard-main">
        <header class="dashboard-header">
          <div class="dashboard-header__identity">
            <h1>AUTO REPUESTOS LEANDRO CONNECT</h1>
            <p>Innovación y Calidad</p>
            <div class="dashboard-header__service-line">
              <span></span>
              <strong>CONECTAMOS TU VEHÍCULO CON EL MEJOR SERVICIO</strong>
              <span></span>
            </div>
          </div>

          <div class="dashboard-header__information">
            <div class="dashboard-header__info-block dashboard-header__date-time">
              ${svgIcon('calendar')}
              <div>
                <span>Fecha: <strong id="dashboard-current-date"></strong></span>
                <span>Hora: <strong id="dashboard-current-time"></strong></span>
              </div>
            </div>

            <div class="dashboard-header__divider" aria-hidden="true"></div>

            <div class="dashboard-header__info-block dashboard-header__profile">
              ${svgIcon('users')}
              <div class="dashboard-header__profile-content">
                <strong>${escapeHtml(user.nombre)}</strong>
                <span>${escapeHtml(user.perfil)}</span>
                <div class="dashboard-header__database dashboard-header__database--profile">
                  <span class="dashboard-header__database-dot" aria-hidden="true"></span>
                  <span>Base de datos conectada</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="dashboard-content"></main>
      </div>

      <footer class="dashboard-footer">
        <span class="dashboard-footer__version" id="dashboard-version">Versión 1.0 Comercial</span>
      </footer>
    </div>
  `;

  root.querySelector('#logout-button').addEventListener('click', onLogout);
  bindNavigation();
  startHeaderClock();
  window.addEventListener('arl:navigate', (event) => {
    const target = event.detail?.page;
    if (target) navigateTo(target, event.detail || {});
  });
  navigateTo(initialPage);

  window.api.getVersion().then((version) => {
    const versionEl = root.querySelector('#dashboard-version');
    if (versionEl) {
      versionEl.textContent = `Versión ${version} Comercial`;
    }
  });
}
