import { escapeHtml } from '../utils/dom.js';

const MOCK_STATS = {
  clientes: 148,
  vehiculos: 203,
  ordenesAbiertas: 7,
  serviciosHoy: 5
};

const MOCK_SERVICIOS_HOY = [
  {
    fecha: '26/06/2026',
    cliente: 'Juan Carlos Pérez',
    vehiculo: 'Toyota Hilux — ABC 123',
    servicio: 'Cambio de aceite y filtro'
  },
  {
    fecha: '26/06/2026',
    cliente: 'María Elena González',
    vehiculo: 'Chevrolet Onix — XYZ 789',
    servicio: 'Alineación y balanceo'
  },
  {
    fecha: '26/06/2026',
    cliente: 'Carlos Benítez',
    vehiculo: 'Ford Ranger — DEF 456',
    servicio: 'Revisión de frenos'
  },
  {
    fecha: '26/06/2026',
    cliente: 'Ana Martínez',
    vehiculo: 'Hyundai Tucson — GHI 321',
    servicio: 'Cambio de bujías'
  },
  {
    fecha: '26/06/2026',
    cliente: 'Roberto Silva',
    vehiculo: 'Volkswagen Gol — JKL 654',
    servicio: 'Lubricación general'
  }
];

const MOCK_ORDENES_ABIERTAS = [
  {
    os: 'OS-0042',
    cliente: 'Pedro Ramírez',
    vehiculo: 'Nissan Frontier — MNO 987',
    estado: 'En progreso',
    estadoClass: 'progress'
  },
  {
    os: 'OS-0043',
    cliente: 'Lucía Fernández',
    vehiculo: 'Kia Sportage — PQR 654',
    estado: 'Abierta',
    estadoClass: 'open'
  },
  {
    os: 'OS-0044',
    cliente: 'Diego Acosta',
    vehiculo: 'Toyota Corolla — STU 321',
    estado: 'Esperando repuesto',
    estadoClass: 'waiting'
  },
  {
    os: 'OS-0045',
    cliente: 'Gabriela Romero',
    vehiculo: 'Chevrolet S10 — VWX 159',
    estado: 'En progreso',
    estadoClass: 'progress'
  },
  {
    os: 'OS-0046',
    cliente: 'Héctor Villalba',
    vehiculo: 'Mitsubishi L200 — YZA 753',
    estado: 'Abierta',
    estadoClass: 'open'
  }
];

const MENU_ITEMS = [
  { id: 'inicio', label: 'Inicio', icon: 'home', active: true },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'vehiculos', label: 'Vehículos', icon: 'car' },
  { id: 'ordenes', label: 'Órdenes de Trabajo', icon: 'clipboard' },
  { id: 'servicios', label: 'Servicios Realizados', icon: 'check' },
  { id: 'proximos', label: 'Próximos Servicios', icon: 'calendar' },
  { id: 'empresa', label: 'Empresa', icon: 'building' },
  { id: 'config', label: 'Configuración', icon: 'settings' }
];

const ICONS = {
  home: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  users: '<path d="M17 19a4 4 0 0 0-8 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 19a3 3 0 0 0-5.5-1.7M3 19a3 3 0 0 1 5.5-1.7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  car: '<path d="M5 17h14M7 17l-1-4 2-5h8l2 5-1 4M9 17v1M15 17v1M6 12h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  check: '<path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  building: '<path d="M4 20V8l8-4 8 4v12H4zM9 20v-5h6v5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
  settings: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  clients: '<path d="M17 19a4 4 0 0 0-8 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  orders: '<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
  services: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 12l3 3 5-6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
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

function renderNavItems() {
  return MENU_ITEMS.map((item) => `
    <li>
      <button
        type="button"
        class="dashboard-nav__item${item.active ? ' dashboard-nav__item--active' : ''}"
        data-nav="${item.id}"
        aria-current="${item.active ? 'page' : 'false'}"
      >
        ${svgIcon(item.icon)}
        ${escapeHtml(item.label)}
      </button>
    </li>
  `).join('');
}

function renderStatCard(label, count, icon) {
  return `
    <article class="dashboard-stat-card">
      <div class="dashboard-stat-card__icon">${svgIcon(icon)}</div>
      <div class="dashboard-stat-card__body">
        <span class="dashboard-stat-card__count">${count}</span>
        <span class="dashboard-stat-card__label">${escapeHtml(label)}</span>
      </div>
    </article>
  `;
}

function renderServiciosRows() {
  if (!MOCK_SERVICIOS_HOY.length) {
    return '<tr><td class="dashboard-table__empty" colspan="4">No hay servicios realizados hoy.</td></tr>';
  }

  return MOCK_SERVICIOS_HOY.map((row) => `
    <tr>
      <td>${escapeHtml(row.fecha)}</td>
      <td>${escapeHtml(row.cliente)}</td>
      <td>${escapeHtml(row.vehiculo)}</td>
      <td>${escapeHtml(row.servicio)}</td>
    </tr>
  `).join('');
}

function renderOrdenesRows() {
  if (!MOCK_ORDENES_ABIERTAS.length) {
    return '<tr><td class="dashboard-table__empty" colspan="4">No hay órdenes abiertas.</td></tr>';
  }

  return MOCK_ORDENES_ABIERTAS.map((row) => `
    <tr>
      <td>${escapeHtml(row.os)}</td>
      <td>${escapeHtml(row.cliente)}</td>
      <td>${escapeHtml(row.vehiculo)}</td>
      <td>
        <span class="dashboard-badge dashboard-badge--${row.estadoClass}">
          ${escapeHtml(row.estado)}
        </span>
      </td>
    </tr>
  `).join('');
}

export function renderDashboardContent() {
  const { clientes, vehiculos, ordenesAbiertas, serviciosHoy } = MOCK_STATS;

  return `
    <div class="dashboard-stats">
      ${renderStatCard('Clientes', clientes, 'users')}
      ${renderStatCard('Vehículos', vehiculos, 'car')}
      ${renderStatCard('Órdenes Abiertas', ordenesAbiertas, 'orders')}
      ${renderStatCard('Servicios Hoy', serviciosHoy, 'services')}
    </div>

    <div class="dashboard-panels">
      <section class="dashboard-panel">
        <header class="dashboard-panel__header">
          ${svgIcon('check')}
          <h2 class="dashboard-panel__title">Servicios realizados hoy</h2>
        </header>
        <div class="dashboard-panel__body">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Servicio</th>
              </tr>
            </thead>
            <tbody>${renderServiciosRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="dashboard-panel">
        <header class="dashboard-panel__header">
          ${svgIcon('clipboard')}
          <h2 class="dashboard-panel__title">Órdenes abiertas</h2>
        </header>
        <div class="dashboard-panel__body">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th scope="col">OS</th>
                <th scope="col">Cliente</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>${renderOrdenesRows()}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

export function renderDashboardShell({ user, empresa, onLogout }) {
  const root = document.getElementById('app-root');
  const empresaNombre = empresa?.nombre || 'Auto Repuestos Leandro S.A.';

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
            ${renderNavItems()}
          </ul>
        </nav>

        <div class="dashboard-sidebar__user">
          <span class="dashboard-sidebar__user-name">${escapeHtml(user.nombre)}</span>
          <span class="dashboard-sidebar__user-role">${escapeHtml(user.perfil)}</span>
          <button class="btn-ghost dashboard-sidebar__logout" type="button" id="logout-button">Salir</button>
        </div>
      </aside>

      <div class="dashboard-main">
        <header class="dashboard-header">
          <div class="dashboard-header__greeting">
            <h1>Panel de Inicio</h1>
            <p>${escapeHtml(empresaNombre)}</p>
          </div>
          <div class="dashboard-header__date">
            ${svgIcon('calendar')}
            <span id="dashboard-date">${escapeHtml(formatDateParaguay())}</span>
          </div>
        </header>

        <main class="dashboard-content">
          ${renderDashboardContent()}
        </main>
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

  window.api.getVersion().then((version) => {
    const versionEl = root.querySelector('#dashboard-version');
    if (versionEl) {
      versionEl.textContent = `Versión ${version} Comercial`;
    }
  });
}
